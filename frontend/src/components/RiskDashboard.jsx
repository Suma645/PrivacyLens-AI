import React, { useState } from 'react';
import ScoreGauge from './ScoreGauge';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Info, 
  Layers, 
  Filter, 
  Check, 
  HelpCircle,
  ExternalLink,
  Sliders,
  ChevronRight
} from 'lucide-react';

export default function RiskDashboard({ 
  analysisResult, 
  onToggleItemVisible, 
  onChangeItemStyle,
  onProceedToEditor 
}) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');

  if (!analysisResult) return null;

  const {
    confidentiality_score,
    risk_classification,
    score_color,
    breakdown,
    category_breakdown,
    score_explanation,
    factor_reasons,
    detections,
    residual_risk,
    metadata_leaks
  } = analysisResult;

  // Filter detections
  const filteredDetections = detections.filter(d => {
    const matchesCategory = selectedCategory === 'ALL' || d.category === selectedCategory;
    const matchesSeverity = selectedSeverity === 'ALL' || d.risk_severity === selectedSeverity;
    return matchesCategory && matchesSeverity;
  });

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'Critical':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">Critical</span>;
      case 'High':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">High</span>;
      case 'Medium':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">Medium</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Low</span>;
    }
  };

  const getCategoryBadge = (cat) => {
    let colorClass = "bg-blue-500/10 text-blue-300 border-blue-500/20";
    if (cat === "Authentication Information") colorClass = "bg-red-500/10 text-red-300 border-red-500/20";
    else if (cat === "Financial Information") colorClass = "bg-orange-500/10 text-orange-300 border-orange-500/20";
    else if (cat === "Identity Information") colorClass = "bg-purple-500/10 text-purple-300 border-purple-500/20";
    else if (cat === "Confidential Information") colorClass = "bg-indigo-500/10 text-indigo-300 border-indigo-500/20";

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${colorClass}`}>
        {cat}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      
      {/* Top Banner Alert for Review Disclaimer */}
      <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="text-xs sm:text-sm text-slate-300">
            <strong className="text-white font-semibold">Human Verification Notice: </strong>
            Automated scanning detects known sensitive patterns, but may miss contextual secrets.
            Review the findings and mark anything safe before sharing.
          </div>
        </div>
        <button
          onClick={onProceedToEditor}
          className="shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
        >
          Open Visual Editor
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main KPI and Score Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Score Gauge Card */}
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden">
          <div className="absolute top-3 left-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Confidentiality Index
          </div>
          <div className="my-2">
            <ScoreGauge 
              score={confidentiality_score}
              classification={risk_classification}
              color={score_color}
              residualScore={residual_risk?.residual_score}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2 max-w-xs">
            {score_explanation}
          </p>
        </div>

        {/* Severity Metrics Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-red-500/20 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">Critical Risk</span>
              <div className="text-3xl font-extrabold text-white mt-2">{breakdown?.Critical || 0}</div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">Credentials, cards, private keys, OTPs</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-orange-500/20 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">High Risk</span>
              <div className="text-3xl font-extrabold text-white mt-2">{breakdown?.High || 0}</div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">Bank accts, addresses, faces, QR codes</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-amber-500/20 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Medium Risk</span>
              <div className="text-3xl font-extrabold text-white mt-2">{breakdown?.Medium || 0}</div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">Emails, phone numbers, employee IDs</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-emerald-500/20 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Protected</span>
              <div className="text-3xl font-extrabold text-white mt-2">
                {detections.filter(d => !d.keep_visible).length}
                <span className="text-sm font-normal text-slate-400">/{detections.length}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">Default: All sensitive items blurred</p>
          </div>

          {/* EXIF Metadata Warning Card */}
          {metadata_leaks && (metadata_leaks.has_gps || metadata_leaks.device_model) && (
            <div className="col-span-2 sm:col-span-4 p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  <strong>Hardware Metadata Leak: </strong>
                  {metadata_leaks.has_gps ? "Embedded GPS Coordinates Found!" : `Device exposed (${metadata_leaks.device_model}).`}
                  All metadata will be automatically stripped in the exported image.
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-200">Auto-Sanitized</span>
            </div>
          )}

        </div>

      </div>

      {/* Detected Information Table & Filter Bar */}
      <div className="rounded-3xl bg-slate-900/70 border border-slate-800 overflow-hidden shadow-xl">
        
        {/* Table Header and Filters */}
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              Detected Risk Factors ({detections.length})
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select items you explicitly wish to share. Unselected items remain securely blurred.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold mr-1">Filter:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-cyan-400"
            >
              <option value="ALL">All Categories</option>
              <option value="Authentication Information">Authentication</option>
              <option value="Financial Information">Financial</option>
              <option value="Identity Information">Identity</option>
              <option value="Personal Information">Personal</option>
              <option value="Confidential Information">Confidential</option>
            </select>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-cyan-400"
            >
              <option value="ALL">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Detected Information</th>
                <th className="py-3.5 px-4 font-semibold">Category</th>
                <th className="py-3.5 px-4 font-semibold">Risk Level</th>
                <th className="py-3.5 px-4 font-semibold">Confidence</th>
                <th className="py-3.5 px-4 font-semibold text-right">Privacy Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {filteredDetections.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                    No detections match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredDetections.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-slate-800/40 transition-colors ${
                      item.keep_visible ? 'bg-emerald-950/10' : ''
                    }`}
                  >
                    
                    {/* Information Text */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-white">
                          {item.extracted_text}
                        </span>
                        <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {item.explanation}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getCategoryBadge(item.category)}
                    </td>

                    {/* Risk Level */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getSeverityBadge(item.risk_severity)}
                    </td>

                    {/* Confidence */}
                    <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-400">
                      {Math.round(item.confidence * 100)}%
                    </td>

                    {/* Action Controls */}
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-2">
                        {/* Redaction Style Selector if protected */}
                        {!item.keep_visible && (
                          <select
                            value={item.protection_style || 'blur'}
                            onChange={(e) => onChangeItemStyle(item.id, e.target.value)}
                            className="bg-slate-950 border border-slate-700 text-xs text-cyan-300 rounded px-2 py-1"
                          >
                            <option value="blur">Blur</option>
                            <option value="pixelate">Pixelate</option>
                            <option value="blackout">Blackout</option>
                          </select>
                        )}

                        {/* Toggle Keep Visible vs Redact */}
                        <button
                          onClick={() => onToggleItemVisible(item.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                            item.keep_visible
                              ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {item.keep_visible ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              Keep Visible
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-cyan-400" />
                              Redacted
                            </>
                          )}
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
