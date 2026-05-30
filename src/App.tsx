/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Hammer, CircleGauge, Award, BookOpen, Layers, ShieldCheck, Cpu } from "lucide-react";
import BeamCalculator from "./components/BeamCalculator";
import ColumnCalculator from "./components/ColumnCalculator";
import RebarGuide from "./components/RebarGuide";

type ActiveTab = "beam" | "column" | "rebars";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("beam");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-350 font-sans selection:bg-blue-500/20 selection:text-blue-300">
      
      {/* HEADER SECTION */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white uppercase">
                BETON<span className="text-blue-400 italic">PRO</span> <span className="text-slate-500 font-normal ml-2 text-xs font-mono hidden sm:inline">v2.4.1 Analysis Engine</span>
              </h1>
              <p className="text-[9px] text-slate-400 font-mono tracking-wider uppercase">
                SNI 2847:2019 / ACI 318-19 COMPLIANT
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <div className="hidden md:flex items-center gap-1.5 bg-slate-900/40 px-2.5 py-1 rounded border border-slate-800">
              <Cpu className="h-3.5 w-3.5 text-blue-400" />
              <span>Engine Solver: V2.4.1</span>
            </div>
            <div className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-medium text-green-400 uppercase tracking-tighter">Engine: Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* CORE HERO SUMMARY BLOCK */}
      <div className="bg-slate-900/40 border-b border-slate-800/80 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Perhitungan Struktur Beton Bertulang Praktis</span>
              </h2>
              <p className="text-xs text-slate-400 max-w-2xl mt-1 leading-relaxed">
                Platform rekayasa ketahanan gempa untuk menganalisis keandalan balok terhadap momen lentur dan geser, 
                serta generate diagram interaksi aksial-momen (P-M) kolom beton secara real-time.
              </p>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex bg-[#0b0f1a] border border-slate-800 rounded-lg p-1 self-start md:self-center shrink-0">
              <button
                onClick={() => setActiveTab("beam")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === "beam"
                    ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <CircleGauge className="h-3.5 w-3.5" />
                Balok (Beam)
              </button>
              <button
                onClick={() => setActiveTab("column")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === "column"
                    ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Kolom (Column)
              </button>
              <button
                onClick={() => setActiveTab("rebars")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === "rebars"
                    ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Baja Rebar (Indo)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BODY CONTENT ROUTER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === "beam" && <BeamCalculator />}
        {activeTab === "column" && <ColumnCalculator />}
        {activeTab === "rebars" && <RebarGuide />}

      </main>

      {/* STYLISH FOOTER */}
      <footer className="border-t border-slate-900/80 bg-slate-950 mt-16 py-8 text-center text-[10.5px] text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Mematuhi Standar Komputasi SNI 2847-2019 / ACI 318-19</span>
          </div>
          <div>
            <span>CivilBeton Analytics © {new Date().getFullYear()} • Dirancang Sesuai Kaidah Struktur Tahan Gempa</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
