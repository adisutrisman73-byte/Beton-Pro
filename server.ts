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
    } else if (type === "column") {
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
    } else if (type === "footplat") {
      prompt = `
Anda adalah seorang Ahli Geoteknis dan Struktur Pondasi di Indonesia. Berikan rekayasa penilaian, review keamanan, dan petunjuk konstruksi untuk Pondasi Telapak (Footplat / Pad Footing) berdasarkan SNI 2847-2019 dan SNI 8460:2017 (Geoteknik).

**INPUT DESAIN FOOTPLAT:**
- Ukuran Pad: Lebar B = ${input.B} meter, Panjang L = ${input.L} meter, Tebal H = ${input.H} mm
- Kekuatan Material: Beton f'c = ${input.fc} MPa, Baja fy = ${input.fy} MPa
- Beban kolom Ultimate: Aksial Pu = ${input.Pu} kN, Momen B = ${input.MuB} kNm, Momen L = ${input.MuL} kNm
- Tahanan Izin Tanah Aktual: qAllowable = ${input.qAllowable} kPa (kN/m²)

**HASIL INTEGRASI STATIK & KEKUATAN:**
- Tegangan Kontak Maksimum ditiang bawah: qMax = ${result.qMax.toFixed(2)} kPa vs Tegangan Izin Tanah = ${input.qAllowable} kPa
- Status Tegangan Tanah: ${result.isSoilPreSafe ? "AMAN (Di bawah daya dukung izin)" : "BAHAYA (Overstressed / melebih tanah izin!)"}
- Tinggi Efektif d = ${result.d} mm
- Geser Satu Arah (One-Way Beam Shear): Demand Vu = ${result.V_oneWay.toFixed(2)} kN vs φVc = ${result.phiV_oneWay.toFixed(2)} kN -> STATUS: ${result.isOneWayShearSafe ? "Aman" : "Gagal / Terlalu Tipis!"}
- Geser Dua Arah (Two-Way Punching Shear): Demand Vu = ${result.V_punch.toFixed(2)} kN vs φVc = ${result.phiV_punch.toFixed(2)} kN -> STATUS: ${result.isPunchingSafe ? "Aman" : "Gagal Pons / Bahaya Punch!"}
- Momen Lentur Desain Cantilever: Mu = ${result.Mu_designL.toFixed(2)} kNm
- Luas Baja Tarik yang Dibutuhkan: As_required = ${Math.round(result.As_required)} mm²

Tulis analisis sistematis dalam Bahasa Indonesia yang mencakup:
1. **Evaluasi Keamanan Tanah (Geotechnic Check)**: Cara mendistribusikan tegangan tanah dan mitigasi jika ukuran footplat kurang lebar.
2. **Evaluasi Ketebalan Pad terhadap Geser Punching**: Mengapa geser pons krusial dalam pondasi telapak, analisa ketebalan pad saat ini.
3. **Analisa Kebutuhan Tulangan**: Analisa ekonomis tulangan terpasang (As_provided = ${Math.round(result.As_provided)} mm²) dan arah penyetelan besi sengkang/tulangan telapak di lapangan.
4. **Petunjuk Konstruksi**: Berikan saran kedalaman minimum pondasi (dari muka tanah asli) dan perlindungan karat baja (selimut beton pondasi minimal 50-70mm).
`;
    } else if (type === "pile") {
      prompt = `
Anda adalah Geotechnical & Deep Foundation Engineer di Indonesia. Berikan tinjauan komprehensif untuk tiang pondasi dalam (Bored Pile atau Tiang Pancang) berdasarkan standar ketahanan gempa SNI 2847-2019 dan SNI 8460-2017.

**INPUT DESAIN TIANG:**
- Jenis Tiang: ${input.pileType === "circular_bored" ? "Bored Pile (Bulat Cor di tempat)" : "Tiang Pancang (Persegi Precast)"}
- Dimensi: Diameter/Lebar = ${input.size} mm, Kedalaman Tertanam = ${input.length} meter
- Beban Kerja Tiang: Aksial Pu = ${input.Pu} kN, Momen Mu = ${input.Mu} kNm, Geser Vu = ${input.Vu} kN
- Tapis Gesek Selimut (Skin Friction): qs = ${input.qsSkin} kPa, Tahanan Ujung (Tip End): qp = ${input.qpTip} kPa

**HASIL EVALUASI STRUKTURAL & GEOTEKNIS:**
- Daya Dukung Geoteknis Izin (dengan SF 2.5): Q_allowable = ${result.Q_allowable.toFixed(2)} kN vs Desain Kerja Pu = ${input.Pu} kN -> STATUS: ${result.isGeotechSafe ? "Aman Geoteknis" : "GAGAL GEOTEKNIS (Tiang akan amblas!)"}
- Kapasitas Struktural Rencana φPn_max = ${result.phiPnMax.toFixed(2)} kN -> STATUS: ${result.isAxialStructuralSafe ? "Aman struktural aksial" : "GAGAL STRUKTURAL (Beton terancam runtuh)"}
- Kapasitas Geser Struktural φVc = ${result.phiVc.toFixed(2)} kN vs Beban Geser Vu = ${input.Vu} kN -> STATUS: ${result.isShearStructuralSafe ? "Aman Geser" : "Gagal Geser!"}

Tulis analisis mendalam dalam Bahasa Indonesia yang berfokus pada:
1. **Keamanan Interaksi Tanah-Struktur (Soil-Structure Dynamic)**: Bandingkan kontribusi gesekan selimut Q_skin (${result.Q_skin.toFixed(1)} kN) vs tahanan ujung Q_bearing (${result.Q_bearing.toFixed(1)} kN). Manakah yang dominan?
2. **Kesesuaian Struktural Tiang**: Menilai kekuatan material beton f'c = ${input.fc} MPa dan rasio tulangan besi spiral/longitudinal ($\rho$ = ${(result.rho * 100).toFixed(2)}%).
3. **Rekomendasi Konstruksi Lapangan**:
   - Untuk Bored Pile: Mitigasi longsor lubang bor (bentonite slurry), penempatan keranjang besi agar tidak terangkat saat pengecoran, dan pembersihan lumpur dasar lubang bor.
   - Untuk Tiang Pancang: Mitigasi retak tiang akibat palu pancang (pile driving stresses) dan fenomena heaving (tanah naik).
`;
    } else if (type === "pilecap") {
      prompt = `
Anda adalah seorang Ahli Struktur Khusus Pondasi Dalam di Indonesia. Lakukan audit teknis struktural dan analisis keamanan untuk Pile Cap (Tutup Tiang Kelompok) berikut ini berdasarkan kaidah SNI 2847-2019/ACI 318-19.

**INPUT DESAIN PILE CAP:**
- Kelompok Tiang: sejumlah ${input.pileCount} Tiang, Spacing antar Tiang s = ${input.pileSpacing} mm, Diameter Tiang = ${input.pileDiameter} mm
- Ukuran Cap: Lebar B = ${input.capB} m, Panjang L = ${input.capL} m, Tebal H = ${input.capH} mm
- Beban Kolom: Aksial Pu = ${input.Pu} kN, Momen X = ${input.MuX} kNm, Momen Y = ${input.MuY} kNm

**HASIL ANALISIS PILE CAP:**
- Beban Terbesar pada Tiang Tunggal: P_max = ${result.maxPileLoad.toFixed(2)} kN vs Kapasitas Tiang Izin = ${result.phiPn_pileSelf} kN -> STATUS: ${result.isPileOverloaded ? "OVERLOADED (Tiang terancam retak/gagal!)" : "Aman dari Overload"}
- Area Geser Pons Kolom: Perimeter bo = ${result.bo_column} mm, Beban Pons Vu = ${result.Vu_punchColumn.toFixed(1)} kN vs Kapasitas Geser Pons φVc = ${result.phiVu_punchColumn.toFixed(1)} kN -> STATUS: ${result.isColumnPunchSafe ? "Aman Terhadap Pons Kolom" : "GAGAL GESER PONS KOLOM!"}
- Area Geser Pons Tiang sudut: Vu_punch = ${result.Vu_punchPile.toFixed(1)} kN vs Kapasitas pons tiang φVc = ${result.phiVu_punchPile.toFixed(1)} kN -> STATUS: ${result.isPilePunchSafe ? "Aman Terhadap Pons Tiang" : "GAGAL GESER PONS TIANG!"}
- Momen Lentur Desain Penting: Mu_X = ${result.MuX_critical.toFixed(1)} kNm, Mu_Y = ${result.MuY_critical.toFixed(1)} kNm

Berikan laporan rekayasa profesional terstruktur dalam Bahasa Indonesia:
1. **Analisa Distribusi Gaya**: Menafsirkan gaya transmisi dari kolom ke tiang-tiang pancang. Apakah momen eksentrisitas memicu beban tiang yang tidak merata?
2. **Kekuatan Geser Pons (Punching Shear Crucial Audit)**: Mengulas ketahanan pile cap terhadap jebolnya tiang pancang tunggal maupun tiang kelompok di bawah kolom.
3. **Penulangan Lentur Bawah (Tension Reinforcement Grid)**: Evaluasi luas tulangan baja terpasang vs rasio minimum (AsX_required = ${Math.round(result.AsX_required)} mm², AsY_required = ${Math.round(result.AsY_required)} mm²). Jelaskan mengapa pile cap membutuhkan detailing penjangkaran (hook anchor) yang kuat.
4. **Petunjuk Pengecoran Pile Cap**: Rekomendasikan perawatan beton masif (mass concrete) karena tebalnya penampang pile cap seringkali memicu retak termal.
`;
    } else if (type === "framing") {
      prompt = `
Anda adalah seorang Ahli Perencanaan Struktur Portal Beton Bertulang Senior di Indonesia. Berikan tinjauan kegempaan (seismic framing review), evaluasi dimensi balok dan kolom, serta rekomendasi perbaikan struktur berdasarkan standar SNI 2847-2019.

**SISTEM PORTAL YANG DI-SKETSA:**
- Jumlah Kolom (Node): ${input.nodes.length} kolom
- Jumlah Balok (Slab/Beam Spans): ${input.beams.length} balok
- Status Keamanan Keseluruhan: ${result.overallStatusSafe ? "AMAN (Seluruh balok & kolom memenuhi syarat DCR)" : "BAHAYA (Beberapa elemen overstressed!)"}

**RINCIAN ELEMEN SKETSA:**
Columns:
${input.nodes.map((n: any, i: number) => {
  const r = result.nodes[n.id] || { PuTotal: 0, phiPn: 0, DCR: 0, isSafe: true };
  return `- Kolom #${i+1} (Grid x:${n.gridX}, y:${n.gridY}): Dimensi ${n.b}x${n.h} mm, f'c ${n.fc} MPa, Beban Terpusat ${n.directLoad || 0} kN + Berat Sendiri. Total beban Pu = ${r.PuTotal.toFixed(1)} kN vs Kapasitas φPn = ${r.phiPn.toFixed(1)} kN [DCR = ${r.DCR.toFixed(2)}] -> Status: ${r.isSafe ? "AMAN" : "GAGAL (Overstressed)"}`;
}).join('\n')}

Beams:
${input.beams.map((b: any, i: number) => {
  const r = result.beams[b.id] || { spanLength: 0, Mu: 0, phiMn: 0, DCR_bending: 0, isSafe: true };
  return `- Balok #${i+1}: Span ${r.spanLength.toFixed(1)} meter, Dimensi ${b.b}x${b.h} mm, Beban Merata q_u = ${b.uniformLoad.toFixed(1)} kN/m, Momen Lentur Mu = ${r.Mu.toFixed(1)} kNm vs Kapasitas φMn = ${r.phiMn.toFixed(1)} kNm [DCR Bending = ${r.DCR_bending.toFixed(2)}] -> Status: ${r.isSafe ? "AMAN" : "GAGAL"}`;
}).join('\n')}

Berikan analisis rekayasa terstruktur dalam Bahasa Indonesia yang mencakup:
1. **Evaluasi Layout Grid Portal**: Tinjau kesesuaian bentang balok (span lengths) dan susunan kolom pembagi struktur.
2. **Review Kuat Batas Balok & Kolom**: Bandingkan rasio kapasitas (DCR). Analisis apakah dimensi balok terlalu ramping (menyebabkan lendutan/momen terlalu besar) atau dimensi kolom kurang kokoh menopang beban tributary.
3. **Konsep Strong Column-Weak Beam**: Berikan penjelasan pentingnya filosofi desain kegempaan nasional (Strong Column-Weak Beam) di mana kolom harus memiliki kapasitas minimal 1.2 kali lebih kuat dari balok yang berpotongan agar terhindar dari keruntuhan geser tiba-tiba.
4. **Saran Praktis Lapangan**: Berikan penyetelan ulang dimensi (sizing), peningkatan mutu f'c, atau konfigurasi jarak sengkang di wilayah tumpuan daerah sendi plastis (plastic hinges).
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
