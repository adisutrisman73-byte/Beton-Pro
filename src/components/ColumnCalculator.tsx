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

  // Rebar settings
  const [rebarDiameter, setRebarDiameter] = useState<number>(22); // D22
  const [totalBarsCount, setTotalBarsCount] = useState<number>(8); // total rebars around perimeter

  const [result, setResult] = useState<ColumnAnalysisResult | null>(null);
  
  // Hover tracking for SVG PM Diagram
  const [hoveredPoint, setHoveredPoint] = useState<PMPoint | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Auto layout rows based on standard symmetric perimeter arrangement
  const generateSymmetricRows = (totalCount: number, height: number, coverDist: number) => {
    const list: { depth: number; count: number }[] = [];
    const usableH = height - 2 * coverDist;

    if (totalCount <= 4) {
      // 4 corners
      list.push({ depth: coverDist, count: 2 });
      list.push({ depth: height - coverDist, count: 2 });
    } else if (totalCount === 6) {
      // 2 top, 2 middle, 2 bottom
      list.push({ depth: coverDist, count: 2 });
      list.push({ depth: coverDist + usableH / 2, count: 2 });
      list.push({ depth: height - coverDist, count: 2 });
    } else if (totalCount === 8) {
      // 3 top, 2 middle, 3 bottom
      list.push({ depth: coverDist, count: 3 });
      list.push({ depth: coverDist + usableH / 2, count: 2 });
      list.push({ depth: height - coverDist, count: 3 });
    } else if (totalCount === 10) {
      // 3 top, 4 middle (2 rows of 2), 3 bottom
      list.push({ depth: coverDist, count: 3 });
      list.push({ depth: coverDist + usableH / 3, count: 2 });
      list.push({ depth: coverDist + (2 * usableH) / 3, count: 2 });
      list.push({ depth: height - coverDist, count: 3 });
    } else {
      // 12 or more: distribute evenly as 4 corners + sides
      // Let's assume 4 top, 4 middle (2 rows of 2), 4 bottom
      list.push({ depth: coverDist, count: 4 });
      list.push({ depth: coverDist + usableH / 3, count: 2 });
      list.push({ depth: coverDist + (2 * usableH) / 3, count: 2 });
      list.push({ depth: height - coverDist, count: 4 });
    }
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

    const rows = generateSymmetricRows(totalBarsCount, safeH, safeCover);
    const input: ColumnInput = {
      b: safeB,
      h: safeH,
      cover: safeCover,
      fc: safeFc,
      fy: safeFy,
      Pu: safePu,
      Mu: safeMu,
      rebarDiameter,
      rebarRows: rows,
    };
    const ans = analyzeColumn(input);
    setResult(ans);
  }, [b, h, cover, fc, fy, Pu, Mu, rebarDiameter, totalBarsCount]);

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
      rebarDiameter,
      rebarRows: generateSymmetricRows(totalBarsCount, safeH, safeCover)
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

        {/* Rebars Arrangement Table/Template */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 uppercase tracking-wider flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
            2. Susunan Rebar Utama Kolom
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Diameter Rebar Utama
              </label>
              <select
                value={rebarDiameter}
                onChange={(e) => setRebarDiameter(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-sm text-slate-200 font-mono transition outline-none cursor-pointer"
              >
                {STANDARD_BAR_DIAMETERS.map(d => (
                  <option key={d} value={d}>D{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Total Jumlah Batang (n)
              </label>
              <select
                value={totalBarsCount}
                onChange={(e) => setTotalBarsCount(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono transition outline-none cursor-pointer"
              >
                {[4, 6, 8, 10, 12, 14, 16].map(c => (
                  <option key={c} value={c}>{c} Batang (Simetris)</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-950/60 rounded-lg border border-slate-850 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Profil Distribusi Simetris (SNI 1% - 8%):</span>
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
            
            {/* SVG Cross-section drawing */}
            <svg 
              width="150" 
              height="150" 
              viewBox="-10 -10 120 120"
              className="overflow-visible"
            >
              {/* concrete block */}
              <rect x="0" y="0" width="100" height="100" rx="4" className="fill-slate-850 stroke-slate-700" strokeWidth="2.5" />
              <text x="50" y="-4" textAnchor="middle" className="text-[8px] font-mono fill-slate-400 font-bold">b = {b} mm</text>
              <text x="-4" y="50" textAnchor="middle" transform="rotate(-90 -4 50)" className="text-[8px] font-mono fill-slate-400 font-bold">h = {h} mm</text>

              {/* tie stirrup (sengkang pengikat) */}
              <rect x="12" y="12" width="76" height="76" rx="2" className="fill-none stroke-indigo-400/60" strokeWidth="1.5" />

              {/* draw corner rebar cores depending on selections */}
              {/* Corners by default */}
              <circle cx="16" cy="16" r="4.5" className="fill-emerald-400 stroke-white" strokeWidth="0.8" />
              <circle cx="84" cy="16" r="4.5" className="fill-emerald-400 stroke-white" strokeWidth="0.8" />
              <circle cx="16" cy="84" r="4.5" className="fill-emerald-400 stroke-white" strokeWidth="0.8" />
              <circle cx="84" cy="84" r="4.5" className="fill-emerald-400 stroke-white" strokeWidth="0.8" />

              {/* Side bars */}
              {totalBarsCount >= 6 && (
                <>
                  <circle cx="16" cy="50" r="4.5" className="fill-emerald-400 stroke-white" strokeWidth="0.8" />
                  <circle cx="84" cy="50" r="4.5" className="fill-emerald-400 stroke-white" strokeWidth="0.8" />
                </>
              )}

              {totalBarsCount >= 8 && (
                <>
                  <circle cx="50" cy="16" r="4.5" className="fill-emerald-400 stroke-white" strokeWidth="0.8" />
                  <circle cx="50" cy="84" r="4.5" className="fill-emerald-400 stroke-white" strokeWidth="0.8" />
                </>
              )}

              {totalBarsCount >= 10 && (
                <>
                  <circle cx="16" cy="33" r="4.5" className="fill-emerald-400 stroke-white" strokeWidth="0.8" />
                  <circle cx="16" cy="67" r="4.5" className="fill-emerald-400 stroke-white" strokeWidth="0.8" />
                  <circle cx="84" cy="33" r="4.5" className="fill-emerald-400 stroke-white" strokeWidth="0.8" />
                  <circle cx="84" cy="67" r="4.5" className="fill-emerald-400 stroke-white" strokeWidth="0.8" />
                </>
              )}
            </svg>

            <div className="flex-1 text-xs space-y-2 text-slate-350 select-text max-w-xs">
              <div className="flex justify-between border-b border-slate-800/60 pb-1">
                <span>Rincian Tulangan:</span>
                <span className="font-mono text-slate-100 font-bold">{totalBarsCount} Batang D{rebarDiameter}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1">
                <span>Total Luas Baja (Ast):</span>
                <span className="font-mono text-slate-100">{Math.round(result.Ast)} mm²</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1">
                <span>Gaya Aksial Kerja Ultimate:</span>
                <span className="font-mono text-indigo-400">{Pu} kN</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1">
                <span>Momen Kerja Ultimate:</span>
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
