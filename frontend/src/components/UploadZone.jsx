import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  FileCode, 
  FileImage, 
  AlertCircle, 
  CheckCircle, 
  Sparkles, 
  Shield, 
  ArrowRight, 
  X, 
  Info, 
  Loader2, 
  FileCheck2, 
  Layers,
  FolderOpen
} from 'lucide-react';

export default function UploadZone({ onAnalyze, analyzing, uploadProgress, onSelectSample }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileMeta, setFileMeta] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [activeFormatTab, setActiveFormatTab] = useState('ALL');
  const fileInputRef = useRef(null);

  // Supported extensions matching backend DocumentService
  const supportedDocExtensions = [
    'pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'txt', 'rtf', 'odt', 'ods', 'odp'
  ];
  const supportedImageExtensions = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff'];
  const allSupported = [...supportedDocExtensions, ...supportedImageExtensions];

  const maxSizeBytes = 50 * 1024 * 1024; // 50 MB

  // Dynamic Accept strings per tab for OS file dialog
  const acceptMap = {
    ALL: '*/*',
    PDF: '.pdf,application/pdf',
    WORD: '.docx,.doc,.odt,.rtf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    EXCEL: '.xlsx,.xls,.ods,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    PPT: '.pptx,.ppt,.odp,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation',
    IMAGE: 'image/*,.png,.jpg,.jpeg,.webp,.bmp'
  };

  const getFormatCategory = (filename) => {
    const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';
    if (['pdf'].includes(ext)) return { label: 'PDF Document', icon: FileText, color: 'text-red-400 bg-red-500/10 border-red-500/30' };
    if (['docx', 'doc', 'odt', 'rtf'].includes(ext)) return { label: 'Word Document', icon: FileText, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
    if (['xlsx', 'xls', 'ods', 'csv'].includes(ext)) return { label: 'Spreadsheet', icon: FileSpreadsheet, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    if (['pptx', 'ppt', 'odp'].includes(ext)) return { label: 'Presentation', icon: Presentation, color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' };
    if (['txt', 'log'].includes(ext)) return { label: 'Text Document', icon: FileCode, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    return { label: 'Screenshot / Image', icon: FileImage, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
  };

  const handleFileProcess = (file) => {
    setError(null);
    if (!file) return;

    const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
    const isSupported = allSupported.includes(ext);

    if (!isSupported) {
      setError(`Unsupported format ".${ext || 'unknown'}". Supported formats: PDF, Word (.docx/.doc), Excel (.xlsx/.xls), PowerPoint (.pptx/.ppt), Text (.txt/.rtf), and Images (.png/.jpg/.webp).`);
      return;
    }

    if (file.size > maxSizeBytes) {
      setError("File exceeds 50MB limit. Please upload a smaller file.");
      return;
    }

    setSelectedFile(file);

    const isImage = supportedImageExtensions.includes(ext);
    const catInfo = getFormatCategory(file.name);

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target.result;
        setPreviewUrl(url);

        const img = new Image();
        img.onload = () => {
          setFileMeta({
            name: file.name,
            ext: ext.toUpperCase(),
            sizeFormatted: (file.size / (1024 * 1024)).toFixed(2) + " MB",
            dimensions: `${img.width} × ${img.height} px`,
            type: catInfo.label,
            isDocument: false,
            catInfo
          });
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    } else {
      // Document file (PDF, DOCX, XLSX, PPTX, TXT)
      setPreviewUrl(null);
      setFileMeta({
        name: file.name,
        ext: ext.toUpperCase(),
        sizeFormatted: file.size > 1024 * 1024 
          ? (file.size / (1024 * 1024)).toFixed(2) + " MB"
          : (file.size / 1024).toFixed(1) + " KB",
        type: catInfo.label,
        isDocument: true,
        catInfo
      });
    }
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
    setFileMeta(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleStartAnalysis = () => {
    if (!selectedFile) {
      setError("Please select or drop a document or screenshot first.");
      return;
    }
    onAnalyze(selectedFile);
  };

  const currentAccept = acceptMap[activeFormatTab] || '*/*';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-cyan-400 text-xs font-semibold mb-3">
          <Shield className="w-3.5 h-3.5" />
          Universal Privacy Scanner & Automatic Redaction
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Upload Documents or Screenshots
        </h2>
        <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
          Scan PDFs, Word, Excel, PowerPoint, Text, and Screenshots for sensitive PII. Critical information (Aadhaar, PAN, Bank accounts) is automatically protected.
        </p>
      </div>

      {/* Format Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-6 text-xs">
        {[
          { id: 'ALL', label: 'All Supported Formats' },
          { id: 'PDF', label: 'PDF Documents (.pdf)' },
          { id: 'WORD', label: 'Word (.docx, .doc, .odt)' },
          { id: 'EXCEL', label: 'Excel & Data (.xlsx, .xls, .ods)' },
          { id: 'PPT', label: 'PowerPoint (.pptx, .ppt)' },
          { id: 'IMAGE', label: 'Screenshots & Images' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFormatTab(tab.id)}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
              activeFormatTab === tab.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Drag-and-Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={(e) => {
          if (!selectedFile && !e.target.closest('button')) {
            fileInputRef.current?.click();
          }
        }}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-200 cursor-pointer ${
          dragActive 
            ? 'border-cyan-400 bg-cyan-950/30 shadow-2xl shadow-cyan-500/20 scale-[1.01]' 
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/50 shadow-xl'
        }`}
      >
        {/* Universal File Input (accepts all files so file browser never hides documents) */}
        <input
          ref={fileInputRef}
          type="file"
          accept={currentAccept}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileProcess(e.target.files[0]);
            }
          }}
        />

        {!selectedFile ? (
          <div>
            <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <Upload className="w-10 h-10" />
            </div>

            <h3 className="text-xl font-bold text-white mb-1">
              Drag & drop your document or screenshot here
            </h3>
            <p className="text-xs text-slate-400 mb-6 max-w-md mx-auto">
              PDF, Word (DOCX/DOC), Excel (XLSX/XLS), PowerPoint (PPTX/PPT), Text (TXT/RTF), PNG, JPG, WEBP (up to 50 MB)
            </p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center px-6 py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/25 cursor-pointer hover:scale-[1.02]"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Browse Documents & Images
            </button>

            {/* Quick Demo Samples */}
            {onSelectSample && (
              <div className="mt-8 pt-6 border-t border-slate-800/80" onClick={(e) => e.stopPropagation()}>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-3">
                  Or test with 1-click sample cases:
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectSample('sample_banking.png', 'Banking & Aadhaar Statement')}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    🏦 Banking & Aadhaar
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectSample('sample_chat.png', 'Customer Support Chat & Marks')}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    💬 Chat & Student Marks
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectSample('sample_developer.png', 'Developer Terminal & Secrets')}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    💻 Cloud Keys & Secrets
                  </button>
                </div>
              </div>
            )}

            {/* Privacy Assurance Banner */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 max-w-lg mx-auto bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Privacy Protected:</strong> Original files are never overwritten; sanitized copies are generated separately.
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-6" onClick={(e) => e.stopPropagation()}>
            
            {/* File Preview Card */}
            <div className="relative max-w-md mx-auto rounded-3xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Uploaded file preview"
                  className="w-full max-h-72 object-contain mx-auto bg-slate-950/80"
                />
              ) : (
                <div className="p-8 text-center space-y-3 bg-slate-900/70">
                  <div className={`w-20 h-20 mx-auto rounded-3xl border flex items-center justify-center ${fileMeta?.catInfo?.color || 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'}`}>
                    {fileMeta?.catInfo?.icon ? (
                      <fileMeta.catInfo.icon className="w-10 h-10" />
                    ) : (
                      <FileCheck2 className="w-10 h-10" />
                    )}
                  </div>
                  <h4 className="text-base font-bold text-white break-all">{fileMeta?.name}</h4>
                  <div className="flex items-center justify-center gap-2">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-cyan-300 border border-blue-500/30">
                      {fileMeta?.type || 'Document'}
                    </span>
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
                      .{fileMeta?.ext}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleReset}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/90 text-slate-300 hover:text-white hover:bg-red-600 transition-colors cursor-pointer shadow-md"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metadata Bar */}
            {fileMeta && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-950/80 p-4 rounded-2xl border border-slate-800 max-w-md mx-auto text-left">
                <div>
                  <span className="text-slate-500 block text-[11px]">Format</span>
                  <span className="font-bold text-white">{fileMeta.ext} ({fileMeta.type})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Size</span>
                  <span className="font-bold text-cyan-400">{fileMeta.sizeFormatted}</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-500 block text-[11px]">Processing Status</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Ready to Scan
                  </span>
                </div>
              </div>
            )}

            {/* Analysis Progress Indicator */}
            {analyzing && (
              <div className="max-w-md mx-auto space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-2 text-cyan-300 font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    Scanning Document / Image for PII...
                  </span>
                  <span className="font-mono font-bold text-cyan-400">{uploadProgress || 65}%</span>
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
            {!analyzing && (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Choose Different File
                </button>
                <button
                  type="button"
                  onClick={handleStartAnalysis}
                  className="px-7 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
                >
                  <Shield className="w-4 h-4" />
                  Scan & Protect Document
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
}
