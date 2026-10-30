import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check, Shield } from 'lucide-react';

export default function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (already installed & opened from home screen)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback instruction for browsers that don't support automated prompt (e.g. iOS Safari)
      alert('To install SnapShield on your phone:\n1. Tap the Share or 3-dots Menu button in your browser.\n2. Tap "Install application" or "Add to Home Screen".');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (isInstalled || isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-blue-900/90 via-indigo-950/90 to-cyan-950/90 border-b border-cyan-500/30 px-4 py-2.5 backdrop-blur-md sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
        
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-slate-950 font-bold shrink-0 shadow-sm">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white block sm:inline">Install SnapShield on Android:</span>
            <span className="text-slate-300 sm:ml-1 hidden sm:inline">
              Get the standalone mobile app with home screen icon & zero-browser clutter.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold flex items-center gap-1.5 shadow-md shadow-cyan-400/20 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
          
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
