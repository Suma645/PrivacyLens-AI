import React from 'react';
import { 
  Scan, 
  Gauge, 
  ShieldCheck, 
  Sliders, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  Cpu,
  FileCheck
} from 'lucide-react';

export default function HowItWorks({ onStart }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 lg:py-16 space-y-16">
      
      {/* Title */}
      <div className="text-center max-w-3xl mx-auto">
        <span className="text-xs uppercase tracking-widest text-cyan-400 font-bold">Privacy Architecture</span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
          How Privacy Lens AI Protects Your Digital Identity
        </h2>
        <p className="text-base text-slate-300 mt-3 leading-relaxed">
          Traditional redaction tools rely on manual black marker tools where users often miss sensitive tokens, IP addresses, or QR codes. Privacy Lens AI turns the security model upside down.
        </p>
      </div>

      {/* 3 Step Interactive Detailed Cards */}
      <div className="space-y-12">
        
        {/* Step 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center p-8 rounded-3xl bg-slate-900/60 border border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-cyan-400 text-xs font-semibold mb-4 border border-blue-500/20">
              Pillar 1 • Ingestion & Extraction
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">1. Smart Multi-Vector Detection</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              When a screenshot is dropped into Privacy Lens AI, our hybrid computer vision and OCR engine extracts all readable text while simultaneously detecting human facial biometric markers, QR codes, and device EXIF location tags.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Card numbers validated via Luhn checksum algorithm</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Cloud API Keys (AWS, GitHub, Google, OpenAI, Slack) detected via regex signatures</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>QR Code decoder prevents accidental token leaks & 2FA hijack</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
            <div className="text-slate-500">// Detection Pipeline Execution</div>
            <div className="text-emerald-400">&gt; OCR Engine: Extracted 42 word tokens</div>
            <div className="text-blue-400">&gt; Computer Vision: 1 Face + 1 QR Code found</div>
            <div className="text-amber-400">&gt; Regex Match: Found 1 Credit Card (Luhn Valid)</div>
            <div className="text-red-400">&gt; Credentials: Found 1 AWS Secret Key</div>
            <div className="pt-2 text-[11px] text-cyan-300 border-t border-slate-800">
              Result: 4 Critical/High Risk Targets Identified
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center p-8 rounded-3xl bg-slate-900/60 border border-slate-800">
          <div className="order-2 md:order-1 p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
              <span>Risk Scoring Matrix</span>
              <span className="text-red-400 font-bold">85 / 100 [Critical]</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 w-[85%]" />
            </div>
            <div className="space-y-1.5 text-xs text-slate-400 pt-2">
              <div className="flex justify-between">
                <span>Authentication Credentials:</span>
                <span className="text-red-400 font-semibold">+35 pts</span>
              </div>
              <div className="flex justify-between">
                <span>Financial Card & CVV:</span>
                <span className="text-orange-400 font-semibold">+30 pts</span>
              </div>
              <div className="flex justify-between">
                <span>Multi-Category Compound Risk:</span>
                <span className="text-amber-400 font-semibold">+10 pts</span>
              </div>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold mb-4 border border-amber-500/20">
              Pillar 2 • Analysis & Threat Evaluation
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">2. Confidentiality Index Assessment</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Privacy Lens AI calculates a transparent 0 to 100 risk score based on severity, detection confidence, and cross-category exposure compounding. You get clear, plain-English explanations for every risk factor found.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-emerald-400 font-bold block">0–29 Low Risk</span>
                <span className="text-[11px] text-slate-400">General text & safe content</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-red-400 font-bold block">80–100 Critical</span>
                <span className="text-[11px] text-slate-400">Immediate breach potential</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center p-8 rounded-3xl bg-slate-900/60 border border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-4 border border-emerald-500/20">
              Pillar 3 • User-Centric Inversion
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">3. You Choose What to Share</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Instead of painstakingly finding each secret to hide, Privacy Lens AI <strong>protects everything by default</strong>. You only click the exact message or region you want the recipient to see.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Multi-pass Gaussian Blur renders text reconstruction mathematically impossible</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Mosaic Pixelation and Solid Blackout styling options</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Manual rectangle drawing tool for any custom regions</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-4">
            <div className="text-xs text-slate-400">Residual Risk with Privacy Lens AI:</div>
            <div className="text-4xl font-extrabold text-emerald-400 tracking-tight">0 / 100</div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4" />
              100% Risk Elimination
            </div>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Original screenshot is never modified. A clean flattened image is generated for download.
            </p>
          </div>
        </div>

      </div>

      {/* CTA Bottom Banner */}
      <div className="text-center pt-8">
        <button
          onClick={onStart}
          className="px-8 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-xl shadow-blue-500/25 transition-all text-base inline-flex items-center gap-2 cursor-pointer"
        >
          <ShieldCheck className="w-5 h-5 text-cyan-200" />
          Start Protecting My Screenshots Now
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
