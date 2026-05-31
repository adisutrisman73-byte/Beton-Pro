/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { analyzeBeam, STANDARD_BAR_DIAMETERS } from "../utils/calculations";
import { BeamInput, BeamAnalysisResult } from "../types";
import { Info, HelpCircle, CheckCircle, XCircle, AlertTriangle, Sliders, Layers, RefreshCw, Star } from "lucide-react";
import AiAdvisor from "./AiAdvisor";

export default function BeamCalculator() {
  // 1. Shared Beam Geometry & Material State
  const [b, setB] = useState<string | number>(300);
  const [h, setH] = useState<string | number>(500);
  const [cover, setCover] = useState<string | number>(40);
  const [fc, setFc] = useState<string | number>(30); // MPa
  const [fy, setFy] = useState<string | number>(420); // MPa
  const [fys, setFys] = useState<string | number>(280); // MPa

  // 2. Zone Tab Selection
  const [activeZone, setActiveZone] = useState<"tumpuan" | "lapangan">("tumpuan");

  // 3. Tumpuan (Support Zone) Parameters
  const [MuTumpuan, setMuTumpuan] = useState<string | number>(220); // kNm
  const [VuTumpuan, setVuTumpuan] = useState<string | number>(120); // kN
  const [rebarDiameterTumpuan, setRebarDiameterTumpuan] = useState<number>(19); // D19
  const [rebarCountTumpuan, setRebarCountTumpuan] = useState<string | number>(5);
  const [isDoubleTumpuan, setIsDoubleTumpuan] = useState<boolean>(false);
  const [compRebarDiameterTumpuan, setCompRebarDiameterTumpuan] = useState<number>(13);
  const [compRebarCountTumpuan, setCompRebarCountTumpuan] = useState<string | number>(2);
  const [stirrupDiameterTumpuan, setStirrupDiameterTumpuan] = useState<number>(10);
  const [stirrupLegsTumpuan, setStirrupLegsTumpuan] = useState<number>(2);
  const [stirrupSpacingTumpuan, setStirrupSpacingTumpuan] = useState<string | number>(100); // mm

  // 4. Lapangan (Mid-span Zone) Parameters
  const [MuLapangan, setMuLapangan] = useState<string | number>(140); // kNm
  const [VuLapangan, setVuLapangan] = useState<string | number>(60); // kN
  const [rebarDiameterLapangan, setRebarDiameterLapangan] = useState<number>(19); // D19
  const [rebarCountLapangan, setRebarCountLapangan] = useState<string | number>(3);
  const [isDoubleLapangan, setIsDoubleLapangan] = useState<boolean>(false);
  const [compRebarDiameterLapangan, setCompRebarDiameterLapangan] = useState<number>(13);
  const [compRebarCountLapangan, setCompRebarCountLapangan] = useState<string | number>(2);
  const [stirrupDiameterLapangan, setStirrupDiameterLapangan] = useState<number>(10);
  const [stirrupLegsLapangan, setStirrupLegsLapangan] = useState<number>(2);
  const [stirrupSpacingLapangan, setStirrupSpacingLapangan] = useState<string | number>(180); // mm

  // Calculated Results
  const [resultTumpuan, setResultTumpuan] = useState<BeamAnalysisResult | null>(null);
  const [resultLapangan, setResultLapangan] = useState<BeamAnalysisResult | null>(null);

  // Auto calculate Tumpuan Zone
  useEffect(() => {
    const safeB = Math.max(50, parseFloat(b as string) || 300);
    const safeH = Math.max(50, parseFloat(h as string) || 500);
    const safeCover = Math.max(10, parseFloat(cover as string) || 40);
    const safeFc = Math.max(5, parseFloat(fc as string) || 30);
    const safeFy = Math.max(100, parseFloat(fy as string) || 420);
    const safeFys = Math.max(100, parseFloat(fys as string) || 280);

    const safeMu = Math.max(0, parseFloat(MuTumpuan as string) || 0);
    const safeVu = Math.max(0, parseFloat(VuTumpuan as string) || 0);
    const safeRebarCount = Math.max(1, parseFloat(rebarCountTumpuan as string) || 2);
    const safeCompRebarCount = Math.max(0, parseFloat(compRebarCountTumpuan as string) || 0);
    const safeStirrupSpacing = Math.max(10, parseFloat(stirrupSpacingTumpuan as string) || 100);

    const input: BeamInput = {
      b: safeB,
      h: safeH,
      cover: safeCover,
      fc: safeFc,
      fy: safeFy,
      fys: safeFys,
      Mu: safeMu,
      Vu: safeVu,
      rebarDiameter: rebarDiameterTumpuan,
      rebarCount: safeRebarCount,
      stirrupDiameter: stirrupDiameterTumpuan,
      stirrupLegs: stirrupLegsTumpuan,
      stirrupSpacing: safeStirrupSpacing,
      isDoubleReinforced: isDoubleTumpuan,
      compressionRebarDiameter: compRebarDiameterTumpuan,
      compressionRebarCount: safeCompRebarCount,
    };
    setResultTumpuan(analyzeBeam(input));
  }, [
    b, h, cover, fc, fy, fys,
    MuTumpuan, VuTumpuan,
    rebarDiameterTumpuan, rebarCountTumpuan,
    isDoubleTumpuan, compRebarDiameterTumpuan, compRebarCountTumpuan,
    stirrupDiameterTumpuan, stirrupLegsTumpuan, stirrupSpacingTumpuan
  ]);

  // Auto calculate Lapangan Zone
  useEffect(() => {
    const safeB = Math.max(50, parseFloat(b as string) || 300);
    const safeH = Math.max(50, parseFloat(h as string) || 500);
    const safeCover = Math.max(10, parseFloat(cover as string) || 40);
    const safeFc = Math.max(5, parseFloat(fc as string) || 30);
    const safeFy = Math.max(100, parseFloat(fy as string) || 420);
    const safeFys = Math.max(100, parseFloat(fys as string) || 280);

    const safeMu = Math.max(0, parseFloat(MuLapangan as string) || 0);
    const safeVu = Math.max(0, parseFloat(VuLapangan as string) || 0);
    const safeRebarCount = Math.max(1, parseFloat(rebarCountLapangan as string) || 2);
    const safeCompRebarCount = Math.max(0, parseFloat(compRebarCountLapangan as string) || 0);
    const safeStirrupSpacing = Math.max(10, parseFloat(stirrupSpacingLapangan as string) || 180);

    const input: BeamInput = {
      b: safeB,
      h: safeH,
      cover: safeCover,
      fc: safeFc,
      fy: safeFy,
      fys: safeFys,
      Mu: safeMu,
      Vu: safeVu,
      rebarDiameter: rebarDiameterLapangan,
      rebarCount: safeRebarCount,
      stirrupDiameter: stirrupDiameterLapangan,
      stirrupLegs: stirrupLegsLapangan,
      stirrupSpacing: safeStirrupSpacing,
      isDoubleReinforced: isDoubleLapangan,
      compressionRebarDiameter: compRebarDiameterLapangan,
      compressionRebarCount: safeCompRebarCount,
    };
    setResultLapangan(analyzeBeam(input));
  }, [
    b, h, cover, fc, fy, fys,
    MuLapangan, VuLapangan,
    rebarDiameterLapangan, rebarCountLapangan,
    isDoubleLapangan, compRebarDiameterLapangan, compRebarCountLapangan,
    stirrupDiameterLapangan, stirrupLegsLapangan, stirrupSpacingLapangan
  ]);

  if (!resultTumpuan || !resultLapangan) return null;

  // Active zone definitions for UI binding
  const isActiveTumpuan = activeZone === "tumpuan";
  const activeResult = isActiveTumpuan ? resultTumpuan : resultLapangan;

  // Helper values for active zone
  const activeMu = isActiveTumpuan ? MuTumpuan : MuLapangan;
  const activeVu = isActiveTumpuan ? VuTumpuan : VuLapangan;
  const activeRebarCount = isActiveTumpuan ? rebarCountTumpuan : rebarCountLapangan;
  const activeRebarDiameter = isActiveTumpuan ? rebarDiameterTumpuan : rebarDiameterLapangan;
  const activeIsDouble = isActiveTumpuan ? isDoubleTumpuan : isDoubleLapangan;
  const activeCompRebarCount = isActiveTumpuan ? compRebarCountTumpuan : compRebarCountLapangan;
  const activeCompRebarDiameter = isActiveTumpuan ? compRebarDiameterTumpuan : compRebarDiameterLapangan;
  const activeStirrupDiameter = isActiveTumpuan ? stirrupDiameterTumpuan : stirrupDiameterLapangan;
  const activeStirrupSpacing = isActiveTumpuan ? stirrupSpacingTumpuan : stirrupSpacingLapangan;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* AT A GLANCE DOUBLE ZONE COMPARATIVE SNAPSHOT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Tumpuan Brief Card */}
        <div 
          onClick={() => setActiveZone("tumpuan")}
          className={`border p-4 rounded-xl cursor-pointer transition duration-300 transform hover:-translate-y-0.5 ${
            isActiveTumpuan 
              ? "bg-slate-900 border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.2)]" 
              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Zona Tumpuan (Support End Area)</span>
            <span className={`px-2 py-0.5 text-[9px] font-mono rounded ${isActiveTumpuan ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>
              {isActiveTumpuan ? "Active View" : "Click to View"}
            </span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-xl font-bold text-white font-mono">
                {rebarCountTumpuan}D{rebarDiameterTumpuan} <span className="text-xs text-slate-500 font-normal">Tarik</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Sengkang: <span className="font-mono text-slate-200">Ø{stirrupDiameterTumpuan}-{stirrupSpacingTumpuan} mm</span>
              </div>
            </div>
            <div className="text-right">
              <div className="flex gap-2 items-center justify-end">
                <span className="text-[10px] text-slate-450 uppercase">Lentur:</span>
                {resultTumpuan.isSafeBending ? (
                  <span className="text-xs font-bold text-green-400 flex items-center gap-1">Aman <CheckCircle className="h-3 w-3" /></span>
                ) : (
                  <span className="text-xs font-bold text-rose-450 flex items-center gap-1">Gagal <XCircle className="h-3 w-3" /></span>
                )}
              </div>
              <div className="flex gap-2 items-center justify-end mt-0.5">
                <span className="text-[10px] text-slate-450 uppercase">Geser:</span>
                {resultTumpuan.isSafeShear ? (
                  <span className="text-xs font-bold text-green-400 flex items-center gap-1">Aman <CheckCircle className="h-3 w-3" /></span>
                ) : (
                  <span className="text-xs font-bold text-rose-450 flex items-center gap-1">Gagal <XCircle className="h-3 w-3" /></span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lapangan Brief Card */}
        <div 
          onClick={() => setActiveZone("lapangan")}
          className={`border p-4 rounded-xl cursor-pointer transition duration-300 transform hover:-translate-y-0.5 ${
            !isActiveTumpuan 
              ? "bg-slate-900 border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.2)]" 
              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Zona Lapangan (Mid-span Area)</span>
            <span className={`px-2 py-0.5 text-[9px] font-mono rounded ${!isActiveTumpuan ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>
              {!isActiveTumpuan ? "Active View" : "Click to View"}
            </span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-xl font-bold text-white font-mono">
                {rebarCountLapangan}D{rebarDiameterLapangan} <span className="text-xs text-slate-500 font-normal">Tarik</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Sengkang: <span className="font-mono text-slate-200">Ø{stirrupDiameterLapangan}-{stirrupSpacingLapangan} mm</span>
              </div>
            </div>
            <div className="text-right">
              <div className="flex gap-2 items-center justify-end">
                <span className="text-[10px] text-slate-450 uppercase">Lentur:</span>
                {resultLapangan.isSafeBending ? (
                  <span className="text-xs font-bold text-green-400 flex items-center gap-1">Aman <CheckCircle className="h-3 w-3" /></span>
                ) : (
                  <span className="text-xs font-bold text-rose-450 flex items-center gap-1">Gagal <XCircle className="h-3 w-3" /></span>
                )}
              </div>
              <div className="flex gap-2 items-center justify-end mt-0.5">
                <span className="text-[10px] text-slate-450 uppercase">Geser:</span>
                {resultLapangan.isSafeShear ? (
                  <span className="text-xs font-bold text-green-400 flex items-center gap-1">Aman <CheckCircle className="h-3 w-3" /></span>
                ) : (
                  <span className="text-xs font-bold text-rose-450 flex items-center gap-1">Gagal <XCircle className="h-3 w-3" /></span>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Input Panels */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-6">
          
          {/* Shared Beam Geometry & Materials */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-400" />
              1. Geometri & Material Utama (Shared)
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
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono transition outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Tinggi Penampang h (mm)
                </label>
                <input
                  type="number"
                  step="any"
                  value={h}
                  onChange={(e) => setH(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono transition outline-none"
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
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono transition outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Kekuatan Beton f'c (MPa)
                </label>
                <input
                  type="number"
                  step="any"
                  value={fc}
                  onChange={(e) => setFc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono transition outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Leleh Lentur fy (MPa)
                </label>
                <input
                  type="number"
                  step="any"
                  value={fy}
                  onChange={(e) => setFy(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono transition outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Leleh Sengkang fys (MPa)
                </label>
                <input
                  type="number"
                  step="any"
                  value={fys}
                  onChange={(e) => setFys(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono transition outline-none"
                />
              </div>
            </div>
          </div>

          {/* ACTIVE ZONE SETTINGS COMPILATION */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            
            {/* Header Zone tab switch */}
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-400" />
                2. Parameter Khusus: {isActiveTumpuan ? "Tumpuan" : "Lapangan"}
              </h3>
              
              <div className="flex bg-[#0b0f1a] rounded p-0.5 border border-slate-800">
                <button
                  onClick={() => setActiveZone("tumpuan")}
                  className={`px-2.5 py-1 rounded text-[10px] font-semibold transition ${
                    isActiveTumpuan 
                      ? "bg-blue-600 text-white" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Tumpuan
                </button>
                <button
                  onClick={() => setActiveZone("lapangan")}
                  className={`px-2.5 py-1 rounded text-[10px] font-semibold transition ${
                    !isActiveTumpuan 
                      ? "bg-blue-600 text-white" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Lapangan
                </button>
              </div>
            </div>

            {/* Bending forces & rebar layout input */}
            <div className="space-y-4">
                           {/* Load demands specific to current active zone */}
              <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Mu Desain {isActiveTumpuan ? "Tumpuan" : "Lapangan"} (kNm)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={isActiveTumpuan ? MuTumpuan : MuLapangan}
                      onChange={(e) => {
                        if (isActiveTumpuan) setMuTumpuan(e.target.value);
                        else setMuLapangan(e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded p-1.5 text-xs text-slate-200 font-mono outline-none"
                    />
                    <span className="absolute right-2 top-2 text-[10px] text-slate-500">kNm</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Vu Desain {isActiveTumpuan ? "Tumpuan" : "Lapangan"} (kN)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={isActiveTumpuan ? VuTumpuan : VuLapangan}
                      onChange={(e) => {
                        if (isActiveTumpuan) setVuTumpuan(e.target.value);
                        else setVuLapangan(e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded p-1.5 text-xs text-slate-200 font-mono outline-none"
                    />
                    <span className="absolute right-2 top-2 text-[10px] text-slate-500">kN</span>
                  </div>
                </div>
              </div>

              {/* Main Tension reinforcement spacing */}
              <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-lg space-y-3">
                <span className="text-xs font-bold text-slate-300 block">Tulangan Lentur Tarik ({isActiveTumpuan ? "Sisi Atas" : "Sisi Bawah"})</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Diameter Rebar</label>
                    <select
                      value={activeRebarDiameter}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isActiveTumpuan) setRebarDiameterTumpuan(val);
                        else setRebarDiameterLapangan(val);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-blue-500 outline-none cursor-pointer"
                    >
                      {STANDARD_BAR_DIAMETERS.map(d => (
                        <option key={d} value={d}>D{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Jumlah Batang (n)</label>
                    <input
                      type="number"
                      step="any"
                      value={activeRebarCount}
                      onChange={(e) => {
                        if (isActiveTumpuan) setRebarCountTumpuan(e.target.value);
                        else setRebarCountLapangan(e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Double Reinforcement Toggle */}
              <div className="flex items-center justify-between px-1 py-1 border-t border-slate-850 mt-2">
                <span className="text-xs font-semibold text-slate-300">Aktifkan Tulangan Tekan Rangkap</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeIsDouble}
                    onChange={(e) => {
                      const val = e.target.checked;
                      if (isActiveTumpuan) setIsDoubleTumpuan(val);
                      else setIsDoubleLapangan(val);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:bg-blue-500 peer-checked:bg-blue-950 border border-slate-700"></div>
                </label>
              </div>

              {/* Compression rebar inputs if active */}
              {activeIsDouble && (
                <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-lg space-y-3 transition animate-fade-in">
                  <span className="text-xs font-bold text-blue-400 block">Tulangan Lentur Tekan ({isActiveTumpuan ? "Sisi Bawah" : "Sisi Atas"})</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] mb-1 text-slate-400">Diameter Rebar</label>
                      <select
                        value={activeCompRebarDiameter}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (isActiveTumpuan) setCompRebarDiameterTumpuan(val);
                          else setCompRebarDiameterLapangan(val);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-blue-500 outline-none cursor-pointer"
                      >
                        {STANDARD_BAR_DIAMETERS.map(d => (
                          <option key={d} value={d}>D{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] mb-1 text-slate-400">Jumlah Batang (n')</label>
                      <input
                        type="number"
                        step="any"
                        value={activeCompRebarCount}
                        onChange={(e) => {
                          if (isActiveTumpuan) setCompRebarCountTumpuan(e.target.value);
                          else setCompRebarCountLapangan(e.target.value);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Stirrups section */}
              <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-lg space-y-3">
                <span className="text-xs font-bold text-slate-300 block">Stirrups / Sengkang Geser</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Diameter Ø(mm)</label>
                    <select
                      value={activeStirrupDiameter}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isActiveTumpuan) setStirrupDiameterTumpuan(val);
                        else setStirrupDiameterLapangan(val);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:border-blue-500 outline-none cursor-pointer"
                    >
                      {[6, 8, 10, 12, 13, 16].map(d => (
                        <option key={d} value={d}>Ø{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Jumlah Kaki</label>
                    <input
                      type="number"
                      step="any"
                      value={isActiveTumpuan ? stirrupLegsTumpuan : stirrupLegsLapangan}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 2;
                        if (isActiveTumpuan) setStirrupLegsTumpuan(val);
                        else setStirrupLegsLapangan(val);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Spasi s (mm)</label>
                    <input
                      type="number"
                      step="any"
                      value={activeStirrupSpacing}
                      onChange={(e) => {
                        if (isActiveTumpuan) setStirrupSpacingTumpuan(e.target.value);
                        else setStirrupSpacingLapangan(e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Analysis, Status and Interactive Diagrams */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-6">
          
          {/* JOINT CAPACITY SATISFACTION SUMMARY BAR */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Metode Desain Kekuatan Batas (LRFD)</span>
              <h2 className="text-sm font-extrabold text-white mt-1">
                Kondisi Komputasi: <span className="text-blue-400 font-mono">{activeZone.toUpperCase()} ZONE</span>
              </h2>
            </div>
            
            <div className="flex gap-4">
              <div className="px-3 py-2 bg-[#0b0f1a] rounded border border-slate-800 text-center shrink-0 w-24">
                <span className="text-[9px] text-slate-400 block font-mono">DCR Lentur</span>
                <span className={`text-sm font-black font-mono block ${activeResult.isSafeBending ? "text-emerald-400" : "text-rose-400"}`}>
                  {(activeMu / (activeResult.phiMn || 1)).toFixed(2)}
                </span>
              </div>
              <div className="px-3 py-2 bg-[#0b0f1a] rounded border border-slate-800 text-center shrink-0 w-24">
                <span className="text-[9px] text-slate-400 block font-mono">DCR Geser</span>
                <span className={`text-sm font-black font-mono block ${activeResult.isSafeShear ? "text-emerald-400" : "text-rose-400"}`}>
                  {(activeVu / (activeResult.phiVn || 1)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* DYNAMIC CROSS SECTION VISUALIZER */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                <span>Visual Penampang Balok ({activeZone.toUpperCase()})</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {b}x{h} mm | Cover {cover}mm
              </span>
            </div>

            <div className="flex flex-col md:flex-row justify-center items-center gap-6 py-4 border border-slate-800 border-dashed rounded-lg bg-slate-950/40">
              
              {/* DYNAMIC CROSS SECTION VISUALIZER */}
              {(() => {
                const bNum = Math.max(100, parseFloat(b as string) || 300);
                const hNum = Math.max(100, parseFloat(h as string) || 500);
                const coverNum = Math.max(10, parseFloat(cover as string) || 40);
                const rebarCountNum = Math.max(1, parseFloat(activeRebarCount as string) || 2);
                const compRebarCountNum = Math.max(0, parseFloat(activeCompRebarCount as string) || 0);

                const maxVal = Math.max(bNum, hNum);
                const margin = maxVal * 0.22; // premium spacing margin

                // Spacing helpers for stirrup
                const stirrupX = coverNum + activeStirrupDiameter / 2;
                const stirrupY = coverNum + activeStirrupDiameter / 2;
                const stirrupW = bNum - 2 * coverNum - activeStirrupDiameter;
                const stirrupH = hNum - 2 * coverNum - activeStirrupDiameter;

                // Center coordinates for steel rebars:
                // Sisi Atas (Top)
                const startTopX = coverNum + activeStirrupDiameter + (isActiveTumpuan ? activeRebarDiameter : activeCompRebarDiameter) / 2;
                const endTopX = bNum - (coverNum + activeStirrupDiameter + (isActiveTumpuan ? activeRebarDiameter : activeCompRebarDiameter) / 2);
                const topY = coverNum + activeStirrupDiameter + (isActiveTumpuan ? activeRebarDiameter : activeCompRebarDiameter) / 2;

                // Sisi Bawah (Bottom)
                const startBotX = coverNum + activeStirrupDiameter + (!isActiveTumpuan ? activeRebarDiameter : activeCompRebarDiameter) / 2;
                const endBotX = bNum - (coverNum + activeStirrupDiameter + (!isActiveTumpuan ? activeRebarDiameter : activeCompRebarDiameter) / 2);
                const bottomY = hNum - (coverNum + activeStirrupDiameter + (!isActiveTumpuan ? activeRebarDiameter : activeCompRebarDiameter) / 2);

                return (
                  <svg 
                    viewBox={`${-margin} ${-margin} ${bNum + 2 * margin} ${hNum + 2.4 * margin}`}
                    className="w-48 h-auto max-h-[220px] overflow-visible"
                    id="beam-cross-section-svg"
                  >
                    {/* Outer concrete rectangle */}
                    <rect 
                      x="0" 
                      y="0" 
                      width={bNum} 
                      height={hNum} 
                      rx={Math.min(bNum, hNum) * 0.04}
                      className="fill-slate-850 stroke-slate-700" 
                      strokeWidth={Math.max(2.5, maxVal * 0.015)}
                    />
                    
                    {/* Dimensions Labels */}
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

                    {/* Cover box representing Stirrup (Sengkang) */}
                    {stirrupW > 0 && stirrupH > 0 && (
                      <rect 
                        x={stirrupX} 
                        y={stirrupY} 
                        width={stirrupW} 
                        height={stirrupH} 
                        rx={Math.max(2, activeStirrupDiameter * 0.3)} 
                        className="fill-none stroke-blue-500/80" 
                        strokeWidth={Math.max(1.5, activeStirrupDiameter / 4)}
                      />
                    )}

                    {/* Stirrup Label */}
                    <text 
                      x={bNum / 2} 
                      y={stirrupY + Math.max(15, maxVal * 0.045)} 
                      textAnchor="middle" 
                      className="fill-blue-300 uppercase font-mono font-bold"
                      fontSize={Math.max(8, maxVal * 0.04)}
                    >
                      Sengkang Ø{isActiveTumpuan ? stirrupDiameterTumpuan : stirrupDiameterLapangan}
                    </text>

                    {/* Top Rebars */}
                    {(() => {
                      const bars: React.ReactNode[] = [];
                      if (isActiveTumpuan) {
                        for (let i = 0; i < rebarCountNum; i++) {
                          const rowSize = rebarCountNum <= 5 ? rebarCountNum : Math.ceil(rebarCountNum / 2);
                          const isSecondRow = i >= rowSize;
                          const indexInRow = isSecondRow ? i - rowSize : i;
                          const itemsInCurrRow = isSecondRow ? rebarCountNum - rowSize : rowSize;
                          const cx = itemsInCurrRow === 1 ? bNum / 2 : startTopX + (indexInRow * (endTopX - startTopX)) / (itemsInCurrRow - 1);
                          const cy = isSecondRow ? topY + activeRebarDiameter + 8 : topY;
                          bars.push(
                            <circle 
                              key={`top-tens-${i}`}
                              cx={cx} 
                              cy={cy} 
                              r={activeRebarDiameter / 2} 
                              className="fill-emerald-400 stroke-emerald-100" 
                              strokeWidth={Math.max(0.6, activeRebarDiameter * 0.1)}
                            />
                          );
                        }
                      } else {
                        if (activeIsDouble && compRebarCountNum > 0) {
                          for (let i = 0; i < compRebarCountNum; i++) {
                            const cx = compRebarCountNum === 1 ? bNum / 2 : startTopX + (i * (endTopX - startTopX)) / (compRebarCountNum - 1);
                            bars.push(
                              <circle 
                                key={`top-comp-${i}`}
                                cx={cx} 
                                cy={topY} 
                                r={activeCompRebarDiameter / 2} 
                                className="fill-cyan-500 stroke-cyan-100" 
                                strokeWidth={Math.max(0.6, activeCompRebarDiameter * 0.1)}
                              />
                            );
                          }
                        } else {
                          const minD = activeCompRebarDiameter > 0 ? activeCompRebarDiameter : 10;
                          bars.push(
                            <circle key="top-hold-l" cx={coverNum + activeStirrupDiameter + minD/2} cy={coverNum + activeStirrupDiameter + minD/2} r={minD/2} className="fill-slate-600 stroke-slate-400" strokeWidth="0.5" />,
                            <circle key="top-hold-r" cx={bNum - (coverNum + activeStirrupDiameter + minD/2)} cy={coverNum + activeStirrupDiameter + minD/2} r={minD/2} className="fill-slate-600 stroke-slate-400" strokeWidth="0.5" />
                          );
                        }
                      }
                      return bars;
                    })()}

                    {/* Bottom Rebars */}
                    {(() => {
                      const bars: React.ReactNode[] = [];
                      if (!isActiveTumpuan) {
                        for (let i = 0; i < rebarCountNum; i++) {
                          const rowSize = rebarCountNum <= 5 ? rebarCountNum : Math.ceil(rebarCountNum / 2);
                          const isSecondRow = i >= rowSize;
                          const indexInRow = isSecondRow ? i - rowSize : i;
                          const itemsInCurrRow = isSecondRow ? rebarCountNum - rowSize : rowSize;
                          const cx = itemsInCurrRow === 1 ? bNum / 2 : startBotX + (indexInRow * (endBotX - startBotX)) / (itemsInCurrRow - 1);
                          const cy = isSecondRow ? bottomY - (activeRebarDiameter + 8) : bottomY;
                          bars.push(
                            <circle 
                              key={`bot-tens-${i}`}
                              cx={cx} 
                              cy={cy} 
                              r={activeRebarDiameter / 2} 
                              className="fill-emerald-400 stroke-emerald-100" 
                              strokeWidth={Math.max(0.6, activeRebarDiameter * 0.1)}
                            />
                          );
                        }
                      } else {
                        if (activeIsDouble && compRebarCountNum > 0) {
                          for (let i = 0; i < compRebarCountNum; i++) {
                            const cx = compRebarCountNum === 1 ? bNum / 2 : startBotX + (i * (endBotX - startBotX)) / (compRebarCountNum - 1);
                            bars.push(
                              <circle 
                                key={`bot-comp-${i}`}
                                cx={cx} 
                                cy={bottomY} 
                                r={activeCompRebarDiameter / 2} 
                                className="fill-cyan-500 stroke-cyan-100" 
                                strokeWidth={Math.max(0.6, activeCompRebarDiameter * 0.1)}
                              />
                            );
                          }
                        } else {
                          const minD = activeCompRebarDiameter > 0 ? activeCompRebarDiameter : 10;
                          bars.push(
                            <circle key="bot-hold-l" cx={coverNum + activeStirrupDiameter + minD/2} cy={hNum - (coverNum + activeStirrupDiameter + minD/2)} r={minD/2} className="fill-slate-600 stroke-slate-400" strokeWidth="0.5" />,
                            <circle key="bot-hold-r" cx={bNum - (coverNum + activeStirrupDiameter + minD/2)} cy={hNum - (coverNum + activeStirrupDiameter + minD/2)} r={minD/2} className="fill-slate-600 stroke-slate-400" strokeWidth="0.5" />
                          );
                        }
                      }
                      return bars;
                    })()}

                    {/* Simple Tension label indicator */}
                    <text 
                      x={bNum / 2} 
                      y={hNum + margin * 0.45} 
                      textAnchor="middle" 
                      className="text-[9.5px] font-mono fill-emerald-400 font-bold uppercase"
                      fontSize={Math.max(9, maxVal * 0.045)}
                    >
                      {isActiveTumpuan ? `${activeRebarCount}D${activeRebarDiameter} (Tarik Atas)` : `${activeRebarCount}D${activeRebarDiameter} (Tarik Bawah)`}
                    </text>
                  </svg>
                );
              })()}

              {/* Param details for currently selected zone */}
              <div className="flex-1 space-y-3 px-4 md:px-0 select-text">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Parameter Hasil ({activeZone.toUpperCase()}):</span>
                
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-450 block text-[9.5px]">Tinggi Efektif d:</span>
                    <span className="font-mono text-slate-250 font-bold">{Math.round(activeResult.d)} mm</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block text-[9.5px]">Luas Baja Tarik As:</span>
                    <span className="font-mono text-emerald-400 font-bold">{Math.round(activeResult.As)} mm²</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block text-[9.5px]">Rasio Tulangan ρ:</span>
                    <span className="font-mono text-slate-200">{(activeResult.rho * 100).toFixed(3)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block text-[9.5px]">Regangan Baja ε_t:</span>
                    <span className="font-mono text-indigo-400 font-bold">{activeResult.concreteStrainEt.toFixed(5)}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block text-[9.5px]">Momen Rencana φMn:</span>
                    <span className="font-mono text-blue-400 font-bold">{activeResult.phiMn.toFixed(1)} kNm</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block text-[9.5px]">Rasio Kapasitas Lentur:</span>
                    <span className={`font-mono font-bold ${activeResult.isSafeBending ? "text-green-400" : "text-rose-450"}`}>
                      {((activeMu / (activeResult.phiMn || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Over-reinforced warning */}
                {activeResult.isOverReinforced && (
                  <div className="bg-rose-950/20 border border-rose-900/45 p-2.5 rounded text-[11px] text-rose-350 flex gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-455 shrink-0 mt-0.5" />
                    <span>
                      <strong>Warning Gagal Getas!</strong> Regangan baja tarik ε_t di bawah batas aman daktilitas (over-reinforced). Kurangi batang baja longitudinal atau ubah geometri.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SIDE-BY-SIDE ANALYTICS SUMMARY TABLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest pb-2 border-b border-slate-850">
              Evaluasi Komparasi Komprehensif (Tumpuan vs Lapangan)
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-text">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] font-mono uppercase">
                    <th className="py-2 px-1">Kriteria Analisis</th>
                    <th className="py-2 px-2 text-center">Zona Tumpuan</th>
                    <th className="py-2 px-2 text-center border-l border-slate-800">Zona Lapangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 font-mono text-slate-300">
                  <tr>
                    <td className="py-2.5 px-1 text-slate-450 font-sans">Momen Desain Utama (Mu)</td>
                    <td className="py-2.5 px-2 text-center text-white">{MuTumpuan} kNm</td>
                    <td className="py-2.5 px-2 text-center text-white border-l border-slate-850">{MuLapangan} kNm</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-1 text-slate-450 font-sans">Kapasitas Lentur (φMn)</td>
                    <td className={`py-2.5 px-2 text-center ${resultTumpuan.isSafeBending ? "text-emerald-400" : "text-rose-400"}`}>
                      {resultTumpuan.phiMn.toFixed(1)} kNm
                    </td>
                    <td className={`py-2.5 px-2 text-center border-l border-slate-850 ${resultLapangan.isSafeBending ? "text-emerald-400" : "text-rose-400"}`}>
                      {resultLapangan.phiMn.toFixed(1)} kNm
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-1 text-slate-450 font-sans">Gaya Geser Desain (Vu)</td>
                    <td className="py-2.5 px-2 text-center text-white">{VuTumpuan} kN</td>
                    <td className="py-2.5 px-2 text-center text-white border-l border-slate-850">{VuLapangan} kN</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-1 text-slate-450 font-sans">Kapasitas Geser (φVn)</td>
                    <td className={`py-2.5 px-2 text-center ${resultTumpuan.isSafeShear ? "text-emerald-400" : "text-rose-400"}`}>
                      {resultTumpuan.phiVn.toFixed(1)} kN
                    </td>
                    <td className={`py-2.5 px-2 text-center border-l border-slate-850 ${resultLapangan.isSafeShear ? "text-emerald-400" : "text-rose-400"}`}>
                      {resultLapangan.phiVn.toFixed(1)} kN
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-1 text-slate-450 font-sans">Spasi Sengkang Terpasang</td>
                    <td className="py-2.5 px-2 text-center text-emerald-400">{stirrupSpacingTumpuan} mm</td>
                    <td className="py-2.5 px-2 text-center text-emerald-400 border-l border-slate-850">{stirrupSpacingLapangan} mm</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-1 text-slate-450 font-sans">Batas Maks. Jarak Stirrup</td>
                    <td className="py-2.5 px-2 text-center text-slate-400">
                      {resultTumpuan.requiredStirrupSpacing ? `${Math.floor(resultTumpuan.requiredStirrupSpacing)} mm` : "N/A"}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-400 border-l border-slate-850">
                      {resultLapangan.requiredStirrupSpacing ? `${Math.floor(resultLapangan.requiredStirrupSpacing)} mm` : "N/A"}
                    </td>
                  </tr>
                  <tr className="bg-slate-950/20">
                    <td className="py-3 px-1 text-slate-350 font-sans font-bold">Kesimpulan Keandalan</td>
                    <td className="py-3 px-2 text-center">
                      {resultTumpuan.isSafeBending && resultTumpuan.isSafeShear ? (
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded font-sans font-bold">AMAN (SAFE)</span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded font-sans font-bold">GAGAL (UNSAFE)</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center border-l border-slate-850">
                      {resultLapangan.isSafeBending && resultLapangan.isSafeShear ? (
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded font-sans font-bold">AMAN (SAFE)</span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded font-sans font-bold">GAGAL (UNSAFE)</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* General commentary with active state alerts */}
            <div className="mt-3 bg-slate-950/60 p-3 rounded border border-slate-850 text-xs text-slate-400 leading-normal gap-2 flex items-start">
              <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block uppercase text-[10px] tracking-wider mb-0.5">Analisis Sengkang Geser ({activeZone.toUpperCase()}):</span>
                <span>{activeResult.shearStatusMessage}</span>
              </div>
            </div>
          </div>

          {/* AI ADVISOR FOR BEAM WITH JOINT CONTROLS */}
          <AiAdvisor 
            type="beam" 
            input={{
              b, h, cover, fc, fy, fys,
              Mu: activeMu,
              Vu: activeVu,
              rebarDiameter: activeRebarDiameter,
              rebarCount: activeRebarCount,
              isDoubleReinforced: activeIsDouble,
              compressionRebarDiameter: activeCompRebarDiameter,
              compressionRebarCount: activeCompRebarCount,
              stirrupDiameter: activeStirrupDiameter,
              stirrupLegs: isActiveTumpuan ? stirrupLegsTumpuan : stirrupLegsLapangan,
              stirrupSpacing: activeStirrupSpacing
            }} 
            result={activeResult} 
          />

        </div>
      </div>
    </div>
  );
}
