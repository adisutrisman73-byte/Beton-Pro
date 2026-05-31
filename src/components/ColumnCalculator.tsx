/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { analyzeColumn, STANDARD_BAR_DIAMETERS } from "../utils/calculations";
import { ColumnInput, ColumnAnalysisResult, PMPoint } from "../types";
import { Info, HelpCircle, CheckCircle, XCircle, AlertTriangle, Play, Settings, Sparkles } from "lucide-react";
import AiAdvisor from "./AiAdvisor";

export default function ColumnCalculator() {
  const [b, setB] = useState<string | number>(400);
  const [h, setH] = useState<string | number>(400);
  const [cover, setCover] = useState<string | number>(40);
  const [fc, setFc] = useState<string | number>(30); // MPa
  const [fy, setFy] = useState<string | number>(420); // MPa

  // Loading demands
  const [Pu, setPu] = useState<string | number>(800); // kN
  const [Mu, setMu] = useState<string | number>(120); // kNm

  // Unique X and Y Rebar configuration states
  const [rebarDiameterX, setRebarDiameterX] = useState<number>(22); // e.g. D22
  const [rebarCountX, setRebarCountX] = useState<number>(3); // nx (bars on top and bottom faces)
  const [rebarDiameterY, setRebarDiameterY] = useState<number>(19); // e.g. D19
  const [rebarCountY, setRebarCountY] = useState<number>(3); // ny (bars/rows along sides/depth)

  // Additional settings for flat column & slenderness checks
  const [columnHeightLu, setColumnHeightLu] = useState<string | number>(3000); // mm
  const [kFactor, setKFactor] = useState<number>(1.0); // k factor for slenderness checks
  const [seismicKds, setSeismicKds] = useState<string>("KDS_D_F"); // KDS level
  const [stirrupDiameterColumn, setStirrupDiameterColumn] = useState<number>(10); // stirrup mm

  const [result, setResult] = useState<ColumnAnalysisResult | null>(null);
  
  // Hover tracking for SVG PM Diagram
  const [hoveredPoint, setHoveredPoint] = useState<PMPoint | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Auto layout rows based on independent X and Y reinforcement selections
  const generateXYRows = (nx: number, ny: number, height: number, coverDist: number, diaX: number, diaY: number) => {
    const list: { depth: number; count: number; diameter: number }[] = [];
    const usableH = height - 2 * coverDist;

    // Top Row at y = coverDist: contains nx bars of diaX
    list.push({ depth: coverDist, count: nx, diameter: diaX });

    // Intermediate rows: ny represents the total rows along depth. 
    // We add middle rows if ny > 2. Each intermediate row has 2 bars (left, right) of diaY
    if (ny > 2) {
      for (let j = 1; j < ny - 1; j++) {
        const rowDepth = coverDist + (j / (ny - 1)) * usableH;
        list.push({ depth: rowDepth, count: 2, diameter: diaY });
      }
    }

    // Bottom Row at y = height - coverDist: contains nx bars of diaX
    list.push({ depth: height - coverDist, count: nx, diameter: diaX });

    return list;
  };

  useEffect(() => {
    const safeH = Math.max(100, parseFloat(h as string) || 400);
    const safeCover = Math.max(10, parseFloat(cover as string) || 40);
    const safeB = Math.max(100, parseFloat(b as string) || 400);
    const safeFc = Math.max(5, parseFloat(fc as string) || 30);
    const safeFy = Math.max(100, parseFloat(fy as string) || 420);
    const safePu = parseFloat(Pu as string) || 0;
    const safeMu = Math.max(0, parseFloat(Mu as string) || 0);

    const rows = generateXYRows(rebarCountX, rebarCountY, safeH, safeCover, rebarDiameterX, rebarDiameterY);
    const input: ColumnInput = {
      b: safeB,
      h: safeH,
      cover: safeCover,
      fc: safeFc,
      fy: safeFy,
      Pu: safePu,
      Mu: safeMu,
      rebarDiameter: rebarDiameterX, // fallback diameter
      rebarRows: rows,
    };
    const ans = analyzeColumn(input);
    setResult(ans);
  }, [b, h, cover, fc, fy, Pu, Mu, rebarDiameterX, rebarCountX, rebarDiameterY, rebarCountY]);

  if (!result) return null;

  // Formatting values for current input
  const currentInput = (): ColumnInput => {
    const safeH = Math.max(100, parseFloat(h as string) || 400);
    const safeCover = Math.max(10, parseFloat(cover as string) || 40);
    const safeB = Math.max(100, parseFloat(b as string) || 400);
    const safeFc = Math.max(5, parseFloat(fc as string) || 30);
    const safeFy = Math.max(100, parseFloat(fy as string) || 420);
    const safePu = parseFloat(Pu as string) || 0;
    const safeMu = Math.max(0, parseFloat(Mu as string) || 0);

    return {
      b: safeB,
      h: safeH,
      cover: safeCover,
      fc: safeFc,
      fy: safeFy,
      Pu: safePu,
      Mu: safeMu,
      rebarDiameter: rebarDiameterX,
      rebarRows: generateXYRows(rebarCountX, rebarCountY, safeH, safeCover, rebarDiameterX, rebarDiameterY)
    };
  };

  // Calculate coordinates scaling for PM Diagram viewport
  // Viewport: width=400, height=350, margin=40
  // X: Bending Moment (Mn or phiMn) -> 0 to max(Mn)*1.1
  // Y: Axial Load (Pn or phiPn) -> min(Pn) to max(Pn)*1.1
  const paddingX = 50;
  const paddingY = 40;
  const plotW = 350;
  const plotH = 270;

  const maxM = Math.max(...result.PMPoints.map(p => Math.max(p.Mn, p.phiMn, Mu))) * 1.25 || 200;
  // Capture bottom most (pure tension) to top most (pure compression)
  const maxP = Math.max(...result.PMPoints.map(p => Math.max(p.Pn, p.phiPn, Pu))) * 1.15 || 1500;
  const minP = Math.min(...result.PMPoints.map(p => p.Pn)) * 1.15 || -300;
  const pSpan = maxP - minP;

  // Convert real coordinates to SVG pixels
  const getSvgCoordinates = (mVal: number, pVal: number) => {
    // scale M: mapped to [paddingX, paddingX + plotW]
    const x = paddingX + (mVal / maxM) * plotW;
    // scale P: mapped to [paddingY + plotH, paddingY] (recall Y-axis of SVG is top-to-bottom)
    const y = paddingY + plotH - ((pVal - minP) / pSpan) * plotH;
    return { x, y };
  };

  // Convert SVG pixel back to approximate real values for mouse overlays
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xPixel = e.clientX - rect.left;
    const yPixel = e.clientY - rect.top;

    // Track mousePos to position tooltip
    setMousePos({ x: e.clientX - rect.left + 15, y: e.clientY - rect.top - 20 });

    // Reverse mapping to find nearest P-M coordinate in our points array
    let closestPt: PMPoint | null = null;
    let minDist = 99999;

    for (const pt of result.PMPoints) {
      const designCoords = getSvgCoordinates(pt.phiMn, pt.phiPn);
      const dx = designCoords.x - xPixel;
      const dy = designCoords.y - yPixel;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist && dist < 35) { // hover radius threshold
        minDist = dist;
        closestPt = pt;
      }
    }

    setHoveredPoint(closestPt);
  };

  // Build SVG path strings for Nominal (Pn) and Design (phiPn) diagrams
  let designPathString = "";
  let nominalPathString = "";

  result.PMPoints.forEach((pt, idx) => {
    // Nominal coordinate
    const nomCoord = getSvgCoordinates(pt.Mn, pt.Pn);
    // Design coordinate with PnMax compression cutoff
    const designP = Math.min(pt.phiPn, result.phiPnMax);
    const desCoord = getSvgCoordinates(pt.phiMn, designP);

    if (idx === 0) {
      nominalPathString += `M ${nomCoord.x} ${nomCoord.y}`;
      designPathString += `M ${desCoord.x} ${desCoord.y}`;
    } else {
      nominalPathString += ` L ${nomCoord.x} ${nomCoord.y}`;
      designPathString += ` L ${desCoord.x} ${desCoord.y}`;
    }
  });

  // Close the design path down by tracing vertical cutoff line if any, or ending nicely on y-axis
  const topCutoffLeft = getSvgCoordinates(0, result.phiPnMax);
  const bottomPureTension = getSvgCoordinates(0, result.PMPoints[0].phiPn);
  
  // Design path goes to PnMax on Y axis
  designPathString += ` L ${topCutoffLeft.x} ${topCutoffLeft.y} L ${bottomPureTension.x} ${bottomPureTension.y}`;
  
  // Nominal path goes to P0 on Y-axis
  const topNominalPureC = getSvgCoordinates(0, result.PMPoints[result.PMPoints.length - 1].Pn);
  const bottomNominalPureT = getSvgCoordinates(0, result.PMPoints[0].Pn);
  nominalPathString += ` L ${topNominalPureC.x} ${topNominalPureC.y} L ${bottomNominalPureT.x} ${bottomNominalPureT.y}`;

  // Current load point coordinate
  const currentLoadCoords = getSvgCoordinates(Mu, Pu);

  // Draw lines to the axes
  const xZeroAxisY = paddingY + plotH - ((0 - minP) / pSpan) * plotH;

  // === ANALISIS KOLOM PIPIH & KELANGSINGAN ===
  const bNum = Math.max(100, parseFloat(b as string) || 400);
  const hNum = Math.max(100, parseFloat(h as string) || 400);
  const fcNum = Math.max(5, parseFloat(fc as string) || 30);
  const PuNum = parseFloat(Pu as string) || 0;

  const aspectColumn = hNum / bNum; // rasio aspek kolom
  const isFlatColumn = aspectColumn >= 1.8 || bNum <= 180; // tergolong kolom pipih jika h/b tinggi atau b tipis

  const L_u = Math.max(500, parseFloat(columnHeightLu as string) || 3000);
  const r_y = 0.2887 * bNum; // radius girasi arah sumbu lemah y
  const lambda_y = (kFactor * L_u) / r_y; // rasio kelangsingan arah sumbu lemah y
  const isSlenderY = lambda_y > 22; // batas kelangsingan SNI 2847 untuk kolom unbraced

  // Hubungan elastisitas & kekakuan retak efektif (Euler Buckling)
  const I_y = (hNum * Math.pow(bNum, 3)) / 12; // Momen Inersia Gross Sumbu Lemah (mm4)
  const E_c = 4700 * Math.sqrt(fcNum); // Modulus Elastisitas Beton (MPa)
  const EI_eff = 0.25 * E_c * I_y; // Kekakuan efektif penampang retak kolom langsing
  const Pcr_kN = (Math.PI * Math.PI * EI_eff) / Math.pow(kFactor * L_u, 2) * 1e-3; // Beban Tekuk Kritis Euler (kN)
  const bucklingLoadRatio = Pcr_kN > 0 ? (PuNum / Pcr_kN) : 0;

  // Spasi maksimum sengkang pengekang (stirrup spacing) untuk stabilitas tekuk lateral tulangan utama
  const minMainBarDia = Math.min(rebarDiameterX, rebarDiameterY);
  const maxStirrupSpacing = Math.round(Math.min(16 * minMainBarDia, 48 * stirrupDiameterColumn, bNum));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      
      {/* LEFT INPUT SECTION */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Dimensions & Concrete Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 uppercase tracking-wider flex items-center gap-2">
            <Settings className="h-4 w-4 text-emerald-400" />
            1. Dimensi & Bahan Kolom
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Lebar Penampang b (mm)
              </label>
              <input
                type="number"
                step="any"
                value={b}
                onChange={(e) => setB(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono transition outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Kedalaman h (mm)
              </label>
              <input
                type="number"
                step="any"
                value={h}
                onChange={(e) => setH(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono transition outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Selimut Beton d' (mm)
              </label>
              <input
                type="number"
                step="any"
                value={cover}
                onChange={(e) => setCover(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono transition outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Mutu Beton f'c (MPa)
              </label>
              <input
                type="number"
                step="any"
                value={fc}
                onChange={(e) => setFc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono transition outline-none"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Mutu Tulangan Longitudinal fy (MPa)
              </label>
              <input
                type="number"
                step="any"
                value={fy}
                onChange={(e) => setFy(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono transition outline-none"
              />
            </div>
          </div>
        </div>

        {/* Rebars Arrangement Table/Template with X and Y Selection */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-sm font-semibold text-slate-200 mb-1.5 uppercase tracking-wider flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
            2. Susunan Rebar Kolom (Sisi X & Y)
          </h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Konfigurasi jumlah batang dan diameter tulangan secara mandiri untuk Sumbu X (lebar b) dan Sumbu Y (depth h).
          </p>

          <div className="space-y-4">
            {/* TULANGAN SISI X */}
            <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-850">
              <span className="text-[11px] font-bold text-indigo-400 block mb-2 uppercase tracking-wide">
                Sisi Arah X (nx pada Lebar b)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Diameter Besi (X)
                  </label>
                  <select
                    value={rebarDiameterX}
                    onChange={(e) => setRebarDiameterX(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none cursor-pointer"
                  >
                    {STANDARD_BAR_DIAMETERS.map(d => (
                      <option key={d} value={d}>D{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Jumlah Baris nx (Min 2)
                  </label>
                  <select
                    value={rebarCountX}
                    onChange={(e) => setRebarCountX(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none cursor-pointer"
                  >
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
                      <option key={c} value={c}>{c} Batang</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* TULANGAN SISI Y */}
            <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-850">
              <span className="text-[11px] font-bold text-teal-400 block mb-2 uppercase tracking-wide">
                Sisi Arah Y (ny pada Kedalaman h)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Diameter Besi (Y)
                  </label>
                  <select
                    value={rebarDiameterY}
                    onChange={(e) => setRebarDiameterY(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none cursor-pointer"
                  >
                    {STANDARD_BAR_DIAMETERS.map(d => (
                      <option key={d} value={d}>D{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Jumlah Baris ny (Min 2)
                  </label>
                  <select
                    value={rebarCountY}
                    onChange={(e) => setRebarCountY(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none cursor-pointer"
                  >
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
                      <option key={c} value={c}>{c} Batang</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-950/60 rounded-lg border border-slate-850 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Profil Distribusi Gabungan (SNI 1% - 8%):</span>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Total Jumlah Besi (n_total):</span>
              <span className="font-mono font-bold text-indigo-300">{2 * rebarCountX + 2 * (rebarCountY - 2)} Batang</span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Total Luas Baja (Ast):</span>
              <span className="font-mono font-bold text-slate-100">{Math.round(result.Ast)} mm²</span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Rasio Tulangan Rencana (ρ_st):</span>
              <span className={`font-mono font-bold ${result.isRatioValid ? "text-emerald-400" : "text-rose-400"}`}>
                {(result.rho * 100).toFixed(2)}%
              </span>
            </div>
            {!result.isRatioValid && (
              <div className="text-[10px] text-rose-300 pt-1 border-t border-rose-950 mt-1.5">
                Peringatan: Rasio tulangan kolom di luar batas minimum 1% atau maksimum 8%!
              </div>
            )}
          </div>
        </div>

        {/* Load demands Pu & Mu */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 uppercase tracking-wider flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            3. Kombinasi Beban Aksial & Lentur
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Aksial Ultimate Pu (kN)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={Pu}
                  onChange={(e) => setPu(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono transition outline-none pr-10"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-550 select-none">kN</span>
              </div>
              <span className="text-[9px] text-slate-500 block mt-1">Nilai negatif mewakili gaya tarik aksial.</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Momen Ultimate Mu (kNm)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={Mu}
                  onChange={(e) => setMu(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono transition outline-none pr-10"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-550 select-none">kNm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Part 4: Analisis Kelangsingan & Kolom Pipih */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <h3 className="text-xs font-semibold text-slate-200 mb-1 uppercase tracking-wider flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
            4. Kelangsingan & Kolom Pipih
          </h3>
          <p className="text-[11px] text-slate-400">
            Perhitungan kelangsingan arah sumbu lemah y (lebar b) dan risiko buckling di bawah peraturan SNI 2847.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                Tinggi Kolom Bebas Lu (mm)
              </label>
              <input
                type="number"
                step="any"
                value={columnHeightLu}
                onChange={(e) => setColumnHeightLu(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                Faktor Panjang Tekuk k
              </label>
              <select
                value={kFactor}
                onChange={(e) => setKFactor(parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none cursor-pointer"
              >
                <option value={1.0}>1.0 (Sendi - Sendi)</option>
                <option value={0.7}>0.7 (Sendi - Jepit)</option>
                <option value={0.5}>0.5 (Jepit - Jepit)</option>
                <option value={2.0}>2.0 (Jepit - Bebas)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                Zona Seismik (KDS)
              </label>
              <select
                value={seismicKds}
                onChange={(e) => setSeismicKds(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none cursor-pointer"
              >
                <option value="KDS_A_B">KDS A-B (Seismik Rendah)</option>
                <option value="KDS_C">KDS C (Seismik Sedang)</option>
                <option value="KDS_D_F">KDS D-F (Seismik Tinggi / SRPMK)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                Dia. Sengkang Stirrup (mm)
              </label>
              <select
                value={stirrupDiameterColumn}
                onChange={(e) => setStirrupDiameterColumn(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none cursor-pointer"
              >
                {[8, 10, 12, 13, 16].map(d => (
                  <option key={d} value={d}>Ø{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* HASIL DETEKSI DAN REKOMENDASI LIVE */}
          <div className="space-y-2.5 p-3 bg-slate-950/60 rounded-lg border border-slate-850">
            {/* Kategori Kolom */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Rasio Aspek Penampang h/b:</span>
              {isFlatColumn ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Kolom Pipih ({aspectColumn.toFixed(2)})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  Kolom Standard ({aspectColumn.toFixed(2)})
                </span>
              )}
            </div>

            {/* Kelangsingan */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Rasio Kelangsingan (λ_y):</span>
              <span className="font-mono font-bold text-slate-350">{lambda_y.toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Batas Kelangsingan SNI:</span>
              {isSlenderY ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  LANGSING (λ &gt; 22)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  PENDEK (λ ≤ 22)
                </span>
              )}
            </div>

            {/* Buckling Euler */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Beban Tekuk Kritis (P_cr):</span>
              <span className="font-mono font-bold text-slate-200">{Math.round(Pcr_kN)} kN</span>
            </div>
            {bucklingLoadRatio > 0.75 && (
              <div className="flex items-start gap-1 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-300">
                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                <span>Bahaya Tekuk: Beban kerja aksial Pu mendekati atau melebihi kapasitas kritis!</span>
              </div>
            )}

            {/* Spasi Sengkang Maksimum */}
            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-850">
              <span className="text-slate-400">Spasi Sengkang Stabilizer:</span>
              <span className="font-mono font-bold text-emerald-400">s_max ≤ {maxStirrupSpacing} mm</span>
            </div>

            {/* Cek Seismik SRPMK */}
            {seismicKds === "KDS_D_F" && (bNum < 300 || bNum / hNum < 0.4) && (
              <div className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded mt-1 space-y-1">
                <div className="font-bold">Informasi SRPMK (KDS D-F / Seismik Tinggi):</div>
                <div className="text-slate-400 leading-relaxed">
                  Dimensi kolom ({bNum}x{hNum} mm) atau rasionya tidak memenuhi syarat minimum SRPMK (&ge; 300 mm, b/h &ge; 0.4) untuk portal penahan beban lateral utama. Direkomendasikan sebagai kolom praktis.
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* RIGHT DISPLAY SECTION WITH INTERACTIVE CHART */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* SAFETY CARD */}
        <div className={`border p-5 rounded-2xl shadow-xl flex items-start gap-4 transition ${
          result.currentLoadSafe 
            ? "bg-emerald-950/25 border-emerald-800/80 text-emerald-300 animate-pulse-soft" 
            : "bg-rose-950/25 border-rose-900/80 text-rose-300"
        }`}>
          {result.currentLoadSafe ? (
            <CheckCircle className="h-8 w-8 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-8 w-8 text-rose-500 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Status Interaksi Gabungan Aksial-Momen Kolom</span>
            <span className="font-black text-xl md:text-2xl block">
              {result.currentLoadSafe ? "KOLOM AMAN (Safe)" : "KOLOM OVERLIMIT (Unsafe!)"}
            </span>
            <p className="text-xs text-slate-350 mt-1">
              Kapasitas terpakai terhadap beban aksial <span className="font-mono text-slate-200">{Pu} kN</span> dan momen <span className="font-mono text-slate-200">{Mu} kNm</span> adalah sekitar <span className="font-mono font-bold text-slate-200">{(result.capacityRatio * 100).toFixed(1)}%</span>.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-800 text-xs">
              <div>
                <span className="text-slate-400">Batas Kompresi Aksial Rencana (φPn,max):</span>
                <span className="font-mono font-bold block text-slate-200">{Math.round(result.phiPnMax)} kN</span>
              </div>
              <div>
                <span className="text-slate-400">Luas Bruto Kolom (Ag):</span>
                <span className="font-mono font-bold block text-slate-200">{Math.round(result.Ag)} mm²</span>
              </div>
            </div>
          </div>
        </div>

        {/* SVG INTERACTIVE P-M DIAGRAM */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative select-none">
          <div className="flex justify-between items-center pb-3 border-b border-slate-850 mb-3 text-xs text-slate-300 font-semibold uppercase tracking-wider">
            <span>Kurva Diagram Interaksi P-M (Symmetrical)</span>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Sumbu Vertikal: P, Horizontal: M
            </span>
          </div>

          <div className="relative bg-slate-950/60 rounded-xl border border-slate-850 overflow-hidden">
            
            {/* SVG graph */}
            <svg
              ref={svgRef}
              width="100%"
              height="350"
              viewBox="0 0 440 350"
              className="mx-auto block overflow-visible cursor-crosshair"
              onMouseMove={handleSvgMouseMove}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {/* Draw Axis Lines */}
              {/* x-axis corresponding to P=0 */}
              <line 
                x1={paddingX} 
                y1={xZeroAxisY} 
                x2={paddingX + plotW} 
                y2={xZeroAxisY} 
                className="stroke-slate-700" 
                strokeWidth="1.2"
                strokeDasharray="4 3"
              />
              {/* y-axis corresponding to M=0 */}
              <line 
                x1={paddingX} 
                y1={paddingY} 
                x2={paddingX} 
                y2={paddingY + plotH} 
                className="stroke-slate-755" 
                strokeWidth="2"
              />

              {/* Axis Ticks and Labels */}
              <text x={paddingX - 10} y={paddingY + 4} textAnchor="end" className="text-[9px] font-mono fill-slate-500">{Math.round(maxP)} kN</text>
              <text x={paddingX - 10} y={xZeroAxisY + 3} textAnchor="end" className="text-[9px] font-mono fill-slate-400 font-bold">0</text>
              <text x={paddingX - 10} y={paddingY + plotH} textAnchor="end" className="text-[9px] font-mono fill-slate-500">{Math.round(minP)} kN</text>

              <text x={paddingX + plotW} y={xZeroAxisY + 14} textAnchor="middle" className="text-[9px] font-mono fill-slate-500">{Math.round(maxM)} kNm</text>

              {/* Axis Titles */}
              <text x="15" y="175" textAnchor="middle" transform="rotate(-90 15 175)" className="text-[10px] font-semibold tracking-wider fill-slate-400">Gaya Aksial P (kN)</text>
              <text x="225" y="340" textAnchor="middle" className="text-[10px] font-semibold tracking-wider fill-slate-400">Benturan Momen M (kNm)</text>

              {/* Fill area enclosed inside Design envelope with subtle transparent gradient */}
              <path 
                d={designPathString} 
                className="fill-emerald-500/5 hover:fill-emerald-500/10 transition"
              />

              {/* Draw NOMINAL Capacity Boundary (Outer Curve) */}
              <path 
                d={nominalPathString} 
                className="fill-none stroke-slate-700" 
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* Draw DESIGN Capacity Boundary (Inner Curve) */}
              <path 
                d={designPathString} 
                className="fill-none stroke-emerald-500" 
                strokeWidth="3.2"
              />

              {/* Top cutoff limit marker line (flat line for tied column maximum axial constraint) */}
              <line 
                x1={paddingX} 
                y1={getSvgCoordinates(0, result.phiPnMax).y} 
                x2={getSvgCoordinates(Math.max(...result.PMPoints.filter(p => p.phiPn >= result.phiPnMax).map(p => p.phiMn)), result.phiPnMax).x} 
                y2={getSvgCoordinates(0, result.phiPnMax).y} 
                className="stroke-amber-400" 
                strokeWidth="1.8"
                strokeDasharray="2 2"
              />
              <text 
                x={paddingX + 25} 
                y={getSvgCoordinates(0, result.phiPnMax).y - 6} 
                className="text-[9px] font-mono fill-amber-350"
              >
                Batas Kapasitas Maks. Aksial φPn(max)
              </text>

              {/* Draw the CURRENT demand point (Pu, Mu) */}
              {/* Guard coordinates in case of crazy inputs */}
              {currentLoadCoords.x >= paddingX && currentLoadCoords.x <= paddingX + plotW && currentLoadCoords.y >= paddingY && currentLoadCoords.y <= paddingY + plotH && (
                <g>
                  {/* Dynamic pulsing glow ring */}
                  <circle 
                    cx={currentLoadCoords.x} 
                    cy={currentLoadCoords.y} 
                    r="8" 
                    className={`${result.currentLoadSafe ? "fill-emerald-400/30 animate-ping" : "fill-rose-500/30 animate-ping"}`}
                  />
                  {/* Real load dot */}
                  <circle 
                    cx={currentLoadCoords.x} 
                    cy={currentLoadCoords.y} 
                    r="5" 
                    className={`${result.currentLoadSafe ? "fill-emerald-400 stroke-slate-900" : "fill-rose-500 stroke-slate-900"}`}
                    strokeWidth="1.5"
                  />
                  
                  {/* Draw projected lines to axes on hover or permanently */}
                  <line 
                    x1={currentLoadCoords.x} 
                    y1={currentLoadCoords.y} 
                    x2={paddingX} 
                    y2={currentLoadCoords.y} 
                    className="stroke-slate-500 stroke-dasharray opacity-30" 
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <line 
                    x1={currentLoadCoords.x} 
                    y1={currentLoadCoords.y} 
                    x2={currentLoadCoords.x} 
                    y2={xZeroAxisY} 
                    className="stroke-slate-500 stroke-dasharray opacity-30" 
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text 
                    x={currentLoadCoords.x + 8} 
                    y={currentLoadCoords.y - 8} 
                    className={`text-[9.5px] font-mono font-bold ${result.currentLoadSafe ? "fill-emerald-400" : "fill-rose-400"}`}
                  >
                    Beban ({Mu}, {Pu})
                  </text>
                </g>
              )}

              {/* Render Hover Intersection Dot */}
              {hoveredPoint && (
                <g>
                  {/* nominal coordinate helper */}
                  <circle 
                    cx={getSvgCoordinates(hoveredPoint.phiMn, Math.min(hoveredPoint.phiPn, result.phiPnMax)).x} 
                    cy={getSvgCoordinates(hoveredPoint.phiMn, Math.min(hoveredPoint.phiPn, result.phiPnMax)).y} 
                    r="4.5" 
                    className="fill-indigo-400 stroke-slate-950" 
                    strokeWidth="1.5"
                  />
                </g>
              )}
            </svg>

            {/* Hover Tooltip Overlay (absolute position inside relative box) */}
            {hoveredPoint && (
              <div 
                className="absolute bg-slate-900 border border-slate-700/80 rounded px-3 py-2 text-[10.5px] font-mono z-20 pointer-events-none shadow-xl text-slate-100"
                style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }}
              >
                <div className="font-bold text-amber-300 text-[11px] mb-1">{hoveredPoint.type}</div>
                <div>φMn: <strong className="text-white">{hoveredPoint.phiMn.toFixed(1)} kNm</strong></div>
                <div>φPn: <strong className="text-white">{Math.round(Math.min(hoveredPoint.phiPn, result.phiPnMax))} kN</strong></div>
                <div className="text-[9px] text-slate-400 border-t border-slate-800 mt-1 pt-1">
                  Reduksi φ: {hoveredPoint.phi.toFixed(2)} | c: {Math.round(hoveredPoint.c)} mm
                </div>
              </div>
            )}

          </div>

          <div className="flex justify-between items-center mt-3 text-[10.5px]">
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-0.5 border-t-2 border-dashed border-slate-600 block"></span>
                <span>Nominal (Pn-Mn)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-0.5 border-t-2 border-emerald-500 block"></span>
                <span className="text-emerald-400 font-semibold">Tereduksi Rencana (φPn-φMn)</span>
              </div>
            </div>
            
            <div className="text-slate-400 flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-indigo-400" />
              <span>Arahkan kursor pada kurva untuk memeriksa kapasitas</span>
            </div>
          </div>
        </div>

        {/* DETAILED COLUMNS STATS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider mb-3 pb-2 border-b border-slate-850">
            Penampang Kolom Melintang (Cross-Section & Rebar Layout)
          </h4>

          <div className="flex flex-col sm:flex-row gap-6 p-4 border border-slate-800 border-dashed rounded-xl bg-slate-950/20 items-center justify-around">
            
            {/* SVG Cross-section drawing (Fully dynamic, proportionally accurate) */}
            {(() => {
              const bNum = Math.max(100, parseFloat(b as string) || 300);
              const hNum = Math.max(100, parseFloat(h as string) || 500);
              const coverNum = Math.max(10, parseFloat(cover as string) || 40);
              const maxVal = Math.max(bNum, hNum);
              const margin = maxVal * 0.18; // generous margin for dimension lines & tags
              
              // Spacing helper for stirrup
              const stirrupX = coverNum + stirrupDiameterColumn / 2;
              const stirrupY = coverNum + stirrupDiameterColumn / 2;
              const stirrupW = bNum - 2 * coverNum - stirrupDiameterColumn;
              const stirrupH = hNum - 2 * coverNum - stirrupDiameterColumn;

              // Spacing helper for rebar centers
              const startX = coverNum + stirrupDiameterColumn + rebarDiameterX / 2;
              const endX = bNum - (coverNum + stirrupDiameterColumn + rebarDiameterX / 2);

              return (
                <svg 
                  viewBox={`${-margin} ${-margin} ${bNum + 2 * margin} ${hNum + 2 * margin}`}
                  className="w-48 h-auto max-h-[190px] overflow-visible"
                >
                  {/* Concrete block */}
                  <rect 
                    x="0" 
                    y="0" 
                    width={bNum} 
                    height={hNum} 
                    rx={Math.min(bNum, hNum) * 0.04} 
                    className={`fill-slate-850 ${bNum < hNum * 0.5 ? 'stroke-rose-500' : 'stroke-slate-700'}`} 
                    strokeWidth={Math.max(2.5, maxVal * 0.015)} 
                  />

                  {/* Tie stirrup (sengkang pengikat) */}
                  {stirrupW > 0 && stirrupH > 0 && (
                    <rect 
                      x={stirrupX} 
                      y={stirrupY} 
                      width={stirrupW} 
                      height={stirrupH} 
                      rx={Math.max(2, stirrupDiameterColumn * 0.3)} 
                      className="fill-none stroke-indigo-400/60" 
                      strokeWidth={stirrupDiameterColumn} 
                    />
                  )}

                  {/* Measurement labels & Dimension helper lines */}
                  {/* Label b */}
                  <line 
                    x1={0} 
                    y1={-margin * 0.25} 
                    x2={bNum} 
                    y2={-margin * 0.25} 
                    className="stroke-slate-600" 
                    strokeWidth={Math.max(1, maxVal * 0.003)} 
                  />
                  <line x1={0} y1={-margin * 0.35} x2={0} y2={margin * 0.05} className="stroke-slate-700" strokeWidth="1" />
                  <line x1={bNum} y1={-margin * 0.35} x2={bNum} y2={margin * 0.05} className="stroke-slate-700" strokeWidth="1" />
                  <text 
                    x={bNum / 2} 
                    y={-margin * 0.45} 
                    textAnchor="middle" 
                    className="fill-slate-350 font-mono font-bold font-sans"
                    fontSize={Math.max(10, maxVal * 0.06)}
                  >
                    b = {b} mm
                  </text>

                  {/* Label h */}
                  <line 
                    x1={-margin * 0.25} 
                    y1={0} 
                    x2={-margin * 0.25} 
                    y2={hNum} 
                    className="stroke-slate-600" 
                    strokeWidth={Math.max(1, maxVal * 0.003)} 
                  />
                  <line x1={-margin * 0.35} y1={0} x2={margin * 0.05} y2={0} className="stroke-slate-700" strokeWidth="1" />
                  <line x1={-margin * 0.35} y1={hNum} x2={margin * 0.05} y2={hNum} className="stroke-slate-700" strokeWidth="1" />
                  <text 
                    x={-margin * 0.45} 
                    y={hNum / 2} 
                    textAnchor="middle" 
                    transform={`rotate(-90 ${-margin * 0.45} ${hNum / 2})`} 
                    className="fill-slate-350 font-mono font-bold font-sans"
                    fontSize={Math.max(10, maxVal * 0.06)}
                  >
                    h = {h} mm
                  </text>

                  {/* Dynamic Rebars drawn in perfectly scaled diameters */}
                  {(() => {
                    const bars: React.ReactNode[] = [];

                    // 1. Top row of rebarCountX bars (Diameter: rebarDiameterX)
                    const topY = coverNum + stirrupDiameterColumn + rebarDiameterX / 2;
                    for (let i = 0; i < rebarCountX; i++) {
                      const cx = rebarCountX > 1 ? startX + (i / (rebarCountX - 1)) * (endX - startX) : bNum / 2;
                      const radiusX = rebarDiameterX / 2;
                      bars.push(
                        <circle 
                          key={`top-${i}`} 
                          cx={cx} 
                          cy={topY} 
                          r={radiusX} 
                          className="fill-indigo-400 stroke-white" 
                          strokeWidth={Math.max(0.6, radiusX * 0.1)} 
                        />
                      );
                    }

                    // 2. Bottom row of rebarCountX bars (Diameter: rebarDiameterX)
                    const bottomY = hNum - (coverNum + stirrupDiameterColumn + rebarDiameterX / 2);
                    for (let i = 0; i < rebarCountX; i++) {
                      const cx = rebarCountX > 1 ? startX + (i / (rebarCountX - 1)) * (endX - startX) : bNum / 2;
                      const radiusX = rebarDiameterX / 2;
                      bars.push(
                        <circle 
                          key={`bottom-${i}`} 
                          cx={cx} 
                          cy={bottomY} 
                          r={radiusX} 
                          className="fill-indigo-400 stroke-white" 
                          strokeWidth={Math.max(0.6, radiusX * 0.1)} 
                        />
                      );
                    }

                    // 3. Intermediate left & right side bars (Diameter: rebarDiameterY)
                    if (rebarCountY > 2) {
                      const sideStartX = coverNum + stirrupDiameterColumn + rebarDiameterY / 2;
                      const sideEndX = bNum - (coverNum + stirrupDiameterColumn + rebarDiameterY / 2);
                      for (let j = 1; j < rebarCountY - 1; j++) {
                        const cy = coverNum + (j / (rebarCountY - 1)) * (hNum - 2 * coverNum);
                        const radiusY = rebarDiameterY / 2;
                        // Left side bar
                        bars.push(
                          <circle 
                            key={`left-${j}`} 
                            cx={sideStartX} 
                            cy={cy} 
                            r={radiusY} 
                            className="fill-teal-400 stroke-white" 
                            strokeWidth={Math.max(0.6, radiusY * 0.1)} 
                          />
                        );
                        // Right side bar
                        bars.push(
                          <circle 
                            key={`right-${j}`} 
                            cx={sideEndX} 
                            cy={cy} 
                            r={radiusY} 
                            className="fill-teal-400 stroke-white" 
                            strokeWidth={Math.max(0.6, radiusY * 0.1)} 
                          />
                        );
                      }
                    }

                    return bars;
                  })()}
                </svg>
              );
            })()}

            <div className="flex-1 text-xs space-y-2 text-slate-350 select-text max-w-xs">
              <div className="flex justify-between border-b border-slate-800/60 pb-1">
                <span>Tulangan Arah X:</span>
                <span className="font-mono text-indigo-300 font-bold">{rebarCountX} Batang D{rebarDiameterX}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1">
                <span>Tulangan Arah Y:</span>
                <span className="font-mono text-teal-400 font-bold">{rebarCountY} Rows x 2 D{rebarDiameterY}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1">
                <span>Total Besi:</span>
                <span className="font-mono text-slate-100 font-bold">
                  {2 * rebarCountX + 2 * (rebarCountY - 2)} Batang
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1">
                <span>Total Luas Baja (Ast):</span>
                <span className="font-mono text-slate-100">{Math.round(result.Ast)} mm²</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1">
                <span>Beban Aksial Pu:</span>
                <span className="font-mono text-indigo-400">{Pu} kN</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1">
                <span>Momen Lentur Mu:</span>
                <span className="font-mono text-indigo-400">{Mu} kNm</span>
              </div>
            </div>
          </div>
        </div>

        {/* CONSULTATION PANEL */}
        <AiAdvisor type="column" input={currentInput()} result={result} />

      </div>
    </div>
  );
}
