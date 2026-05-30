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
  BookOpen
} from "lucide-react";
import { FrameNode, FrameBeam, FrameLayoutAnalysis } from "../types";
import { analyzeFrameLayout, STANDARD_BAR_DIAMETERS } from "../utils/calculations";
import AiAdvisor from "./AiAdvisor";

// Grid configuration
const GRID_COLS = 9; // X indices: 0 to 8
const GRID_ROWS = 5; // Y indices: 0 to 4
const GRID_SPACING_X = 90; // Pixels
const GRID_SPACING_Y = 75; // Pixels
const OFFSET_X = 60; // Left margin
const OFFSET_Y = 50; // Top margin

// Helper to convert grid coordinates to SVG pixel space
function gridToPx(gx: number, gy: number) {
  return {
    x: gx * GRID_SPACING_X + OFFSET_X,
    y: gy * GRID_SPACING_Y + OFFSET_Y
  };
}

export default function FramingCalculator() {
  // Setup standard preset layout showing a 2-Story framing elevasi portique
  const initialNodes: FrameNode[] = [
    { id: "n1", gridX: 2, gridY: 4, b: 350, h: 350, fc: 25, fy: 420, directLoad: 0, height: 3.5, rebarCount: 8, rebarDiameter: 16 },
    { id: "n2", gridX: 6, gridY: 4, b: 350, h: 350, fc: 25, fy: 420, directLoad: 0, height: 3.5, rebarCount: 8, rebarDiameter: 16 },
    { id: "n3", gridX: 2, gridY: 2, b: 300, h: 300, fc: 25, fy: 420, directLoad: 15, height: 3.5, rebarCount: 6, rebarDiameter: 16 },
    { id: "n4", gridX: 6, gridY: 2, b: 300, h: 300, fc: 25, fy: 420, directLoad: 15, height: 3.5, rebarCount: 6, rebarDiameter: 16 },
    { id: "n5", gridX: 2, gridY: 0, b: 250, h: 250, fc: 25, fy: 420, directLoad: 5, height: 3.5, rebarCount: 4, rebarDiameter: 16 },
    { id: "n6", gridX: 6, gridY: 0, b: 250, h: 250, fc: 25, fy: 420, directLoad: 5, height: 3.5, rebarCount: 4, rebarDiameter: 16 }
  ];

  const initialBeams: FrameBeam[] = [
    // Column members modelled as vertical frame lines
    { id: "b-col1", startNodeId: "n1", endNodeId: "n3", b: 300, h: 300, fc: 25, fy: 420, fys: 280, uniformLoad: 2.0, rebarCount: 4, rebarDiameter: 16, stirrupDiameter: 10, stirrupSpacing: 150 },
    { id: "b-col2", startNodeId: "n2", endNodeId: "n4", b: 300, h: 300, fc: 25, fy: 420, fys: 280, uniformLoad: 2.0, rebarCount: 4, rebarDiameter: 16, stirrupDiameter: 10, stirrupSpacing: 150 },
    { id: "b-col3", startNodeId: "n3", endNodeId: "n5", b: 250, h: 250, fc: 25, fy: 420, fys: 280, uniformLoad: 1.5, rebarCount: 4, rebarDiameter: 16, stirrupDiameter: 10, stirrupSpacing: 150 },
    { id: "b-col4", startNodeId: "n4", endNodeId: "n6", b: 250, h: 250, fc: 25, fy: 420, fys: 280, uniformLoad: 1.5, rebarCount: 4, rebarDiameter: 16, stirrupDiameter: 10, stirrupSpacing: 150 },
    // Horizontal Floor & Roof Beams
    { id: "b-floor1", startNodeId: "n3", endNodeId: "n4", b: 250, h: 400, fc: 25, fy: 420, fys: 280, uniformLoad: 24.0, rebarCount: 5, rebarDiameter: 19, stirrupDiameter: 10, stirrupSpacing: 100 },
    { id: "b-roof1", startNodeId: "n5", endNodeId: "n6", b: 200, h: 300, fc: 25, fy: 420, fys: 280, uniformLoad: 12.0, rebarCount: 4, rebarDiameter: 16, stirrupDiameter: 8, stirrupSpacing: 150 }
  ];

  const [nodes, setNodes] = useState<FrameNode[]>(initialNodes);
  const [beams, setBeams] = useState<FrameBeam[]>(initialBeams);

  // UI status
  const [selectedTool, setSelectedTool] = useState<"select" | "node" | "beam" | "delete">("select");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("n3");
  const [selectedBeamId, setSelectedBeamId] = useState<string | null>(null);
  const [drawingStartNodeId, setDrawingStartNodeId] = useState<string | null>(null);
  
  // Custom Hover coordinate track for cursor snapping preview
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);
  const [hoverGrid, setHoverGrid] = useState<{ gx: number, gy: number } | null>(null);

  // Calculate stress factors in real-time
  const analysis: FrameLayoutAnalysis = useMemo(() => {
    return analyzeFrameLayout(nodes, beams);
  }, [nodes, beams]);

  // Selected object references for properties panel
  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  const selectedBeam = useMemo(() => {
    return beams.find(b => b.id === selectedBeamId) || null;
  }, [beams, selectedBeamId]);

  // Handle snapping logic on mouse move
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePos({ x, y });

    // Calculate nearest grid slot
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

  // Canvas click handles the tooling actions
  const handleCanvasClick = () => {
    if (!hoverGrid) return;
    const { gx, gy } = hoverGrid;

    // --- NODE PLAEMENT MODE ---
    if (selectedTool === "node") {
      // Check if node exists at this grid position
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
        rebarCount: 4,
        rebarDiameter: 16
      };

      setNodes(prev => [...prev, newNode]);
      setSelectedNodeId(newNodeId);
      setSelectedBeamId(null);
      return;
    }

    // Default select reset
    if (selectedTool === "select") {
      setSelectedNodeId(null);
      setSelectedBeamId(null);
      setDrawingStartNodeId(null);
    }
  };

  // Click on existing column node
  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();

    if (selectedTool === "delete") {
      // Delete column node, and all connected beams
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

        // Check if beam already exists between these two nodes
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
            b: 250,
            h: 400,
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

    // Default selection
    setSelectedNodeId(nodeId);
    setSelectedBeamId(null);
  };

  // Click on existing beam line
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

  // Reset to default preset frame
  const resetToPreset = () => {
    setNodes(initialNodes);
    setBeams(initialBeams);
    setSelectedNodeId("n3");
    setSelectedBeamId(null);
    setSelectedTool("select");
    setDrawingStartNodeId(null);
  };

  // Clear everything
  const clearAll = () => {
    setNodes([]);
    setBeams([]);
    setSelectedNodeId(null);
    setSelectedBeamId(null);
    setSelectedTool("node");
    setDrawingStartNodeId(null);
  };

  // Update Node factors in the fields
  const updateSelectedNode = (field: keyof FrameNode, val: any) => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.map(n => {
      if (n.id === selectedNodeId) {
        return { ...n, [field]: val };
      }
      return n;
    }));
  };

  // Update Beam factors in fields
  const updateSelectedBeam = (field: keyof FrameBeam, val: any) => {
    if (!selectedBeamId) return;
    setBeams(prev => prev.map(b => {
      if (b.id === selectedBeamId) {
        return { ...b, [field]: val };
      }
      return b;
    }));
  };

  return (
    <div className="space-y-6">
      
      {/* EXPLANATORY HERO SUMMARY */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Layers className="h-24 w-24 text-blue-500" />
        </div>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-600/15 border border-blue-500/30 rounded-lg text-blue-400">
            <Maximize className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white uppercase tracking-wide">
              Sketsa Desain Portal (Framing CAD Engine)
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Modul interaktif tempat Anda menggambar penempatan kolom (titik tumpu) dan jembatan balok bangunan secara visual. 
              Berikan beban terpusat terpadu atau beban terdistribusi merata (q), konfigurasi luas penampang, dan saksikan 
              diagram kelayakan DCR mekanika terhitung secara instan berdasarkan teori bidang portal.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* CAD CANVAS GRID COLUMNS */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* TOOLBOX BUTTON PANEL */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-[#0b0f1a] border border-slate-850 p-1 rounded-lg">
              <button
                onClick={() => { setSelectedTool("select"); setDrawingStartNodeId(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition cursor-pointer ${
                  selectedTool === "select" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Pilih & Atur properti elemen"
              >
                <MousePointer className="h-3.5 w-3.5" />
                <span>Navigasi</span>
              </button>

              <button
                onClick={() => { setSelectedTool("node"); setDrawingStartNodeId(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition cursor-pointer ${
                  selectedTool === "node" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Klik grid untuk meletakkan titik kolom"
              >
                <Plus className="h-3.5 w-3.5 text-blue-400" />
                <span>+ Kolom</span>
              </button>

              <button
                onClick={() => { setSelectedTool("beam"); setDrawingStartNodeId(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition cursor-pointer ${
                  selectedTool === "beam" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Hubungkan dua kolom untuk menggambar balok portal"
              >
                <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-400" />
                <span>+ Balok</span>
              </button>

              <button
                onClick={() => { setSelectedTool("delete"); setDrawingStartNodeId(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition cursor-pointer ${
                  selectedTool === "delete" ? "bg-rose-950 text-rose-350 border border-rose-900/50" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Hapus kolom atau balok penampang"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                <span>Hapus</span>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={resetToPreset}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium cursor-pointer transition"
                title="Kembalikan layout portal default dua lantai"
              >
                <Dices className="h-3.5 w-3.5 text-amber-400" />
                <span>Layout default</span>
              </button>
              <button
                onClick={clearAll}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800/40 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-850 hover:border-rose-900/50 rounded text-xs font-medium cursor-pointer transition"
              >
                <span>Sapu Layar</span>
              </button>
            </div>
          </div>

          {/* ACTIVE DRAW AREA */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
            
            {/* IN-SITE GRID NOTATION BANNER */}
            <div className="absolute top-3 left-4 text-[10px] font-mono text-slate-500 flex gap-4 pointer-events-none uppercase tracking-wider z-10">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Mode: {selectedTool === "select" ? "Klik untuk Atur Properti & Beban" : selectedTool === "node" ? "Klik Grid untuk Meletakkan Kolom" : selectedTool === "beam" ? "Hubungkan Dua Kolom untuk Balok" : "Klik Elemen untuk Menghapus"}
              </span>
              <span>1 Kotak Grid = 1.5 Meter</span>
            </div>

            <svg
              viewBox="0 0 850 390"
              className="w-full h-auto bg-[#080d19]/90 relative select-none"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onClick={handleCanvasClick}
            >
              {/* SVG DEFINITIONS & GRID PATTERNS */}
              <defs>
                <pattern id="dotPattern" width="30" height="30" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.2" fill="#1e293b" />
                </pattern>
                {/* Marker for Distributed Loads arrows */}
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="10" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 5 10 L 10 0 z" fill="#f59e0b" />
                </marker>
              </defs>

              {/* Grid Background */}
              <rect width="100%" height="100%" fill="url(#dotPattern)" />

              {/* Major CAD Grid Lines */}
              {Array.from({ length: GRID_COLS }).map((_, cx) => (
                <line
                  key={`v-${cx}`}
                  x1={cx * GRID_SPACING_X + OFFSET_X}
                  y1={OFFSET_Y - 15}
                  x2={cx * GRID_SPACING_X + OFFSET_X}
                  y2={(GRID_ROWS - 1) * GRID_SPACING_Y + OFFSET_Y + 15}
                  stroke="#1e293b"
                  strokeWidth="0.8"
                  strokeDasharray="4 4"
                />
              ))}
              {Array.from({ length: GRID_ROWS }).map((_, ry) => (
                <line
                  key={`h-${ry}`}
                  x1={OFFSET_X - 15}
                  y1={ry * GRID_SPACING_Y + OFFSET_Y}
                  x2={(GRID_COLS - 1) * GRID_SPACING_X + OFFSET_X + 15}
                  y2={ry * GRID_SPACING_Y + OFFSET_Y}
                  stroke="#1e293b"
                  strokeWidth="0.8"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Axis markers coordinates index label */}
              {Array.from({ length: GRID_COLS }).map((_, cx) => (
                <text
                  key={`lbl-x-${cx}`}
                  x={cx * GRID_SPACING_X + OFFSET_X}
                  y={OFFSET_Y - 22}
                  textAnchor="middle"
                  className="fill-slate-600 font-mono text-[9px] font-bold"
                >
                  {(cx * 1.5).toFixed(1)}m
                </text>
              ))}
              {Array.from({ length: GRID_ROWS }).map((_, ry) => (
                <text
                  key={`lbl-y-${ry}`}
                  x={OFFSET_X - 25}
                  y={ry * GRID_SPACING_Y + OFFSET_Y + 3}
                  textAnchor="end"
                  className="fill-slate-600 font-mono text-[9px] font-bold"
                >
                  {ry === 4 ? "GND" : `Lt.${4 - ry}`}
                </text>
              ))}

              {/* DRAW IN-BETWEEN BEAMS (LINES) FIRST SO THEY APPEAR BEHIND COLUMN NODES */}
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

                // Determine line color
                let strokeColor = "stroke-slate-550";
                if (isSafe) {
                  strokeColor = "stroke-emerald-500/80 hover:stroke-emerald-400";
                } else {
                  strokeColor = "stroke-rose-500 hover:stroke-rose-400";
                }
                if (isSelected) {
                  strokeColor = "stroke-blue-400";
                }

                // Drawing auxiliary uniform distributed loads diagram
                const isHorizontal = Math.abs(ptStart.y - ptEnd.y) < 5;
                const loadHeight = 16;
                const arrowCounts = 8;

                return (
                  <g key={beam.id} className="cursor-pointer">
                    
                    {/* Distributed Loads Arrows (if horizontal and load > 0) */}
                    {isHorizontal && beam.uniformLoad > 0 && (
                      <g className="opacity-95 text-amber-500 select-none pointer-events-none">
                        {/* Distributed beam top bracket line */}
                        <line
                          x1={ptStart.x}
                          y1={ptStart.y - loadHeight}
                          x2={ptEnd.x}
                          y2={ptEnd.y - loadHeight}
                          stroke="#f59e0b"
                          strokeWidth="1"
                          strokeDasharray="2 1"
                        />
                        {/* Load arrow markers */}
                        {Array.from({ length: arrowCounts }).map((_, arrowIdx) => {
                          const t = (arrowIdx + 0.5) / arrowCounts;
                          const interX = ptStart.x + t * (ptEnd.x - ptStart.x);
                          const interY = ptStart.y;
                          return (
                            <line
                              key={arrowIdx}
                              x1={interX}
                              y1={interY - loadHeight}
                              x2={interX}
                              y2={interY - 3}
                              stroke="#f59e0b"
                              strokeWidth="1.2"
                              markerEnd="url(#arrow)"
                            />
                          );
                        })}
                        {/* Uniform load label value */}
                        <text
                          x={(ptStart.x + ptEnd.x) / 2}
                          y={ptStart.y - loadHeight - 4}
                          textAnchor="middle"
                          className="fill-amber-400 font-mono font-bold text-[9px]"
                        >
                          q={beam.uniformLoad.toFixed(1)} kN/m
                        </text>
                      </g>
                    )}

                    {/* Interactive wide touch target line */}
                    <line
                      x1={ptStart.x}
                      y1={ptStart.y}
                      x2={ptEnd.x}
                      y2={ptEnd.y}
                      stroke="transparent"
                      strokeWidth="15"
                      onClick={(e) => handleBeamClick(e, beam.id)}
                    />

                    {/* True visible steel beam column bar */}
                    <line
                      x1={ptStart.x}
                      y1={ptStart.y}
                      x2={ptEnd.x}
                      y2={ptEnd.y}
                      className={`${strokeColor} transition-all duration-200`}
                      strokeWidth={isSelected ? "5" : "3.5"}
                      onClick={(e) => handleBeamClick(e, beam.id)}
                    />

                    {/* Beam mini summary tag text if hovered/selected */}
                    {isSelected && (
                      <g className="pointer-events-none">
                        <rect
                          x={(ptStart.x + ptEnd.x) / 2 - 45}
                          y={(ptStart.y + ptEnd.y) / 2 + 8}
                          width="90"
                          height="16"
                          rx="3"
                          fill="#0b0f19"
                          stroke="#38bdf8"
                          strokeWidth="0.8"
                        />
                        <text
                          x={(ptStart.x + ptEnd.x) / 2}
                          y={(ptStart.y + ptEnd.y) / 2 + 20}
                          textAnchor="middle"
                          className="fill-sky-400 font-mono text-[8.5px] font-bold"
                        >
                          BLK {beam.b}x{beam.h} (DCR:{dcrVal.toFixed(2)})
                        </text>
                      </g>
                    )}
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

                // Color coding representing structural safety limit
                let fillCol = "fill-slate-900 stroke-slate-650";
                if (isSafe) {
                  fillCol = "fill-[#0a2318] stroke-emerald-500 hover:fill-[#0c3120]";
                } else {
                  fillCol = "fill-[#330f14] stroke-rose-500 hover:fill-[#44131a]";
                }

                if (isSelected) {
                  fillCol = "fill-[#111c3a] stroke-blue-400";
                }

                return (
                  <g key={node.id} className="cursor-pointer">
                    
                    {/* Concentrated Point Load Arrow vector on top of Column */}
                    {node.directLoad > 0 && (
                      <g className="text-amber-300 pointer-events-none">
                        <line
                          x1={pt.x}
                          y1={pt.y - 30}
                          x2={pt.x}
                          y2={pt.y - 12}
                          stroke="#f59e0b"
                          strokeWidth="2.5"
                          markerEnd="url(#arrow)"
                        />
                        <text
                          x={pt.x + 8}
                          y={pt.y - 20}
                          textAnchor="start"
                          className="fill-amber-400 font-mono font-extrabold text-[9px]"
                        >
                          P={node.directLoad} kN
                        </text>
                      </g>
                    )}

                    {/* Column Rectangle block */}
                    <rect
                      x={pt.x - 10}
                      y={pt.y - 10}
                      width="20"
                      height="20"
                      rx="3"
                      className={`${fillCol} transition-all duration-200`}
                      strokeWidth={isSelected ? "2.5" : "1.8"}
                      onClick={(e) => handleNodeClick(e, node.id)}
                    />

                    {/* Joint dot node center core */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="2.5"
                      fill={isSelected ? "#60a5fa" : "#334155"}
                      pointerEvents="none"
                    />

                    {/* Text values */}
                    <text
                      x={pt.x}
                      y={pt.y + 20}
                      textAnchor="middle"
                      className="fill-slate-400 font-mono text-[8px] font-semibold select-none pointer-events-none"
                    >
                      {isSelected ? `KLM #${node.id.substring(0,4)}` : `DCR ${dcrVal.toFixed(2)}`}
                    </text>
                  </g>
                );
              })}

              {/* Snapping guidelines indicator on mouse hover */}
              {selectedTool === "node" && hoverGrid && (
                <g className="pointer-events-none opacity-80">
                  <circle
                    cx={hoverGrid.gx * GRID_SPACING_X + OFFSET_X}
                    cy={hoverGrid.gy * GRID_SPACING_Y + OFFSET_Y}
                    r="12"
                    fill="none"
                    stroke="#2563eb"
                    strokeDasharray="2 2"
                    strokeWidth="1.2"
                    className="animate-spin"
                  />
                  <circle
                    cx={hoverGrid.gx * GRID_SPACING_X + OFFSET_X}
                    cy={hoverGrid.gy * GRID_SPACING_Y + OFFSET_Y}
                    r="4"
                    fill="#3b82f6"
                  />
                </g>
              )}

              {/* Interactive Beam drawing guide line */}
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
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                  );
                })()
              )}
            </svg>

            {/* QUICK LEGEND PANEL */}
            <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 flex flex-wrap gap-x-6 gap-y-1.5 justify-center items-center text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500/10 border border-emerald-500/40 rounded"></span>
                <span>Elemen Aman (DCR ≤ 1.0)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-rose-500/10 border border-rose-500/40 rounded"></span>
                <span className="text-rose-400 font-semibold">Gagal Kapasitas (DCR &gt; 1.0)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 border border-sky-400 rounded"></span>
                <span>Elemen Terpilih</span>
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="text-base leading-none">↓</span>
                <span>Beban Luar (kN / kN/m)</span>
              </span>
            </div>
          </div>
        </div>

        {/* SIDEBAR DYNAMIC COLUMN CONFIGURATION */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {selectedNode ? (
            /* COLUMN PROPERTIES PANEL */
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 animate-fade-in relative overflow-hidden">
              <div className="absolute right-0 top-0 -mr-4 -mt-4 w-20 h-20 bg-blue-600/5 rounded-full blur-xl"></div>
              
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[10px] uppercase tracking-wider text-blue-400 font-mono font-bold">PROPERTI ELEMEN SELEKSI</span>
                <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded"></span>
                  Kolom Beton (Grid X:{selectedNode.gridX}, Y:{selectedNode.gridY})
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
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-205 focus:border-blue-500 outline-none text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Tinggi h (mm)</label>
                    <input
                      type="number"
                      value={selectedNode.h}
                      onChange={(e) => updateSelectedNode("h", Math.max(150, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-205 focus:border-blue-500 outline-none text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Sizing sliders for easier interactive sizing adjustments */}
                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5 text-[10.5px]">
                    <span>Atur Ukuran Penampang</span>
                    <span className="text-slate-300 font-mono font-semibold">{selectedNode.b}x{selectedNode.h} mm</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="600"
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

                {/* Concrete f'c & Steel fy strengths */}
                <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-850">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Beton f'c (MPa)</label>
                    <select
                      value={selectedNode.fc}
                      onChange={(e) => updateSelectedNode("fc", parseFloat(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-8
                      00 rounded px-2 py-1 text-slate-200 outline-none text-xs"
                    >
                      <option value="20">K-250 (20 MPa)</option>
                      <option value="25">K-300 (25 MPa)</option>
                      <option value="30">K-350 (30 MPa)</option>
                      <option value="35">K-400 (35 MPa)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Baja fy (MPa)</label>
                    <select
                      value={selectedNode.fy}
                      onChange={(e) => updateSelectedNode("fy", parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none text-xs"
                    >
                      <option value="280">BjTP 280 (Siri Polos)</option>
                      <option value="420">BjTS 420 (Ulir Deform)</option>
                    </select>
                  </div>
                </div>

                {/* Column Reinforcement detailing (Tulangan) */}
                <div className="bg-slate-950/40 p-2.5 rounded border border-slate-850 space-y-2">
                  <p className="font-mono text-[9px] text-blue-400 uppercase font-bold tracking-wider mb-1">Detail Besi Tulangan</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block">Jumlah Batang</label>
                      <select
                        value={selectedNode.rebarCount}
                        onChange={(e) => updateSelectedNode("rebarCount", parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs"
                      >
                        <option value="4">4 Batang</option>
                        <option value="6">6 Batang</option>
                        <option value="8">8 Batang</option>
                        <option value="12">12 Batang</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Ukuran Diameter</label>
                      <select
                        value={selectedNode.rebarDiameter}
                        onChange={(e) => updateSelectedNode("rebarDiameter", parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs"
                      >
                        {STANDARD_BAR_DIAMETERS.filter(d => d >= 12).map(d => (
                          <option key={d} value={d}>D{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Point external load application */}
                <div className="pb-2 border-b border-slate-850">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Beban Aksial Tambahan:</span>
                    <span className="text-amber-400 font-mono font-bold">{selectedNode.directLoad} kN</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    step="10"
                    value={selectedNode.directLoad}
                    onChange={(e) => updateSelectedNode("directLoad", parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-[9px] text-slate-500 font-mono italic mt-0.5 block">
                    (Misal: Reaksi tumpuan atap ringan atau tangki air atas diletakkan eksak di kolom ini)
                  </span>
                </div>

                {/* Mechanical Analysis results for this specific Column Node */}
                {analysis.nodes[selectedNode.id] && (
                  (() => {
                    const detail = analysis.nodes[selectedNode.id];
                    return (
                      <div className="bg-slate-950 p-3 rounded border border-slate-850 space-y-2 mt-2">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400">Total Beban Menara Pu:</span>
                          <span className="text-white font-mono font-bold">{detail.PuTotal.toFixed(1)} kN</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400">Kapasitas Desain φPn:</span>
                          <span className="text-emerald-400 font-mono font-bold">{detail.phiPn.toFixed(1)} kN</span>
                        </div>
                        
                        {/* Utilization Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-slate-500">Rasio DCR Aksial:</span>
                            <span className={`font-bold ${detail.DCR > 1.0 ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
                              {(detail.DCR * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${detail.DCR > 1.0 ? "bg-rose-500" : "bg-emerald-500"}`}
                              style={{ width: `${Math.min(100, detail.DCR * 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className={`p-1.5 rounded text-[10px] font-mono text-center flex items-center justify-center gap-1.5 ${
                          detail.isSafe ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400 font-bold"
                        }`}>
                          {detail.isSafe ? (
                            <>
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>KOLOM COCOK & AMAN</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3.5 w-3.5 animate-bounce" />
                              <span>BEBAN MELEBIHI REKAYASA STRUKTUR</span>
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
                <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-mono font-bold">PROPERTI ELEMEN SELEKSI</span>
                <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded"></span>
                  Balok Pengaku Portal
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
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:border-emerald-500 outline-none text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Tinggi h (mm)</label>
                    <input
                      type="number"
                      value={selectedBeam.h}
                      onChange={(e) => updateSelectedBeam("h", Math.max(100, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-205 focus:border-emerald-500 outline-none text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Slider sizing presets for beams */}
                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5 text-[10.5px]">
                    <span>Atur Ukuran Penampang Balok</span>
                    <span className="text-slate-300 font-mono font-semibold">{selectedBeam.b}x{selectedBeam.h} mm</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="650"
                    step="50"
                    value={selectedBeam.h}
                    onChange={(e) => {
                      const hVal = parseInt(e.target.value);
                      updateSelectedBeam("h", hVal);
                      updateSelectedBeam("b", Math.round(hVal * 0.6)); // typical b = 0.6h proportion matching good civil practice
                    }}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Materials configuration strengths */}
                <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-850">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Beton f'c (MPa)</label>
                    <select
                      value={selectedBeam.fc}
                      onChange={(e) => updateSelectedBeam("fc", parseFloat(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none text-xs"
                    >
                      <option value="20">20 MPa</option>
                      <option value="25">25 MPa</option>
                      <option value="30">30 MPa</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Baja Lentur</label>
                    <select
                      value={selectedBeam.fy}
                      onChange={(e) => updateSelectedBeam("fy", parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none text-xs"
                    >
                      <option value="280">fy = 280</option>
                      <option value="420">fy = 420 (Deformed)</option>
                    </select>
                  </div>
                </div>

                {/* Longitudinal Tension Rebears for bending resistance */}
                <div className="bg-slate-950/40 p-2.5 rounded border border-slate-850 space-y-2">
                  <p className="font-mono text-[9px] text-emerald-400 uppercase font-bold tracking-wider mb-1">Besi Tulangan Bawah Lentur</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block">Jumlah Batang</label>
                      <select
                        value={selectedBeam.rebarCount}
                        onChange={(e) => updateSelectedBeam("rebarCount", parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-100 text-xs"
                      >
                        <option value="2">2 Batang</option>
                        <option value="3">3 Batang</option>
                        <option value="4">4 Batang</option>
                        <option value="5">5 Batang</option>
                        <option value="6">6 Batang</option>
                        <option value="8">8 Batang</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Diameter Besi</label>
                      <select
                        value={selectedBeam.rebarDiameter}
                        onChange={(e) => updateSelectedBeam("rebarDiameter", parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-100 text-xs"
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
                    <label className="text-[11px] text-slate-400 block mb-0.5">Sengkang (Stirrup)</label>
                    <select
                      value={selectedBeam.stirrupDiameter}
                      onChange={(e) => updateSelectedBeam("stirrupDiameter", parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 outline-none text-xs"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 focus:border-emerald-500 outline-none text-xs font-mono"
                    />
                  </div>
                </div>

                {/* distributed uniformly values */}
                <div className="pb-2 border-b border-slate-850">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Beban Merata q_u:</span>
                    <span className="text-amber-400 font-mono font-bold">{selectedBeam.uniformLoad.toFixed(1)} kN/m</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="50.0"
                    step="1.0"
                    value={selectedBeam.uniformLoad}
                    onChange={(e) => updateSelectedBeam("uniformLoad", parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-[9px] text-slate-505 font-mono italic mt-0.5 block">
                    (Misal: Reaksi beban dinding batu bata 250kg/m² + plat lantai 400kg/m²)
                  </span>
                </div>

                {/* Analysis detail breakdown calculated in real-time */}
                {analysis.beams[selectedBeam.id] && (
                  (() => {
                    const detail = analysis.beams[selectedBeam.id];
                    return (
                      <div className="bg-slate-950 p-3 rounded border border-slate-850 space-y-2 mt-2">
                        <p className="font-mono text-[9px] text-slate-400 uppercase border-b border-slate-900 pb-1">Review Hasil Solver</p>
                        
                        <div className="flex justify-between items-center text-[11px] font-mono">
                          <span className="text-slate-500">Bentang Bersih (L):</span>
                          <span className="text-white font-bold">{detail.spanLength.toFixed(2)} m</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono border-t border-slate-900 pt-1">
                          <div>
                            <span className="text-slate-500 block">Lentur Mu</span>
                            <span className="text-white block font-bold">{detail.Mu.toFixed(1)} kNm</span>
                            <span className="text-slate-500">Kapasitas φMn</span>
                            <span className="text-emerald-400 block font-bold">{detail.phiMn.toFixed(1)} kNm</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Geser Vu</span>
                            <span className="text-white block font-bold">{detail.Vu.toFixed(1)} kN</span>
                            <span className="text-slate-500">Kapasitas φVn</span>
                            <span className="text-emerald-400 block font-bold">{detail.phiVn.toFixed(1)} kN</span>
                          </div>
                        </div>

                        {/* Flexural stress ratio */}
                        <div className="pt-1.5 space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-slate-400">
                            <span>Stress Lentur DCR:</span>
                            <span className={`font-bold ${detail.DCR_bending > 1.0 ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
                              {(detail.DCR_bending * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${detail.DCR_bending > 1.0 ? "bg-rose-500" : "bg-emerald-500"}`}
                              style={{ width: `${Math.min(100, detail.DCR_bending * 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className={`p-1.5 rounded text-[10px] font-mono text-center flex items-center justify-center gap-1.5 ${
                          detail.isSafe ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400 font-bold"
                        }`}>
                          {detail.isSafe ? (
                            <>
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>BALOK KAPASITAS AMAN</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3.5 w-3.5 animate-bounce" />
                              <span>GAGAL KAPASITAS BATAS</span>
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
            /* DEFAULT PROPERTY BAR PANEL IF NOTHING CHOSEN */
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-800/40 rounded-full flex items-center justify-center mx-auto text-slate-550 border border-slate-800">
                <HelpCircle className="h-6 w-6 text-slate-400" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-slate-200">Panel Sifat Elemen</h4>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Belum ada komponen yang dipilih. Klik salah satu Kolom kotak atau Balok garis di layar sketsa kiri untuk mengedit dimensi penampang, baja rebar, dan memberikan muatan beban.
                </p>
              </div>
              
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-left text-[11px] font-mono text-slate-400 space-y-2">
                <p className="text-blue-400 font-semibold uppercase tracking-wide text-[9.5px]">Saran Konstruksi:</p>
                <div className="space-y-1 leading-relaxed">
                  <p>1. Aktifkan mode <strong>+ Kolom</strong> untuk menambah tiang baru.</p>
                  <p>2. Aktifkan mode <strong>+ Balok</strong> lalu hubungkan dua kolom untuk membuat balok.</p>
                  <p>3. Pilih mode <strong>Navigasi</strong> lalu klik elemen untuk memodifikasi parameter beban.</p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* MATRIX ANALYSIS TABLE & FEASIBILITY REPORT */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-6">
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Feasibility & Stress Ratio Matrix Report</h4>
            <p className="text-xs text-slate-400 mt-0.5">Analisis tegangan batas kriteria kelayakan beton bertulang diatur sesuai SNI 2847-2019.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Status Portal:</span>
            <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider font-mono ${
              analysis.overallStatusSafe 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
            }`}>
              {analysis.overallStatusSafe ? "Aman Terkendali" : "Overload Terdeteksi"}
            </span>
          </div>
        </div>

        {/* DETAILS GRID FOR COLUMNS AND BEAMS TABLE */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          
          {/* COLUMNS CHECKOUT */}
          <div className="p-5 space-y-3">
            <span className="text-[10.5px] font-mono uppercase tracking-wider text-blue-400 font-bold block">1. Rekapitulasi Kolom Beton (Nodes)</span>
            
            {nodes.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono italic">Belum ada kolom terpasang.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-[10px] text-slate-550 border-b border-slate-800/80 uppercase pb-1">
                      <th className="pb-2 font-semibold">Kolom</th>
                      <th className="pb-2 font-semibold">Tampang (mm)</th>
                      <th className="pb-2 font-semibold">Beban Pu (kN)</th>
                      <th className="pb-2 font-semibold">Kapasitas (kN)</th>
                      <th className="pb-2 font-semibold text-right">Rasio DCR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {nodes.map((n, idx) => {
                      const res = analysis.nodes[n.id] || { PuTotal: 0, phiPn: 0, DCR: 0, isSafe: true };
                      return (
                        <tr 
                          key={n.id} 
                          onClick={() => { setSelectedNodeId(n.id); setSelectedBeamId(null); }}
                          className={`hover:bg-slate-850/40 cursor-pointer ${selectedNodeId === n.id ? "bg-slate-800/30" : ""}`}
                        >
                          <td className="py-2.5 font-bold text-slate-300">#{idx+1} [G:{n.gridX},{n.gridY}]</td>
                          <td className="py-2.5 text-slate-400">{n.b}x{n.h}</td>
                          <td className="py-2.5 text-white">{res.PuTotal.toFixed(1)}</td>
                          <td className="py-2.5 text-emerald-400">{res.phiPn.toFixed(0)}</td>
                          <td className="py-2.5 text-right font-extrabold">
                            <span className={res.DCR > 1.0 ? "text-rose-400" : "text-emerald-400"}>
                              {(res.DCR * 100).toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* BEAMS CHECKOUT */}
          <div className="p-5 space-y-3">
            <span className="text-[10.5px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">2. Rekapitulasi Balok Beton (Spans)</span>
            
            {beams.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono italic">Belum ada balok terpasang.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-[10px] text-slate-550 border-b border-slate-800/80 uppercase pb-1">
                      <th className="pb-2 font-semibold">Balok</th>
                      <th className="pb-2 font-semibold">Panjang (m)</th>
                      <th className="pb-2 font-semibold">Momen Mu (kNm)</th>
                      <th className="pb-2 font-semibold">Kapasitas φMn</th>
                      <th className="pb-2 font-semibold text-right">Momen DCR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {beams.map((b, idx) => {
                      const res = analysis.beams[b.id] || { spanLength: 0, Mu: 0, phiMn: 0, DCR_bending: 0, isSafe: true };
                      return (
                        <tr 
                          key={b.id} 
                          onClick={() => { setSelectedBeamId(b.id); setSelectedNodeId(null); }}
                          className={`hover:bg-slate-850/40 cursor-pointer ${selectedBeamId === b.id ? "bg-slate-800/30" : ""}`}
                        >
                          <td className="py-2.5 font-bold text-slate-300">Balok #{idx+1}</td>
                          <td className="py-2.5 text-slate-400">{res.spanLength.toFixed(1)}m</td>
                          <td className="py-2.5 text-white">{res.Mu.toFixed(1)}</td>
                          <td className="py-2.5 text-emerald-400">{res.phiMn.toFixed(0)}</td>
                          <td className="py-2.5 text-right font-extrabold">
                            <span className={res.DCR_bending > 1.0 ? "text-rose-400" : "text-emerald-400"}>
                              {(res.DCR_bending * 100).toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* AI BOT INTEGRATED RECOMMENDATION FOR THIS LAYOUT */}
      {nodes.length > 0 && (
        <AiAdvisor
          type="framing"
          input={{ nodes, beams }}
          result={analysis}
        />
      )}

    </div>
  );
}
