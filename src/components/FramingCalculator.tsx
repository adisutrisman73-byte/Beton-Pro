/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  Sparkles, 
  Trash2, 
  Info, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  Maximize, 
  RefreshCw, 
  HelpCircle, 
  Layers, 
  Plus, 
  ArrowDownToLine, 
  MousePointer, 
  Dices,
  BookOpen,
  Download,
  AlertCircle,
  FileText,
  Scaling,
  Anchor
} from "lucide-react";
import { FrameNode, FrameBeam, FrameLayoutAnalysis } from "../types";
import { analyzeFrameLayout, STANDARD_BAR_DIAMETERS } from "../utils/calculations";
import AiAdvisor from "./AiAdvisor";

// Grid configuration for 2D Top View Floor Plan (Denah 2D)
const GRID_COLS = 7; // X indices: 0 to 6
const GRID_ROWS = 5; // Y indices: 0 to 4
const GRID_SPACING_X = 100; // SVG space pixels spacing
const GRID_SPACING_Y = 80;  // SVG space pixels spacing
const OFFSET_X = 80;        // Margin left for bubbles
const OFFSET_Y = 70;        // Margin top for bubbles

// Helper to convert grid coordinates to SVG pixel space
function gridToPx(gx: number, gy: number) {
  return {
    x: gx * GRID_SPACING_X + OFFSET_X,
    y: gy * GRID_SPACING_Y + OFFSET_Y
  };
}

/**
 * Highly compatible and robust ASCII DXF File Exporter
 * Generates industry-compliant layers which open perfectly in AutoCAD, nanoCAD, GstarCAD,
 * DraftSight, ZwCAD, SolidWorks, etc., where it can be saved as a native DWG.
 */
function generateDXF(nodes: FrameNode[], beams: FrameBeam[], spacingInMeters: number): string {
  const lines: string[] = [];
  
  // 1. File Header Section
  lines.push("  0");
  lines.push("SECTION");
  lines.push("  2");
  lines.push("HEADER");
  lines.push("  0");
  lines.push("ENDSEC");
  
  // 2. Layers Definitions Table (Standard colors index: 1=Red, 2=Yellow, 3=Green, 4=Cyan, 5=Blue, 8=Dark Grey)
  lines.push("  0");
  lines.push("SECTION");
  lines.push("  2");
  lines.push("TABLES");
  lines.push("  0");
  lines.push("TABLE");
  lines.push("  2");
  lines.push("LAYER");
  lines.push(" 70");
  lines.push("10");
  
  const defineLayer = (name: string, color: number) => {
    lines.push("  0");
    lines.push("LAYER");
    lines.push("  2");
    lines.push(name);
    lines.push(" 70");
    lines.push("0");
    lines.push(" 62");
    lines.push(color.toString());
    lines.push("  6");
    lines.push("CONTINUOUS");
  };

  defineLayer("GRID_AXIS", 8);       // Grey dashed axis grid
  defineLayer("KOLOM_BETON", 3);     // Green columns
  defineLayer("BALOK_LANTAI", 1);    // Red framing beams
  defineLayer("DIMENSI_PLAN", 5);    // Blue dimension lines
  defineLayer("DESKRIPSI_TEKS", 4);  // Cyan annotations
  
  lines.push("  0");
  lines.push("ENDTAB");
  lines.push("  0");
  lines.push("ENDSEC");
  
  // 3. Drawing Entities Section
  lines.push("  0");
  lines.push("SECTION");
  lines.push("  2");
  lines.push("ENTITIES");

  // Auxiliary core CAD entities generators
  const dLine = (x1: number, y1: number, x2: number, y2: number, layer: string) => {
    lines.push("  0");
    lines.push("LINE");
    lines.push("  8");
    lines.push(layer);
    lines.push(" 10");
    lines.push(x1.toFixed(1));
    lines.push(" 20");
    lines.push(y1.toFixed(1));
    lines.push(" 30");
    lines.push("0.0");
    lines.push(" 11");
    lines.push(x2.toFixed(1));
    lines.push(" 21");
    lines.push(y2.toFixed(1));
    lines.push(" 31");
    lines.push("0.0");
  };

  const dRect = (cx: number, cy: number, w: number, h: number, layer: string) => {
    const xL = cx - w / 2;
    const xR = cx + w / 2;
    const yB = cy - h / 2;
    const yT = cy + h / 2;
    
    // Bounds wireframe outline
    dLine(xL, yB, xR, yB, layer);
    dLine(xR, yB, xR, yT, layer);
    dLine(xR, yT, xL, yT, layer);
    dLine(xL, yT, xL, yB, layer);
    
    // Hatch details crossover
    dLine(xL, yB, xR, yT, layer);
    dLine(xL, yT, xR, yB, layer);
  };

  const dText = (text: string, x: number, y: number, height: number, layer: string, rotation = 0) => {
    lines.push("  0");
    lines.push("TEXT");
    lines.push("  8");
    lines.push(layer);
    lines.push(" 10");
    lines.push(x.toFixed(1));
    lines.push(" 20");
    lines.push(y.toFixed(1));
    lines.push(" 40");
    lines.push(height.toFixed(1));
    lines.push("  1");
    lines.push(text);
    if (rotation !== 0) {
      lines.push(" 50");
      lines.push(rotation.toString());
    }
  };

  // Convert grid indices to millimeters (practical standard metric drawing scale in Indonesia CAD office)
  const mul = spacingInMeters * 1000;

  // Limits tracking
  let minGridX = 0, maxGridX = GRID_COLS - 1;
  let minGridY = 0, maxGridY = GRID_ROWS - 1;

  if (nodes.length > 0) {
    minGridX = Math.min(...nodes.map(n => n.gridX));
    maxGridX = Math.max(...nodes.map(n => n.gridX));
    minGridY = Math.min(...nodes.map(n => n.gridY));
    maxGridY = Math.max(...nodes.map(n => n.gridY));
  }

  // Draw dashed grid lines and bubble IDs
  const ext = mul * 0.4; // grid line extends beyond outer columns outline
  
  // Vertical grids (columns letters: A, B, C...)
  for (let gx = minGridX; gx <= maxGridX; gx++) {
    const xVal = gx * mul;
    const yStart = -maxGridY * mul - ext;
    const yEnd = -minGridY * mul + ext;
    
    dLine(xVal, yStart, xVal, yEnd, "GRID_AXIS");
    
    const letter = String.fromCharCode(65 + gx); // A, B, C...
    dText(letter, xVal - 50, yEnd + 100, 160, "GRID_AXIS");
    dText(letter, xVal - 50, yStart - 250, 160, "GRID_AXIS");
  }

  // Horizontal grids (numeric identifiers: 1, 2, 3...)
  for (let gy = minGridY; gy <= maxGridY; gy++) {
    const yVal = -gy * mul;
    const xStart = minGridX * mul - ext;
    const xEnd = maxGridX * mul + ext;
    
    dLine(xStart, yVal, xEnd, yVal, "GRID_AXIS");
    
    const num = (gy + 1).toString();
    dText(num, xStart - 300, yVal - 50, 160, "GRID_AXIS");
    dText(num, xEnd + 150, yVal - 50, 160, "GRID_AXIS");
  }

  // Draw Column elements inside layers
  nodes.forEach((node) => {
    const cx = node.gridX * mul;
    const cy = -node.gridY * mul;
    
    // Concrete Column box layout
    dRect(cx, cy, node.b, node.h, "KOLOM_BETON");
    
    // Label annotations
    dText(`KOLOM ${node.b}x${node.h}`, cx - node.b/2, cy + node.h/2 + 100, 90, "DESKRIPSI_TEKS");
    dText(`f'c ${node.fc} MPa`, cx - node.b/2, cy + node.h/2 + 200, 75, "DESKRIPSI_TEKS");
    if (node.directLoad > 0) {
      dText(`PL: ${node.directLoad} kN`, cx - node.b/2, cy - node.h/2 - 120, 80, "DESKRIPSI_TEKS");
    }
  });

  // Draw Structural Framing Beams (double line outlines and labels)
  beams.forEach((beam) => {
    const startNode = nodes.find(n => n.id === beam.startNodeId);
    const endNode = nodes.find(n => n.id === beam.endNodeId);
    if (!startNode || !endNode) return;

    const x1 = startNode.gridX * mul;
    const y1 = -startNode.gridY * mul;
    const x2 = endNode.gridX * mul;
    const y2 = -endNode.gridY * mul;

    // Core center axis line 
    dLine(x1, y1, x2, y2, "BALOK_LANTAI");

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length > 0) {
      // 2D offsets vector representing concrete width (b)
      const px = -dy / length;
      const py = dx / length;
      const hWidth = beam.b / 2;

      // Left boundary wall
      dLine(x1 + px * hWidth, y1 + py * hWidth, x2 + px * hWidth, y2 + py * hWidth, "BALOK_LANTAI");
      // Right boundary wall
      dLine(x1 - px * hWidth, y1 - py * hWidth, x2 - px * hWidth, y2 - py * hWidth, "BALOK_LANTAI");

      // Mid-span annotation label with angle rotation matching the beam direction
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      if (angle < -90) angle += 180;
      if (angle > 90) angle -= 180;

      dText(
        `BALOK B ${beam.b}x${beam.h} (q=${beam.uniformLoad} kN/m)`,
        midX - 120 * Math.sin(angle * Math.PI / 180),
        midY + 120 * Math.cos(angle * Math.PI / 180),
        95,
        "DESKRIPSI_TEKS",
        Math.round(angle)
      );
    }
  });

  // Draw Dimension chains with tickers
  const yDimBase = -maxGridY * mul - ext * 1.5;
  for (let gx = minGridX; gx < maxGridX; gx++) {
    const x1 = gx * mul;
    const x2 = (gx + 1) * mul;
    
    // Dimension bar
    dLine(x1, yDimBase, x2, yDimBase, "DIMENSI_PLAN");
    // Standard CAD tickers
    dLine(x1 - 60, yDimBase - 60, x1 + 60, yDimBase + 60, "DIMENSI_PLAN");
    dLine(x2 - 60, yDimBase - 60, x2 + 60, yDimBase + 60, "DIMENSI_PLAN");
    // Text value
    dText(`${spacingInMeters.toFixed(2)} m`, (x1 + x2) / 2 - 100, yDimBase + 100, 110, "DIMENSI_PLAN");
  }

  // Vertical axis dimensioning chains on left side
  const xDimBase = minGridX * mul - ext * 1.5;
  for (let gy = minGridY; gy < maxGridY; gy++) {
    const y1 = -gy * mul;
    const y2 = -(gy + 1) * mul;
    
    dLine(xDimBase, y1, xDimBase, y2, "DIMENSI_PLAN");
    dLine(xDimBase - 60, y1 - 60, xDimBase + 60, y1 + 60, "DIMENSI_PLAN");
    dLine(xDimBase - 60, y2 - 60, xDimBase + 60, y2 + 60, "DIMENSI_PLAN");
    dText(`${spacingInMeters.toFixed(2)} m`, xDimBase - 250, (y1 + y2) / 2 - 50, 110, "DIMENSI_PLAN", 90);
  }

  // General Drawing title blocks
  const xTitle = minGridX * mul;
  const yTitle = -maxGridY * mul - ext * 2.5;
  dText("DENAH RENCANA STRUKTUR PORTAL 2D (DESIGN PLAN)", xTitle, yTitle, 200, "DESKRIPSI_TEKS");
  dText(`KODE DRAWING: BETONPRO-CAD  |  GRID SPACING: ${spacingInMeters.toFixed(2)} METERS`, xTitle, yTitle - 150, 120, "DESKRIPSI_TEKS");

  // End entities
  lines.push("  0");
  lines.push("ENDSEC");
  
  // EOF termination marker
  lines.push("  0");
  lines.push("EOF");
  
  return lines.join("\r\n");
}

export default function FramingCalculator() {
  // Configurable Grid spacing in meters (Indo typical structural bay spacing is 3-6 meters)
  const [gridSpacing, setGridSpacing] = useState<number>(3.5);

  // Ready-to-use Indonesia Residential 2D Floor Plan layout preset (Sloof/Balok & Kolom)
  const initialNodes: FrameNode[] = [
    { id: "n1", gridX: 1, gridY: 1, b: 300, h: 300, fc: 25, fy: 420, directLoad: 0, height: 3.5, rebarCount: 6, rebarDiameter: 16 },
    { id: "n2", gridX: 4, gridY: 1, b: 300, h: 300, fc: 25, fy: 420, directLoad: 12, height: 3.5, rebarCount: 6, rebarDiameter: 16 },
    { id: "n3", gridX: 1, gridY: 3, b: 300, h: 300, fc: 25, fy: 420, directLoad: 0, height: 3.5, rebarCount: 6, rebarDiameter: 16 },
    { id: "n4", gridX: 4, gridY: 3, b: 300, h: 300, fc: 25, fy: 420, directLoad: 15, height: 3.5, rebarCount: 6, rebarDiameter: 16 },
    { id: "n5", gridX: 1, gridY: 0, b: 250, h: 250, fc: 25, fy: 420, directLoad: 5, height: 3.5, rebarCount: 4, rebarDiameter: 16 },
    { id: "n6", gridX: 4, gridY: 0, b: 250, h: 250, fc: 25, fy: 420, directLoad: 5, height: 3.5, rebarCount: 4, rebarDiameter: 16 }
  ];

  const initialBeams: FrameBeam[] = [
    // Outer perimeter framing child beams
    { id: "b1", startNodeId: "n5", endNodeId: "n1", b: 200, h: 350, fc: 25, fy: 420, fys: 280, uniformLoad: 14.5, rebarCount: 4, rebarDiameter: 16, stirrupDiameter: 10, stirrupSpacing: 150 },
    { id: "b2", startNodeId: "n6", endNodeId: "n2", b: 200, h: 350, fc: 25, fy: 420, fys: 280, uniformLoad: 14.5, rebarCount: 4, rebarDiameter: 16, stirrupDiameter: 10, stirrupSpacing: 150 },
    { id: "b3", startNodeId: "n5", endNodeId: "n6", b: 250, h: 400, fc: 25, fy: 420, fys: 280, uniformLoad: 12.0, rebarCount: 4, rebarDiameter: 16, stirrupDiameter: 10, stirrupSpacing: 150 },
    { id: "b4", startNodeId: "n1", endNodeId: "n2", b: 250, h: 400, fc: 25, fy: 420, fys: 280, uniformLoad: 25.0, rebarCount: 5, rebarDiameter: 19, stirrupDiameter: 10, stirrupSpacing: 100 },
    { id: "b5", startNodeId: "n1", endNodeId: "n3", b: 200, h: 350, fc: 25, fy: 420, fys: 280, uniformLoad: 18.0, rebarCount: 4, rebarDiameter: 16, stirrupDiameter: 10, stirrupSpacing: 150 },
    { id: "b6", startNodeId: "n2", endNodeId: "n4", b: 200, h: 350, fc: 25, fy: 420, fys: 280, uniformLoad: 18.0, rebarCount: 4, rebarDiameter: 16, stirrupDiameter: 10, stirrupSpacing: 150 },
    { id: "b7", startNodeId: "n3", endNodeId: "n4", b: 250, h: 400, fc: 25, fy: 420, fys: 280, uniformLoad: 24.0, rebarCount: 5, rebarDiameter: 19, stirrupDiameter: 10, stirrupSpacing: 100 }
  ];

  const [nodes, setNodes] = useState<FrameNode[]>(initialNodes);
  const [beams, setBeams] = useState<FrameBeam[]>(initialBeams);

  // Interactive CAD mouse tracker tooling
  const [selectedTool, setSelectedTool] = useState<"select" | "node" | "beam" | "delete">("select");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("n2");
  const [selectedBeamId, setSelectedBeamId] = useState<string | null>(null);
  const [drawingStartNodeId, setDrawingStartNodeId] = useState<string | null>(null);
  
  // Auxiliary hover tracks
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);
  const [hoverGrid, setHoverGrid] = useState<{ gx: number, gy: number } | null>(null);

  // Compute load factors in real-time
  const analysis: FrameLayoutAnalysis = useMemo(() => {
    return analyzeFrameLayout(nodes, beams);
  }, [nodes, beams]);

  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  const selectedBeam = useMemo(() => {
    return beams.find(b => b.id === selectedBeamId) || null;
  }, [beams, selectedBeamId]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePos({ x, y });

    // Snap cursor coordinate calculation based on grid limits
    const gx = Math.round((x - OFFSET_X) / GRID_SPACING_X);
    const gy = Math.round((y - OFFSET_Y) / GRID_SPACING_Y);

    if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
      setHoverGrid({ gx, gy });
    } else {
      setHoverGrid(null);
    }
  };

  const handleMouseLeave = () => {
    setMousePos(null);
    setHoverGrid(null);
  };

  const handleCanvasClick = () => {
    if (!hoverGrid) return;
    const { gx, gy } = hoverGrid;

    if (selectedTool === "node") {
      const exists = nodes.some(n => n.gridX === gx && n.gridY === gy);
      if (exists) return;

      const newNodeId = "n_" + Date.now();
      const newNode: FrameNode = {
        id: newNodeId,
        gridX: gx,
        gridY: gy,
        b: 300,
        h: 300,
        fc: 25,
        fy: 420,
        directLoad: 0,
        height: 3.5,
        rebarCount: 6,
        rebarDiameter: 16
      };

      setNodes(prev => [...prev, newNode]);
      setSelectedNodeId(newNodeId);
      setSelectedBeamId(null);
      return;
    }

    if (selectedTool === "select") {
      setSelectedNodeId(null);
      setSelectedBeamId(null);
      setDrawingStartNodeId(null);
    }
  };

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();

    if (selectedTool === "delete") {
      setNodes(prev => prev.filter(n => n.id !== nodeId));
      setBeams(prev => prev.filter(b => b.startNodeId !== nodeId && b.endNodeId !== nodeId));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
      return;
    }

    if (selectedTool === "beam") {
      if (!drawingStartNodeId) {
        setDrawingStartNodeId(nodeId);
      } else {
        if (drawingStartNodeId === nodeId) {
          setDrawingStartNodeId(null);
          return;
        }

        const beamExists = beams.some(b => 
          (b.startNodeId === drawingStartNodeId && b.endNodeId === nodeId) ||
          (b.startNodeId === nodeId && b.endNodeId === drawingStartNodeId)
        );

        if (!beamExists) {
          const newBeamId = "b_" + Date.now();
          const newBeam: FrameBeam = {
            id: newBeamId,
            startNodeId: drawingStartNodeId,
            endNodeId: nodeId,
            b: 200,
            h: 350,
            fc: 25,
            fy: 420,
            fys: 280,
            uniformLoad: 12.0,
            rebarCount: 4,
            rebarDiameter: 16,
            stirrupDiameter: 10,
            stirrupSpacing: 150
          };
          setBeams(prev => [...prev, newBeam]);
          setSelectedBeamId(newBeamId);
          setSelectedNodeId(null);
        }

        setDrawingStartNodeId(null);
      }
      return;
    }

    setSelectedNodeId(nodeId);
    setSelectedBeamId(null);
  };

  const handleBeamClick = (e: React.MouseEvent, beamId: string) => {
    e.stopPropagation();

    if (selectedTool === "delete") {
      setBeams(prev => prev.filter(b => b.id !== beamId));
      if (selectedBeamId === beamId) setSelectedBeamId(null);
      return;
    }

    setSelectedBeamId(beamId);
    setSelectedNodeId(null);
    setDrawingStartNodeId(null);
  };

  const resetToPreset = () => {
    setNodes(initialNodes);
    setBeams(initialBeams);
    setSelectedNodeId("n2");
    setSelectedBeamId(null);
    setSelectedTool("select");
    setDrawingStartNodeId(null);
  };

  const clearAll = () => {
    setNodes([]);
    setBeams([]);
    setSelectedNodeId(null);
    setSelectedBeamId(null);
    setSelectedTool("node");
    setDrawingStartNodeId(null);
  };

  const updateSelectedNode = (field: keyof FrameNode, val: any) => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.map(n => {
      if (n.id === selectedNodeId) {
        return { ...n, [field]: val };
      }
      return n;
    }));
  };

  const updateSelectedBeam = (field: keyof FrameBeam, val: any) => {
    if (!selectedBeamId) return;
    setBeams(prev => prev.map(b => {
      if (b.id === selectedBeamId) {
        return { ...b, [field]: val };
      }
      return b;
    }));
  };

  // Triggers client-side DWG/DXF download instantly
  const handleExportDWG = () => {
    try {
      const content = generateDXF(nodes, beams, gridSpacing);
      const blob = new Blob([content], { type: "application/dxf;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "denah_rencana_struktur_beton.dxf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal melakukan export CAD DXF:", err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* EXPLANATORY HERO BANNER */}
      <div className="bg-slate-900 border border-slate-850 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Layers className="h-24 w-24 text-blue-500" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-600/15 border border-blue-500/30 rounded-lg text-blue-400 shrink-0">
              <Scaling className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-500/10 text-blue-400 font-mono text-[9px] font-bold px-2 py-0.5 border border-blue-500/20 rounded uppercase tracking-wider">Top View CAD</span>
                <h3 className="text-base font-extrabold text-white uppercase tracking-wide">
                  Draf Denah Struktur 2D & Ekspor DXF
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-3xl">
                Tempatkan kolom tekan utama dan bentangkan jembatan balok portal slab secara langsung pada grid dua dimensi. 
                Sistem menghitung real-time rasio pembebanan DCR struktural dan mendistribusikan beban merata ataupun beban mati/hidup tambahan. 
                Hasil gambar draf CAD dapat diekspor langsung sebagai file <strong>DXF</strong> yang terbaca sempurna di AutoCAD sebagai DWG.
              </p>
            </div>
          </div>
          
          <button
            onClick={handleExportDWG}
            disabled={nodes.length === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition ${
              nodes.length === 0 
                ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-850" 
                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.25)]"
            }`}
            title="Download AutoCAD DXF format vector drawing"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor File CAD (.DXF)</span>
          </button>
        </div>
      </div>

      {/* CORE GRID CONTROLS FOR ARCHITECTURAL BAY SIZING */}
      <div className="bg-[#0c1221] border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Scaling className="h-4 w-4 text-emerald-400" />
            <span>Ukuran Jarak Grid As Utama (Structural Spacing)</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-none">Mengubah jarak bentang antar kolom di kordinat 2D secara masif.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-slate-400 font-mono">1 Kotak Grid = </span>
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded border border-slate-800/80">
            <input
              type="number"
              step="0.5"
              min="2.0"
              max="8.0"
              value={gridSpacing}
              onChange={(e) => setGridSpacing(Math.max(2.0, parseFloat(e.target.value) || 3.0))}
              className="w-12 bg-transparent text-slate-100 outline-none text-xs text-center font-mono font-bold"
            />
            <span className="text-xs text-slate-500">Meter</span>
          </div>
          <input
            type="range"
            min="2.5"
            max="6.5"
            step="0.5"
            value={gridSpacing}
            onChange={(e) => setGridSpacing(parseFloat(e.target.value))}
            className="w-24 sm:w-36 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* CAD CANVAS COLUMNS */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* TOOLBOX BUTTON PANEL */}
          <div className="bg-slate-900 border border-slate-850 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-[#080d17] border border-slate-850 p-1 rounded-lg">
              <button
                onClick={() => { setSelectedTool("select"); setDrawingStartNodeId(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition cursor-pointer ${
                  selectedTool === "select" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Pilih & Atur properti dimensi balok atau kolom"
              >
                <MousePointer className="h-3.5 w-3.5" />
                <span>Navigasi</span>
              </button>

              <button
                onClick={() => { setSelectedTool("node"); setDrawingStartNodeId(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition cursor-pointer ${
                  selectedTool === "node" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Klik titik pertemuan grid untuk menggambar kolom"
              >
                <Plus className="h-3.5 w-3.5 text-blue-400" />
                <span>+ Letak Kolom</span>
              </button>

              <button
                onClick={() => { setSelectedTool("beam"); setDrawingStartNodeId(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition cursor-pointer ${
                  selectedTool === "beam" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Klik Kolom A lalu klik Kolom B untuk memasang Balok"
              >
                <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-400" />
                <span>+ Bentang Balok</span>
              </button>

              <button
                onClick={() => { setSelectedTool("delete"); setDrawingStartNodeId(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition cursor-pointer ${
                  selectedTool === "delete" ? "bg-rose-950 text-rose-300 border border-rose-900/50" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Klik elemen struktur mana saja untuk menghapusnya"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                <span>Hapus Elemen</span>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={resetToPreset}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded text-xs font-medium cursor-pointer transition"
                title="Kembalikan denah standard 2D default"
              >
                <Dices className="h-3.5 w-3.5 text-amber-500" />
                <span>Denah Default</span>
              </button>
              <button
                onClick={clearAll}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800/40 hover:bg-rose-950/40 text-slate-400 hover:text-rose-350 border border-slate-850 hover:border-rose-905/50 rounded text-xs font-medium cursor-pointer transition"
              >
                <span>Bersih Layar</span>
              </button>
            </div>
          </div>

          {/* ACTIVE CAD CANVAS AREA */}
          <div className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden shadow-2xl relative">
            
            {/* LIVE TOOLTIP GUIDELINES BANNER */}
            <div className="absolute top-3 left-4 text-[10px] font-mono text-slate-500 flex gap-4 pointer-events-none uppercase tracking-wider z-10">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Mode: {
                  selectedTool === "select" ? "Klik pada Kolom/Balok untuk sesuaikan ukuran rebar/beban" : 
                  selectedTool === "node" ? "Klik pada persilangan Grid untuk pasang Kolom Tekan" : 
                  selectedTool === "beam" ? (drawingStartNodeId ? "Pilih Kolom Tujuan untuk disambungkan Balok" : "Pilih Kolom Pangkal Pengikat Balok") : 
                  "Pilih Elemen Kolom atau Balok untuk dihapus dari denah"
                }
              </span>
            </div>

            <div className="absolute top-3 right-4 text-[10px] font-mono text-emerald-400 uppercase tracking-widest hidden sm:block z-10">
              <span>Rasio Grid: {gridSpacing.toFixed(1)}m x {gridSpacing.toFixed(1)}m</span>
            </div>

            <svg
              viewBox="0 0 850 490"
              className="w-full h-auto bg-[#050913]/95 relative select-none"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onClick={handleCanvasClick}
            >
              {/* SVG CAD DEFS */}
              <defs>
                <pattern id="cadDotPattern" width="45" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.1" fill="#1e293b" />
                </pattern>
                {/* Arrowhead point for load indicators and dimensions */}
                <marker id="dxfArrow" viewBox="0 0 10 10" refX="5" refY="10" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 5 10 L 10 0 z" fill="#3b82f6" />
                </marker>
                <marker id="beamLoadArrow" viewBox="0 0 10 10" refX="5" refY="10" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M 0 0 L 5 10 L 10 0 z" fill="#f59e0b" />
                </marker>
              </defs>

              {/* Grid DOT pattern */}
              <rect width="100%" height="100%" fill="url(#cadDotPattern)" />

              {/* Major Dashed Gridaxis lines */}
              {Array.from({ length: GRID_COLS }).map((_, cx) => (
                <line
                  key={`v-${cx}`}
                  x1={cx * GRID_SPACING_X + OFFSET_X}
                  y1={OFFSET_Y - 20}
                  x2={cx * GRID_SPACING_X + OFFSET_X}
                  y2={(GRID_ROWS - 1) * GRID_SPACING_Y + OFFSET_Y + 20}
                  stroke="#1a2e4d"
                  strokeWidth="0.8"
                  strokeDasharray="4 6"
                />
              ))}
              {Array.from({ length: GRID_ROWS }).map((_, ry) => (
                <line
                  key={`h-${ry}`}
                  x1={OFFSET_X - 20}
                  y1={ry * GRID_SPACING_Y + OFFSET_Y}
                  x2={(GRID_COLS - 1) * GRID_SPACING_X + OFFSET_X + 20}
                  y2={ry * GRID_SPACING_Y + OFFSET_Y}
                  stroke="#1a2e4d"
                  strokeWidth="0.8"
                  strokeDasharray="4 6"
                />
              ))}

              {/* Grid bubble letters at the top (A, B, C, D...) */}
              {Array.from({ length: GRID_COLS }).map((_, cx) => {
                const bubbleX = cx * GRID_SPACING_X + OFFSET_X;
                return (
                  <g key={`bubble-x-${cx}`} className="pointer-events-none select-none">
                    <circle cx={bubbleX} cy={OFFSET_Y - 30} r="10" fill="#0f172a" stroke="#475569" strokeWidth="1" />
                    <text
                      x={bubbleX}
                      y={OFFSET_Y - 26}
                      textAnchor="middle"
                      className="fill-slate-400 font-mono text-[9px] font-bold"
                    >
                      {String.fromCharCode(65 + cx)}
                    </text>
                  </g>
                );
              })}

              {/* Grid bubble numbers at the left side (1, 2, 3...) */}
              {Array.from({ length: GRID_ROWS }).map((_, ry) => {
                const bubbleY = ry * GRID_SPACING_Y + OFFSET_Y;
                return (
                  <g key={`bubble-y-${ry}`} className="pointer-events-none select-none">
                    <circle cx={OFFSET_X - 30} cy={bubbleY} r="10" fill="#0f172a" stroke="#475569" strokeWidth="1" />
                    <text
                      x={OFFSET_X - 30}
                      y={bubbleY + 3}
                      textAnchor="middle"
                      className="fill-slate-400 font-mono text-[9px] font-bold"
                    >
                      {ry + 1}
                    </text>
                  </g>
                );
              })}

              {/* DRAW STRUCTURAL FRAMING BEAMS FIRST */}
              {beams.map((beam) => {
                const startNode = nodes.find(n => n.id === beam.startNodeId);
                const endNode = nodes.find(n => n.id === beam.endNodeId);
                if (!startNode || !endNode) return null;

                const ptStart = gridToPx(startNode.gridX, startNode.gridY);
                const ptEnd = gridToPx(endNode.gridX, endNode.gridY);
                
                const isSelected = selectedBeamId === beam.id;
                const analysisDetail = analysis.beams[beam.id];
                const isSafe = analysisDetail?.isSafe ?? true;
                const dcrVal = analysisDetail ? Math.max(analysisDetail.DCR_bending, analysisDetail.DCR_shear) : 0;

                // Determine double borders framing style representation matching top view
                const dx = ptEnd.x - ptStart.x;
                const dy = ptEnd.y - ptStart.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const px = -dy / length;
                const py = dx / length;
                const beamWidthPx = Math.max(5, beam.b / 45); // Scale width representation for aesthetic balance

                // Double lines points offsets
                const xL1 = ptStart.x + px * beamWidthPx;
                const yL1 = ptStart.y + py * beamWidthPx;
                const xL2 = ptEnd.x + px * beamWidthPx;
                const yL2 = ptEnd.y + py * beamWidthPx;

                const xR1 = ptStart.x - px * beamWidthPx;
                const yR1 = ptStart.y - py * beamWidthPx;
                const xR2 = ptEnd.x - px * beamWidthPx;
                const yR2 = ptEnd.y - py * beamWidthPx;

                let beamStroke = "stroke-[#334155]";
                let interiorFill = "fill-slate-900/10";
                
                if (isSafe) {
                  beamStroke = isSelected ? "stroke-sky-400" : "stroke-emerald-600/70 hover:stroke-emerald-500";
                  interiorFill = isSelected ? "fill-sky-950/20" : "fill-emerald-950/5";
                } else {
                  beamStroke = isSelected ? "stroke-rose-450" : "stroke-rose-600 hover:stroke-rose-500";
                  interiorFill = "fill-rose-950/20";
                }

                return (
                  <g key={beam.id} className="cursor-pointer">
                    {/* Beam area boundary polyfill */}
                    <polygon
                      points={`${xL1},${yL1} ${xL2},${yL2} ${xR2},${yR2} ${xR1},${yR1}`}
                      className={`${interiorFill} transition-all duration-150`}
                      onClick={(e) => handleBeamClick(e, beam.id)}
                    />

                    {/* Left & Right layout outline borders */}
                    <line
                      x1={xL1}
                      y1={yL1}
                      x2={xL2}
                      y2={yL2}
                      className={`${beamStroke} transition-all duration-150`}
                      strokeWidth={isSelected ? "2.5" : "1.5"}
                      onClick={(e) => handleBeamClick(e, beam.id)}
                    />
                    <line
                      x1={xR1}
                      y1={yR1}
                      x2={xR2}
                      y2={yR2}
                      className={`${beamStroke} transition-all duration-150`}
                      strokeWidth={isSelected ? "2.5" : "1.5"}
                      onClick={(e) => handleBeamClick(e, beam.id)}
                    />

                    {/* Transparent thick line for easiest hovering */}
                    <line
                      x1={ptStart.x}
                      y1={ptStart.y}
                      x2={ptEnd.x}
                      y2={ptEnd.y}
                      stroke="transparent"
                      strokeWidth="16"
                      onClick={(e) => handleBeamClick(e, beam.id)}
                    />

                    {/* Beam central centerline indicator */}
                    <line
                      x1={ptStart.x}
                      y1={ptStart.y}
                      x2={ptEnd.x}
                      y2={ptEnd.y}
                      stroke="#475569"
                      strokeWidth="0.5"
                      strokeDasharray="2 4"
                      pointerEvents="none"
                    />

                    {/* Little load indicator on beams */}
                    {beam.uniformLoad > 0 && (
                      <g className="pointer-events-none opacity-80">
                        {/* Span text */}
                        <text
                          x={(ptStart.x + ptEnd.x) / 2}
                          y={(ptStart.y + ptEnd.y) / 2 - 8}
                          textAnchor="middle"
                          className="fill-amber-500 font-mono font-bold text-[8px]"
                        >
                          q={beam.uniformLoad.toFixed(1)}
                        </text>
                      </g>
                    )}

                    {/* Active dimension length bubble */}
                    <g className="pointer-events-none select-none opacity-80">
                      <text
                        x={(ptStart.x + ptEnd.x) / 2}
                        y={(ptStart.y + ptEnd.y) / 2 + 13}
                        textAnchor="middle"
                        className="fill-slate-500 font-mono text-[7px]"
                      >
                        L={((Math.sqrt(Math.pow(endNode.gridX - startNode.gridX,2)+Math.pow(endNode.gridY - startNode.gridY,2)))*gridSpacing).toFixed(1)}m
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* DRAW COLUMN NODES ON TOP */}
              {nodes.map((node) => {
                const pt = gridToPx(node.gridX, node.gridY);
                const isSelected = selectedNodeId === node.id;
                
                const nodeAnalysis = analysis.nodes[node.id];
                const isSafe = nodeAnalysis?.isSafe ?? true;
                const dcrVal = nodeAnalysis?.DCR ?? 0;

                let fillNode = "fill-slate-900 stroke-slate-700";
                let rebarDotColor = "fill-slate-500";

                if (isSafe) {
                  fillNode = isSelected ? "fill-[#142345] stroke-sky-400" : "fill-[#071d14] stroke-emerald-500 hover:fill-[#0c2f21]";
                  rebarDotColor = "fill-emerald-400";
                } else {
                  fillNode = isSelected ? "fill-[#45141e] stroke-rose-400" : "fill-[#240a0e] stroke-rose-500 hover:fill-[#381016]";
                  rebarDotColor = "fill-rose-400";
                }

                // Render dynamic column cross-section representation with hatch lines and small dots representing steel reinforcement!
                const colSizePx = Math.max(12, node.b / 18); // scaled columns representations
                
                return (
                  <g key={node.id} className="cursor-pointer">
                    {/* Concentrated Load Line marker vector inside denah plan (represented as points anchors load) */}
                    {node.directLoad > 0 && (
                      <g className="pointer-events-none opacity-90 text-amber-400">
                        <circle cx={pt.x} cy={pt.y - (colSizePx / 2) - 8} r="1.5" className="fill-amber-500" />
                        <line
                          x1={pt.x}
                          y1={pt.y - (colSizePx / 2) - 15}
                          x2={pt.x}
                          y2={pt.y - (colSizePx / 2) - 3}
                          stroke="#f59e0b"
                          strokeWidth="1.5"
                          markerEnd="url(#beamLoadArrow)"
                        />
                        <text
                          x={pt.x + 6}
                          y={pt.y - (colSizePx / 2) - 10}
                          textAnchor="start"
                          className="fill-amber-400 font-mono font-bold text-[8px]"
                        >
                          P={node.directLoad}
                        </text>
                      </g>
                    )}

                    {/* Column concrete square bounds */}
                    <rect
                      x={pt.x - colSizePx / 2}
                      y={pt.y - colSizePx / 2}
                      width={colSizePx}
                      height={colSizePx}
                      rx="1.5"
                      className={`${fillNode} transition-all duration-150`}
                      strokeWidth={isSelected ? "2.5" : "1.5"}
                      onClick={(e) => handleNodeClick(e, node.id)}
                    />

                    {/* Structural Hatch crossover lines */}
                    <line
                      x1={pt.x - colSizePx / 2}
                      y1={pt.y - colSizePx / 2}
                      x2={pt.x + colSizePx / 2}
                      y2={pt.y + colSizePx / 2}
                      stroke="#1e293b"
                      strokeWidth="0.8"
                      pointerEvents="none"
                    />
                    <line
                      x1={pt.x - colSizePx / 2}
                      y1={pt.y + colSizePx / 2}
                      x2={pt.x + colSizePx / 2}
                      y2={pt.y - colSizePx / 2}
                      stroke="#1e293b"
                      strokeWidth="0.8"
                      pointerEvents="none"
                    />

                    {/* Standard reinforcement rebar circles representation at the 4 corners of the column! */}
                    <circle cx={pt.x - colSizePx / 2 + 3} cy={pt.y - colSizePx / 2 + 3} r="1.2" className={`${rebarDotColor} opacity-90`} pointerEvents="none" />
                    <circle cx={pt.x + colSizePx / 2 - 3} cy={pt.y - colSizePx / 2 + 3} r="1.2" className={`${rebarDotColor} opacity-90`} pointerEvents="none" />
                    <circle cx={pt.x - colSizePx / 2 + 3} cy={pt.y + colSizePx / 2 - 3} r="1.2" className={`${rebarDotColor} opacity-90`} pointerEvents="none" />
                    <circle cx={pt.x + colSizePx / 2 - 3} cy={pt.y + colSizePx / 2 - 3} r="1.2" className={`${rebarDotColor} opacity-90`} pointerEvents="none" />

                    {/* Text node utilization index ratio label */}
                    <text
                      x={pt.x}
                      y={pt.y + colSizePx / 2 + 10}
                      textAnchor="middle"
                      className="fill-slate-400 font-mono text-[8px] font-bold select-none pointer-events-none"
                    >
                      {isSelected ? `KLM #${node.id.substring(0,4)}` : `K-${node.b} (DCR ${dcrVal.toFixed(2)})`}
                    </text>
                  </g>
                );
              })}

              {/* Grid axes dimensional chains drawing at the bottom */}
              {(() => {
                if (nodes.length === 0) return null;
                const minGx = Math.min(...nodes.map(n => n.gridX));
                const maxGx = Math.max(...nodes.map(n => n.gridX));
                const minGy = Math.min(...nodes.map(n => n.gridY));
                const maxGy = Math.max(...nodes.map(n => n.gridY));

                const yDimOffset = (GRID_ROWS - 1) * GRID_SPACING_Y + OFFSET_Y + 35;
                const hDimOffset = OFFSET_X - 45;

                return (
                  <g className="pointer-events-none select-none opacity-60">
                    {/* Horizontal architectural chain */}
                    {Array.from({ length: maxGx - minGx }).map((_, idx) => {
                      const cg = minGx + idx;
                      const xStart = cg * GRID_SPACING_X + OFFSET_X;
                      const xEnd = (cg + 1) * GRID_SPACING_X + OFFSET_X;

                      return (
                        <g key={`dim-h-${idx}`} className="text-slate-500">
                          <line x1={xStart} y1={yDimOffset} x2={xEnd} y2={yDimOffset} stroke="#475569" strokeWidth="0.8" />
                          <line x1={xStart} y1={yDimOffset - 4} x2={xStart} y2={yDimOffset + 4} stroke="#475569" strokeWidth="0.8" />
                          <line x1={xEnd} y1={yDimOffset - 4} x2={xEnd} y2={yDimOffset + 4} stroke="#475569" strokeWidth="0.8" />
                          
                          {/* CAD tick marks */}
                          <line x1={xStart - 4} y1={yDimOffset - 4} x2={xStart + 4} y2={yDimOffset + 4} stroke="#64748b" strokeWidth="1" />
                          <line x1={xEnd - 4} y1={yDimOffset - 4} x2={xEnd + 4} y2={yDimOffset + 4} stroke="#64748b" strokeWidth="1" />

                          <text x={(xStart + xEnd) / 2} y={yDimOffset - 5} textAnchor="middle" className="fill-blue-400 font-mono text-[8px] font-bold">
                            {gridSpacing.toFixed(2)} m
                          </text>
                        </g>
                      );
                    })}

                    {/* Vertical dimension chain */}
                    {Array.from({ length: maxGy - minGy }).map((_, idx) => {
                      const rg = minGy + idx;
                      const yStart = rg * GRID_SPACING_Y + OFFSET_Y;
                      const yEnd = (rg + 1) * GRID_SPACING_Y + OFFSET_Y;

                      return (
                        <g key={`dim-v-${idx}`} className="text-slate-500">
                          <line x1={hDimOffset} y1={yStart} x2={hDimOffset} y2={yEnd} stroke="#475569" strokeWidth="0.8" />
                          <line x1={hDimOffset - 4} y1={yStart} x2={hDimOffset + 4} y2={yStart} stroke="#475569" strokeWidth="0.8" />
                          <line x1={hDimOffset - 4} y1={yEnd} x2={hDimOffset + 4} y2={yEnd} stroke="#475569" strokeWidth="0.8" />

                          <line x1={hDimOffset - 4} y1={yStart - 4} x2={hDimOffset + 4} y2={yStart + 4} stroke="#64748b" strokeWidth="1" />
                          <line x1={hDimOffset - 4} y1={yEnd - 4} x2={hDimOffset + 4} y2={yEnd + 4} stroke="#64748b" strokeWidth="1" />

                          <text x={hDimOffset - 7} y={(yStart + yEnd) / 2 + 3} textAnchor="end" className="fill-blue-400 font-mono text-[8px] font-bold">
                            {gridSpacing.toFixed(2)} m
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })()}

              {/* Cursor preview indicator in Node creation modes */}
              {selectedTool === "node" && hoverGrid && (
                <g className="pointer-events-none opacity-80">
                  <circle
                    cx={hoverGrid.gx * GRID_SPACING_X + OFFSET_X}
                    cy={hoverGrid.gy * GRID_SPACING_Y + OFFSET_Y}
                    r="12"
                    fill="none"
                    stroke="#2563eb"
                    strokeDasharray="2 2"
                    strokeWidth="1"
                    className="animate-spin"
                  />
                  <circle
                    cx={hoverGrid.gx * GRID_SPACING_X + OFFSET_X}
                    cy={hoverGrid.gy * GRID_SPACING_Y + OFFSET_Y}
                    r="3.5"
                    fill="#3b82f6"
                  />
                </g>
              )}

              {/* Interactive Beam drawing connector preview line */}
              {selectedTool === "beam" && drawingStartNodeId && mousePos && (
                (() => {
                  const sNode = nodes.find(n => n.id === drawingStartNodeId);
                  if (!sNode) return null;
                  const sPt = gridToPx(sNode.gridX, sNode.gridY);
                  return (
                    <line
                      x1={sPt.x}
                      y1={sPt.y}
                      x2={mousePos.x}
                      y2={mousePos.y}
                      stroke="#2563eb"
                      strokeWidth="1.8"
                      strokeDasharray="3 3"
                    />
                  );
                })()
              )}
            </svg>

            {/* QUICK LEGEND PANEL */}
            <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 flex flex-wrap gap-x-6 gap-y-1.5 justify-center items-center text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500/10 border border-emerald-500/40 rounded"></span>
                <span>Dimensi Aman (DCR ≤ 1.0)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-rose-500/15 border border-rose-500/40 rounded"></span>
                <span className="text-rose-450 font-bold">Harus Diperbesar (DCR &gt; 1.0)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 border border-sky-400 rounded"></span>
                <span>Elemen Terpilih</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-amber-500 font-extrabold text-[12px]">↓</span>
                <span>Beban Kerja (kN / kN/m)</span>
              </span>
            </div>
          </div>
        </div>

        {/* SIDEBAR DYNAMIC PROPERTIES FOR SELECTED OBJECT */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {selectedNode ? (
            /* COLUMN PROPERTIES PANEL */
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 animate-fade-in relative overflow-hidden">
              <div className="absolute right-0 top-0 -mr-4 -mt-4 w-20 h-20 bg-blue-600/5 rounded-full blur-xl"></div>
              
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[10px] uppercase tracking-wider text-blue-400 font-mono font-bold">PROPERTI DIAGRAM DETIL</span>
                <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded"></span>
                  Kolom Beton K1 (Persimpangan {String.fromCharCode(65 + selectedNode.gridX)}, Y:{selectedNode.gridY + 1})
                </h4>
              </div>

              {/* INPUT SLIDERS & PARAMETERS */}
              <div className="space-y-3 text-xs">
                {/* Sizing of Column Section */}
                <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-850">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Lebar b (mm)</label>
                    <input
                      type="number"
                      value={selectedNode.b}
                      onChange={(e) => updateSelectedNode("b", Math.max(150, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:border-blue-500 outline-none text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Tinggi h (mm)</label>
                    <input
                      type="number"
                      value={selectedNode.h}
                      onChange={(e) => updateSelectedNode("h", Math.max(150, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:border-blue-500 outline-none text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Sizing sliders for easier interactive sizing adjustments */}
                <div>
                  <div className="flex justify-between text-slate-400 mb-1 text-[10px]">
                    <span>Sizing Ukuran Kolom Utama</span>
                    <span className="text-slate-300 font-mono font-semibold">{selectedNode.b}x{selectedNode.h} mm</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="500"
                    step="50"
                    value={selectedNode.b}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      updateSelectedNode("b", v);
                      updateSelectedNode("h", v); // Keep column square by default for simplicity on slider dragged
                    }}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Concrete Strength f'c & Steel Strength fy */}
                <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-850">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Mutu Beton f'c (MPa)</label>
                    <select
                      value={selectedNode.fc}
                      onChange={(e) => updateSelectedNode("fc", parseFloat(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none text-xs cursor-pointer"
                    >
                      <option value="20">K-250 (20 MPa)</option>
                      <option value="25">K-300 (25 MPa)</option>
                      <option value="30">K-350 (30 MPa)</option>
                      <option value="35">K-400 (35 MPa)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Mutu Baja fy (MPa)</label>
                    <select
                      value={selectedNode.fy}
                      onChange={(e) => updateSelectedNode("fy", parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none text-xs cursor-pointer"
                    >
                      <option value="280">BjTP 280 (Polos)</option>
                      <option value="420">BjTS 420 (Deform)</option>
                    </select>
                  </div>
                </div>

                {/* Column Reinforcement detailing (Tulangan) */}
                <div className="bg-slate-950/40 p-2.5 rounded border border-slate-850 space-y-2">
                  <p className="font-mono text-[9px] text-blue-400 uppercase font-bold tracking-wider mb-1">Penyetelan Tulangan Memanjang</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block">Jml Batang</label>
                      <select
                        value={selectedNode.rebarCount}
                        onChange={(e) => updateSelectedNode("rebarCount", parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-205 text-xs cursor-pointer"
                      >
                        <option value="4">4 Batang (4D)</option>
                        <option value="6">6 Batang (6D)</option>
                        <option value="8">8 Batang (8D)</option>
                        <option value="12">12 Batang (12D)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Diameter Besi</label>
                      <select
                        value={selectedNode.rebarDiameter}
                        onChange={(e) => updateSelectedNode("rebarDiameter", parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-205 text-xs cursor-pointer"
                      >
                        {STANDARD_BAR_DIAMETERS.filter(d => d >= 12).map(d => (
                          <option key={d} value={d}>D{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Point Load inputs */}
                <div className="pb-2 border-b border-slate-850">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Beban Terpusat Tambahan:</span>
                    <span className="text-amber-400 font-mono font-bold">{selectedNode.directLoad} kN</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="160"
                    step="10"
                    value={selectedNode.directLoad}
                    onChange={(e) => updateSelectedNode("directLoad", parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-[9px] text-slate-500 font-mono italic mt-1 block leading-tight">
                    (Misal: Reaksi beban aksial terpusat sekunder dari water tank / mesin atap di atas kolom ini)
                  </span>
                </div>

                {/* Mechanical Analysis results of Column Node */}
                {analysis.nodes[selectedNode.id] && (
                  (() => {
                    const detail = analysis.nodes[selectedNode.id];
                    return (
                      <div className="bg-slate-950 p-3 rounded border border-slate-850 space-y-2 mt-2">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400">Beban Kumulatif Pu:</span>
                          <span className="text-white font-mono font-bold">{detail.PuTotal.toFixed(1)} kN</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400">Kapasitas Desain φPn:</span>
                          <span className="text-emerald-400 font-mono font-bold">{detail.phiPn.toFixed(1)} kN</span>
                        </div>
                        
                        {/* Utilization Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-slate-550">Rasio DCR Aksial:</span>
                            <span className={`font-bold ${detail.DCR > 1.0 ? "text-rose-450 animate-pulse font-extrabold" : "text-emerald-405"}`}>
                              {(detail.DCR * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${detail.DCR > 1.0 ? "bg-rose-550" : "bg-emerald-500"}`}
                              style={{ width: `${Math.min(100, detail.DCR * 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className={`p-1.5 rounded text-[10px] font-mono text-center flex items-center justify-center gap-1.5 ${
                          detail.isSafe ? "bg-emerald-500/10 text-emerald-400 animate-fade-in" : "bg-rose-500/10 text-rose-400 font-bold"
                        }`}>
                          {detail.isSafe ? (
                            <>
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                              <span>KAPASITAS KOLOM AMAN</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                              <span>OVERSTRESSED - PERBESAR KOLOM!</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          ) : selectedBeam ? (
            /* BEAM PROPERTIES PANEL */
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 animate-fade-in relative overflow-hidden">
              <div className="absolute right-0 top-0 -mr-4 -mt-4 w-20 h-20 bg-emerald-600/5 rounded-full blur-xl"></div>
              
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-mono font-bold">PROPERTI DIAGRAM DETIL</span>
                <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded"></span>
                  Balok Penampang Beton (Floor Frame Span)
                </h4>
              </div>

              {/* INPUT SLIDERS & PARAMETERS FOR SELECTED BEAM */}
              <div className="space-y-3 text-xs">
                {/* section dimension width & height */}
                <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-850">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Lebar b (mm)</label>
                    <input
                      type="number"
                      value={selectedBeam.b}
                      onChange={(e) => updateSelectedBeam("b", Math.max(100, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:border-emerald-500 outline-none text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Tinggi h (mm)</label>
                    <input
                      type="number"
                      value={selectedBeam.h}
                      onChange={(e) => updateSelectedBeam("h", Math.max(100, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:border-emerald-500 outline-none text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Slider sizing presets for beams */}
                <div>
                  <div className="flex justify-between text-slate-400 mb-1 text-[10px]">
                    <span>Sizing Ukuran Balok Utama</span>
                    <span className="text-slate-300 font-mono font-semibold">{selectedBeam.b}x{selectedBeam.h} mm</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="550"
                    step="50"
                    value={selectedBeam.h}
                    onChange={(e) => {
                      const hVal = parseInt(e.target.value);
                      updateSelectedBeam("h", hVal);
                      updateSelectedBeam("b", Math.max(120, Math.round(hVal * 0.6 / 10) * 10)); // typical b = 0.6h proportion matching robust civil engineering practice
                    }}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Materials configuration strengths */}
                <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-850">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Mutu Beton f'c (MPa)</label>
                    <select
                      value={selectedBeam.fc}
                      onChange={(e) => updateSelectedBeam("fc", parseFloat(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none text-xs cursor-pointer"
                    >
                      <option value="20">20 MPa</option>
                      <option value="25">25 MPa</option>
                      <option value="30">30 MPa</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Mutu Baja Lentur</label>
                    <select
                      value={selectedBeam.fy}
                      onChange={(e) => updateSelectedBeam("fy", parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none text-xs cursor-pointer"
                    >
                      <option value="280">fy = 280 (Polos)</option>
                      <option value="420">fy = 420 (Deformed)</option>
                    </select>
                  </div>
                </div>

                {/* Longitudinal Tension Rebears for bending resistance */}
                <div className="bg-slate-950/40 p-2.5 rounded border border-slate-850 space-y-2">
                  <p className="font-mono text-[9px] text-emerald-400 uppercase font-bold tracking-wider mb-1">Baja Tulangan Utama Bawah (Lentur)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block">Jml Batang</label>
                      <select
                        value={selectedBeam.rebarCount}
                        onChange={(e) => updateSelectedBeam("rebarCount", parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-205 text-xs cursor-pointer"
                      >
                        <option value="2">2 Batang (2D)</option>
                        <option value="3">3 Batang (3D)</option>
                        <option value="4">4 Batang (4D)</option>
                        <option value="6">6 Batang (6D)</option>
                        <option value="8">8 Batang (8D)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Diameter Besi</label>
                      <select
                        value={selectedBeam.rebarDiameter}
                        onChange={(e) => updateSelectedBeam("rebarDiameter", parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-205 text-xs cursor-pointer"
                      >
                        {STANDARD_BAR_DIAMETERS.filter(d => d >= 10).map(d => (
                          <option key={d} value={d}>D{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Stirrups detailing spacing */}
                <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-850">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-0.5">Sengkang (Sengkang)</label>
                    <select
                      value={selectedBeam.stirrupDiameter}
                      onChange={(e) => updateSelectedBeam("stirrupDiameter", parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-100 outline-none text-xs cursor-pointer"
                    >
                      <option value="8">D8</option>
                      <option value="10">D10</option>
                      <option value="12">D12</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-0.5">Jarak (mm)</label>
                    <input
                      type="number"
                      step="25"
                      value={selectedBeam.stirrupSpacing}
                      onChange={(e) => updateSelectedBeam("stirrupSpacing", Math.max(50, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 focus:border-emerald-500 outline-none text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* distributed uniformly loads on beam */}
                <div className="pb-2 border-b border-slate-850">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Beban Merata q terdistribusi:</span>
                    <span className="text-amber-400 font-mono font-bold">{selectedBeam.uniformLoad.toFixed(1)} kN/m</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="45"
                    step="0.5"
                    value={selectedBeam.uniformLoad}
                    onChange={(e) => updateSelectedBeam("uniformLoad", parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-[9px] text-slate-500 font-mono italic mt-1 block leading-tight">
                    (Misal: Tributary slab load {gridSpacing}m bay: Mati Pelat + beban hidup hunian K-Splat {selectedBeam.uniformLoad > 20 ? "Komersil" : "Hunian Ringan"})
                  </span>
                </div>

                {/* Bending analysis check */}
                {analysis.beams[selectedBeam.id] && (
                  (() => {
                    const detail = analysis.beams[selectedBeam.id];
                    return (
                      <div className="bg-slate-950 p-3 rounded border border-slate-850 space-y-2 mt-2">
                        <div className="flex justify-between items-center text-[10.5px]">
                          <span className="text-slate-500">Momen Ultimate Mu:</span>
                          <span className="text-white font-mono font-bold">{detail.Mu.toFixed(1)} kNm</span>
                        </div>
                        <div className="flex justify-between items-center text-[10.5px]">
                          <span className="text-slate-500">Kapasitas Desain φMn:</span>
                          <span className="text-emerald-400 font-mono font-bold">{detail.phiMn.toFixed(1)} kNm</span>
                        </div>
                        <div className="flex justify-between items-center text-[10.5px]">
                          <span className="text-slate-500">Gaya Geser Ult. Vu:</span>
                          <span className="text-white font-mono font-bold">{detail.Vu.toFixed(1)} kN</span>
                        </div>
                        <div className="flex justify-between items-center text-[10.5px]">
                          <span className="text-slate-500">Kapasitas Geser Desain φVn:</span>
                          <span className="text-emerald-400 font-mono font-bold">{detail.phiVn.toFixed(1)} kN</span>
                        </div>

                        {/* Utilization Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-slate-550">Rasio DCR Lentur Balok:</span>
                            <span className={`font-bold ${detail.DCR_bending > 1.0 ? "text-rose-450 animate-pulse font-extrabold" : "text-emerald-400"}`}>
                              {(detail.DCR_bending * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${detail.DCR_bending > 1.0 ? "bg-rose-550" : "bg-emerald-500"}`}
                              style={{ width: `${Math.min(100, detail.DCR_bending * 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className={`p-1.5 rounded text-[10px] font-mono text-center flex items-center justify-center gap-1.5 ${
                          detail.isSafe ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400 font-bold"
                        }`}>
                          {detail.isSafe ? (
                            <>
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                              <span>BENTANG BALOK AMAN & COCOK</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                              <span>OVERSTRESSED - PERBESAR BALOK!</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          ) : (
            /* DEFAULT INSTRUCTION BOX */
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Settings className="h-4 w-4 text-blue-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">CAD Draft Properties Panel</h4>
              </div>

              <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-850 space-y-3.5 text-xs text-slate-400 leading-relaxed">
                <p className="flex gap-2 items-start">
                  <span className="p-1 bg-blue-600/15 text-blue-400 rounded-md shrink-0 font-bold font-mono">1</span>
                  <span>
                    Klik <strong>Navigasi</strong> pada toolbar lalu pilih salah satu kolom beton maupun balok di layar CAD untuk memunculkan setting detil rebar, beban, dan mutu beton.
                  </span>
                </p>
                <p className="flex gap-2 items-start">
                  <span className="p-1 bg-blue-600/15 text-blue-400 rounded-md shrink-0 font-bold font-mono">2</span>
                  <span>
                    Pilih <strong>+ Letak Kolom</strong> untuk meletakkan titik kolom tekan tambahan di mana saja pada kordinat grid utama denah.
                  </span>
                </p>
                <p className="flex gap-2 items-start">
                  <span className="p-1 bg-blue-600/15 text-blue-400 rounded-md shrink-0 font-bold font-mono">3</span>
                  <span>
                    Gunakan tool <strong>+ Bentang Balok</strong> untuk menyambung mengikat kolom-kolom struktur dengan balok penahan lantai.
                  </span>
                </p>
                <p className="flex gap-2 items-start text-emerald-400 font-medium">
                  <span className="p-1 bg-emerald-600/15 text-emerald-400 rounded-md shrink-0 font-bold font-mono">✔</span>
                  <span>
                    Ekspor layout 2D gambar rujukan ke CAD (.DXF) yang siap diimport langsung ke <strong>AutoCAD (DWG)</strong> untuk dilanjutkan drafting.
                  </span>
                </p>
              </div>

              {/* STATS COUNT */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-950 p-2.5 rounded border border-slate-850 text-center">
                  <span className="block text-[10px] text-slate-500 font-mono uppercase">Total Kolom</span>
                  <span className="text-lg font-extrabold text-white font-mono">{nodes.length}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-850 text-center">
                  <span className="block text-[10px] text-slate-500 font-mono uppercase">Total Balok</span>
                  <span className="text-lg font-extrabold text-white font-mono">{beams.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GEMINI AI EXPERT STRUCTURAL REVIEW */}
      {nodes.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-950/20 to-slate-900">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-400" />
              <div>
                <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Asisten Ahli Struktur CAD (Gemini AI Engine)</h4>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">Tinjauan Standar SNI 2847:2019 Berdasarkan Draft Gambar Denah 2D Anda</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <AiAdvisor 
              type="framing" 
              input={{ nodes, beams }} 
              result={analysis} 
            />
          </div>
        </div>
      )}

    </div>
  );
}
