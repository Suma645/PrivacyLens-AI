import React from 'react';
import { Shield, Lock, Heart, Award, ExternalLink } from 'lucide-react';

export default function Footer({ onNavigate, onOpenAbout }) {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 mt-20 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 text-white">
                <Shield className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-white tracking-tight">
                Snap<span className="text-cyan-400">Shield</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              SnapShield – Smart Screenshot Privacy Protector.
              Engineered with zero-storage architecture to prevent accidental data leaks in screenshots and screen captures.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Volatile Memory Only • Permanent EXIF Stripping • Luhn Card Verification</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Product</h4>
            <ul className="space-y-1.5">
              <li>
                <button onClick={() => onNavigate('upload')} className="hover:text-cyan-400 transition-colors">
                  Upload Screenshot
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('how-it-works')} className="hover:text-cyan-400 transition-colors">
                  How It Works
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('editor')} className="hover:text-cyan-400 transition-colors">
                  Selective Privacy Editor
                </button>
              </li>
            </ul>
          </div>

          {/* Trust & Project */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Security & Trust</h4>
            <ul className="space-y-1.5">
              <li>
                <button onClick={onOpenAbout} className="hover:text-cyan-400 transition-colors text-left">
                  Zero Permanent Storage Policy
                </button>
              </li>
              <li>
                <button onClick={onOpenAbout} className="hover:text-cyan-400 transition-colors text-left">
                  Irreversible Redaction Spec
                </button>
              </li>
              <li>
                <button onClick={onOpenAbout} className="hover:text-cyan-400 transition-colors text-left">
                  Hackathon Credits & Team
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} SnapShield Privacy. Designed for commercial screenshot security.
          </div>
          <div className="flex items-center gap-1.5">
            <span>Built for Tech-ಶೋಧ Hackathon by</span>
            <span className="text-slate-300 font-semibold">Nudi C, Suma M Arkachari, Lakshmi E</span>
            <span>(VVCE)</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
