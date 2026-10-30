import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingHero from './components/LandingHero';
import HowItWorks from './components/HowItWorks';
import UploadZone from './components/UploadZone';
import RiskDashboard from './components/RiskDashboard';
import PrivacyEditor from './components/PrivacyEditor';
import StegoLab from './components/StegoLab';
import DownloadModal from './components/DownloadModal';
import AboutModal from './components/AboutModal';
import InstallPwaPrompt from './components/InstallPwaPrompt';
import Footer from './components/Footer';

import { checkBackendHealth, analyzeScreenshot, updateProtection } from './services/api';
import { runClientOcr } from './services/clientOcr';
import { Shield, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('landing'); // 'landing', 'how-it-works', 'upload', 'editor'
  const [isBackendHealthy, setIsBackendHealthy] = useState(false);
  
  // Analysis State
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [manualBoxes, setManualBoxes] = useState([]);
  const [visibleBoxes, setVisibleBoxes] = useState([]);
  const [protectionMode, setProtectionMode] = useState('spotlight');
  const [updatingProtection, setUpdatingProtection] = useState(false);

  // Modals
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [globalNotification, setGlobalNotification] = useState(null);

  // Check backend health on mount
  useEffect(() => {
    async function checkHealth() {
      const data = await checkBackendHealth();
      setIsBackendHealthy(!!data);
    }
    checkHealth();
  }, []);

  const showNotification = (msg, type = 'info') => {
    setGlobalNotification({ msg, type });
    setTimeout(() => setGlobalNotification(null), 4500);
  };

  // Analyze Screenshot handler
  const handleAnalyze = async (file, preloadedTokens = null) => {
    setAnalyzing(true);
    setUploadProgress(15);

    try {
      let clientTokens = preloadedTokens || [];
      if (!clientTokens || clientTokens.length === 0) {
        setUploadProgress(25);
        try {
          // Allow OCR up to 12s with progress
          const ocrPromise = runClientOcr(file, (p) => {
            setUploadProgress(25 + Math.round(p * 45));
          });
          const timeoutPromise = new Promise(resolve => setTimeout(() => resolve([]), 12000));
          clientTokens = await Promise.race([ocrPromise, timeoutPromise]);
        } catch (e) {
          console.warn("Client OCR error:", e);
        }
      }

      setUploadProgress(75);

      // Call analyze API (falls back to on-device engine with clientTokens if backend unreachable)
      const result = await analyzeScreenshot(file, clientTokens);
      setUploadProgress(100);

      setAnalysisResult(result);
      setManualBoxes([]);
      setAnalyzing(false);
      setActiveTab('editor');

      showNotification(`Analysis complete! Identified ${result.detections.length} privacy factors.`, 'success');

    } catch (err) {
      console.error("Analysis failure:", err);
      setAnalyzing(false);
      showNotification(err.message || "Failed to analyze screenshot. Please verify backend is running.", 'error');
    }
  };

  // Load Preset Sample Screenshot for 1-click test
  const handleLoadSample = async (sampleFilename, title) => {
    setAnalyzing(true);
    setUploadProgress(15);
    try {
      const res = await fetch(`/samples/${sampleFilename}`);
      if (!res.ok) throw new Error("Sample file not found in public assets");
      const blob = await res.blob();
      const file = new File([blob], sampleFilename, { type: 'image/png' });

      // Load companion ocr tokens if available
      let companionTokens = [];
      try {
        const jsonFilename = sampleFilename.replace(/\.png$/i, '.ocr.json');
        const jsonRes = await fetch(`/samples/${jsonFilename}`);
        if (jsonRes.ok) {
          companionTokens = await jsonRes.json();
        }
      } catch (e) {
        // non-fatal
      }

      await handleAnalyze(file, companionTokens);
      showNotification(`Loaded demo screenshot: ${title}`, 'info');
    } catch (err) {
      console.error("Failed to load sample screenshot:", err);
      setAnalyzing(false);
      showNotification("Could not load sample screenshot: " + err.message, 'error');
    }
  };

  // Toggle Item Visibility (Keep Visible vs Redact)
  const handleToggleItemVisible = async (itemId) => {
    if (!analysisResult) return;

    const updatedDetections = analysisResult.detections.map(d => {
      if (d.id === itemId) {
        return { ...d, keep_visible: !d.keep_visible };
      }
      return d;
    });

    // Optimistic UI update
    setAnalysisResult(prev => ({
      ...prev,
      detections: updatedDetections
    }));

    // Sync with backend
    await syncProtectionUpdate(updatedDetections, manualBoxes);
  };

  // Change Redaction Style (blur, pixelate, blackout)
  const handleChangeItemStyle = async (itemId, style) => {
    if (!analysisResult) return;

    const updatedDetections = analysisResult.detections.map(d => {
      if (d.id === itemId) {
        return { ...d, protection_style: style };
      }
      return d;
    });

    setAnalysisResult(prev => ({
      ...prev,
      detections: updatedDetections
    }));

    await syncProtectionUpdate(updatedDetections, manualBoxes);
  };

  // Spotlight Visible Box Operations (Inverted Selection: Only selected areas are clear, rest blurred)
  const handleAddVisibleBox = async (newBox) => {
    const boxWithId = { id: 'vis_' + Date.now(), ...newBox };
    const updated = [...visibleBoxes, boxWithId];
    setVisibleBoxes(updated);
    await syncProtectionUpdate(analysisResult.detections, manualBoxes, updated, 'spotlight');
    showNotification("Selected area kept clear! Surrounding image automatically blurred.", "success");
  };

  const handleRemoveVisibleBox = async (boxId) => {
    const updated = visibleBoxes.filter(b => b.id !== boxId);
    setVisibleBoxes(updated);
    await syncProtectionUpdate(analysisResult.detections, manualBoxes, updated, 'spotlight');
  };

  const handleClearVisibleBoxes = async () => {
    setVisibleBoxes([]);
    await syncProtectionUpdate(analysisResult.detections, manualBoxes, [], 'spotlight');
    showNotification("Cleared all visible selections.", "info");
  };

  // Manual Box Operations
  const handleAddManualBox = async (newBox) => {
    const updatedBoxes = [...manualBoxes, newBox];
    setManualBoxes(updatedBoxes);
    await syncProtectionUpdate(analysisResult.detections, updatedBoxes, visibleBoxes);
    showNotification("Custom manual blur box added.", "info");
  };

  const handleClearManualBoxes = async () => {
    setManualBoxes([]);
    await syncProtectionUpdate(analysisResult.detections, [], visibleBoxes);
    showNotification("Cleared all manual blur boxes.", "info");
  };

  // Bulk Actions
  const handleProtectAll = async () => {
    if (!analysisResult) return;
    const updatedDetections = analysisResult.detections.map(d => ({
      ...d,
      keep_visible: false
    }));
    setVisibleBoxes([]);
    setAnalysisResult(prev => ({ ...prev, detections: updatedDetections }));
    await syncProtectionUpdate(updatedDetections, manualBoxes, [], 'spotlight');
    showNotification("All sensitive areas securely blurred.", "success");
  };

  const handleInvertAll = async () => {
    if (!analysisResult) return;
    const updatedDetections = analysisResult.detections.map(d => ({
      ...d,
      keep_visible: !d.keep_visible
    }));
    setAnalysisResult(prev => ({ ...prev, detections: updatedDetections }));
    await syncProtectionUpdate(updatedDetections, manualBoxes, visibleBoxes);
  };

  // Sync with backend /api/protect
  const syncProtectionUpdate = async (detections, boxes = manualBoxes, visBoxes = visibleBoxes, mode = protectionMode) => {
    if (!analysisResult?.file_id) return;
    setUpdatingProtection(true);

    try {
      const res = await updateProtection(analysisResult.file_id, detections, boxes, visBoxes, mode);
      if (res.success) {
        setAnalysisResult(prev => ({
          ...prev,
          protected_image: res.protected_image,
          residual_risk: res.residual_risk
        }));
      }
    } catch (err) {
      console.error("Protection update sync error:", err);
      showNotification("Failed to refresh protected preview: " + err.message, "error");
    } finally {
      setUpdatingProtection(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Global Notification Toast */}
      {globalNotification && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold backdrop-blur-md ${
            globalNotification.type === 'error'
              ? 'bg-red-950/90 text-red-200 border-red-500/40'
              : globalNotification.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
              : 'bg-blue-950/90 text-cyan-200 border-blue-500/40'
          }`}>
            {globalNotification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{globalNotification.msg}</span>
          </div>
        </div>
      )}

      {/* In-App Mobile PWA Installation Banner */}
      <InstallPwaPrompt />

      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onNavigate={(tab) => setActiveTab(tab)}
        isBackendHealthy={isBackendHealthy}
        onOpenAbout={() => setIsAboutOpen(true)}
      />

      {/* Main View Router */}
      <main className="flex-grow">
        
        {/* Landing Page */}
        {activeTab === 'landing' && (
          <LandingHero
            onStartUpload={() => setActiveTab('upload')}
            onHowItWorks={() => setActiveTab('how-it-works')}
            onLoadSample={(sample, title) => handleLoadSample(sample, title)}
          />
        )}

        {/* How It Works */}
        {activeTab === 'how-it-works' && (
          <HowItWorks onStart={() => setActiveTab('upload')} />
        )}

        {/* Upload Zone */}
        {activeTab === 'upload' && (
          <UploadZone
            onAnalyze={handleAnalyze}
            analyzing={analyzing}
            uploadProgress={uploadProgress}
            onSelectSample={(sample, title) => handleLoadSample(sample, title)}
          />
        )}

        {/* Steganography Lab */}
        {activeTab === 'stego' && (
          <StegoLab />
        )}

        {/* Editor & Risk Dashboard */}
        {activeTab === 'editor' && (
          <div>
            {!analysisResult ? (
              /* Empty state if user navigates to editor before uploading */
              <div className="max-w-md mx-auto my-20 p-8 text-center rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-cyan-400">
                  <Shield className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">No Screenshot Loaded Yet</h3>
                <p className="text-xs text-slate-400">
                  Upload a screenshot or pick a test sample to analyze privacy risks and selectively protect sensitive data.
                </p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Upload Screenshot
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Risk Analysis Dashboard */}
                <RiskDashboard
                  analysisResult={analysisResult}
                  onToggleItemVisible={handleToggleItemVisible}
                  onChangeItemStyle={handleChangeItemStyle}
                  onProtectAll={handleProtectAll}
                  onInvertAll={handleInvertAll}
                  onProceedToEditor={() => {
                    // Smooth scroll to the interactive canvas
                    const elem = document.getElementById('privacy-editor-container');
                    elem?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />

                {/* Interactive Privacy Split-Screen Editor */}
                <div id="privacy-editor-container">
                  <PrivacyEditor
                    originalImage={analysisResult.original_image}
                    protectedImage={analysisResult.protected_image}
                    detections={analysisResult.detections}
                    manualBoxes={manualBoxes}
                    visibleBoxes={visibleBoxes}
                    protectionMode={protectionMode}
                    imageInfo={analysisResult.image_info}
                    residualRisk={analysisResult.residual_risk}
                    onToggleItemVisible={handleToggleItemVisible}
                    onChangeItemStyle={handleChangeItemStyle}
                    onAddVisibleBox={handleAddVisibleBox}
                    onRemoveVisibleBox={handleRemoveVisibleBox}
                    onClearVisibleBoxes={handleClearVisibleBoxes}
                    onAddManualBox={handleAddManualBox}
                    onClearManualBoxes={handleClearManualBoxes}
                    onProtectAll={handleProtectAll}
                    onInvertAll={handleInvertAll}
                    onOpenDownload={() => setIsDownloadOpen(true)}
                  />
                </div>

              </div>
            )}
          </div>
        )}

      </main>

      {/* Pre-Flight Checklist & Download Modal */}
      <DownloadModal
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
        fileId={analysisResult?.file_id}
        imageInfo={analysisResult?.image_info}
        residualRisk={analysisResult?.residual_risk}
        protectedImage={analysisResult?.protected_image}
      />

      {/* Security Guarantees & About Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* Footer */}
      <Footer
        onNavigate={(tab) => setActiveTab(tab)}
        onOpenAbout={() => setIsAboutOpen(true)}
      />

    </div>
  );
}
