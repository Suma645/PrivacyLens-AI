import React, { useState, useRef } from 'react';
import { 
  Eye, 
  EyeOff, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Sliders, 
  Layers, 
  ShieldCheck, 
  ShieldAlert, 
  PenTool, 
  Trash2, 
  Download, 
  Sparkles,
  SplitSquareVertical, 
  Maximize2, 
  Minimize2,
  RefreshCw,
  Check,
  Lock,
  ArrowRight,
  MousePointer,
  Grid,
  Droplet,
  Square
} from 'lucide-react';

export default function PrivacyEditor({
  originalImage,
  protectedImage,
  detections = [],
  manualBoxes = [],
  visibleBoxes = [],
  protectionMode = 'spotlight',
  imageInfo,
  residualRisk,
  onToggleItemVisible,
  onChangeItemStyle,
  onAddVisibleBox,
  onRemoveVisibleBox,
  onClearVisibleBoxes,
  onAddManualBox,
  onClearManualBoxes,
  onProtectAll,
  onInvertAll,
  onOpenDownload
}) {
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState('side-by-side'); // 'side-by-side' or 'slider'
  const [sliderPos, setSliderPos] = useState(50); // percentage for compare slider
  const [activeTool, setActiveTool] = useState('blackout'); // 'blackout', 'blur', 'pixelate', 'spotlight'
  
  // Dragging state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [currentDrawBox, setCurrentDrawBox] = useState(null);

  const leftContainerRef = useRef(null);
  const imgRef = useRef(null);

  // Original image natural dimensions
  const naturalWidth = imageInfo?.width || 800;
  const naturalHeight = imageInfo?.height || 600;

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(3, prev + 0.25));
  const handleZoomOut = () => setZoom(prev => Math.max(0.5, prev - 0.25));
  const handleZoomReset = () => setZoom(1);

  // Click & Drag on the original image
  const handleMouseDown = (e) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = naturalWidth / rect.width;
    const scaleY = naturalHeight / rect.height;

    const startX = (e.clientX - rect.left) * scaleX;
    const startY = (e.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    setDrawStart({ x: startX, y: startY });
    setCurrentDrawBox({ x: startX, y: startY, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !drawStart || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = naturalWidth / rect.width;
    const scaleY = naturalHeight / rect.height;

    const curX = (e.clientX - rect.left) * scaleX;
    const curY = (e.clientY - rect.top) * scaleY;

    const x = Math.min(drawStart.x, curX);
    const y = Math.min(drawStart.y, curY);
    const width = Math.abs(curX - drawStart.x);
    const height = Math.abs(curY - drawStart.y);

    setCurrentDrawBox({ x, y, width, height });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentDrawBox && currentDrawBox.width > 12 && currentDrawBox.height > 12) {
      if (activeTool === 'spotlight') {
        // Spotlight Sharing: Only this box is kept visible, rest is blurred
        onAddVisibleBox({
          x: Math.round(currentDrawBox.x),
          y: Math.round(currentDrawBox.y),
          width: Math.round(currentDrawBox.width),
          height: Math.round(currentDrawBox.height)
        });
      } else {
        // Manual Redaction: blackout, blur, or pixelate
        onAddManualBox({
          id: 'man_' + Date.now(),
          x: Math.round(currentDrawBox.x),
          y: Math.round(currentDrawBox.y),
          width: Math.round(currentDrawBox.width),
          height: Math.round(currentDrawBox.height),
          style: activeTool
        });
      }
    }
    setIsDrawing(false);
    setDrawStart(null);
    setCurrentDrawBox(null);
  };

  // Get current tool display label
  const getToolLabel = () => {
    switch (activeTool) {
      case 'blackout': return '⬛ Solid Blackout Active (Click & Drag to Blackout)';
      case 'blur': return '💧 Gaussian Blur Active (Click & Drag to Blur)';
      case 'pixelate': return '▦ Pixelation Active (Click & Drag to Pixelate)';
      case 'spotlight': return '✨ Spotlight Active (Click & Drag Area to Keep Clear)';
      default: return 'Redaction Tool';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Top Multi-Tool Selection Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md">
        
        {/* Tool Mode Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-1">Active Tool:</span>
          
          <button
            onClick={() => setActiveTool('blackout')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTool === 'blackout'
                ? 'bg-black text-amber-300 border border-amber-500/70 shadow-lg shadow-amber-500/10'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Solid Blackout
          </button>

          <button
            onClick={() => setActiveTool('blur')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTool === 'blur'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Droplet className="w-3.5 h-3.5" />
            Gaussian Blur
          </button>

          <button
            onClick={() => setActiveTool('pixelate')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTool === 'pixelate'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            Pixelate
          </button>

          <button
            onClick={() => setActiveTool('spotlight')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTool === 'spotlight'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Spotlight Selection
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {manualBoxes.length > 0 && (
            <button
              onClick={onClearManualBoxes}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              Clear Manual ({manualBoxes.length})
            </button>
          )}

          {visibleBoxes.length > 0 && (
            <button
              onClick={onClearVisibleBoxes}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              Clear Spotlight ({visibleBoxes.length})
            </button>
          )}

          <button
            onClick={onOpenDownload}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Protected
          </button>
        </div>
      </div>

      {/* Editor Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
        
        {/* Left Status Indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              <span className="text-slate-400">Tool: </span>
              <span className="font-bold text-cyan-400">
                {getToolLabel()}
              </span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-black border border-amber-400 inline-block" />
            <span>Aadhaar/PAN/Bank = Solid Blackout</span>
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/40 border border-blue-500 inline-block ml-2" />
            <span>Email/Phone = Optional Blur</span>
          </div>
        </div>

        {/* View & Zoom Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                viewMode === 'side-by-side' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Side by Side
            </button>
            <button
              onClick={() => setViewMode('slider')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                viewMode === 'slider' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Compare Slider
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button 
              onClick={handleZoomOut} 
              className="p-1 hover:text-white hover:bg-slate-800 rounded cursor-pointer" 
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono text-xs">{Math.round(zoom * 100)}%</span>
            <button 
              onClick={handleZoomIn} 
              className="p-1 hover:text-white hover:bg-slate-800 rounded cursor-pointer" 
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button 
              onClick={handleZoomReset} 
              className="p-1 hover:text-white hover:bg-slate-800 rounded ml-1 cursor-pointer" 
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Main Interactive Stage */}
      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* LEFT: Interactive Original Screenshot (Drag to Redact or Spotlight) */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <MousePointer className="w-4 h-4" />
                Original File (Click & Drag to Apply {activeTool.toUpperCase()})
              </span>
              <span className="text-[11px] text-cyan-400 font-bold bg-cyan-500/15 px-2 py-0.5 rounded border border-cyan-500/30">
                Interactive Canvas Active
              </span>
            </div>

            <div 
              ref={leftContainerRef}
              className="relative rounded-2xl overflow-auto border-2 border-dashed border-cyan-500/40 bg-slate-950 p-2 max-h-[650px] shadow-2xl cursor-crosshair select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <div 
                className="relative inline-block transition-transform duration-150 origin-top-left"
                style={{ transform: `scale(${zoom})` }}
              >
                <img
                  ref={imgRef}
                  src={originalImage}
                  alt="Original Screenshot"
                  className="block max-w-full h-auto select-none rounded pointer-events-none"
                />

                {/* SVG Overlay for Bounding Boxes and Selections */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-auto"
                  viewBox={`0 0 ${naturalWidth} ${naturalHeight}`}
                  preserveAspectRatio="none"
                >
                  {/* Detected Items Overlay */}
                  {detections.map((det) => {
                    const b = det.bounding_box;
                    if (!b || b.width <= 0) return null;
                    const isHighest = det.priority === 'highest';
                    const isProtected = !det.keep_visible;

                    if (isProtected) {
                      // Highest Priority = Solid Black Box
                      if (isHighest || det.protection_style === 'blackout') {
                        return (
                          <g key={`det_${det.id}`}>
                            <rect
                              x={b.x}
                              y={b.y}
                              width={b.width}
                              height={b.height}
                              fill="#000000"
                              stroke="#f59e0b"
                              strokeWidth={1.5}
                              rx={2}
                            />
                            <text
                              x={b.x + 4}
                              y={Math.max(12, b.y - 4)}
                              fill="#f59e0b"
                              fontSize="10"
                              fontWeight="bold"
                            >
                              ⬛ SOLID BLACKOUT: {det.extracted_text.slice(0, 14)}
                            </text>
                          </g>
                        );
                      }

                      // Blur
                      return (
                        <g key={`det_${det.id}`}>
                          <rect
                            x={b.x}
                            y={b.y}
                            width={b.width}
                            height={b.height}
                            fill="rgba(59, 130, 246, 0.45)"
                            stroke="#3b82f6"
                            strokeWidth={1.5}
                            rx={2}
                          />
                          <text
                            x={b.x + 4}
                            y={Math.max(12, b.y - 4)}
                            fill="#60a5fa"
                            fontSize="10"
                            fontWeight="bold"
                          >
                            💧 BLUR: {det.extracted_text.slice(0, 14)}
                          </text>
                        </g>
                      );
                    }

                    // Kept visible
                    return (
                      <g key={`det_${det.id}`}>
                        <rect
                          x={b.x}
                          y={b.y}
                          width={b.width}
                          height={b.height}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth={1.5}
                          strokeDasharray="4 3"
                          rx={2}
                        />
                        <text
                          x={b.x + 4}
                          y={Math.max(12, b.y - 4)}
                          fill="#10b981"
                          fontSize="9"
                          fontWeight="bold"
                        >
                          ✓ VISIBLE
                        </text>
                      </g>
                    );
                  })}

                  {/* User-Drawn Manual Redaction Boxes */}
                  {manualBoxes.map((box, idx) => (
                    <g key={`man_${box.id || idx}`} className="cursor-pointer">
                      <rect
                        x={box.x}
                        y={box.y}
                        width={box.width}
                        height={box.height}
                        fill={box.style === 'blackout' ? '#000000' : (box.style === 'pixelate' ? 'rgba(168, 85, 247, 0.45)' : 'rgba(59, 130, 246, 0.45)')}
                        stroke={box.style === 'blackout' ? '#ef4444' : (box.style === 'pixelate' ? '#a855f7' : '#3b82f6')}
                        strokeWidth={2}
                        rx={3}
                      />
                      <rect
                        x={box.x}
                        y={Math.max(0, box.y - 18)}
                        width={Math.min(box.width, 140)}
                        height={16}
                        fill={box.style === 'blackout' ? '#000000' : (box.style === 'pixelate' ? '#9333ea' : '#2563eb')}
                        rx={2}
                      />
                      <text
                        x={box.x + 4}
                        y={Math.max(11, box.y - 6)}
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="bold"
                      >
                        {box.style === 'blackout' ? '⬛ MANUAL BLACKOUT' : (box.style === 'pixelate' ? '▦ PIXELATE' : '💧 BLUR')}
                      </text>
                    </g>
                  ))}

                  {/* User-Selected Visible Spotlight Boxes */}
                  {visibleBoxes.map((box, idx) => (
                    <g key={`vis_${box.id || idx}`} className="cursor-pointer">
                      <rect
                        x={box.x}
                        y={box.y}
                        width={box.width}
                        height={box.height}
                        fill="rgba(16, 185, 129, 0.18)"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        rx={4}
                      />
                      <rect
                        x={box.x}
                        y={Math.max(0, box.y - 20)}
                        width={Math.min(box.width, 160)}
                        height={18}
                        fill="#059669"
                        rx={3}
                      />
                      <text
                        x={box.x + 6}
                        y={Math.max(13, box.y - 7)}
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="bold"
                      >
                        ✓ SPOTLIGHT CLEAR #{idx + 1}
                      </text>
                    </g>
                  ))}

                  {/* Active Dragging Rectangle Preview */}
                  {currentDrawBox && currentDrawBox.width > 5 && currentDrawBox.height > 5 && (
                    <g>
                      <rect
                        x={currentDrawBox.x}
                        y={currentDrawBox.y}
                        width={currentDrawBox.width}
                        height={currentDrawBox.height}
                        fill={
                          activeTool === 'blackout' ? '#000000' : 
                          activeTool === 'pixelate' ? 'rgba(168, 85, 247, 0.3)' :
                          activeTool === 'spotlight' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(59, 130, 246, 0.3)'
                        }
                        stroke={
                          activeTool === 'blackout' ? '#ef4444' : 
                          activeTool === 'pixelate' ? '#a855f7' :
                          activeTool === 'spotlight' ? '#10b981' : '#3b82f6'
                        }
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        rx={3}
                      />
                      <rect
                        x={currentDrawBox.x}
                        y={Math.max(0, currentDrawBox.y - 18)}
                        width={130}
                        height={16}
                        fill={
                          activeTool === 'blackout' ? '#000000' :
                          activeTool === 'pixelate' ? '#a855f7' :
                          activeTool === 'spotlight' ? '#10b981' : '#3b82f6'
                        }
                        rx={2}
                      />
                      <text
                        x={currentDrawBox.x + 4}
                        y={Math.max(11, currentDrawBox.y - 6)}
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="bold"
                      >
                        DRAWING {activeTool.toUpperCase()}
                      </text>
                    </g>
                  )}
                </svg>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                <MousePointer className="w-3.5 h-3.5 text-cyan-400" />
                Select any region to apply {activeTool}.
              </span>
              <div className="flex items-center gap-3">
                {manualBoxes.length > 0 && (
                  <button
                    onClick={onClearManualBoxes}
                    className="text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                  >
                    Reset Manual ({manualBoxes.length})
                  </button>
                )}
                {visibleBoxes.length > 0 && (
                  <button
                    onClick={onClearVisibleBoxes}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                  >
                    Reset Spotlight ({visibleBoxes.length})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Live Protected Screenshot Result */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                Protected Live Preview (Irreversible Burn-in)
              </span>
              <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Safe to Share
              </span>
            </div>

            <div className="relative rounded-2xl overflow-auto border border-slate-800 bg-slate-950 p-2 max-h-[650px] shadow-2xl">
              <div 
                className="transition-transform duration-150 origin-top-left"
                style={{ transform: `scale(${zoom})` }}
              >
                <img
                  src={protectedImage}
                  alt="Protected Preview"
                  className="block max-w-full h-auto select-none rounded"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Aadhaar/PAN/Bank blacked out; sensitive data securely sanitized.
              </span>
              <button
                onClick={onOpenDownload}
                className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                Download Now
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* Compare Slider Mode */
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-4 shadow-2xl max-w-4xl mx-auto space-y-3">
          <div className="text-center text-xs text-slate-300">
            Drag the vertical handle left/right to compare <strong>Original File</strong> vs <strong>Sanitized Result</strong>
          </div>

          <div 
            className="relative select-none overflow-hidden rounded-xl mx-auto border border-slate-800"
            style={{ width: '100%', maxWidth: '800px', height: '520px' }}
          >
            {/* Background: Protected Result */}
            <img
              src={protectedImage}
              alt="Protected Result"
              className="absolute inset-0 w-full h-full object-contain select-none"
            />

            {/* Foreground: Original Image with Clip */}
            <div 
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={originalImage}
                alt="Original"
                className="absolute inset-0 w-full h-full object-contain select-none max-w-none"
                style={{ width: '800px' }}
              />
            </div>

            {/* Divider Line */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-emerald-400 shadow-[0_0_12px_#10b981] cursor-ew-resize flex items-center justify-center"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs shadow-lg">
                ↔
              </div>
            </div>

            {/* Hidden Native Range Input for Slider Dragging */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPos}
              onChange={(e) => setSliderPos(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
            />
          </div>

          <div className="flex justify-between text-xs text-slate-400 px-4">
            <span className="font-semibold text-blue-400">← Original</span>
            <span className="font-semibold text-emerald-400">Protected Output →</span>
          </div>
        </div>
      )}

    </div>
  );
}
