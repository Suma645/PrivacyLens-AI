import React, { useState, useRef } from 'react';
import { 
  Lock, 
  Unlock, 
  Key, 
  Upload, 
  Download, 
  Copy, 
  Check, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles, 
  FileImage, 
  Eye, 
  EyeOff,
  RefreshCw,
  Info,
  Loader2
} from 'lucide-react';
import { encodeStegoMessage, decodeStegoMessage } from '../services/api';

export default function StegoLab() {
  const [activeMode, setActiveMode] = useState('encode'); // 'encode' or 'decode'
  
  // Encode State
  const [encodeFile, setEncodeFile] = useState(null);
  const [encodePreview, setEncodePreview] = useState(null);
  const [encodeMessage, setEncodeMessage] = useState('');
  const [encodePassword, setEncodePassword] = useState('');
  const [showEncodePassword, setShowEncodePassword] = useState(false);
  const [useEncryption, setUseEncryption] = useState(true);
  const [encoding, setEncoding] = useState(false);
  const [encodeResult, setEncodeResult] = useState(null);
  const [encodeError, setEncodeError] = useState(null);

  // Decode State
  const [decodeFile, setDecodeFile] = useState(null);
  const [decodePreview, setDecodePreview] = useState(null);
  const [decodePassword, setDecodePassword] = useState('');
  const [showDecodePassword, setShowDecodePassword] = useState(false);
  const [decoding, setDecoding] = useState(false);
  const [decodeResult, setDecodeResult] = useState(null);
  const [decodeError, setDecodeError] = useState(null);
  const [copied, setCopied] = useState(false);

  const encodeInputRef = useRef(null);
  const decodeInputRef = useRef(null);

  // Handle Encode File
  const handleEncodeFileSelect = (file) => {
    setEncodeError(null);
    setEncodeResult(null);
    if (!file) return;

    if (!file.type.includes('png') && !file.name.toLowerCase().endsWith('.png')) {
      setEncodeError("PNG format is strongly recommended for LSB steganography to prevent lossy compression.");
    }

    setEncodeFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setEncodePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  // Handle Decode File
  const handleDecodeFileSelect = (file) => {
    setDecodeError(null);
    setDecodeResult(null);
    if (!file) return;

    setDecodeFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setDecodePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  // Run Encode
  const handleRunEncode = async () => {
    if (!encodeFile) {
      setEncodeError("Please upload a carrier image first.");
      return;
    }
    if (!encodeMessage.trim()) {
      setEncodeError("Please enter a secret message to hide.");
      return;
    }
    if (useEncryption && !encodePassword.trim()) {
      setEncodeError("Please enter an encryption password or disable password protection.");
      return;
    }

    setEncoding(true);
    setEncodeError(null);
    setEncodeResult(null);

    try {
      const pwd = useEncryption ? encodePassword.trim() : null;
      const res = await encodeStegoMessage(encodeFile, encodeMessage, pwd);
      setEncodeResult(res);
    } catch (err) {
      console.error("Encode failure:", err);
      setEncodeError(err.message || "Failed to embed secret message into image.");
    } finally {
      setEncoding(false);
    }
  };

  // Run Decode
  const handleRunDecode = async () => {
    if (!decodeFile) {
      setDecodeError("Please upload an image to inspect for hidden data.");
      return;
    }

    setDecoding(true);
    setDecodeError(null);
    setDecodeResult(null);

    try {
      const pwd = decodePassword.trim() || null;
      const res = await decodeStegoMessage(decodeFile, pwd);
      setDecodeResult(res);
    } catch (err) {
      console.error("Decode failure:", err);
      setDecodeError(err.message || "Failed to extract secret message. If the image was encrypted, verify the password.");
    } finally {
      setDecoding(false);
    }
  };

  // Copy Decoded Message
  const handleCopy = () => {
    if (!decodeResult?.message) return;
    navigator.clipboard.writeText(decodeResult.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
          <Key className="w-3.5 h-3.5" />
          LSB Steganography & AES-256 Vault
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Steganography <span className="text-cyan-400">Lab</span>
        </h2>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Conceal confidential messages inside PNG pixels with military-grade authenticated AES-256-GCM encryption, or extract hidden secrets with the correct key.
        </p>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <button
            onClick={() => setActiveMode('encode')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeMode === 'encode'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            Hide Secret Message (Encode)
          </button>
          <button
            onClick={() => setActiveMode('decode')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeMode === 'decode'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Unlock className="w-4 h-4" />
            Extract Secret Message (Decode)
          </button>
        </div>
      </div>

      {/* ENCODE TAB */}
      {activeMode === 'encode' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Left: Input Form */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-cyan-400" />
              1. Embed Secret Data
            </h3>

            {/* Carrier Image Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Carrier Image (Lossless PNG)
              </label>
              <input
                ref={encodeInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleEncodeFileSelect(e.target.files[0])}
              />
              
              {!encodeFile ? (
                <div
                  onClick={() => encodeInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-cyan-400 rounded-2xl p-6 text-center cursor-pointer bg-slate-950/60 hover:bg-slate-950 transition-colors"
                >
                  <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-white">Select carrier PNG image</p>
                  <p className="text-[11px] text-slate-500 mt-1">PNG is ideal; pixels are modified imperceptibly</p>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 p-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={encodePreview} alt="Carrier" className="w-12 h-12 object-cover rounded-xl" />
                    <div>
                      <p className="text-xs font-semibold text-white truncate max-w-[200px]">{encodeFile.name}</p>
                      <p className="text-[10px] text-slate-400">{(encodeFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setEncodeFile(null); setEncodePreview(null); }}
                    className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* Secret Message Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-300">
                  Secret Message
                </label>
                <span className="text-[10px] text-slate-500">{encodeMessage.length} characters</span>
              </div>
              <textarea
                value={encodeMessage}
                onChange={(e) => setEncodeMessage(e.target.value)}
                placeholder="Enter confidential notes, API keys, credentials, or private message to hide..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            {/* Password Protection */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-white">Encrypt with AES-256-GCM</span>
                </div>
                <input
                  type="checkbox"
                  checked={useEncryption}
                  onChange={(e) => setUseEncryption(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700"
                />
              </label>

              {useEncryption && (
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="relative">
                    <input
                      type={showEncodePassword ? "text" : "password"}
                      value={encodePassword}
                      onChange={(e) => setEncodePassword(e.target.value)}
                      placeholder="Enter strong encryption password..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 pr-10 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEncodePassword(!showEncodePassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showEncodePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Key className="w-3 h-3 text-cyan-400" />
                    Key derived via PBKDF2 (SHA-256, 10,000 rounds). Decryption impossible without password.
                  </p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {encodeError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{encodeError}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleRunEncode}
              disabled={encoding || !encodeFile || !encodeMessage.trim()}
              className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer"
            >
              {encoding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Embedding Secret into Image Pixels...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Hide Secret in Image
                </>
              )}
            </button>
          </div>

          {/* Right: Output / Download Card */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              2. Stego Output Image
            </h3>

            {!encodeResult ? (
              <div className="border border-slate-800 rounded-2xl p-10 text-center text-slate-500 space-y-3 bg-slate-950/40 min-h-[320px] flex flex-col items-center justify-center">
                <FileImage className="w-12 h-12 text-slate-700 mx-auto" />
                <p className="text-xs">Your stego-protected PNG will appear here once generated.</p>
                <p className="text-[11px] text-slate-600 max-w-xs">
                  The visual appearance remains 100% indistinguishable from the original image to the human eye.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-slate-950 p-3 shadow-xl">
                  <img
                    src={encodeResult.stego_image}
                    alt="Stego Protected"
                    className="max-h-64 object-contain mx-auto rounded-lg"
                  />
                  <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                    ✓ Secret Embedded
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">ENCRYPTION</span>
                    <span className="font-semibold text-cyan-400">
                      {encodeResult.encrypted ? "AES-256-GCM (Auth)" : "Standard LSB"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">PAYLOAD SIZE</span>
                    <span className="font-semibold text-white">
                      {encodeResult.message_length} chars
                    </span>
                  </div>
                </div>

                <a
                  href={encodeResult.stego_image}
                  download={`stego_secret_${Date.now()}.png`}
                  className="w-full py-3 rounded-xl font-bold text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download Stego PNG Image
                </a>

                <p className="text-[11px] text-slate-400 text-center">
                  💡 Share this PNG freely. Only recipients with the password can reveal the hidden message.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* DECODE TAB */}
      {activeMode === 'decode' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Left: Input Stego Image */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Unlock className="w-5 h-5 text-cyan-400" />
              1. Upload Stego Image
            </h3>

            {/* Stego Image Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Stego Image (PNG with hidden message)
              </label>
              <input
                ref={decodeInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleDecodeFileSelect(e.target.files[0])}
              />
              
              {!decodeFile ? (
                <div
                  onClick={() => decodeInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-cyan-400 rounded-2xl p-6 text-center cursor-pointer bg-slate-950/60 hover:bg-slate-950 transition-colors"
                >
                  <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-white">Select stego image</p>
                  <p className="text-[11px] text-slate-500 mt-1">Upload the image containing secret embedded bits</p>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 p-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={decodePreview} alt="Stego" className="w-12 h-12 object-cover rounded-xl" />
                    <div>
                      <p className="text-xs font-semibold text-white truncate max-w-[200px]">{decodeFile.name}</p>
                      <p className="text-[10px] text-slate-400">{(decodeFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setDecodeFile(null); setDecodePreview(null); }}
                    className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Decryption Password (if protected)
              </label>
              <div className="relative">
                <input
                  type={showDecodePassword ? "text" : "password"}
                  value={decodePassword}
                  onChange={(e) => setDecodePassword(e.target.value)}
                  placeholder="Enter password if message was encrypted..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 pr-10 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => setShowDecodePassword(!showDecodePassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showDecodePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {decodeError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{decodeError}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleRunDecode}
              disabled={decoding || !decodeFile}
              className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer"
            >
              {decoding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning Pixels & Decrypting...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  Extract Hidden Secret
                </>
              )}
            </button>
          </div>

          {/* Right: Decoded Result */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              2. Extracted Secret Message
            </h3>

            {!decodeResult ? (
              <div className="border border-slate-800 rounded-2xl p-10 text-center text-slate-500 space-y-3 bg-slate-950/40 min-h-[320px] flex flex-col items-center justify-center">
                <Key className="w-12 h-12 text-slate-700 mx-auto" />
                <p className="text-xs">Extracted message will appear here after scanning.</p>
                <p className="text-[11px] text-slate-600 max-w-xs">
                  Privacy Lens AI validates the PSTE stego header and cryptographic HMAC authentication tag.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-1 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    ✓ Authenticated Message
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {decodeResult.message?.length || 0} characters
                  </span>
                </div>

                <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-emerald-300 max-h-60 overflow-y-auto whitespace-pre-wrap select-all">
                  {decodeResult.message}
                </div>

                <button
                  onClick={handleCopy}
                  className="w-full py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-slate-800 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Extracted Message
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
