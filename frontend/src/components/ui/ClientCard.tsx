import React from 'react';

export interface Client {
  id: string;
  nombre: string;
  cedula: string;
  telefono: string;
  score: number;
}

export const getInitials = (name: string) => {
  return name
    .split(' ')
    .filter(n => n.length > 0)
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const getScoreColor = (score: number) => {
  const value = score / 20;
  if (value >= 4.0) return 'text-emerald-500';
  if (value >= 3.0) return 'text-amber-500';
  return 'text-red-500';
};

interface ClientCardProps {
  client: Client;
}

export const ClientCard: React.FC<ClientCardProps> = ({ client }) => {
  return (
    <a 
      href={`/clientes/${client.id}`}
      className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col gap-4 transition-all press-96 subtle-surface hover:border-slate-300 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold overflow-hidden text-sm">
           {getInitials(client.nombre)}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-bold text-slate-900 leading-tight">{client.nombre}</h3>
          <p className="truncate text-sm text-slate-500">C.C: {client.cedula}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-start">
        <div className={`flex items-center gap-1 text-sm font-bold ${getScoreColor(client.score)}`}>
          <span className="text-xs">★</span>
          <span className="tabular-nums">{(client.score / 20).toFixed(1)}</span>
        </div>
        <svg className="w-5 h-5 text-slate-300 sm:mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </a>
  );
};
