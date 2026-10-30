import React, { useState } from 'react';
import { Shield, Lock, Eye, Menu, X, CheckCircle, Info } from 'lucide-react';

export default function Navbar({ onNavigate, activeTab, isBackendHealthy, onOpenAbout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo and Brand */}
          <div 
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-white" />
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl blur opacity-30 group-hover:opacity-75 transition duration-300 -z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                  Snap<span className="text-cyan-400">Shield</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-cyan-300 border border-cyan-500/30">
                  v1.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Smart Screenshot Privacy Protector</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => onNavigate('landing')}
              className={`text-sm font-medium transition-colors ${
                activeTab === 'landing' ? 'text-cyan-400 font-semibold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => onNavigate('how-it-works')}
              className={`text-sm font-medium transition-colors ${
                activeTab === 'how-it-works' ? 'text-cyan-400 font-semibold' : 'text-slate-300 hover:text-white'
              }`}
            >
              How It Works
            </button>
            <button
              onClick={() => onNavigate('editor')}
              className={`text-sm font-medium transition-colors ${
                activeTab === 'editor' ? 'text-cyan-400 font-semibold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Privacy Shield
            </button>
            <button
              onClick={onOpenAbout}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Info className="w-4 h-4 text-cyan-400" />
              About & Trust
            </button>
          </nav>

          {/* Status and Action */}
          <div className="hidden md:flex items-center gap-4">
            {/* Backend Health Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400">
              <span className={`w-2 h-2 rounded-full ${isBackendHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-[11px] font-mono">
                {isBackendHealthy ? 'AI & Engine Online' : 'Local Sandbox'}
              </span>
            </div>

            <button
              onClick={() => onNavigate('upload')}
              className="relative inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white transition-all duration-200 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 rounded-lg shadow-md shadow-blue-500/20 hover:shadow-cyan-500/30 hover:scale-102 focus:outline-none focus:ring-2 focus:ring-cyan-400 active:scale-98"
            >
              <Lock className="w-4 h-4 mr-2" />
              Protect Screenshot
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => onNavigate('upload')}
              className="px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg flex items-center gap-1 shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              Protect
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-b border-slate-800 px-4 pt-2 pb-4 space-y-2">
          <button
            onClick={() => { onNavigate('landing'); setMobileMenuOpen(false); }}
            className="block w-full text-left px-3 py-2 text-base font-medium text-slate-200 hover:bg-slate-900 rounded-lg"
          >
            Home
          </button>
          <button
            onClick={() => { onNavigate('how-it-works'); setMobileMenuOpen(false); }}
            className="block w-full text-left px-3 py-2 text-base font-medium text-slate-200 hover:bg-slate-900 rounded-lg"
          >
            How It Works
          </button>
          <button
            onClick={() => { onNavigate('upload'); setMobileMenuOpen(false); }}
            className="block w-full text-left px-3 py-2 text-base font-medium text-cyan-400 bg-blue-500/10 rounded-lg"
          >
            Protect Screenshot
          </button>
          <button
            onClick={() => { onOpenAbout(); setMobileMenuOpen(false); }}
            className="block w-full text-left px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-900 rounded-lg"
          >
            About & Security Guarantees
          </button>
        </div>
      )}
    </header>
  );
}
