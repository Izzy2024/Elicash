import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../lib/api.service';
import { ClientCard } from './ui/ClientCard';
import type { Client } from './ui/ClientCard';

export default function ClientList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setError(null);
        const data = await apiService.get('/api/clients');
        setClients(data || []);
      } catch (err) {
        console.error('Failed to fetch clients', err);
        setError('No se pudieron cargar los clientes. Por favor, intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return clients;
    
    return clients.filter(c => 
      c.nombre.toLowerCase().includes(query) || 
      c.cedula.includes(query)
    );
  }, [clients, search]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Buscador */}
      <div className="relative">
        <input 
          type="text" 
          placeholder="Buscar cliente por nombre o cédula..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 pl-10 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all subtle-surface"
        />
        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-gray-500 subtle-surface">
          Cargando clientes...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center text-red-600 subtle-surface">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-gray-500 subtle-surface">
          No se encontraron clientes coincidiendo con tu búsqueda.
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(client => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}
