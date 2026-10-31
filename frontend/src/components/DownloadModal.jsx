import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Download, 
  X, 
  FileCheck, 
  Lock, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { getDownloadUrl } from '../services/api';

export default function DownloadModal({ isOpen, onClose, fileId, imageInfo, residualRisk, protectedImage }) {
  const origExt = (imageInfo?.filename?.split('.').pop() || 'png').toLowerCase();
  const isDoc = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'txt', 'rtf'].includes(origExt);

  const [format, setFormat] = useState(isDoc ? origExt : 'png');
  const [check1, setCheck1] = useState(true);
  const [check2, setCheck2] = useState(true);
  const [check3, setCheck3] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (isDoc) {
      setFormat(origExt);
    } else {
      setFormat('png');
    }
  }, [origExt, isDoc]);

  if (!isOpen) return null;

  const allChecked = check1 && check2 && check3;

  const handleDownload = () => {
    if (!allChecked || !fileId) return;

    setDownloading(true);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    const url = getDownloadUrl(fileId, format, protectedImage);
    const link = document.createElement('a');
    link.href = url;
    link.download = `privacylens-protected-${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-bold text-white">Pre-Flight Privacy Checklist</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Confirm your privacy decisions before downloading the permanent, irreversible protected export.
          </p>
        </div>

        {/* Live Pre-Download Preview Card */}
        <div className="mb-6 rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 p-2.5 shadow-xl relative group">
          <div className="flex items-center justify-between pb-2 px-1 text-[11px] font-semibold text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              Live Sanitized Preview (Verification)
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
              Safe to Export
            </span>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center max-h-52 border border-slate-800">
            {protectedImage ? (
              <img
                src={protectedImage}
                alt="Protected Preview"
                className="max-h-52 w-auto object-contain mx-auto"
              />
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                <FileCheck className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
                Sanitized Document Ready for Download (.{(format || origExt).toUpperCase()})
              </div>
            )}
          </div>
        </div>

        {/* Export Properties Strip */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs text-slate-300 mb-6">
          <div>
            <span className="text-slate-500">File: </span>
            <span className="font-semibold text-white truncate max-w-[120px] inline-block align-bottom">
              {imageInfo?.filename || "document"}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Original: </span>
            <span className="font-semibold text-emerald-400">100% Untouched</span>
          </div>
          <div>
            <span className="text-slate-500">Export: </span>
            <span className="font-semibold text-cyan-400">Permanent Redaction</span>
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={check1}
              onChange={(e) => setCheck1(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
            />
            <div className="text-xs text-slate-300">
              <strong className="text-white block font-medium">1. Critical PII Protection</strong>
              All high-priority identifiers (Aadhaar, PAN, Bank Accounts, Cards) are permanently wiped from the exported file.
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={check2}
              onChange={(e) => setCheck2(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
            />
            <div className="text-xs text-slate-300">
              <strong className="text-white block font-medium">2. Separate Protected Copy</strong>
              The original uploaded file is not overwritten; a separate sanitized file is being exported.
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={check3}
              onChange={(e) => setCheck3(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
            />
            <div className="text-xs text-slate-300">
              <strong className="text-white block font-medium">3. Irreversible Sanitization</strong>
              Redactions cannot be recovered via text copying, unblurring, or file inspection.
            </div>
          </label>
        </div>

        {/* Format Selector */}
        <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs mb-6 gap-2">
          <span className="font-semibold text-slate-300">Export Format:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {isDoc ? (
              <>
                <button
                  type="button"
                  onClick={() => setFormat(origExt)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    format === origExt
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white bg-slate-900'
                  }`}
                >
                  .{origExt.toUpperCase()} (Native)
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('pdf')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    format === 'pdf'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white bg-slate-900'
                  }`}
                >
                  PDF Document
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('png')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    format === 'png'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white bg-slate-900'
                  }`}
                >
                  PNG Preview
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setFormat('png')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    format === 'png'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white bg-slate-900'
                  }`}
                >
                  PNG
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('jpg')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    format === 'jpg'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white bg-slate-900'
                  }`}
                >
                  JPG
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('pdf')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    format === 'pdf'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white bg-slate-900'
                  }`}
                >
                  PDF
                </button>
              </>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleDownload}
          disabled={!allChecked || downloading}
          className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          {downloading ? 'Downloading Sanitized File...' : `Download Protected .${(format || 'png').toUpperCase()}`}
        </button>

        {!allChecked && (
          <p className="text-[11px] text-center text-slate-500 mt-2">
            Please check all 3 verification boxes above to confirm export.
          </p>
        )}

      </div>
    </div>
  );
}
