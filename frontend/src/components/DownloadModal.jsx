import React, { useState } from 'react';
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
  const [format, setFormat] = useState('png');
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const allChecked = check1 && check2 && check3;

  const handleDownload = () => {
    if (!allChecked || !fileId) return;

    setDownloading(true);

    // Trigger fireworks / confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // non-fatal
    }

    // Trigger browser file download (supports both server endpoint and on-device data URL)
    const url = getDownloadUrl(fileId, format, protectedImage);
    const link = document.createElement('a');
    link.href = url;
    link.download = `snapshield-protected-${Date.now()}.${format}`;
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
            Confirm your privacy decisions before downloading the permanent, irreversible export.
          </p>
        </div>

        {/* Export Properties Strip */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs text-slate-300 mb-6">
          <div>
            <span className="text-slate-500">Dimensions: </span>
            <span className="font-semibold text-white">{imageInfo?.width} × {imageInfo?.height} px</span>
          </div>
          <div>
            <span className="text-slate-500">Metadata: </span>
            <span className="font-semibold text-emerald-400">EXIF Stripped</span>
          </div>
          <div>
            <span className="text-slate-500">Security: </span>
            <span className="font-semibold text-cyan-400">Irreversible</span>
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
              <strong className="text-white block font-medium">1. Personal & Financial Verification</strong>
              I have verified that all sensitive passwords, account numbers, and identities are properly masked.
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
              <strong className="text-white block font-medium">2. Explicit Share Consent</strong>
              I confirm that only the sections I explicitly marked visible will be readable by recipients.
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
              <strong className="text-white block font-medium">3. Permanent Flattening Acknowledgement</strong>
              I understand all blurred pixels are burned in permanently and cannot be recovered or unblurred.
            </div>
          </label>
        </div>

        {/* Format Selector */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs mb-6">
          <span className="font-semibold text-slate-300">Export Format:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFormat('png')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                format === 'png'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white bg-slate-900'
              }`}
            >
              PNG (Lossless)
            </button>
            <button
              onClick={() => setFormat('jpg')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                format === 'jpg'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white bg-slate-900'
              }`}
            >
              JPG (Compressed)
            </button>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleDownload}
          disabled={!allChecked || downloading}
          className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          {downloading ? 'Downloading Sanitized File...' : 'Download Protected Screenshot'}
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
