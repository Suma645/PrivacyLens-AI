import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileImage, 
  AlertCircle, 
  CheckCircle, 
  Sparkles, 
  Shield, 
  ArrowRight, 
  X, 
  Info,
  Loader2
} from 'lucide-react';

export default function UploadZone({ onAnalyze, analyzing, uploadProgress, onSelectSample }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageMeta, setImageMeta] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const maxSizeBytes = 30 * 1024 * 1024; // 30 MB

  const handleFileProcess = (file) => {
    setError(null);
    if (!file) return;

    if (!allowedTypes.includes(file.type.toLowerCase()) && !/\.(png|jpe?g|webp)$/i.test(file.name)) {
      setError("Unsupported file format. Please upload a PNG, JPG, JPEG, or WEBP screenshot.");
      return;
    }

    if (file.size > maxSizeBytes) {
      setError("File exceeds 30MB limit. Please upload a smaller screenshot.");
      return;
    }

    setSelectedFile(file);

    // Read preview and dimensions
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target.result;
      setPreviewUrl(url);

      // Extract image dimensions
      const img = new Image();
      img.onload = () => {
        setImageMeta({
          name: file.name,
          sizeFormatted: (file.size / (1024 * 1024)).toFixed(2) + " MB",
          width: img.width,
          height: img.height,
          type: file.type || 'image/png'
        });
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageMeta(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleStartAnalysis = () => {
    if (!selectedFile) {
      setError("Please select or drop a screenshot first.");
      return;
    }
    onAnalyze(selectedFile);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      
      {/* Step Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-cyan-400 text-xs font-semibold mb-3">
          Step 1 of 3: Secure Ingestion
        </div>
        <h2 className="text-3xl font-bold text-white tracking-tight">Upload Your Screenshot</h2>
        <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
          Screenshots are analyzed strictly in volatile memory. No permanent copies are stored.
        </p>
      </div>

      {/* Main Upload Box */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-200 ${
          dragActive 
            ? 'border-cyan-400 bg-cyan-950/20 shadow-2xl shadow-cyan-500/20 scale-[1.01]' 
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/jpg, image/webp"
          className="hidden"
          onChange={(e) => handleFileProcess(e.target.files[0])}
        />

        {!selectedFile ? (
          <div>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <Upload className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              Drag and drop your screenshot here
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Supports PNG, JPG, JPEG, and WEBP up to 30 MB
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-6 py-3 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <FileImage className="w-4 h-4 mr-2" />
              Browse Screenshot Files
            </button>

            {/* Privacy Notification Banner */}
            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400 max-w-lg mx-auto bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Privacy Assurance:</strong> Files are processed in memory and never sent to external AI without explicit consent.
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Image Preview Card */}
            <div className="relative max-w-md mx-auto rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl group">
              <img
                src={previewUrl}
                alt="Uploaded Screenshot"
                className="w-full max-h-72 object-contain mx-auto"
              />
              <button
                type="button"
                onClick={handleReset}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-slate-300 hover:text-white hover:bg-red-600 transition-colors"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metadata Bar */}
            {imageMeta && (
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-800 max-w-md mx-auto">
                <div>
                  <span className="text-slate-500">File: </span>
                  <span className="font-semibold text-white">{imageMeta.name}</span>
                </div>
                <div>
                  <span className="text-slate-500">Size: </span>
                  <span className="font-semibold text-cyan-400">{imageMeta.sizeFormatted}</span>
                </div>
                <div>
                  <span className="text-slate-500">Dimensions: </span>
                  <span className="font-semibold text-blue-400">{imageMeta.width} × {imageMeta.height} px</span>
                </div>
              </div>
            )}

            {/* Upload Progress Bar if processing */}
            {analyzing && (
              <div className="max-w-md mx-auto space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 text-cyan-300 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Scanning screenshot with OCR & Pattern Heuristics...
                  </span>
                  <span>{uploadProgress || 65}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 transition-all duration-300"
                    style={{ width: `${uploadProgress || 65}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                disabled={analyzing}
                onClick={handleStartAnalysis}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-500/25 hover:shadow-cyan-500/35 transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing Privacy Risks...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 text-cyan-200" />
                    Analyze Screenshot
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={analyzing}
                onClick={handleReset}
                className="px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 transition-colors"
              >
                Choose Different File
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Preset Test Case Presets for Hackathon / Testing */}
      <div className="mt-8 pt-6 border-t border-slate-800 text-center">
        <p className="text-xs text-slate-400 font-semibold mb-3">Or choose a pre-loaded sample screenshot:</p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={() => onSelectSample('sample_banking.png', 'Apex Bank Statement')}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/60 text-xs text-slate-300 hover:text-cyan-300 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>💳</span>
            <span>Bank & Card Statement</span>
          </button>
          <button
            onClick={() => onSelectSample('sample_developer.png', 'Developer Terminal & Keys')}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/60 text-xs text-slate-300 hover:text-cyan-300 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>🔑</span>
            <span>Cloud Secrets & .env</span>
          </button>
          <button
            onClick={() => onSelectSample('sample_chat.png', 'Support Chat & OTP')}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-violet-500/60 text-xs text-slate-300 hover:text-cyan-300 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>💬</span>
            <span>Customer Chat & OTP</span>
          </button>
        </div>
      </div>

    </div>
  );
}
