/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Sparkles, Loader2, MessageSquare, AlertCircle, Copy, Check } from "lucide-react";
import { BeamInput, BeamAnalysisResult, ColumnInput, ColumnAnalysisResult } from "../types";

interface AiAdvisorProps {
  type: "beam" | "column";
  input: BeamInput | ColumnInput;
  result: BeamAnalysisResult | ColumnAnalysisResult;
}

export default function AiAdvisor({ type, input, result }: AiAdvisorProps) {
  const [advice, setAdvice] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const getAiRecommendation = async () => {
    setLoading(true);
    setError("");
    setAdvice("");

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          input,
          result,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menghubungi pusat analis AI.");
      }

      const data = await response.json();
      setAdvice(data.advice || "Tidak ada saran.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Terdapat kegagalan koneksi ke API asisten.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(advice);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Safe light markdown formatter for our API responses
  const renderMarkdownText = (text: string) => {
    if (!text) return null;
    
    // Split lines
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      
      // Headers
      if (trimmed.startsWith("###")) {
        return (
          <h4 key={idx} className="text-base font-bold text-emerald-400 mt-4 mb-2 flex items-center gap-1.5 border-b border-slate-800 pb-1">
            {trimmed.replace(/^###\s*/, "")}
          </h4>
        );
      }
      if (trimmed.startsWith("##")) {
        return (
          <h3 key={idx} className="text-lg font-bold text-emerald-300 mt-5 mb-3">
            {trimmed.replace(/^##\s*/, "")}
          </h3>
        );
      }
      if (trimmed.startsWith("#")) {
        return (
          <h2 key={idx} className="text-xl font-extrabold text-white mt-6 mb-3 border-l-4 border-emerald-500 pl-3">
            {trimmed.replace(/^#\s*/, "")}
          </h2>
        );
      }

      // Check bullet list
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        const content = trimmed.replace(/^[-*]\s*/, "");
        return (
          <li key={idx} className="ml-5 list-disc text-sm text-slate-300 mb-1 leading-relaxed">
            {parseInlineStyles(content)}
          </li>
        );
      }

      // Default paragraph
      if (trimmed === "") {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="text-sm text-slate-300 mb-2 leading-relaxed">
          {parseInlineStyles(trimmed)}
        </p>
      );
    });
  };

  // Mini-parser for bold **text** or inline code `code`
  const parseInlineStyles = (content: string) => {
    const parts: React.ReactNode[] = [];
    let currentText = content;
    let keyIdx = 0;

    while (currentText.length > 0) {
      const boldIdx = currentText.indexOf("**");
      const codeIdx = currentText.indexOf("`");

      // No markers left
      if (boldIdx === -1 && codeIdx === -1) {
        parts.push(<span key={keyIdx++}>{currentText}</span>);
        break;
      }

      // Decide which one is closer
      if (boldIdx !== -1 && (codeIdx === -1 || boldIdx < codeIdx)) {
        // Handle bold
        if (boldIdx > 0) {
          parts.push(<span key={keyIdx++}>{currentText.slice(0, boldIdx)}</span>);
        }
        const nextBold = currentText.indexOf("**", boldIdx + 2);
        if (nextBold !== -1) {
          const boldText = currentText.slice(boldIdx + 2, nextBold);
          parts.push(<strong key={keyIdx++} className="font-semibold text-emerald-300">{boldText}</strong>);
          currentText = currentText.slice(nextBold + 2);
        } else {
          parts.push(<span key={keyIdx++}>**</span>);
          currentText = currentText.slice(boldIdx + 2);
        }
      } else {
        // Handle inline code
        if (codeIdx > 0) {
          parts.push(<span key={keyIdx++}>{currentText.slice(0, codeIdx)}</span>);
        }
        const nextCode = currentText.indexOf("`", codeIdx + 1);
        if (nextCode !== -1) {
          const codeText = currentText.slice(codeIdx + 1, nextCode);
          parts.push(
            <code key={keyIdx++} className="bg-slate-950 px-1.5 py-0.5 rounded font-mono text-xs text-amber-300 border border-slate-805">
              {codeText}
            </code>
          );
          currentText = currentText.slice(nextCode + 1);
        } else {
          parts.push(<span key={keyIdx++}>`</span>);
          currentText = currentText.slice(codeIdx + 1);
        }
      }
    }

    return parts;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-100 mt-6 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute right-0 top-0 -mr-6 -mt-6 h-28 w-28 bg-emerald-500/5 rounded-full blur-2xl"></div>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            Asisten AI Penasihat Struktur (Gemini)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Kirim parameter komputasi Anda untuk mendapatkan tinjauan kelayakan, optimalisasi & sengkang lapangan dari pakar AI.
          </p>
        </div>
        
        {!advice && !loading && (
          <button
            onClick={getAiRecommendation}
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white rounded-lg font-medium text-xs shadow-lg shadow-emerald-950/20 active:scale-[0.98] transition cursor-pointer self-start sm:self-center"
          >
            <MessageSquare className="h-4 w-4" />
            Minta Analisis Struktur AI
          </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 gap-3">
          <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
          <p className="text-sm font-medium text-slate-300 animate-pulse">Menghitung matriks penampang...</p>
          <p className="text-xs text-slate-500 max-w-sm">
            Kecerdasan Buatan sedang mengevaluasi rasio baja terhadap beton dengan kriteria daktilitas SNI 2847-2019.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-lg p-4 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Kesalahan Komunikasi</span>
            {error} (Pastikan Kunci API Gemini Anda sudah terpasang di Secrets Panel).
          </div>
        </div>
      )}

      {advice && !loading && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-800/40 px-3 py-2 rounded-lg border border-slate-800">
            <span>Rekomendasi dari Asisten Rekayasa Struktur Utama • Selesai</span>
            <div className="flex items-center gap-2">
              <button
                onClick={copyToClipboard}
                className="hover:text-emerald-400 flex items-center gap-1.5 transition px-2 py-1 hover:bg-slate-800 rounded text-[11px]"
                title="Salin hasil konsultasi"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Salin</span>
                  </>
                )}
              </button>
              <button
                onClick={getAiRecommendation}
                className="hover:text-emerald-400 flex items-center gap-1.5 transition px-2 py-1 hover:bg-slate-800 rounded text-[11px]"
              >
                <span>Analisis Ulang</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-lg max-h-[500px] overflow-y-auto custom-scrollbar-slate">
            {renderMarkdownText(advice)}
          </div>
        </div>
      )}
    </div>
  );
}
