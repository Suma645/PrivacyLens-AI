import React, { useState, useRef, useEffect } from 'react';
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
  SplitSquareVertical, 
  Maximize2,
  Minimize2,
  RefreshCw,
  Check,
  Lock,
  ArrowRight
} from 'lucide-react';

export default function PrivacyEditor({
  originalImage,
  protectedImage,
  detections,
  manualBoxes,
  imageInfo,
  residualRisk,
  onToggleItemVisible,
  onChangeItemStyle,
  onAddManualBox,
  onRemoveManualBox,
  onClearManualBoxes,
  onProtectAll,
  onInvertAll,
  onResetAll,
  onOpenDownload
}) {
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState('side-by-side'); // 'side-by-side' or 'slider'
  const [sliderPos, setSliderPos] = useState(50); // percentage for compare slider
  const [activeBoxId, setActiveBoxId] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [currentDrawBox, setCurrentDrawBox] = useState(null);
  const [manualStyle, setManualStyle] = useState('blackout');

  const leftContainerRef = useRef(null);
  const imgRef = useRef(null);

  // Original image natural dimensions
  const naturalWidth = imageInfo?.width || 800;
  const naturalHeight = imageInfo?.height || 600;

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(3, prev + 0.25));
  const handleZoomOut = () => setZoom(prev => Math.max(0.5, prev - 0.25));
  const handleZoomReset = () => setZoom(1);

  // Manual Drawing handlers on the Left image
  const handleMouseDown = (e) => {
    if (!drawMode || !imgRef.current) return;
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
    if (isDrawing && currentDrawBox && currentDrawBox.width > 10 && currentDrawBox.height > 10) {
      onAddManualBox({
        ...currentDrawBox,
        style: manualStyle
      });
    }
    setIsDrawing(false);
    setDrawStart(null);
    setCurrentDrawBox(null);
  };

  const activeDetection = detections.find(d => d.id === activeBoxId);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        
        {/* Left Toolbar: Residual Risk Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div className="text-xs">
              <span className="text-slate-400">Residual Risk: </span>
              <span className={`font-bold ${residualRisk?.residual_score > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {residualRisk?.residual_score ?? 0}/100
              </span>
            </div>
            {residualRisk?.reduction_percent !== undefined && (
              <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                -{residualRisk.reduction_percent}%
              </span>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500/40 border border-red-500 inline-block" />
            <span>Redacted ({detections.filter(d => !d.keep_visible).length + manualBoxes.length})</span>
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40 border border-emerald-500 inline-block ml-2" />
            <span>Visible ({detections.filter(d => d.keep_visible).length})</span>
          </div>
        </div>

        {/* Center Toolbar: View and Zoom Controls */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
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

          {/* Zoom Buttons */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
            <button 
              onClick={handleZoomOut} 
              className="p-1 hover:text-white hover:bg-slate-800 rounded" 
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono text-xs">{Math.round(zoom * 100)}%</span>
            <button 
              onClick={handleZoomIn} 
              className="p-1 hover:text-white hover:bg-slate-800 rounded" 
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button 
              onClick={handleZoomReset} 
              className="p-1 hover:text-white hover:bg-slate-800 rounded ml-1" 
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Manual Drawing Tool Toggle */}
          <button
            onClick={() => setDrawMode(!drawMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              drawMode 
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30' 
                : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            {drawMode ? 'Drawing Active' : 'Draw Custom Redaction'}
          </button>
        </div>

        {/* Right Toolbar: Download CTA */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenDownload}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export & Download
          </button>
        </div>

      </div>

      {/* Bulk Action Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">Fast Presets:</span>
          <button
            onClick={onProtectAll}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Protect All (Secure Default)
          </button>
          <button
            onClick={onInvertAll}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Invert Selections
          </button>
          {manualBoxes.length > 0 && (
            <button
              onClick={onClearManualBoxes}
              className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear {manualBoxes.length} Manual Box(es)
            </button>
          )}
        </div>

        {drawMode && (
          <div className="flex items-center gap-2 text-cyan-300 bg-cyan-950/40 px-3 py-1 rounded-lg border border-cyan-500/30">
            <span>Draw style:</span>
            <select
              value={manualStyle}
              onChange={(e) => setManualStyle(e.target.value)}
              className="bg-slate-900 text-cyan-200 rounded px-2 py-0.5 border border-cyan-500/40 text-xs"
            >
              <option value="blackout">Solid Blackout</option>
              <option value="blur">Blur</option>
              <option value="pixelate">Pixelate</option>
            </select>
            <span className="text-[11px] text-slate-400 ml-1">Click & drag on original image</span>
          </div>
        )}
      </div>

      {/* Editor Body */}
      {viewMode === 'side-by-side' ? (
        /* Side by Side Split Screen */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT: Original Screenshot with Interactive Bounding Boxes */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Layers className="w-4 h-4" />
                Original Screenshot (Click box to toggle share)
              </span>
              <span>{imageInfo?.width} × {imageInfo?.height} px</span>
            </div>

            <div 
              ref={leftContainerRef}
              className={`relative rounded-2xl overflow-auto border border-slate-800 bg-slate-950 p-2 max-h-[650px] shadow-2xl ${
                drawMode ? 'cursor-crosshair' : 'cursor-default'
              }`}
            >
              <div 
                className="relative inline-block transition-transform duration-150 origin-top-left"
                style={{ transform: `scale(${zoom})` }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                {/* The Original Image */}
                <img
                  ref={imgRef}
                  src={originalImage}
                  alt="Original"
                  className="block max-w-full h-auto select-none pointer-events-none rounded"
                />

                {/* SVG Overlay for Bounding Boxes */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-auto"
                  viewBox={`0 0 ${naturalWidth} ${naturalHeight}`}
                >
                  {/* Detected Items */}
                  {detections.map((det) => {
                    const { x, y, width, height } = det.bounding_box;
                    const isVisible = det.keep_visible;
                    const isSelected = activeBoxId === det.id;

                    const strokeColor = isVisible 
                      ? '#10b981' 
                      : (det.risk_severity === 'Critical' ? '#ef4444' : '#3b82f6');
                    const fillColor = isVisible 
                      ? 'rgba(16, 185, 129, 0.25)' 
                      : (det.risk_severity === 'Critical' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(59, 130, 246, 0.35)');

                    return (
                      <g 
                        key={det.id}
                        className="cursor-pointer group"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveBoxId(det.id === activeBoxId ? null : det.id);
                        }}
                      >
                        {/* Interactive Box */}
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? 3 : 2}
                          rx={3}
                          className="transition-all duration-200"
                        />
                        {/* Label Badge on box */}
                        <text
                          x={x + 3}
                          y={Math.max(12, y - 4)}
                          fill={strokeColor}
                          fontSize={Math.max(10, Math.min(14, width / 8))}
                          fontWeight="bold"
                          fontFamily="monospace"
                          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
                        >
                          {isVisible ? "✓ SHARED" : `🛡️ ${det.protection_style.toUpperCase()}`}
                        </text>
                      </g>
                    );
                  })}

                  {/* User Drawn Manual Boxes */}
                  {manualBoxes.map((box, idx) => (
                    <g key={`manual_${idx}`}>
                      <rect
                        x={box.x}
                        y={box.y}
                        width={box.width}
                        height={box.height}
                        fill="rgba(168, 85, 247, 0.4)"
                        stroke="#a855f7"
                        strokeWidth={2}
                        strokeDasharray="4 2"
                        rx={2}
                      />
                      <text
                        x={box.x + 3}
                        y={Math.max(12, box.y - 4)}
                        fill="#c084fc"
                        fontSize="11"
                        fontWeight="bold"
                      >
                        MANUAL {box.style.toUpperCase()}
                      </text>
                    </g>
                  ))}

                  {/* Current Active Drag Box */}
                  {currentDrawBox && (
                    <rect
                      x={currentDrawBox.x}
                      y={currentDrawBox.y}
                      width={currentDrawBox.width}
                      height={currentDrawBox.height}
                      fill="rgba(6, 182, 212, 0.3)"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  )}
                </svg>
              </div>
            </div>

            {/* Quick Box Inspector Popover if a box is clicked */}
            {activeDetection && (
              <div className="p-4 rounded-xl bg-slate-900 border border-blue-500/40 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white font-mono">
                      {activeDetection.extracted_text}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-cyan-300 border border-blue-500/20">
                      {activeDetection.type}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveBoxId(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>

                <p className="text-xs text-slate-300">
                  {activeDetection.explanation}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => onToggleItemVisible(activeDetection.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeDetection.keep_visible
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {activeDetection.keep_visible ? <Check className="w-3.5 h-3.5" /> : null}
                    {activeDetection.keep_visible ? 'Visible (Will Share)' : 'Mark Safe to Share'}
                  </button>

                  <div className="flex items-center gap-1 text-xs text-slate-400 ml-auto">
                    <span>Style:</span>
                    {['blur', 'pixelate', 'blackout'].map((s) => (
                      <button
                        key={s}
                        onClick={() => onChangeItemStyle(activeDetection.id, s)}
                        className={`px-2 py-1 rounded text-xs capitalize ${
                          activeDetection.protection_style === s
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Live Protected Screenshot Result */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                Live Protected Preview (Final Download Result)
              </span>
              <span className="text-[11px] text-slate-500">Unrecoverable Redaction</span>
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
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                All redacted pixels are permanently sanitized using multi-pass filters.
              </span>
              <button
                onClick={onOpenDownload}
                className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
              >
                Download Protected File
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* Compare Slider Mode (Before / After wipe slider) */
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-2 shadow-2xl max-w-4xl mx-auto">
          <div className="text-center text-xs text-slate-400 mb-2">
            Drag the vertical handle left/right to compare Before (Original) vs After (Protected)
          </div>

          <div 
            className="relative select-none overflow-hidden rounded-xl mx-auto"
            style={{ width: '100%', maxWidth: '800px', height: '520px' }}
          >
            {/* Background: Protected Result */}
            <img
              src={protectedImage}
              alt="Protected"
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
              className="absolute top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_10px_#06b6d4] cursor-ew-resize flex items-center justify-center"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="w-6 h-6 rounded-full bg-cyan-400 text-slate-950 font-bold flex items-center justify-center text-[10px] shadow-lg">
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

          <div className="flex justify-between text-xs text-slate-400 mt-3 px-4">
            <span className="font-semibold text-blue-400">← Original Screenshot</span>
            <span className="font-semibold text-emerald-400">Protected Screenshot →</span>
          </div>
        </div>
      )}

    </div>
  );
}
