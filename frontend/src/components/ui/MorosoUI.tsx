import React from 'react';

/**
 * RiskBadge: Visual indicator of client risk level based on delinquency days.
 * Follows the "Risk Color Rule" from DESIGN.md.
 */
export const RiskBadge = ({ level, days }: { level: string, days?: number }) => {
  const styles = {
    crítico: "bg-red-50 text-red-600 border-red-100",
    critico: "bg-red-50 text-red-600 border-red-100",
    urgente: "bg-orange-50 text-orange-600 border-orange-100",
    atrasado: "bg-blue-50 text-blue-600 border-blue-100",
    completado: "bg-emerald-50 text-emerald-600 border-emerald-100",
  }[level.toLowerCase()] || "bg-gray-50 text-gray-600 border-gray-100";

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${styles}`}>
      {level} {days !== undefined ? `• ${days}d` : ''}
    </span>
  );
};

/**
 * SummaryCard: Statistics card for the header.
 * Uses 'tabular-nums' for numerical alignment as per DESIGN.md.
 */
export const SummaryCard = ({ label, value, colorClass = "text-slate-900" }: { label: string, value: string | number, colorClass?: string }) => (
  <div className="bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-slate-100">
    <div className={`text-2xl font-bold tabular-nums ${colorClass}`}>{value}</div>
    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{label}</div>
  </div>
);

/**
 * ActionIconButton: Circular button for quick actions (like phone).
 * Implements 'press-96' micro-interaction from DESIGN.md.
 */
export const ActionIconButton = ({ icon, onClick }: { icon: React.ReactNode, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="touch-target flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 press-96 transition-colors hover:bg-slate-100"
  >
    {icon}
  </button>
);
