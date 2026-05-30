/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  BeamInput, 
  BeamAnalysisResult, 
  ColumnInput, 
  ColumnAnalysisResult, 
  PMPoint,
  FootplatInput,
  FootplatResult,
  PileInput,
  PileResult,
  PileCapInput,
  PileCapResult,
  FrameNode,
  FrameBeam,
  FrameLayoutAnalysis,
  NodeAnalysisDetail,
  BeamAnalysisDetail
} from "../types";

export const Es = 200000; // Young's modulus of steel, MPa

// List of standard steel rears in Indonesia
export const STANDARD_BAR_DIAMETERS = [8, 10, 12, 13, 16, 19, 22, 25, 29, 32];

// Calculate beta1 based on SNI 2847:2019 / ACI 318-19
export function calculateBeta1(fc: number): number {
  if (fc <= 28) {
    return 0.85;
  } else if (fc >= 55) {
    return 0.65;
  } else {
    return 0.85 - (0.05 * (fc - 28)) / 7;
  }
}

// Balance steel percentage singly reinforced
export function calculateRhoBalanced(fc: number, fy: number, beta1: number): number {
  return (0.85 * beta1 * fc / fy) * (600 / (600 + fy));
}

/**
 * Beam Analysis Engine (Analisis Balok)
 * Handles both singly and doubly reinforced rectangular sections.
 */
export function analyzeBeam(input: BeamInput): BeamAnalysisResult {
  const {
    b, h, cover, fc, fy, fys, Mu, Vu,
    rebarDiameter, rebarCount,
    isDoubleReinforced,
    compressionRebarDiameter, compressionRebarCount,
    stirrupDiameter, stirrupLegs, stirrupSpacing
  } = input;

  const d = h - cover;
  const dPrime = cover; // compression steel depth from top fiber
  const beta1 = calculateBeta1(fc);

  // Steel areas
  const rebarArea1 = (Math.PI * Math.pow(rebarDiameter, 2)) / 4;
  const As = rebarCount * rebarArea1;

  const compressionRebarArea1 = (Math.PI * Math.pow(compressionRebarDiameter, 2)) / 4;
  const AsPrime = isDoubleReinforced ? compressionRebarCount * compressionRebarArea1 : 0;

  const rho = As / (b * d);
  const ey = fy / Es; // yield strain of steel

  // Limits
  const rhoMin = Math.max((0.25 * Math.sqrt(fc)) / fy, 1.4 / fy);
  const rhoBalanced = calculateRhoBalanced(fc, fy, beta1);
  const rhoMax = 0.75 * rhoBalanced; // old reference, in ACI 19 we check tensile strain >= 0.004

  let c = 0;
  let fs = fy;
  let fsPrime = 0;
  let safeBending = false;
  let overReinforced = false;
  let Mn = 0;
  let phiBending = 0.9;
  let et = 0;

  if (As <= 0) {
    return {
      d, beta1, As, AsPrime, rho, rhoMin, rhoMax, rhoBalanced,
      neutralAxisC: 0, concreteStrainEt: 0, phiBending: 0.9, Mn: 0, phiMn: 0,
      isSafeBending: false, isOverReinforced: false, Vc: 0, Vs: 0, Vn: 0, phiVn: 0,
      isSafeShear: false, shearStatusMessage: "Tulangan utama tidak boleh 0."
    };
  }

  if (!isDoubleReinforced || AsPrime <= 0) {
    // SINGLY REINFORCED
    // Tension steel is assumed to yield. Let's check:
    const a = (As * fy) / (0.85 * fc * b);
    c = a / beta1;
    et = 0.003 * (d - c) / c;
    
    // Check if it really yields
    if (et < ey) {
      // Re-solve with non-yielded steel
      // Tension steel stress fs = Es * 0.003 * (d-c)/c
      // 0.85 * fc * b * beta1 * c = As * Es * 0.003 * (d-c)/c
      // Let's solve quadratic: 0.85 * fc * b * beta1 * c^2 + 0.003 * As * Es * c - 0.003 * As * Es * d = 0
      const k1 = 0.85 * fc * b * beta1;
      const k2 = 0.003 * As * Es;
      const k3 = -0.003 * As * Es * d;
      const rootC = (-k2 + Math.sqrt(k2 * k2 - 4 * k1 * k3)) / (2 * k1);
      c = rootC;
      et = 0.003 * (d - c) / c;
      fs = Math.min(fy, et * Es);
    } else {
      fs = fy;
    }

    const correctA = beta1 * c;
    Mn = As * fs * (d - correctA / 2) * 1e-6; // kNm
    overReinforced = et < 0.004;
  } else {
    // DOUBLY REINFORCED
    // Solve C_c + C_s = T using numerical bisection
    // We want to find c such that 0.85 * fc * b * beta1 * c + As' * fs' = As * fs
    let lowC = 0.1;
    let highC = h * 2;
    let iteration = 0;
    while (highC - lowC > 0.01 && iteration < 100) {
      const midC = (lowC + highC) / 2;
      const actA = Math.min(beta1 * midC, h);
      const Cc = 0.85 * fc * b * actA;
      
      const strainS = 0.003 * (d - midC) / midC;
      const currFs = Math.max(-fy, Math.min(fy, strainS * Es));

      const strainSPrime = 0.003 * (midC - dPrime) / midC;
      const currFsPrime = Math.max(-fy, Math.min(fy, strainSPrime * Es));

      // Force balance: Cc + AsPrime * (fsPrime - 0.85*fc) - As * fs = 0
      const balance = Cc + AsPrime * (currFsPrime - 0.85 * fc) - As * currFs;
      if (balance > 0) {
        highC = midC;
      } else {
        lowC = midC;
      }
      iteration++;
    }

    c = (lowC + highC) / 2;
    const actA = Math.min(beta1 * c, h);
    et = 0.003 * (d - c) / c;
    fs = Math.max(-fy, Math.min(fy, et * Es));
    fsPrime = Math.max(-fy, Math.min(fy, (0.003 * (c - dPrime) / c) * Es));

    const Cc = 0.85 * fc * b * actA;
    // Moment about tension reinforcement center
    Mn = (Cc * (d - actA / 2) + AsPrime * (fsPrime - 0.85 * fc) * (d - dPrime)) * 1e-6; // kNm
    overReinforced = et < 0.004;
  }

  // Calculate phi based on extreme tension strain et
  if (et >= 0.005) {
    phiBending = 0.90;
  } else if (et <= ey) {
    phiBending = 0.65; // standard tied column, or brittle beam limit
  } else {
    phiBending = 0.65 + 0.25 * ((et - ey) / (0.005 - ey));
  }

  const phiMn = phiBending * Mn;
  safeBending = phiMn >= Mu;

  // SHEAR CALCULATIONS (Geser)
  // Vc = 0.17 * sqrt(f'c) * b * d
  const Vc = 0.17 * Math.sqrt(fc) * b * d * 1e-3; // kN
  const phiShear = 0.75;
  const stirrupArea1 = (Math.PI * Math.pow(stirrupDiameter, 2)) / 4;
  const Av = stirrupLegs * stirrupArea1; // area of multiple legs

  const Vs = (Av * fys * d / (stirrupSpacing || 150)) * 1e-3; // provided Vs, kN
  const Vn = Vc + Vs;
  const phiVn = phiShear * Vn;
  const safeShear = phiVn >= Vu;

  // Required Shear reinforcement check
  let requiredStirrupSpacing: number | undefined = undefined;
  let shearStatusMessageFlag = "";

  if (Vu <= 0.5 * phiShear * Vc) {
    shearStatusMessageFlag = "Aman sinergis. Kapasitas geser beton mencukupi. Sengkang minimum disarankan.";
  } else if (Vu <= phiShear * Vc) {
    // minimum shear reinforcement needed
    const minSpacingRatio = Math.max((0.062 * Math.sqrt(fc) * b) / fys, (0.35 * b) / fys);
    requiredStirrupSpacing = Math.min(d / 2, 600);
    shearStatusMessageFlag = `Sengkang minimum diperlukan (s ≤ ${Math.floor(requiredStirrupSpacing)} mm).`;
  } else {
    // shear steel is active
    const shearForceNeeded = (Vu / phiShear) - Vc;
    const spacingCalc = (Av * fys * d) / (shearForceNeeded * 1000); // mm
    
    // limit check: Vs max = 0.66 * sqrt(fc) * b * d
    const maxVs = 0.66 * Math.sqrt(fc) * b * d * 1e-3;
    if (shearForceNeeded > maxVs) {
      shearStatusMessageFlag = "Dimensi penampang terlalu kecil untuk menahan gaya geser (Vs melebihi batas kontrol)! Besarkan dimensi balok.";
    } else {
      const vsThreshold = 0.33 * Math.sqrt(fc) * b * d * 1e-3;
      const maxSpac = shearForceNeeded <= vsThreshold ? Math.min(d / 2, 600) : Math.min(d / 4, 300);
      requiredStirrupSpacing = Math.min(spacingCalc, maxSpac);
      
      if (stirrupSpacing <= requiredStirrupSpacing) {
        shearStatusMessageFlag = `Kombinasi sengkang aman. Jarak maksimum sengkang adalah ${Math.floor(requiredStirrupSpacing)} mm.`;
      } else {
        shearStatusMessageFlag = `Sengkang tidak kuat! Perkecil spasi sengkang ke s ≤ ${Math.floor(requiredStirrupSpacing)} mm.`;
      }
    }
  }

  return {
    d, beta1, As, AsPrime, rho, rhoMin, rhoMax, rhoBalanced,
    neutralAxisC: c, concreteStrainEt: et, phiBending, Mn, phiMn,
    isSafeBending: safeBending && !overReinforced,
    isOverReinforced: overReinforced,
    Vc, Vs, Vn, phiVn,
    isSafeShear: safeShear,
    requiredStirrupSpacing,
    shearStatusMessage: shearStatusMessageFlag
  };
}

/**
 * Column Analysis & P-M Interaction Diagram Generator
 */
export function analyzeColumn(input: ColumnInput): ColumnAnalysisResult {
  const { b, h, cover, fc, fy, Pu, Mu, rebarDiameter, rebarRows } = input;

  const Ag = b * h;
  
  // Calculate total steel area Ast
  const singleBarArea = (Math.PI * Math.pow(rebarDiameter, 2)) / 4;
  let Ast = 0;
  for (const row of rebarRows) {
    Ast += row.count * singleBarArea;
  }

  const rho = Ast / Ag;
  const isRatioValid = rho >= 0.01 && rho <= 0.08; // Typical limit: 1% to 8% (usually 4% in practice)

  // 1. Pure Compressive Strength (P0)
  // P0 = 0.85 * f'c * (Ag - Ast) + fy * Ast
  const P0 = (0.85 * fc * (Ag - Ast) + fy * Ast) * 1e-3; // kN
  // Cap at 80% for tied column: Pn_max = 0.80 * P0
  const PnMax = 0.80 * P0;
  const phiComp = 0.65; // strength reduction factor for tied column in compression
  const phiPnMax = phiComp * PnMax;

  // 2. Pure Tensile Strength
  const Pn_pureTension = -Ast * fy * 1e-3; // Tension is represented by negative axial force in diagram
  const phiTension = 0.90;
  const phiPn_pureTension = phiTension * Pn_pureTension;

  const beta1 = calculateBeta1(fc);
  const hOver2 = h / 2;

  // Function to calculate (Pn, Mn) for a specific neutral axis depth 'c'
  const calculateCapacityForC = (cVal: number): PMPoint => {
    // Avoid cVal = 0 or close to 0 to prevent division by zero
    const c = Math.max(0.1, cVal);
    const a = Math.min(beta1 * c, h); // Whitney block depth, cannot exceed section height h

    // Concrete compression force
    const Cc = 0.85 * fc * b * a * 1e-3; // kN
    // Center of Whitney block to plastic centroid (geometric center h/2)
    const armCc = hOver2 - a / 2;
    const momentCc = Cc * armCc * 1e-3; // kNm

    let sumPs = 0; // Steel axial force sum (kN)
    let sumMs = 0; // Steel moment force sum (kNm)
    let extremeSteelStrain = -999;
    let extremeSteelDepth = 0;

    for (const row of rebarRows) {
      const rowArea = row.count * singleBarArea;
      // Strain in this steel row (compression positive, tension negative)
      const strain = 0.003 * (c - row.depth) / c;
      
      // Keep track of the extreme tension rebar (furthest row from top fiber)
      if (row.depth > extremeSteelDepth) {
        extremeSteelDepth = row.depth;
        extremeSteelStrain = strain;
      }

      // Calculate stress in design code
      let stress = strain * Es;
      if (stress > fy) stress = fy;
      if (stress < -fy) stress = -fy;

      // Force = Area * Stress (adjusted for displaced concrete if row is in concrete compression zone)
      let force = rowArea * stress * 1e-3; // kN
      if (row.depth < a) {
        // Displaced concrete correction factor
        force -= rowArea * (0.85 * fc) * 1e-3;
      }

      sumPs += force;
      // Moment about centroid (h/2)
      // distance to centroid = (h/2 - coordinate)
      const arm = hOver2 - row.depth;
      sumMs += force * arm * 1e-3; // kNm
    }

    const Pn = Cc + sumPs; // Nominal axial capacity
    const Mn = momentCc + sumMs; // Nominal moment capacity

    // Net tensile strain in extreme tension rebar
    // extremeSteelStrain is strain (negative means tension, but let's represent tensile strain as positive)
    const absEt = -extremeSteelStrain; // positive tensile strain
    const ey = fy / Es;

    let phi = 0.65;
    if (absEt >= 0.005) {
      phi = 0.90;
    } else if (absEt <= ey) {
      phi = 0.65;
    } else {
      phi = 0.65 + 0.25 * ((absEt - ey) / (0.005 - ey));
    }

    let type = "Compression Controlled";
    if (absEt > ey && absEt < 0.005) {
      type = "Transition Zone";
    } else if (absEt >= 0.005) {
      type = "Tension Controlled";
    }

    return {
      Pn,
      Mn: Math.abs(Mn),
      phiPn: phi * Pn,
      phiMn: Math.abs(phi * Mn),
      c,
      type,
      phi
    };
  };

  // Generate continuous PM diagram points (both nominal and design/reduced)
  const PMPoints: PMPoint[] = [];

  // Add pure tension point
  PMPoints.push({
    Pn: Pn_pureTension,
    Mn: 0,
    phiPn: phiPn_pureTension,
    phiMn: 0,
    c: 0,
    type: "Pure Tension",
    phi: phiTension
  });

  // Generate intermediate points by varying neutral axis depth c
  // 1. Tension control to hybrid zones (c is small, e.g., 10mm to 0.6 * h)
  const numSteps = 80;
  
  // Vary c from near-zero to 3 times the column depth h to capture whole diagram
  for (let i = 1; i <= numSteps; i++) {
    const t = i / numSteps;
    // Exponential spacing to get higher density for small c (tension/balance points)
    const cVal = 15 + (3 * h - 15) * Math.pow(t, 2);
    const pt = calculateCapacityForC(cVal);
    
    // Cap design axial compression at phi * Pn_max
    if (pt.phiPn > phiPnMax) {
      // Modify point for the design diagram, keeping the nominal capacity intact
    }
    PMPoints.push(pt);
  }

  // Sort diagram points by Pn ascending to form a perfect closed path / polygon
  PMPoints.sort((a, b) => a.Pn - b.Pn);

  // Add Pure Concentric compression point at the very top (Mn = 0, Pn = P0)
  PMPoints.push({
    Pn: P0,
    Mn: 0,
    phiPn: phiPnMax, // applied cutoff
    phiMn: 0,
    c: 99999,
    type: "Pure Compression",
    phi: phiComp
  });

  // We should duplicate the diagram symmetrically for negative moment if needed,
  // but standard practice only shows positive moment since design moment is symmetrical.
  // Standard P-M diagram shows +M and P.

  // Let's check safety of (Mu, Pu) against the design interaction diagram boundary.
  // We check if the coordinate (Mu, Pu) is inside the polygon formed by:
  // (0, phiPn_pureTension) -> ... -> (phiMn, phiPn) -> (0, phiPn_max)
  let currentLoadSafe = false;
  let capacityRatio = 0.0;

  // Let's compute capacityRatio using radial rays.
  // Ray from (0, 0) to (Mu, Pu) intersects the boundary (phiMn, phiPn)
  // Let's find the intersection.
  // Angle of input load point:
  const thetaLoad = Math.atan2(Pu, Mu); // Note: Mu on X axis, Pu on Y axis

  let minAngleDiff = 99999;
  let intPn = 0;
  let intMn = 0;

  // Find two adjacent points on the diagram that bracket the load angle
  for (let i = 0; i < PMPoints.length - 1; i++) {
    const pt1 = PMPoints[i];
    const pt2 = PMPoints[i + 1];

    // Design capacities
    // Apply PnMax cutoff to design values
    const p1_p = Math.min(pt1.phiPn, phiPnMax);
    const m1_p = pt1.phiMn;
    const p2_p = Math.min(pt2.phiPn, phiPnMax);
    const m2_p = pt2.phiMn;

    const theta1 = Math.atan2(p1_p, m1_p);
    const theta2 = Math.atan2(p2_p, m2_p);

    // Check if thetaLoad is between theta1 and theta2
    if ((thetaLoad >= theta1 && thetaLoad <= theta2) || (thetaLoad <= theta1 && thetaLoad >= theta2)) {
      // Intersection of line segment (m1_p, p1_p -> m2_p, p2_p) with ray (0,0 -> Mu, Pu)
      // Ray equation: y = k * x where k = Pu/Mu -> P = (Pu/Mu)*M
      // Line equation: P - p1 = (p2-p1)/(m2-m1) * (M - m1)
      // (Pu/Mu)*M = p1 + S * (M - m1) where S = (p2-p1)/(m2-m1)
      // M * (Pu/Mu - S) = p1 - S * m1
      // M = (p1 - S * m1) / (Pu/Mu - S)
      const m_slope = (m2_p - m1_p) !== 0 ? (p2_p - p1_p) / (m2_p - m1_p) : 999999;
      const k = Mu !== 0 ? Pu / Mu : 999999;

      let M_cap = 0;
      let P_cap = 0;

      if (Math.abs(k - m_slope) > 0.0001) {
        M_cap = (p1_p - m_slope * m1_p) / (k - m_slope);
        P_cap = k * M_cap;
      } else {
        M_cap = (m1_p + m2_p) / 2;
        P_cap = (p1_p + p2_p) / 2;
      }

      // Check if intersection lies on the segment (otherwise move on)
      if (M_cap >= Math.min(m1_p, m2_p) - 1 && M_cap <= Math.max(m1_p, m2_p) + 1) {
        intMn = M_cap;
        intPn = P_cap;
        break;
      }
    }
  }

  // Fallback if ray intersection wasn't found (e.g. Pure axial or near pure bending)
  if (intMn === 0 && intPn === 0) {
    if (Mu === 0) {
      intPn = Pu >= 0 ? phiPnMax : phiPn_pureTension;
      intMn = 0;
    } else {
      // Find point in PMPoints closest to Pu=0 on the design side
      const ptZeroPu = PMPoints.find(pt => Math.abs(pt.Pn) < 10) || PMPoints[Math.floor(PMPoints.length/2)];
      intPn = ptZeroPu.phiPn;
      intMn = ptZeroPu.phiMn;
    }
  }

  // Calculate capacity ratio
  const rLoad = Math.sqrt(Mu * Mu + Pu * Pu);
  const rCap = Math.sqrt(intMn * intMn + intPn * intPn);
  
  capacityRatio = rCap > 0 ? rLoad / rCap : 1.5;
  currentLoadSafe = capacityRatio <= 1.0 && Pu <= phiPnMax && Pu >= phiPn_pureTension;

  return {
    Ag,
    Ast,
    rho,
    isRatioValid,
    PnMax,
    phiPnMax,
    PMPoints,
    currentLoadSafe,
    capacityRatio
  };
}

/**
 * Footplat / Foundation Pad analysis (Analisis Footplat SNI 2847-2019)
 */
export function analyzeFootplat(input: FootplatInput): FootplatResult {
  const { B, L, H, cover, columnB, columnH, fc, fy, Pu, MuB, MuL, qAllowable } = input;

  const area = B * L;
  // Volume based self weight (concrete density = 24 kN/m3)
  const weightSelf = B * L * (H / 1000) * 24;
  
  // Total factored axial force including pile self weight
  const PuTotal = Pu + 1.2 * weightSelf;

  // Section Moduli (W) for bearing pressure calculations
  const W_B = (L * B * B) / 6; // base modulus for bending in B direction
  const W_L = (B * L * L) / 6; // base modulus for bending in L direction

  // Bearing pressure: q = Pu/A +- M_B/W_B +- M_L/W_L
  const qAxial = PuTotal / area;
  const qMomB = MuB / W_B;
  const qMomL = MuL / W_L;

  const qMax = qAxial + qMomB + qMomL;
  const qMin = Math.max(0, qAxial - qMomB - qMomL); // soil cannot take strain (tension), clip at 0
  
  const isSoilPreSafe = qMax <= qAllowable;
  const DCR_soil = qMax / qAllowable;

  // Effective depth (d)
  const d = H - cover;

  // 1. One-way shear check (Geser dua dimensi / geser balok)
  // Critical section is at distance d from the column face on both directions.
  const distCantilevL = (L - (columnH / 1000)) / 2; // meters
  const distCantilevB = (B - (columnB / 1000)) / 2; // meters

  const d_meters = d / 1000;
  
  // Determine shear plane distance
  const shearPlaneL = distCantilevL - d_meters;
  const shearPlaneB = distCantilevB - d_meters;

  let V_oneWay = 0;
  if (shearPlaneL > 0) {
    V_oneWay = Math.max(V_oneWay, qMax * B * shearPlaneL);
  }
  if (shearPlaneB > 0) {
    V_oneWay = Math.max(V_oneWay, qMax * L * shearPlaneB);
  }

  // One-way shear concrete limit phi * V_c = 0.75 * 0.17 * sqrt(f'c) * b * d
  const phiV_oneWay = 0.75 * 0.17 * Math.sqrt(fc) * (B * 1000) * d * 1e-3; // kN
  const isOneWayShearSafe = V_oneWay <= phiV_oneWay;
  const DCR_shear1 = phiV_oneWay > 0 ? V_oneWay / phiV_oneWay : 0;

  // 2. Punching Shear Check (Geser Pons вокруг колонны)
  // Critical perimeter around column at distance d/2
  const bo = 2 * (columnB + d) + 2 * (columnH + d); // mm
  const punchArea_m2 = (columnB + d) * (columnH + d) * 1e-6; // m2
  
  const V_punch = Math.max(0, Pu - qMax * punchArea_m2); // kN
  // Punching capacity: min of ACI standard formulas. Simplification: 0.33 * sqrt(fc) * bo * d
  const phiV_punch = 0.75 * 0.33 * Math.sqrt(fc) * bo * d * 1e-3; // kN
  const isPunchingSafe = V_punch <= phiV_punch;
  const DCR_shear2 = phiV_punch > 0 ? V_punch / phiV_punch : 0;

  // 3. Flexure calculation / Bending reinforcement
  // Max Cantilever moment at column face
  const Mu_designL = 0.5 * qMax * B * Math.pow(distCantilevL, 2); // kNm
  
  // Steel area math
  let As_required = 0;
  const b_width = B * 1000; // mm
  const Rn = (Mu_designL * 1e6) / (0.9 * b_width * d * d); // MPa
  
  if (Rn > 0 && Rn < 0.85 * fc) {
    const rho_req = (0.85 * fc / fy) * (1 - Math.sqrt(1 - (2 * Rn) / (0.85 * fc)));
    As_required = rho_req * b_width * d;
  } else {
    As_required = 0.0018 * b_width * H; // absolute code minimum rebar
  }

  const As_provided = Math.max(As_required, 0.0018 * b_width * H);
  const isReinforcementSafe = As_provided >= As_required;

  return {
    area,
    weightSelf,
    qMax,
    qMin,
    isSoilPreSafe,
    d,
    V_oneWay,
    phiV_oneWay,
    isOneWayShearSafe,
    bo,
    V_punch,
    phiV_punch,
    isPunchingSafe,
    Mu_designL,
    As_required,
    As_provided,
    isReinforcementSafe,
    DCR_soil,
    DCR_shear1,
    DCR_shear2
  };
}

/**
 * Bored Pile / Driven Pile capacity (Structural & Geotechnical Analisis Tiang Pancang & Bor)
 */
export function analyzePile(input: PileInput): PileResult {
  const { pileType, size, length, fc, fy, Pu, Mu, Vu, qsSkin, qpTip, rebarDiameter, rebarCount } = input;

  // 1. Geometrical properties
  let Ag = 0;
  let perimeter = 0;
  if (pileType === "circular_bored") {
    Ag = (Math.PI * Math.pow(size, 2)) / 4;
    perimeter = Math.PI * size;
  } else {
    Ag = size * size;
    perimeter = 4 * size;
  }

  const singleRebarArea = (Math.PI * Math.pow(rebarDiameter, 2)) / 4;
  const Ast = rebarCount * singleRebarArea;
  const rho = Ast / Ag;

  // 2. Geotechnical Load capacity (Aman dukung tanah)
  const areaMeters = Ag * 1e-6;
  const perimeterMeters = perimeter * 1e-3;

  // Ultimate capacity Qu = Qs + Qp
  const Q_skin = perimeterMeters * length * qsSkin; // kN
  const Q_bearing = areaMeters * qpTip; // kN
  const Q_ultimate = Q_skin + Q_bearing;
  
  // Allowable capacity with Safety Factor of 2.5
  const Q_allowable = Q_ultimate / 2.5;
  const isGeotechSafe = Pu <= Q_allowable;
  const DCR_geotech = Q_allowable > 0 ? Pu / Q_allowable : 0;

  // 3. Structural capacity (column standard reduction)
  // Concentric compression formula
  const Pn0 = (0.85 * fc * (Ag - Ast) + fy * Ast) * 1e-3; // kN
  const PnMax = 0.80 * Pn0;
  const phiPnMax = 0.65 * PnMax; // standard tied check factor
  const isAxialStructuralSafe = Pu <= phiPnMax;
  const DCR_structural = phiPnMax > 0 ? Pu / phiPnMax : 0;

  // 4. Structural shear
  const Vc = 0.17 * Math.sqrt(fc) * Ag * 1e-3; // concrete shear limit, kN
  const phiVc = 0.75 * Vc;
  const isShearStructuralSafe = Vu <= phiVc;

  return {
    Ag,
    Ast,
    rho,
    Q_skin,
    Q_bearing,
    Q_ultimate,
    Q_allowable,
    PnMax,
    phiPnMax,
    isAxialStructuralSafe,
    isGeotechSafe,
    Vc,
    phiVc,
    isShearStructuralSafe,
    DCR_geotech,
    DCR_structural
  };
}

/**
 * Pile Cap Analytical Engine
 * Configures layout, shear punching, and pile spacing verification.
 */
export function analyzePileCap(input: PileCapInput): PileCapResult {
  const { pileCount, pileSpacing, pileDiameter, capB, capL, capH, columnB, columnH, fc, fy, Pu, MuX, MuY, cover } = input;

  const d = capH - cover;

  // Geometrical pile center coordinates relative to column centroid (0,0)
  // Let's model common configuration standards:
  // We'll calculate the sum of coordinates squared (sum_x2, sum_y2) to distribute moment
  let pileCoordinates: { x: number; y: number }[] = [];
  const s = pileSpacing; // mm

  switch (pileCount) {
    case 2:
      pileCoordinates = [
        { x: -s / 2, y: 0 },
        { x: s / 2, y: 0 }
      ];
      break;
    case 3: {
      const h_tri = (s * Math.sqrt(3)) / 2;
      pileCoordinates = [
        { x: -s / 2, y: -h_tri / 3 },
        { x: s / 2, y: -h_tri / 3 },
        { x: 0, y: (2 * h_tri) / 3 }
      ];
      break;
    }
    case 4:
    default:
      pileCoordinates = [
        { x: -s / 2, y: -s / 2 },
        { x: s / 2, y: -s / 2 },
        { x: -s / 2, y: s / 2 },
        { x: s / 2, y: s / 2 }
      ];
      break;
    case 5:
      pileCoordinates = [
        { x: -s / 2, y: -s / 2 },
        { x: s / 2, y: -s / 2 },
        { x: -s / 2, y: s / 2 },
        { x: s / 2, y: s / 2 },
        { x: 0, y: 0 }
      ];
      break;
    case 6:
      pileCoordinates = [
        { x: -s / 2, y: -s },
        { x: s / 2, y: -s },
        { x: -s / 2, y: 0 },
        { x: s / 2, y: 0 },
        { x: -s / 2, y: s },
        { x: s / 2, y: s }
      ];
      break;
    case 9:
      pileCoordinates = [
        { x: -s, y: -s }, { x: 0, y: -s }, { x: s, y: -s },
        { x: -s, y: 0 },  { x: 0, y: 0 },  { x: s, y: 0 },
        { x: -s, y: s },  { x: 0, y: s },  { x: s, y: s }
      ];
      break;
  }

  // Calculate sum(x^2) and sum(y^2) in meters for pile load distribution
  let sum_x2 = 0;
  let sum_y2 = 0;
  pileCoordinates.forEach(pt => {
    sum_x2 += Math.pow(pt.x * 1e-3, 2);
    sum_y2 += Math.pow(pt.y * 1e-3, 2);
  });

  // Calculate load per pile (factored load)
  // Pi = P/n +- Mx*y/sum_y2 +- My*x/sum_x2
  let maxPileLoad = -999999;
  let minPileLoad = 999999;

  pileCoordinates.forEach(pt => {
    const xM = pt.x * 1e-3;
    const yM = pt.y * 1e-3;
    
    let load = Pu / pileCount;
    if (sum_y2 > 0) load += (MuX * yM) / sum_y2;
    if (sum_x2 > 0) load += (MuY * xM) / sum_x2;

    if (load > maxPileLoad) maxPileLoad = load;
    if (load < minPileLoad) minPileLoad = load;
  });

  // Structural compression limit per pile (assumed 1200 kN default or calculated)
  const phiPn_pileSelf = 1500; // Standard allowable support capacity in kN for typical 40cm-50cm piles
  const isPileOverloaded = maxPileLoad > phiPn_pileSelf;
  const DCR_pileLoad = phiPn_pileSelf > 0 ? maxPileLoad / phiPn_pileSelf : 0;

  // Bending moments at face of column
  // Moment caused by piles lying outside the column face plane.
  // distance column face = columnSize / 2
  const distColFaceX = (columnB / 2); // mm
  const distColFaceY = (columnH / 2); // mm

  let MuX_critical = 0;
  let MuY_critical = 0;

  pileCoordinates.forEach(pt => {
    const x_offset = Math.abs(pt.x);
    const y_offset = Math.abs(pt.y);

    const pileP = Pu / pileCount; // use average simplified load for conservative design strip

    if (x_offset > distColFaceX) {
      MuY_critical += pileP * ((x_offset - distColFaceX) * 1e-3);
    }
    if (y_offset > distColFaceY) {
      MuX_critical += pileP * ((y_offset - distColFaceY) * 1e-3);
    }
  });

  // Required Reinforcement Areas X and Y
  const capB_mm = capB * 1000;
  const capL_mm = capL * 1000;
  
  // X direction steel (using critical MuY)
  let AsX_required = 0.0018 * capB_mm * capH;
  const RnX = (MuY_critical * 1e6) / (0.9 * capB_mm * d * d);
  if (RnX > 0 && RnX < 0.85 * fc) {
    const rho = (0.85 * fc / fy) * (1 - Math.sqrt(1 - (2 * RnX) / (0.85 * fc)));
    AsX_required = Math.max(AsX_required, rho * capB_mm * d);
  }

  // Y direction steel (critical MuX)
  let AsY_required = 0.0018 * capL_mm * capH;
  const RnY = (MuX_critical * 1e6) / (0.9 * capL_mm * d * d);
  if (RnY > 0 && RnY < 0.85 * fc) {
    const rho = (0.85 * fc / fy) * (1 - Math.sqrt(1 - (2 * RnY) / (0.85 * fc)));
    AsY_required = Math.max(AsY_required, rho * capL_mm * d);
  }

  // Punching shear around column
  // Perimeter bo
  const bo_column = 2 * (columnB + d) + 2 * (columnH + d);
  const punchArea_col = (columnB + d) * (columnH + d) * 1e-6; // m2
  const Vu_punchColumn = Math.max(0, Pu - (Pu / pileCount) * (punchArea_col > 0.5 ? 1 : 0)); // simple approximation
  const phiVu_punchColumn = 0.75 * 0.33 * Math.sqrt(fc) * bo_column * d * 1e-3; // kN
  const isColumnPunchSafe = Vu_punchColumn <= phiVu_punchColumn;
  const DCR_columnPunch = phiVu_punchColumn > 0 ? Vu_punchColumn / phiVu_punchColumn : 0;

  // Punching shear around corner single pile
  const bo_pile = Math.PI * (pileDiameter + d); // circular pile perimeter
  const Vu_punchPile = maxPileLoad; // individual pile force
  const phiVu_punchPile = 0.75 * 0.33 * Math.sqrt(fc) * bo_pile * d * 1e-3; // kN
  const isPilePunchSafe = Vu_punchPile <= phiVu_punchPile;
  const DCR_pilePunch = phiVu_punchPile > 0 ? Vu_punchPile / phiVu_punchPile : 0;

  return {
    d,
    maxPileLoad,
    minPileLoad,
    phiPn_pileSelf,
    isPileOverloaded,
    MuX_critical,
    MuY_critical,
    AsX_required,
    AsY_required,
    bo_column,
    Vu_punchColumn,
    phiVu_punchColumn,
    isColumnPunchSafe,
    bo_pile,
    Vu_punchPile,
    phiVu_punchPile,
    isPilePunchSafe,
    DCR_pileLoad,
    DCR_columnPunch,
    DCR_pilePunch
  };
}

/**
 * Analytical Frame Layout Solver
 * Distributes beam span uniform loads (q) to columns, computes moments and shear, 
 * and solves demand capacity ratios (DCR) for each node (column) and edge (beam).
 */
export function analyzeFrameLayout(
  nodes: FrameNode[],
  beams: FrameBeam[]
): FrameLayoutAnalysis {
  const nodeAnalysis: Record<string, NodeAnalysisDetail> = {};
  const beamAnalysis: Record<string, BeamAnalysisDetail> = {};
  let overallStatusSafe = true;

  // Initialize node details (Pu cumulative loads)
  nodes.forEach((node) => {
    // Estimasi berat sendiri kolom (Concrete self-weight approx 24 kN/m3)
    const selfWeight = 1.2 * (node.b / 1000) * (node.h / 1000) * node.height * 24; // kN
    const PuColInitial = node.directLoad + selfWeight;

    nodeAnalysis[node.id] = {
      nodeId: node.id,
      PuTotal: PuColInitial,
      phiPn: 0,
      DCR: 0,
      isSafe: true,
    };
  });

  // Analyze Beams and Distribute tributary loads to columns
  beams.forEach((beam) => {
    const startNode = nodes.find((n) => n.id === beam.startNodeId);
    const endNode = nodes.find((n) => n.id === beam.endNodeId);

    if (!startNode || !endNode) {
      // Skip invalid beam connections
      beamAnalysis[beam.id] = {
        beamId: beam.id,
        spanLength: 0,
        Mu: 0,
        Vu: 0,
        phiMn: 0,
        phiVn: 0,
        DCR_bending: 0,
        DCR_shear: 0,
        isSafe: false,
      };
      return;
    }

    // Determine span length L in m (assuming 1 grid unit = 1.5 m for more realistic civil scale)
    const dx = startNode.gridX - endNode.gridX;
    const dy = startNode.gridY - endNode.gridY;
    const GRID_SPACING_METERS = 1.5;
    const spanLength = Math.sqrt(dx * dx + dy * dy) * GRID_SPACING_METERS;

    // Factored loads on beam (Uniform distributed load q, e.g., dead load + live load)
    const q_u = beam.uniformLoad; // kN/m

    // Bending design moment Mu = q * L^2 / 8 (approx simple beam max bending)
    const Mu = (q_u * spanLength * spanLength) / 8; // kNm
    
    // Shear force Vu = q * L / 2 (approx support shear reaction)
    const Vu = (q_u * spanLength) / 2; // kN

    // Tributary distribution of joint load to start and end columns (nodes)
    const reactionLoad = Vu; // reaction reaction of simple support = q*L/2
    if (nodeAnalysis[startNode.id]) {
      nodeAnalysis[startNode.id].PuTotal += reactionLoad;
    }
    if (nodeAnalysis[endNode.id]) {
      nodeAnalysis[endNode.id].PuTotal += reactionLoad;
    }

    // Capacity checking of BEAM
    const d = beam.h - 40; // effective depth with standard cover
    const rebarArea = (Math.PI * Math.pow(beam.rebarDiameter, 2)) / 4;
    const As = beam.rebarCount * rebarArea;

    // a = As * fy / (0.85 * fc * b)
    const a = (As * beam.fy) / (0.85 * beam.fc * beam.b);
    
    // phiMn = 0.9 * As * fy * (d - a / 2) * 1e-6 (kNm)
    const Mn = As * beam.fy * (d - a / 2) * 1e-6; // kNm
    const phiMn = 0.9 * Mn;

    // Shear Capacity: phiVn = 0.75 * (Vc + Vs)
    // Concrete shear Vc = 0.17 * sqrt(fc) * b * d * 1e-3 (kN)
    const Vc = 0.17 * Math.sqrt(beam.fc) * beam.b * d * 1e-3;

    // Stirrups shear Vs if spacing is relevant
    const stirrupArea = 2 * (Math.PI * Math.pow(beam.stirrupDiameter, 2)) / 4; // 2 stirrup legs
    const Vs = (stirrupArea * beam.fys * d / Math.max(50, beam.stirrupSpacing)) * 1e-3; // kN
    
    const phiVn = 0.75 * (Vc + Vs);

    const DCR_bending = phiMn > 0 ? Mu / phiMn : 999;
    const DCR_shear = phiVn > 0 ? Vu / phiVn : 999;

    const isSafe = DCR_bending <= 1.0 && DCR_shear <= 1.0;
    if (!isSafe) {
      overallStatusSafe = false;
    }

    beamAnalysis[beam.id] = {
      beamId: beam.id,
      spanLength,
      Mu,
      Vu,
      phiMn,
      phiVn,
      DCR_bending,
      DCR_shear,
      isSafe,
    };
  });

  // Calculate Column capacities (Axial Concentric reduction)
  nodes.forEach((node) => {
    const detail = nodeAnalysis[node.id];
    if (!detail) return;

    // Gross area Ag (mm2)
    const Ag = node.b * node.h;
    
    // Steel area Ast
    const singleRebarArea = (Math.PI * Math.pow(node.rebarDiameter, 2)) / 4;
    const Ast = node.rebarCount * singleRebarArea;

    // Concentric column formula
    // Pn0 = 0.85 * fc * (Ag - Ast) + fy * Ast
    const Pn0 = (0.85 * node.fc * (Ag - Ast) + node.fy * Ast) * 1e-3; // kN
    const PnMax = 0.80 * Pn0;
    const phiPn = 0.65 * PnMax; // Reduction for spiral or tied column

    const DCR = phiPn > 0 ? detail.PuTotal / phiPn : 999;
    const isSafe = DCR <= 1.0;

    if (!isSafe) {
      overallStatusSafe = false;
    }

    detail.phiPn = phiPn;
    detail.DCR = DCR;
    detail.isSafe = isSafe;
  });

  return {
    nodes: nodeAnalysis,
    beams: beamAnalysis,
    overallStatusSafe,
  };
}


