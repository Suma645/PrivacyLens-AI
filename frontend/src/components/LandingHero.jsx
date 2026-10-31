import React from 'react';
import { 
  Shield, 
  Eye, 
  Lock, 
  FileText, 
  Scan, 
  Gauge, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles,
  Zap,
  Cpu,
  Upload
} from 'lucide-react';

export default function LandingHero({ onStartUpload, onHowItWorks, onLoadSample }) {
  return (
    <div className="relative overflow-hidden py-12 lg:py-20">
      
      {/* Background Cyber Glow Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/15 to-cyan-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-xs text-cyan-300 shadow-sm backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="font-semibold tracking-wide">Universal Document & Screenshot Privacy Protection</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">PDF, Word, Excel, PPT & Images</span>
          </div>
        </div>

        {/* Hero Typography */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Your Documents & Screenshots. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400">
              Your Privacy. Your Control.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Stop accidentally leaking banking details, Aadhaar, PAN, student marks, and personal identities.
            <strong className="text-white font-medium"> PrivacyLens-AI </strong> automatically scans PDFs, Office documents, and screenshots, automatically redacts critical identifiers with permanent solid blackouts, and gives you manual control over normal personal info.
          </p>

          {/* Core Principle Callout */}
          <div className="mt-5 inline-block px-4 py-2 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs sm:text-sm text-blue-200">
            <span className="font-bold text-cyan-400">Core Principle: </span>
            Critical PII is auto-blacked out. You choose which normal personal items to keep visible.
          </div>

          {/* Primary & Secondary Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onStartUpload}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-500/25 hover:shadow-cyan-500/35 transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-base cursor-pointer"
            >
              <Upload className="w-5 h-5 text-cyan-200" />
              Upload & Scan Documents
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              onClick={onHowItWorks}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 transition-all duration-200 flex items-center justify-center gap-2 text-base cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-slate-400" />
              How It Works
            </button>
          </div>

          {/* Quick Demo Previews */}
          <div className="mt-8 pt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Try Instant Sample:</span>
            <button
              onClick={() => onLoadSample('sample_banking.png', 'Apex Bank Statement')}
              className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-blue-900/40 hover:text-cyan-300 border border-slate-700/60 transition-colors"
            >
              💳 Bank & Credit Card
            </button>
            <button
              onClick={() => onLoadSample('sample_developer.png', 'Developer Terminal & Keys')}
              className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-blue-900/40 hover:text-cyan-300 border border-slate-700/60 transition-colors"
            >
              🔑 Cloud API Keys & .env
            </button>
            <button
              onClick={() => onLoadSample('sample_chat.png', 'Support Chat & OTP')}
              className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-blue-900/40 hover:text-cyan-300 border border-slate-700/60 transition-colors"
            >
              💬 Chat, Phone & OTP
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
