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
  Cpu
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
            <span className="font-semibold tracking-wide">Next-Gen Screenshot Sanitization Engine</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Zero Storage Architecture</span>
          </div>
        </div>

        {/* Hero Typography */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Your Screenshots. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400">
              Your Privacy. Your Control.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Stop accidentally leaking banking details, API tokens, passwords, and personal identities.
            <strong className="text-white font-medium"> Privacy Lens AI </strong> automatically scans screenshots, evaluates confidentiality risk, and blurs everything except what you explicitly choose to share.
          </p>

          {/* Core Principle Callout */}
          <div className="mt-5 inline-block px-4 py-2 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs sm:text-sm text-blue-200">
            <span className="font-bold text-cyan-400">Core Principle: </span>
            You choose what to share. Privacy Lens AI automatically protects everything else.
          </div>

          {/* Primary & Secondary Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onStartUpload}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-500/25 hover:shadow-cyan-500/35 transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-base cursor-pointer"
            >
              <Shield className="w-5 h-5 text-cyan-200" />
              Protect My Screenshot
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

        {/* Feature Cards Grid (3 Core Features) */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Card 1 */}
          <div className="relative group p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-5 group-hover:scale-110 transition-transform">
              <Scan className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">1. Automatic Sensitive Detection</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              High-accuracy OCR and pattern intelligence instantly identifies personal names, emails, phone numbers, credit cards (Luhn validated), passwords, API keys, QR codes, and faces.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">Regex Engine</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">OCR Words</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">CV Vision</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="relative group p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
            <div className="w-12 h-12 rounded-xl bg-cyan-600/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 transition-transform">
              <Gauge className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">2. Intelligent Confidentiality Scoring</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Transparent 0–100 risk algorithm computes exposure severity (Low, Medium, High, Critical) based on credential sensitivity, quantity, and metadata leakage vectors.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">0-29 Low</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">30-59 Med</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20">80-100 Critical</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="relative group p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-violet-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10">
            <div className="w-12 h-12 rounded-xl bg-violet-600/10 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-5 group-hover:scale-110 transition-transform">
              <Sliders className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">3. Smart Selective Redaction</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Never share by accident. All sensitive zones start fully protected. You click what to keep visible, or choose between Gaussian Blur, Mosaic Pixelation, and Solid Blackout.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="text-[11px] px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">Gaussian Blur</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">Pixelate</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-500/20 text-slate-300 border border-slate-600">Solid Blackout</span>
            </div>
          </div>

        </div>

        {/* 3-Step Process Diagram (Hackathon Architecture) */}
        <div className="mt-20 p-8 rounded-3xl bg-slate-900/40 border border-slate-800 relative">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs uppercase tracking-widest text-cyan-400 font-bold">Workflow</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">From Upload to Protected Share in 3 Steps</h2>
            <p className="text-sm text-slate-400 mt-2">PrivacyLens AI 3-pillar security methodology: Detect, Assess, Protect.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            
            {/* Step 1 */}
            <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 text-center relative group hover:border-blue-500/40 transition-colors">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center mx-auto mb-3 border border-blue-500/40">
                1
              </div>
              <h4 className="font-bold text-white text-base">Scan & Detect</h4>
              <p className="text-xs text-slate-400 mt-2">
                Upload image. OCR & CV extract text, detect facial regions, QR codes, and EXIF location metadata.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 text-center relative group hover:border-cyan-500/40 transition-colors">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center mx-auto mb-3 border border-cyan-500/40">
                2
              </div>
              <h4 className="font-bold text-white text-base">Analyse & Assess</h4>
              <p className="text-xs text-slate-400 mt-2">
                Categorizes findings into 5 privacy vectors and calculates a transparent 0-100 confidentiality score.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 text-center relative group hover:border-emerald-500/40 transition-colors">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center mx-auto mb-3 border border-emerald-500/40">
                3
              </div>
              <h4 className="font-bold text-white text-base">Redact & Protect</h4>
              <p className="text-xs text-slate-400 mt-2">
                Preview final result in split-screen, selectively unmask only safe content, and download sanitized image.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
