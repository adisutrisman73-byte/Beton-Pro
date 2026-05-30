/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SteelRebar {
  name: string; // e.g., "D19"
  diameter: number; // mm
  area: number; // mm^2
}

export interface BeamInput {
  b: number; // width, mm
  h: number; // height, mm
  cover: number; // concrete cover to rebar center, mm
  fc: number; // concrete strength f'c, MPa
  fy: number; // longitudinal rebar yield strength fy, MPa
  fys: number; // shear stirrup yield strength fys, MPa
  Mu: number; // ultimate moment design, kNm
  Vu: number; // ultimate shear design, kN
  rebarDiameter: number; // mm
  rebarCount: number; // number of reinforcing bars
  stirrupDiameter: number; // mm
  stirrupLegs: number; // number of legs
  stirrupSpacing: number; // mm
  isDoubleReinforced: boolean;
  compressionRebarDiameter: number; // mm
  compressionRebarCount: number; // number of compression reinforcing bars
}

export interface BeamAnalysisResult {
  d: number; // effective depth, mm
  beta1: number;
  As: number; // provided tension steel area, mm^2
  AsPrime: number; // provided compression steel area, mm^2
  rho: number; // reinforcement ratio
  rhoMin: number;
  rhoMax: number;
  rhoBalanced: number;
  neutralAxisC: number; // mm
  concreteStrainEt: number; // strain in tension steel
  phiBending: number; // strength reduction factor
  Mn: number; // nominal moment capacity, kNm
  phiMn: number; // design moment capacity, kNm
  isSafeBending: boolean;
  isOverReinforced: boolean;
  
  // Shear results
  Vc: number; // concrete shear capacity, kN
  Vs: number; // steel shear capacity, kN
  Vn: number; // nominal shear capacity, kN
  phiVn: number; // design shear capacity, kN
  isSafeShear: boolean;
  requiredStirrupSpacing?: number; // theoretically required spacing in mm
  shearStatusMessage: string;
}

export interface ColumnInput {
  b: number; // width, mm
  h: number; // depth, mm
  cover: number; // steel center cover, mm
  fc: number; // concrete strength f'c, MPa
  fy: number; // steel strength fy, MPa
  Pu: number; // ultimate axial design, kN
  Mu: number; // ultimate moment design, kNm
  rebarDiameter: number; // mm
  rebarRows: {
    depth: number; // distance from top fiber, mm
    count: number; // number of bars in this row
  }[];
}

export interface PMPoint {
  Pn: number; // Nominal Axial strength, kN
  Mn: number; // Nominal Bending strength, kNm
  phiPn: number; // Design Axial strength, kN
  phiMn: number; // Design Bending strength, kNm
  c: number; // neutral axis depth, mm
  type: string; // description (e.g., "Compression Control", "Balance Point", "Tension Control")
  phi: number; // phi factor
}

export interface ColumnAnalysisResult {
  Ag: number; // gross area, mm^2
  Ast: number; // total steel area, mm^2
  rho: number; // reinforcement ratio, (Ast/Ag)
  isRatioValid: boolean; // SNI states 1% to 8% (usually 1-4% in practice)
  PnMax: number; // maximum nominal concentric axial capacity, kN
  phiPnMax: number; // maximum design compressive strength, kN
  PMPoints: PMPoint[];
  currentLoadSafe: boolean;
  capacityRatio: number; // combined stress ratio
}

// === NEW FOUNDATION ANALYTICS ===

export interface FootplatInput {
  B: number; // foundation width, m
  L: number; // foundation length, m
  H: number; // slab thickness, mm
  cover: number; // concrete cover, mm
  columnB: number; // column width in B direction, mm
  columnH: number; // column depth in L direction, mm
  fc: number; // concrete strength, MPa
  fy: number; // steel strength, MPa
  Pu: number; // factored axial load from column, kN
  MuB: number; // factored moment in B direction, kNm
  MuL: number; // factored moment in L direction, kNm
  qAllowable: number; // allowable bearing capacity of soil, kPa/ksf
}

export interface FootplatResult {
  area: number; // m^2
  weightSelf: number; // kN (approximate based on foundation volume)
  qMax: number; // kPa
  qMin: number; // kPa
  isSoilPreSafe: boolean;
  
  // Shear
  d: number; // effective depth, mm
  V_oneWay: number; // shear demand at d, kN
  phiV_oneWay: number; // design shear capacity, kN
  isOneWayShearSafe: boolean;
  
  // Two-way Punching Shear around Column
  bo: number; // punching perimeter, mm
  V_punch: number; // punching shear demand, kN
  phiV_punch: number; // punching shear design capacity, kN
  isPunchingSafe: boolean;
  
  // Flexure
  Mu_designL: number; // design bending moment inside, kNm
  As_required: number; // calculated As required, mm^2
  As_provided: number; // provided nominal minimum reinforcement or calculated As, mm^2
  isReinforcementSafe: boolean;
  DCR_soil: number;
  DCR_shear1: number;
  DCR_shear2: number;
}

export interface PileInput {
  pileType: "circular_bored" | "square_pancang";
  size: number; // diameter (circular) or side width (square), mm
  length: number; // overall embedded depth, m
  fc: number; // concrete strength f'c, MPa
  fy: number; // longitudinal rebar strength fy, MPa
  Pu: number; // factored design axial compression load, kN
  Mu: number; // factored moment, kNm
  Vu: number; // factored shear, kN
  qsSkin: number; // allowable uniform skin friction, kPa
  qpTip: number; // allowable tip end bearing, kPa
  rebarDiameter: number; // longitudinal rebar size
  rebarCount: number; // rebar count
}

export interface PileResult {
  Ag: number; // gross pile area, mm^2
  Ast: number; // steel area, mm^2
  rho: number; // steel ratio
  Q_skin: number; // ultimate skin friction capacity, kN
  Q_bearing: number; // ultimate end bearing capacity, kN
  Q_ultimate: number; // total ultimate geotechnical axial capacity, kN
  Q_allowable: number; // allowable service loads capacity, kN
  
  // Structural Strength (Axial Column Analogy)
  PnMax: number; // max structural capacity, kN
  phiPnMax: number; // design structural capacity, kN
  isAxialStructuralSafe: boolean;
  
  // Geotechnical check
  isGeotechSafe: boolean;
  
  // Shear strength
  Vc: number; // concrete shear capacity, kN
  phiVc: number; // design concrete shear capacity, kN
  isShearStructuralSafe: boolean;
  
  DCR_geotech: number;
  DCR_structural: number;
}

export interface PileCapInput {
  pileCount: number; // e.g. 2, 3, 4, 5, 6, 9 pile group
  pileSpacing: number; // spacing between pile centers, mm
  pileDiameter: number; // individual pile diameter, mm
  capB: number; // cap layout width, m
  capL: number; // cap layout length, m
  capH: number; // cap thickness, mm
  columnB: number; // column size x, mm
  columnH: number; // column size y, mm
  fc: number; // concrete strength fc, MPa
  fy: number; // rebar strength fy, MPa
  Pu: number; // column axial load, kN
  MuX: number; // column moment x, kNm
  MuY: number; // column moment y, kNm
  cover: number; // concrete cover, mm
}

export interface PileCapResult {
  d: number; // effective depth, mm
  maxPileLoad: number; // critical load in individual pile, kN
  minPileLoad: number; // minimum load, kN
  phiPn_pileSelf: number; // capacity limit support, kN
  isPileOverloaded: boolean;
  
  // Bending Moment
  MuX_critical: number; // Critical design moment x-axis, kNm
  MuY_critical: number; // Critical design moment y-axis, kNm
  AsX_required: number; // required steel X, mm^2
  AsY_required: number; // required steel Y, mm^2
  
  // Punching shear around column
  bo_column: number; // perimeter, mm
  Vu_punchColumn: number; // demand, kN
  phiVu_punchColumn: number; // capacity, kN
  isColumnPunchSafe: boolean;

  // Punching shear around individual corner pile
  bo_pile: number;
  Vu_punchPile: number;
  phiVu_punchPile: number;
  isPilePunchSafe: boolean;
  
  DCR_pileLoad: number;
  DCR_columnPunch: number;
  DCR_pilePunch: number;
}

