/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  analyzeFootplat, 
  analyzePile, 
  analyzePileCap, 
  STANDARD_BAR_DIAMETERS 
} from "../utils/calculations";
import { 
  FootplatInput, 
  FootplatResult, 
  PileInput, 
  PileResult, 
  PileCapInput, 
  PileCapResult 
} from "../types";
import { 
  Info, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Sliders, 
  Layers, 
  Activity, 
  CircleDot, 
  Compass, 
  Database 
} from "lucide-react";
import AiAdvisor from "./AiAdvisor";

type SubTab = "footplat" | "pile" | "pilecap";

export default function FoundationCalculator() {
  const [subTab, setSubTab] = useState<SubTab>("footplat");

  // ==========================================
  // A. FOOTPLAT STATE & LOGIC
  // ==========================================
  const [footB, setFootB] = useState<string | number>(1.5); // meter
  const [footL, setFootL] = useState<string | number>(1.5); // meter
  const [footH, setFootH] = useState<string | number>(350); // mm
  const [footCover, setFootCover] = useState<string | number>(50); // mm
  const [footColB, setFootColB] = useState<string | number>(300); // mm
  const [footColH, setFootColH] = useState<string | number>(300); // mm
  const [footFc, setFootFc] = useState<string | number>(25); // MPa
  const [footFy, setFootFy] = useState<string | number>(420); // MPa
  const [footPu, setFootPu] = useState<string | number>(350); // kN
  const [footMuB, setFootMuB] = useState<string | number>(25); // kNm
  const [footMuL, setFootMuL] = useState<string | number>(25); // kNm
  const [footQAllow, setFootQAllow] = useState<string | number>(180); // kPa / kPa
  const [footResult, setFootResult] = useState<FootplatResult | null>(null);

  useEffect(() => {
    const input: FootplatInput = {
      B: Math.max(0.1, parseFloat(footB as string) || 1.5),
      L: Math.max(0.1, parseFloat(footL as string) || 1.5),
      H: Math.max(50, parseFloat(footH as string) || 350),
      cover: Math.max(10, parseFloat(footCover as string) || 50),
      columnB: Math.max(50, parseFloat(footColB as string) || 300),
      columnH: Math.max(50, parseFloat(footColH as string) || 300),
      fc: Math.max(5, parseFloat(footFc as string) || 25),
      fy: Math.max(100, parseFloat(footFy as string) || 420),
      Pu: parseFloat(footPu as string) || 0,
      MuB: parseFloat(footMuB as string) || 0,
      MuL: parseFloat(footMuL as string) || 0,
      qAllowable: Math.max(10, parseFloat(footQAllow as string) || 180)
    };
    setFootResult(analyzeFootplat(input));
  }, [footB, footL, footH, footCover, footColB, footColH, footFc, footFy, footPu, footMuB, footMuL, footQAllow]);

  // ==========================================
  // B. PILE STATE & LOGIC
  // ==========================================
  const [pileType, setPileType] = useState<"circular_bored" | "square_pancang">("circular_bored");
  const [pileSize, setPileSize] = useState<string | number>(400); // mm
  const [pileLength, setPileLength] = useState<string | number>(12); // meter
  const [pileFc, setPileFc] = useState<string | number>(30); // MPa
  const [pileFy, setPileFy] = useState<string | number>(420); // MPa
  const [pilePu, setPilePu] = useState<string | number>(450); // kN
  const [pileMu, setPileMu] = useState<string | number>(40); // kNm
  const [pileVu, setPileVu] = useState<string | number>(20); // kN
  const [pileQs, setPileQs] = useState<string | number>(25); // kPa (Skin Friction)
  const [pileQp, setPileQp] = useState<string | number>(3500); // kPa (End Bearing)
  const [pileRebarDiameter, setPileRebarDiameter] = useState<number>(16); // mm
  const [pileRebarCount, setPileRebarCount] = useState<string | number>(6);
  const [pileResult, setPileResult] = useState<PileResult | null>(null);

  useEffect(() => {
    const input: PileInput = {
      pileType,
      size: Math.max(50, parseFloat(pileSize as string) || 400),
      length: Math.max(0.5, parseFloat(pileLength as string) || 12),
      fc: Math.max(5, parseFloat(pileFc as string) || 30),
      fy: Math.max(100, parseFloat(pileFy as string) || 420),
      Pu: parseFloat(pilePu as string) || 0,
      Mu: parseFloat(pileMu as string) || 0,
      Vu: parseFloat(pileVu as string) || 0,
      qsSkin: parseFloat(pileQs as string) || 0,
      qpTip: parseFloat(pileQp as string) || 0,
      rebarDiameter: pileRebarDiameter,
      rebarCount: Math.max(4, parseInt(pileRebarCount as string) || 6)
    };
    setPileResult(analyzePile(input));
  }, [pileType, pileSize, pileLength, pileFc, pileFy, pilePu, pileMu, pileVu, pileQs, pileQp, pileRebarDiameter, pileRebarCount]);

  // ==========================================
  // C. PILE CAP STATE & LOGIC
  // ==========================================
  const [capPiles, setCapPiles] = useState<number>(4); // Group size
  const [capSpacing, setCapSpacing] = useState<string | number>(1200); // mm (typically 3D)
  const [capPileDiam, setCapPileDiam] = useState<string | number>(400); // mm
  const [capB, setCapB] = useState<string | number>(1.8); // meter
  const [capL, setCapL] = useState<string | number>(1.8); // meter
  const [capH, setCapH] = useState<string | number>(750); // mm
  const [capColB, setCapColB] = useState<string | number>(400); // mm
  const [capColH, setCapColH] = useState<string | number>(400); // mm
  const [capFc, setCapFc] = useState<string | number>(30); // MPa
  const [capFy, setCapFy] = useState<string | number>(420); // MPa
  const [capPu, setCapPu] = useState<string | number>(1200); // kN
  const [capMuX, setCapMuX] = useState<string | number>(80); // kNm
  const [capMuY, setCapMuY] = useState<string | number>(50); // kNm
  const [capCover, setCapCover] = useState<string | number>(75); // mm
  const [capResult, setCapResult] = useState<PileCapResult | null>(null);

  useEffect(() => {
    const input: PileCapInput = {
      pileCount: capPiles,
      pileSpacing: Math.max(100, parseFloat(capSpacing as string) || 1200),
      pileDiameter: Math.max(50, parseFloat(capPileDiam as string) || 400),
      capB: Math.max(0.1, parseFloat(capB as string) || 1.8),
      capL: Math.max(0.2, parseFloat(capL as string) || 1.8),
      capH: Math.max(100, parseFloat(capH as string) || 750),
      columnB: Math.max(50, parseFloat(capColB as string) || 400),
      columnH: Math.max(50, parseFloat(capColH as string) || 400),
      fc: Math.max(5, parseFloat(capFc as string) || 30),
      fy: Math.max(100, parseFloat(capFy as string) || 420),
      Pu: parseFloat(capPu as string) || 0,
      MuX: parseFloat(capMuX as string) || 0,
      MuY: parseFloat(capMuY as string) || 0,
      cover: Math.max(10, parseFloat(capCover as string) || 75)
    };
    setCapResult(analyzePileCap(input));
  }, [capPiles, capSpacing, capPileDiam, capB, capL, capH, capColB, capColH, capFc, capFy, capPu, capMuX, capMuY, capCover]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* SECONDARY FOUNDATION TAB SELECTOR */}
      <div className="flex bg-[#0b0f1a] border border-slate-800 rounded-xl p-1 select-none">
        <button
          onClick={() => setSubTab("footplat")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition outline-none cursor-pointer ${
            subTab === "footplat"
              ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Pondasi Telapak (Footplat)
        </button>
        <button
          onClick={() => setSubTab("pile")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition outline-none cursor-pointer ${
            subTab === "pile"
              ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <CircleDot className="h-3.5 w-3.5" />
          Bored Pile / Tiang Pancang
        </button>
        <button
          onClick={() => setSubTab("pilecap")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition outline-none cursor-pointer ${
            subTab === "pilecap"
              ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          Tutup Tiang Group (Pile Cap)
        </button>
      </div>

      {/* ========================================================
          SUB-TAB 1: FOOTPLAT CALCULATOR
          ======================================================== */}
      {subTab === "footplat" && footResult && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in select-text">
          {/* Left Inputs */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-850">
                <Sliders className="h-4 w-4 text-blue-400" />
                Dimensi & Tanah (Footplat)
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Lebar B (m)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={footB}
                    onChange={(e) => setFootB(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Panjang L (m)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={footL}
                    onChange={(e) => setFootL(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Tebal H (mm)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={footH}
                    onChange={(e) => setFootH(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Cover d' (mm)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={footCover}
                    onChange={(e) => setFootCover(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Daya Dukung Tanah q_all (kPa)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={footQAllow}
                    onChange={(e) => setFootQAllow(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 border-yellow-500/30 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    f'c Beton (MPa)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={footFc}
                    onChange={(e) => setFootFc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-lg space-y-3">
                <span className="text-xs font-bold text-slate-300 block">Kolom Pedestal Terkoneksi</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400">Lebar c_x (mm)</label>
                    <input
                      type="number"
                      step="any"
                      value={footColB}
                      onChange={(e) => setFootColB(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 text-xs py-1 text-slate-200 font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Panjang c_y (mm)</label>
                    <input
                      type="number"
                      step="any"
                      value={footColH}
                      onChange={(e) => setFootColH(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 text-xs py-1 text-slate-200 font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-lg space-y-3">
                <span className="text-xs font-bold text-slate-300 block">Gaya Reaksi Ultimate (Kolom)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400">Pu (kN)</label>
                    <input
                      type="number"
                      step="any"
                      value={footPu}
                      onChange={(e) => setFootPu(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 text-xs py-1 text-slate-200 font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Mu_B (kNm)</label>
                    <input
                      type="number"
                      step="any"
                      value={footMuB}
                      onChange={(e) => setFootMuB(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 text-xs py-1 text-slate-200 font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Mu_L (kNm)</label>
                    <input
                      type="number"
                      step="any"
                      value={footMuL}
                      onChange={(e) => setFootMuL(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 text-xs py-1 text-slate-200 font-mono outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Output details & SVGs */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* CAPACITY SNAPSHOT SUMMARY */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Inspeksi Keamanan Pondasi Telapak</span>
                <h4 className="text-xs text-white max-w-sm mt-0.5 font-mono">
                  Slab telapak: <span className="text-blue-400">{footB}x{footL} m</span> | Tebal: <span className="text-blue-400">{footH} mm</span>
                </h4>
              </div>

              <div className="flex gap-2">
                <div className="bg-slate-950 border border-slate-800 rounded px-3 py-1 text-center w-20">
                  <span className="text-[8px] text-slate-400 block font-mono">DCR Tanah</span>
                  <span className={`text-[13px] font-black font-mono ${footResult.isSoilPreSafe ? "text-emerald-400" : "text-rose-400"}`}>
                    {footResult.DCR_soil.toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded px-3 py-1 text-center w-20">
                  <span className="text-[8px] text-slate-400 block font-mono">Geser Balok</span>
                  <span className={`text-[13px] font-black font-mono ${footResult.isOneWayShearSafe ? "text-emerald-400" : "text-rose-400"}`}>
                    {footResult.DCR_shear1.toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded px-3 py-1 text-center w-20">
                  <span className="text-[8px] text-slate-400 block font-mono">Geser Pons</span>
                  <span className={`text-[13px] font-black font-mono ${footResult.isPunchingSafe ? "text-emerald-400" : "text-rose-400"}`}>
                    {footResult.DCR_shear2.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Visual footprint sketch */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-slate-850 pb-2">
                Tata Letak Telapak Telapak & Kolom Pedestal (Top View)
              </h4>

              <div className="flex flex-col md:flex-row items-center justify-center gap-6 py-4 bg-slate-950/40 rounded-lg border border-slate-800 border-dashed">
                <svg width="180" height="180" viewBox="-10 -10 120 120" className="overflow-visible">
                  {/* Soil pressure boundaries */}
                  <rect x="0" y="0" width="100" height="100" className="fill-slate-850 stroke-slate-700" strokeWidth="2" />
                  
                  {/* Bending reinforcement lines */}
                  <line x1="10" y1="5" x2="10" y2="95" className="stroke-slate-600/30" strokeWidth="0.8" />
                  <line x1="25" y1="5" x2="25" y2="95" className="stroke-slate-600/30" strokeWidth="0.8" />
                  <line x1="40" y1="5" x2="40" y2="95" className="stroke-slate-600/30" strokeWidth="0.8" />
                  <line x1="55" y1="5" x2="55" y2="95" className="stroke-slate-600/30" strokeWidth="0.8" />
                  <line x1="70" y1="5" x2="70" y2="95" className="stroke-slate-600/30" strokeWidth="0.8" />
                  <line x1="85" y1="5" x2="85" y2="95" className="stroke-slate-600/30" strokeWidth="0.8" />

                  <line x1="5" y1="10" x2="95" y2="10" className="stroke-slate-600/30" strokeWidth="0.8" />
                  <line x1="5" y1="25" x2="95" y2="25" className="stroke-slate-600/30" strokeWidth="0.8" />
                  <line x1="5" y1="40" x2="95" y2="40" className="stroke-slate-600/30" strokeWidth="0.8" />
                  <line x1="5" y1="55" x2="95" y2="55" className="stroke-slate-600/30" strokeWidth="0.8" />
                  <line x1="5" y1="70" x2="95" y2="70" className="stroke-slate-600/30" strokeWidth="0.8" />
                  <line x1="5" y1="85" x2="95" y2="85" className="stroke-slate-100/10" strokeWidth="0.8" />

                  {/* Punching perimeter dashed box d/2 */}
                  <rect x="35" y="35" width="30" height="30" className="fill-none stroke-blue-500/80" strokeDasharray="3" strokeWidth="1" />

                  {/* Center Column pedestal */}
                  <rect x="40" y="40" width="20" height="20" className="fill-slate-700 stroke-slate-500" strokeWidth="1.5" />

                  {/* Dimension text tags */}
                  <text x="50" y="-4" textAnchor="middle" className="text-[7.5px] fill-slate-400 font-mono">B = {footB} m</text>
                  <text x="-5" y="50" textAnchor="middle" transform="rotate(-90 -5 50)" className="text-[7.5px] fill-slate-400 font-mono">L = {footL} m</text>
                  <text x="50" y="52" textAnchor="middle" className="text-[6.5px] fill-white font-mono font-bold">Kolom</text>
                </svg>

                <div className="flex-1 space-y-2 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rincian Hasil Analisis:</span>
                  <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800 font-mono">
                    <div>
                      <span className="text-slate-450 block text-[9px]">Tegangan Kont. Maks:</span>
                      <span className={`font-bold ${footResult.isSoilPreSafe ? "text-emerald-400" : "text-rose-400"}`}>{footResult.qMax.toFixed(1)} kPa</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block text-[9px]">Tegangan Kontak Min:</span>
                      <span className="text-slate-250">{footResult.qMin.toFixed(1)} kPa</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block text-[9px]">Geser Pons Cap:</span>
                      <span className="text-slate-200">{footResult.phiV_punch.toFixed(1)} kN</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block text-[9px]">Beban Pons Kolom:</span>
                      <span className="text-indigo-400 font-bold">{footResult.V_punch.toFixed(1)} kN</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block text-[9px]">As Min Lentur Baja:</span>
                      <span className="text-blue-400 font-bold">{Math.round(footResult.As_provided)} mm²</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block text-[9px]">Status Tanah:</span>
                      <span className={`font-bold ${footResult.isSoilPreSafe ? "text-emerald-400" : "text-rose-455"}`}>
                        {footResult.isSoilPreSafe ? "Aman" : "Gagal / Kurang Lebar"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* AI ADVISOR BINDINGS */}
            <AiAdvisor 
              type="footplat" 
              input={{
                B: footB,
                L: footL,
                H: footH,
                cover: footCover,
                columnB: footColB,
                columnH: footColH,
                fc: footFc,
                fy: footFy,
                Pu: footPu,
                MuB: footMuB,
                MuL: footMuL,
                qAllowable: footQAllow
              } as any}
              result={footResult as any}
            />

          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB 2: BORED PILE & DRIVEN PILE
          ======================================================== */}
      {subTab === "pile" && pileResult && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in select-text">
          {/* Left inputs */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              
              <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-405" />
                  Konfigurasi Tiang Dalam
                </h3>
                
                <select
                  value={pileType}
                  onChange={(e) => setPileType(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10.5px] font-bold text-slate-300 outline-none cursor-pointer"
                >
                  <option value="circular_bored">Bored Pile (Bulat)</option>
                  <option value="square_pancang">Tiang Pancang (Kotak)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    {pileType === "circular_bored" ? "Diameter Tiang D (mm)" : "Sisi Tiang W (mm)"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={pileSize}
                    onChange={(e) => setPileSize(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Kedalaman Tiang L (m)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={pileLength}
                    onChange={(e) => setPileLength(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Skin Friction q_s (kPa)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={pileQs}
                    onChange={(e) => setPileQs(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Tip End Bear q_p (kPa)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={pileQp}
                    onChange={(e) => setPileQp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    f'c Beton (MPa)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={pileFc}
                    onChange={(e) => setPileFc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    fy Baja Utama (MPa)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={pileFy}
                    onChange={(e) => setPileFy(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-lg space-y-3">
                <span className="text-xs font-bold text-slate-300 block">Tulangan Longitudinal Tiang</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400">Diameter Rebar</label>
                    <select
                      value={pileRebarDiameter}
                      onChange={(e) => setPileRebarDiameter(parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 text-xs py-1 text-slate-200 font-mono outline-none"
                    >
                      {STANDARD_BAR_DIAMETERS.map(d => (
                        <option key={d} value={d}>D{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Jumlah Besi (n)</label>
                    <input
                      type="number"
                      step="any"
                      value={pileRebarCount}
                      onChange={(e) => setPileRebarCount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 text-xs py-1 text-slate-200 font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-lg space-y-3">
                <span className="text-xs font-bold text-slate-300 block">Beban Gaya Pada Kepala Tiang</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400">Gaya Aksial Pu(kN)</label>
                    <input
                      type="number"
                      step="any"
                      value={pilePu}
                      onChange={(e) => setPilePu(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 text-xs py-1 text-slate-200 font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Momen Mu(kNm)</label>
                    <input
                      type="number"
                      step="any"
                      value={pileMu}
                      onChange={(e) => setPileMu(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 text-xs py-1 text-slate-200 font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Geser Vu(kN)</label>
                    <input
                      type="number"
                      step="any"
                      value={pileVu}
                      onChange={(e) => setPileVu(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 text-xs py-1 text-slate-200 font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right output */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* STABILITY CAPACITY SNAPSHOT */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Inspeksi Keamanan Tiang Tunggal</span>
                <h4 className="text-xs text-white max-w-sm mt-0.5 font-mono">
                  {pileType === "circular_bored" ? "Bored Pile" : "Tiang Pancang"}: <span className="text-blue-400">size {pileSize} mm</span> | L: <span className="text-blue-400">{pileLength} m</span>
                </h4>
              </div>

              <div className="flex gap-2">
                <div className="bg-slate-950 border border-slate-800 rounded px-3 py-1 text-center w-24">
                  <span className="text-[8px] text-slate-400 block font-mono">DCR Geoteknik</span>
                  <span className={`text-[13px] font-black font-mono ${pileResult.isGeotechSafe ? "text-emerald-400" : "text-rose-400"}`}>
                    {pileResult.DCR_geotech.toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded px-3 py-1 text-center w-24">
                  <span className="text-[8px] text-slate-400 block font-mono">DCR Struktur</span>
                  <span className={`text-[13px] font-black font-mono ${pileResult.isAxialStructuralSafe ? "text-emerald-400" : "text-rose-400"}`}>
                    {pileResult.DCR_structural.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Pile Details Grid & Drawing */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-slate-850 pb-2">
                Tata Susunan Penampang Tiang Dalam (Cross Section)
              </h4>

              <div className="flex flex-col md:flex-row items-center justify-center gap-6 py-4 bg-slate-950/40 rounded-lg border border-slate-800 border-dashed">
                <svg width="180" height="180" viewBox="-10 -10 120 120" className="overflow-visible">
                  {/* Outer Circular Bored Pile or Square Pile */}
                  {pileType === "circular_bored" ? (
                    <circle cx="50" cy="50" r="45" className="fill-slate-850 stroke-slate-700" strokeWidth="2.5" />
                  ) : (
                    <rect x="5" y="5" width="90" height="90" rx="3" className="fill-slate-850 stroke-slate-700" strokeWidth="2.5" />
                  )}

                  {/* Rebars distribution */}
                  {Array.from({ length: Math.min(16, pileRebarCount) }).map((_, i) => {
                    const radius = pileType === "circular_bored" ? 34 : 34;
                    const angle = (i * 2 * Math.PI) / Math.min(16, pileRebarCount);
                    const cx = 50 + radius * Math.cos(angle);
                    const cy = 50 + radius * Math.sin(angle);
                    return (
                      <circle 
                        key={`pile-rebar-${i}`}
                        cx={cx} 
                        cy={cy} 
                        r="3.5" 
                        className="fill-cyan-500 stroke-cyan-100" 
                        strokeWidth="0.8" 
                      />
                    );
                  })}

                  {/* Helical Spiral Inner Ring Line */}
                  {pileType === "circular_bored" ? (
                    <circle cx="50" cy="50" r="34" className="fill-none stroke-slate-650" strokeWidth="1" />
                  ) : (
                    <rect x="16" y="16" width="68" height="68" className="fill-none stroke-slate-650" strokeWidth="1" />
                  )}

                  <text x="50" y="52" textAnchor="middle" className="text-[7.5px] fill-slate-300 font-mono font-bold">
                    {pileSize} mm
                  </text>
                </svg>

                <div className="flex-1 space-y-2 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kapasitas Geoteknis & Struktur:</span>
                  <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800 font-mono">
                    <div>
                      <span className="text-slate-450 block text-[9px]">Dukung Selimut Q_skin:</span>
                      <span className="text-slate-200 font-bold">{Math.round(pileResult.Q_skin)} kN</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block text-[9px]">Tahanan Ujung Q_bearing:</span>
                      <span className="text-slate-200 font-bold">{Math.round(pileResult.Q_bearing)} kN</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block text-[9px]">Total Q_Allowable SF=2.5:</span>
                      <span className="text-emerald-400 font-bold">{Math.round(pileResult.Q_allowable)} kN</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block text-[9px]">Beban Maksimum Utama:</span>
                      <span className="text-indigo-400 font-bold">{pilePu} kN</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block text-[9px]">Kapasitas Aksial φPn:</span>
                      <span className="text-blue-400 font-bold">{Math.round(pileResult.phiPnMax)} kN</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block text-[9px]">Rasio Baja Tulangan:</span>
                      <span className="text-slate-250">{(pileResult.rho * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI ADVISOR BINDINGS */}
            <AiAdvisor 
              type="pile" 
              input={{
                pileType,
                size: pileSize,
                length: pileLength,
                fc: pileFc,
                fy: pileFy,
                Pu: pilePu,
                Mu: pileMu,
                Vu: pileVu,
                qsSkin: pileQs,
                qpTip: pileQp,
                rebarDiameter: pileRebarDiameter,
                rebarCount: pileRebarCount
              } as any}
              result={pileResult as any}
            />

          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB 3: PILE CAP GROUP
          ======================================================== */}
      {subTab === "pilecap" && capResult && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in select-text">
          {/* Left inputs */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-850">
                <Database className="h-4 w-4 text-blue-400" />
                Parameter Group & Cap
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Jumlah Tiang (Pile Count)
                  </label>
                  <select
                    value={capPiles}
                    onChange={(e) => setCapPiles(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono outline-none cursor-pointer"
                  >
                    <option value={2}>2 Tiang</option>
                    <option value={3}>3 Tiang (Segitiga)</option>
                    <option value={4}>4 Tiang (Grid Bujur)</option>
                    <option value={5}>5 Tiang (Symmetrical)</option>
                    <option value={6}>6 Tiang (Grid Persegi)</option>
                    <option value={9}>9 Tiang (3x3 Grid)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Jarak Antar As s (mm)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={capSpacing}
                    onChange={(e) => setCapSpacing(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Lebar Cap B (m)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={capB}
                    onChange={(e) => setCapB(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Panjang Cap L (m)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={capL}
                    onChange={(e) => setCapL(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Tebal Pile Cap H (mm)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={capH}
                    onChange={(e) => setCapH(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    f'c Beton Cap (MPa)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={capFc}
                    onChange={(e) => setCapFc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-lg space-y-3">
                <span className="text-xs font-bold text-slate-300 block">Tiang Pancang yang Digunakan</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400">Diameter Tiang (mm)</label>
                    <input
                      type="number"
                      step="any"
                      value={capPileDiam}
                      onChange={(e) => setCapPileDiam(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 text-xs py-1 text-slate-200 font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Selimut d' (Cover)</label>
                    <input
                      type="number"
                      step="any"
                      value={capCover}
                      onChange={(e) => setCapCover(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 text-xs py-1 text-slate-200 font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-lg space-y-3">
                <span className="text-xs font-bold text-slate-300 block">Beban Kerja Kolom Kolom (Ultimate)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400">Pu (kN)</label>
                    <input
                      type="number"
                      step="any"
                      value={capPu}
                      onChange={(e) => setCapPu(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 text-xs py-1 text-slate-200 font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Mu_X (kNm)</label>
                    <input
                      type="number"
                      step="any"
                      value={capMuX}
                      onChange={(e) => setCapMuX(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 text-xs py-1 text-slate-200 font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Mu_Y (kNm)</label>
                    <input
                      type="number"
                      step="any"
                      value={capMuY}
                      onChange={(e) => setCapMuY(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 text-xs py-1 text-slate-200 font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right output */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* STABILITY CAP METRIC RANGES */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Inspeksi Keandalan Tutup Tiang Group</span>
                <h4 className="text-xs text-white max-w-sm mt-0.5 font-mono">
                  Pile Cap: <span className="text-blue-400">{capB}x{capL} m</span> | Tebal: <span className="text-blue-400">{capH} mm</span>
                </h4>
              </div>

              <div className="flex gap-2">
                <div className="bg-slate-950 border border-slate-800 rounded px-3 py-1 text-center w-20">
                  <span className="text-[8px] text-slate-400 block font-mono">DCR Tiang</span>
                  <span className={`text-[13px] font-black font-mono ${!capResult.isPileOverloaded ? "text-emerald-400" : "text-rose-400"}`}>
                    {capResult.DCR_pileLoad.toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded px-3 py-1 text-center w-20">
                  <span className="text-[8px] text-slate-400 block font-mono">Pons Kolom</span>
                  <span className={`text-[13px] font-black font-mono ${capResult.isColumnPunchSafe ? "text-emerald-400" : "text-rose-400"}`}>
                    {capResult.DCR_columnPunch.toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded px-3 py-1 text-center w-20">
                  <span className="text-[8px] text-slate-400 block font-mono">Pons Tiang</span>
                  <span className={`text-[13px] font-black font-mono ${capResult.isPilePunchSafe ? "text-emerald-400" : "text-rose-400"}`}>
                    {capResult.DCR_pilePunch.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Layout drawing */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-slate-850 pb-2">
                Konfigurasi Tiang & Pile Cap Layout (Top View)
              </h4>

              <div className="flex flex-col md:flex-row items-center justify-center gap-6 py-4 bg-slate-950/40 rounded-lg border border-slate-800 border-dashed">
                <svg width="180" height="180" viewBox="-10 -10 120 120" className="overflow-visible">
                  {/* Outer Cap border rectangle */}
                  <rect x="0" y="0" width="100" height="100" className="fill-slate-850 stroke-slate-700" strokeWidth="2.2" />

                  {/* Draw column pedestal */}
                  <rect x="38" y="38" width="24" height="24" className="fill-slate-750 stroke-slate-550" strokeWidth="1.5" />

                  {/* Symmetrical pile coordinates representations */}
                  {capPiles === 2 && (
                    <>
                      <circle cx="20" cy="50" r="10" className="fill-blue-600/30 stroke-blue-500" strokeWidth="1" />
                      <circle cx="80" cy="50" r="10" className="fill-blue-600/30 stroke-blue-500" strokeWidth="1" />
                    </>
                  )}
                  {capPiles === 3 && (
                    <>
                      <circle cx="20" cy="75" r="10" className="fill-blue-600/30 stroke-blue-500" strokeWidth="1" />
                      <circle cx="80" cy="75" r="10" className="fill-blue-600/30 stroke-blue-500" strokeWidth="1" />
                      <circle cx="50" cy="25" r="10" className="fill-blue-600/30 stroke-blue-500" strokeWidth="1" />
                    </>
                  )}
                  {capPiles === 4 && (
                    <>
                      <circle cx="20" cy="20" r="10" className="fill-blue-600/30 stroke-blue-500" strokeWidth="1" />
                      <circle cx="80" cy="20" r="10" className="fill-blue-600/30 stroke-blue-500" strokeWidth="1" />
                      <circle cx="20" cy="80" r="10" className="fill-blue-600/30 stroke-blue-500" strokeWidth="1" />
                      <circle cx="80" cy="80" r="10" className="fill-blue-600/30 stroke-blue-500" strokeWidth="1" />
                    </>
                  )}
                  {capPiles === 5 && (
                    <>
                      <circle cx="20" cy="20" r="9" className="fill-blue-600/30 stroke-blue-500" strokeWidth="1" />
                      <circle cx="80" cy="20" r="9" className="fill-blue-600/30 stroke-blue-500" strokeWidth="1" />
                      <circle cx="20" cy="80" r="9" className="fill-blue-600/30 stroke-blue-500" strokeWidth="1" />
                      <circle cx="80" cy="80" r="9" className="fill-blue-600/30 stroke-blue-500" strokeWidth="1" />
                      <circle cx="50" cy="50" r="9" className="fill-blue-600/30 stroke-blue-500" strokeWidth="1" />
                    </>
                  )}
                  {capPiles > 5 && (
                    <>
                      <circle cx="20" cy="20" r="8" className="fill-blue-600/30 stroke-blue-500" strokeWidth="1" />
                      <circle cx="50" cy="20" r="8" className="fill-blue-600/30 stroke-blue-500" strokeWidth="1" />
                      <circle cx="80" cy="20" r="8" className="fill-blue-600/30 stroke-blue-500" strokeWidth="1" />
                      <circle cx="20" cy="80" r="8" className="fill-blue-600/30 stroke-blue-500" strokeWidth="1" />
                      <circle cx="50" cy="80" r="8" className="fill-blue-600/30 stroke-blue-500" strokeWidth="1" />
                      <circle cx="80" cy="80" r="8" className="fill-blue-600/30 stroke-blue-500" strokeWidth="1" />
                    </>
                  )}

                  <text x="50" y="-4" textAnchor="middle" className="text-[7px] fill-slate-400 font-mono">B = {capB} m</text>
                  <text x="-5" y="50" textAnchor="middle" transform="rotate(-90 -5 50)" className="text-[7.5px] fill-slate-400 font-mono">L = {capL} m</text>
                </svg>

                <div className="flex-1 space-y-2 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gaya Tiang & Geser Pons:</span>
                  <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800 font-mono">
                    <div>
                      <span className="text-slate-450 block text-[9px]">Gaya Tiang Maks (Pmax):</span>
                      <span className={`font-bold ${!capResult.isPileOverloaded ? "text-emerald-400" : "text-rose-455"}`}>
                        {Math.round(capResult.maxPileLoad)} kN
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-450 block text-[9px]">Gaya Tiang Min (Pmin):</span>
                      <span className="text-slate-200">{Math.round(capResult.minPileLoad)} kN</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block text-[9px]">Pons Kolom φVc:</span>
                      <span className="text-blue-400 font-bold">{Math.round(capResult.phiVu_punchColumn)} kN</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block text-[9px]">Kebutuhan Besi X:</span>
                      <span className="text-indigo-400 font-bold">{Math.round(capResult.AsX_required)} mm²</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block text-[9px]">Punching Tiang Sudut:</span>
                      <span className={`font-bold ${capResult.isPilePunchSafe ? "text-emerald-400" : "text-rose-400"}`}>
                        {capResult.isPilePunchSafe ? "Safe" : "Bahaya Punch"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-450 block text-[9px]">DCR Tiang Tunggal:</span>
                      <span className="text-slate-250">{(capResult.DCR_pileLoad).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI ADVISOR BINDINGS */}
            <AiAdvisor 
              type="pilecap" 
              input={{
                pileCount: capPiles,
                pileSpacing: capSpacing,
                pileDiameter: capPileDiam,
                capB,
                capL,
                capH,
                columnB: capColB,
                columnH: capColH,
                fc: capFc,
                fy: capFy,
                Pu: capPu,
                MuX: capMuX,
                MuY: capMuY,
                cover: capCover
              } as any}
              result={capResult as any}
            />

          </div>
        </div>
      )}

    </div>
  );
}
