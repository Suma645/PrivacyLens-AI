import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Trash2, 
  Cpu, 
  FileCheck, 
  X, 
  Users, 
  Award,
  Terminal,
  ExternalLink
} from 'lucide-react';

export default function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl my-8">
        
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">About Privacy Lens AI</h3>
            <p className="text-xs text-cyan-400 font-mono">PrivacyLens AI Architecture • Zero-Storage Security</p>
          </div>
        </div>

        {/* Content sections */}
        <div className="space-y-6 text-xs sm:text-sm text-slate-300">
          
          {/* Mission */}
          <div>
            <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              The Privacy Crisis in Digital Screenshots
            </h4>
            <p className="text-slate-400 leading-relaxed text-xs">
              Every day, millions of screenshots are shared on Slack, WhatsApp, Twitter/X, and forums containing accidentally exposed credit cards, authentication tokens, API keys, private conversations, and GPS metadata.
              Privacy Lens AI solves this through a fundamental shift in privacy logic: <strong>You choose what to share; Privacy Lens AI automatically protects everything else.</strong>
            </p>
          </div>

          {/* Core Guarantees Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5 text-xs">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                Zero Permanent Storage
              </div>
              <p className="text-[11px] text-slate-400">
                Uploaded and processed screenshots reside in volatile temporary directories and are permanently wiped after the session.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5 text-xs">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                Irreversible Cryptographic Redaction
              </div>
              <p className="text-[11px] text-slate-400">
                Blur and pixelation are mathematically rendered onto the pixel raster. No hidden vector layers or recoverable text exist in exported files.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5 text-xs">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                No Unauthorized AI Data Sharing
              </div>
              <p className="text-[11px] text-slate-400">
                OCR and pattern detection run locally or via dedicated sandboxed services. Screenshots are never sent to external AI without explicit consent.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                Automatic EXIF & Location Stripping
              </div>
              <p className="text-[11px] text-slate-400">
                GPS coordinates, device models, camera identifiers, and timestamp metadata are 100% stripped from all exported screenshots.
              </p>
            </div>
          </div>

          {/* Hackathon Attribution */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-slate-950 border border-blue-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white text-xs uppercase tracking-wider">
                Tech-ಶೋಧ Hackathon Project • PrivacyLens AI
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Developed by Team Members from <strong>Vidyavardhaka College of Engineering, Mysuru (VVCE)</strong>:
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
                1. Nudi C
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
                2. Suma M Arkachari
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
                3. Lakshmi E
              </span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Close Privacy Guide
          </button>
        </div>

      </div>
    </div>
  );
}
