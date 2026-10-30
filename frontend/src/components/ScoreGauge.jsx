import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function ScoreGauge({ score, classification, color, residualScore = null, size = 160 }) {
  // Score is 0 - 100
  const normalizedScore = Math.min(100, Math.max(0, score || 0));
  const strokeWidth = 12;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  const getRiskIcon = () => {
    if (normalizedScore >= 80) return <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" />;
    if (normalizedScore >= 60) return <AlertTriangle className="w-6 h-6 text-orange-500" />;
    if (normalizedScore >= 30) return <AlertTriangle className="w-6 h-6 text-amber-500" />;
    return <ShieldCheck className="w-6 h-6 text-emerald-400" />;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Background Track */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color || "#3b82f6"}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.4s ease'
            }}
          />
        </svg>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="mb-1">{getRiskIcon()}</div>
          <span className="text-3xl font-extrabold tracking-tight text-white">
            {normalizedScore}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
            Risk Score
          </span>
        </div>
      </div>

      {/* Classification Tag */}
      <div className="mt-3 text-center">
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide border shadow-sm"
          style={{
            borderColor: color ? `${color}66` : '#3b82f666',
            backgroundColor: color ? `${color}18` : '#3b82f618',
            color: color || '#60a5fa'
          }}
        >
          {classification || "Low Risk"}
        </span>

        {residualScore !== null && (
          <div className="mt-2 text-xs text-slate-300 flex items-center justify-center gap-1.5">
            <span className="text-slate-400">Residual Risk:</span>
            <span className="font-bold text-emerald-400">{residualScore}/100</span>
            {score > residualScore && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                -{score - residualScore} pts
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
