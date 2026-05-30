/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { STANDARD_BAR_DIAMETERS } from "../utils/calculations";

export default function RebarGuide() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-100">
      <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
        Panduan & Spesifikasi Tulangan (SNI Deform)
      </h3>
      <p className="text-xs text-slate-400 mb-6 leading-relaxed">
        Berikut adalah referensi diameter nominal tulangan baja sirip (deform) standar di Indonesia 
        beserta perhitungan luas nominal satu batang ($A_s = \frac{1}{4} \pi \phi^2$).
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {STANDARD_BAR_DIAMETERS.map((dia) => {
          const area = (Math.PI * Math.pow(dia, 2)) / 4;
          return (
            <div 
              key={dia} 
              className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 rounded-lg p-3 transition text-center group"
            >
              <div className="text-xs font-mono text-emerald-400 group-hover:scale-105 transition-transform duration-200">
                D{dia}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Dia: <span className="font-mono text-slate-300">{dia} mm</span>
              </div>
              <div className="text-xs font-mono font-semibold text-slate-200 mt-1.5">
                {area.toFixed(1)} <span className="text-[9px] text-slate-400">mm²</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-slate-800/80 pt-4 text-[11px] text-slate-400 space-y-1">
        <div className="flex gap-2">
          <span className="text-emerald-500 font-bold">•</span>
          <span>Baja Tulangan Beton Bertulang umumnya menggunakan BJTS 420B (fy = 420 MPa) untuk sengkang gempabumi khusus dan tulangan longitudinal.</span>
        </div>
        <div className="flex gap-2">
          <span className="text-emerald-500 font-bold">•</span>
          <span>Model ini dikembangkan sesuai acuan **Persyaratan Beton Struktural untuk Bangunan Gedung (SNI 2847-2019)**.</span>
        </div>
      </div>
    </div>
  );
}
