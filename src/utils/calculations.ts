/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BeamInput, BeamAnalysisResult, ColumnInput, ColumnAnalysisResult, PMPoint } from "../types";

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
