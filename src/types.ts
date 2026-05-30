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
