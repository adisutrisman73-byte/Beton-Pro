/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize GoogleGenAI API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json());

// API: Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API: Consultation with Structural Expert (Gemini)
app.post("/api/explain", async (req, res) => {
  try {
    const { type, input, result } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: "Kunci API Gemini tidak ditemukan di server. Silakan konfigurasi di platform AI Studio." 
      });
    }

    let prompt = "";
    if (type === "beam") {
      prompt = `
Anda adalah seorang Ahli Struktur Beton Bertulang Senior di Indonesia. Berikan tinjauan profesional, kritik, rekomendasi, dan solusi optimasi untuk desain balok beton bertulang berikut ini berdasarkan standar SNI 2847-2019 (atau ACI 318-19).

**INPUT DESAIN BALOK:**
- Dimensi penampang: Lebar b = ${input.b} mm, Tinggi h = ${input.h} mm, Selimut d' = ${input.cover} mm
- Kekuatan Material: Beton f'c = ${input.fc} MPa, Baja Utama fy = ${input.fy} MPa, Sengkang fys = ${input.fys} MPa
- Beban Ultimate: Momen Mu = ${input.Mu} kNm, Geser Vu = ${input.Vu} kN
- Tulangan Tarik Aktual: ${input.rebarCount} batang diameter D${input.rebarDiameter} (As = ${Math.round(result.As)} mm²)
- Tulangan Tekan Aktual (jika ada): ${input.isDoubleReinforced ? `${input.compressionRebarCount} batang diameter D${input.compressionRebarDiameter} (As' = ${Math.round(result.AsPrime)} mm²)` : "Nihil (Singly Reinforced)"}
- Tulangan Sengkang Aktual: Diameter Ø${input.stirrupDiameter} dengan ${input.stirrupLegs} kaki, spasi s = ${input.stirrupSpacing} mm

**HASIL ANALISIS MATEMATIS:**
- Tinggi Efektif d = ${Math.round(result.d)} mm
- Rasio Tulangan ρ = ${result.rho.toFixed(5)} (Rasio minimum ρ_min = ${result.rhoMin.toFixed(5)}, Rasio seimbang ρ_b = ${result.rhoBalanced.toFixed(5)})
- Regangan Baja Tarik (ε_t) = ${result.concreteStrainEt.toFixed(5)}
- Status Kelenturan: ${result.isOverReinforced ? "OVER-REINFORCED (Gagal Getas / Tidak Diizinkan)" : "Ductile (Tension Controlled)"}
- Kapasitas Momen Rencana: φMn = ${result.phiMn.toFixed(2)} kNm vs Beban Mu = ${input.Mu} kNm -> STATUS: ${result.isSafeBending ? "Aman Terhadap Lentur" : "TIDAK AMAN TERHADAP LENTUR (Overstressed!)"}
- Gaya Geser Nominal Beton: Vc = ${result.Vc.toFixed(2)} kN
- Gaya Geser Sengkang Aktual: Vs = ${result.Vs.toFixed(2)} kN
- Kapasitas Geser Rencana: φVn = ${result.phiVn.toFixed(2)} kN vs Beban Vu = ${input.Vu} kN -> STATUS: ${result.isSafeShear ? "Aman Terhadap Geser" : "TIDAK AMAN TERHADAP GESER!"}
- Catatan Sengkang: ${result.shearStatusMessage}

Tulis analisis terstruktur yang padat dan praktis dalam Bahasa Indonesia yang berfokus pada:
1. **Evaluasi Keamanan**: Apakah aman lentur dan geser? Apakah rasio tulangan melanggar batas daktilitas?
2. **Kesesuaian Dimensi**: Apakah rasio b/h cukup proporsional?
3. **Optimasi Struktur**: Jika tidak aman, berikan langkah perbaikan konkret (misal: naikkan f'c, tambah tulangan, atau besarkan penampang). Jika over-reinforced, jelaskan solusinya. Jika terlalu aman (boros), sarankan pengurangan yang rasional.
4. **Detail Sengkang**: Berikan rekomendasi spasi sengkang di area tumpuan (1/4 bentang) vs lapangan (1/2 bentang) secara praktis di lapangan kerja.

Jaga agar nada profesional, mendidik, dan aplikatif untuk civitas teknik/praktisi proyek di Indonesia. Gunakan format Markdown yang rapi dengan poin-poin yang mudah dibaca.
`;
    } else {
      // Column
      prompt = `
Anda adalah seorang Ahli Struktur Beton Bertulang Senior di Indonesia. Berikan tinjauan profesional dan rekomendasi optimasi untuk desain KOLOM beton bertulang berikut ini berdasarkan standar SNI 2847-2019 (atau ACI 318-19).

**INPUT DESAIN KOLOM:**
- Dimensi penampang rectangular: Lebar b = ${input.b} mm, Kedalaman (tinggi) h = ${input.h} mm, Selimut d' = ${input.cover} mm
- Kekuatan Material: Beton f'c = ${input.fc} MPa, Baja fy = ${input.fy} MPa
- Beban Kerja Ultimate: Gaya Aksial Pu = ${input.Pu} kN, Momen Lentur Mu = ${input.Mu} kNm
- Rebar Utama: Diameter D${input.rebarDiameter}

**HASIL ANALISIS MATEMATIS:**
- Luas Bruto Ag = ${Math.round(result.Ag)} mm²
- Luas Baja Aktual Ast = ${Math.round(result.Ast)} mm² (Rasio tulangan ρ_st = ${result.rho.toFixed(4)} atau ${(result.rho * 100).toFixed(2)}%)
- Batas Kelayakan Rasio Tulangan Kolom: ${result.isRatioValid ? "MEMENUHI BATAS (1% - 8%)" : "TIDAK MEMENUHI BATAS (Harus di antara 1% - 8%)"}
- Kapasitas Aksial Rencana Maksimum: φPn_max = ${Math.round(result.phiPnMax)} kN
- Status Kapasitas Gabungan (P-M Interaction Diagram): ${result.currentLoadSafe ? "AMAN (Titik Pu,Mu berada di dalam diagram interaksi)" : "TIDAK AMAN (Titik Pu,Mu di luar batas kapasitas!)"}
- Rasio Kapasitas (Combined Stress Ratio): ${(result.capacityRatio * 100).toFixed(1)}%

Tulis analisis terstruktur yang padat dan praktis dalam Bahasa Indonesia yang berfokus pada:
1. **Evaluasi Diagram Interaksi**: Jelaskan posisi koordinat beban aksial Pu dan momen Mu saat ini terhadap diagram interaksi (apakah mendekati kegagalan tarik, kegagalan tekan/balance, atau kelebihan beban aksial murni).
2. **Kesesuaian Rasio Tulangan (ρ_st)**: Apakah ekonomis? (Dalam praktik Indonesia, angka 1.5% - 3.5% adalah ideal. Di atas 4% akan menyulitkan pengecoran/honeycomb pada sambungan balok-kolom/lubang sengkang).
3. **Rekomendasi Optimasi Praktis**: Bagaimana menyiasati kapasitas jika tidak aman, atau bagaimana merasionalisasi dimensi penampang jika rasio kapasitas di bawah 50% (over-designed).
4. **Ketentuan Sengkang Ikat (Sengkang Kolom)**: Rekomendasikan spasi sengkang ikat kolom berdasarkan peraturan (misal: minimum dari 16x diameter tulangan utama, 48x diameter sengkang, atau dimensi terkecil kolom).

Jaga agar nada profesional, mendidik, dan aplikatif untuk praktisi lapangan di Indonesia. Gunakan format Markdown yang rapi dengan poin-poin yang mudah dibaca.
`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ advice: response.text });
  } catch (error: any) {
    console.error("Gemini advice API error:", error);
    res.status(500).json({ error: error.message || "Gagal mendapatkan penjelasan AI" });
  }
});

// Configure Vite or Serve Static Files
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite HMR integration...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

setupServer();
