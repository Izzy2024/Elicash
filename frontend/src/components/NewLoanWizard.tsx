import React, { useState, useEffect } from 'react';
import { apiService } from '../lib/api.service';

export default function NewLoanWizard() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    monto: 1000,
    tasa_interes: 10,
    tipo_interes: 'simple',
    tipo_prestamo: 'cuotas',
    frecuencia: 'mensual',
    num_cuotas: 6,
    fecha_inicio: new Date().toISOString().split('T')[0]
  });

  const esSinPlazo = formData.tipo_prestamo === 'sin_plazo';

  const [simulation, setSimulation] = useState<any[]>([]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const data = await apiService.get('/api/clients');
        setClients(data);
      } catch (err) {
        console.error('Error loading clients:', err);
      }
    };
    fetchClients();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const buildPayload = (includeClient = false) => {
    const base: Record<string, unknown> = {
      monto: Number(formData.monto),
      tasa_interes: Number(formData.tasa_interes),
      tipo_interes: formData.tipo_interes,
      tipo_prestamo: formData.tipo_prestamo,
      frecuencia: formData.frecuencia,
      fecha_inicio: new Date(formData.fecha_inicio).toISOString(),
    };
    if (!esSinPlazo) base.num_cuotas = Number(formData.num_cuotas);
    if (includeClient) base.client_id = formData.client_id;
    return base;
  };

  const simulate = async () => {
    setLoading(true);
    try {
      const data = await apiService.post('/api/loans/simulate', buildPayload());
      setSimulation(data);
    } catch (err: any) {
      alert(err.message || 'Error en simulación');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id) {
      alert('Por favor seleccione un cliente');
      return;
    }

    setLoading(true);
    try {
      const payload = buildPayload(true);
      const loan = await apiService.post('/api/loans', payload);
      if (loan?.id) {
        alert('Préstamo originado exitosamente.');
        window.location.href = `/prestamos/detalle?id=${loan.id}`;
      }
    } catch (err: any) {
      alert(err.message || 'Error al crear préstamo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl w-full mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
          <select name="client_id" value={formData.client_id} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white">
            <option value="">Seleccione un cliente...</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.nombre} ({c.cedula})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto ($)</label>
            <input name="monto" type="number" value={formData.monto} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-3" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tasa Interés (%)</label>
            <input name="tasa_interes" type="number" value={formData.tasa_interes} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-3" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Préstamo</label>
          <select name="tipo_prestamo" value={formData.tipo_prestamo} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white">
            <option value="cuotas">Cuotas fijas</option>
            <option value="sin_plazo">Sin plazo (pagos libres)</option>
          </select>
          {esSinPlazo && (
            <p className="text-xs text-slate-400 mt-1">Cada pago descuenta primero intereses y luego capital. No hay cuotas fijas.</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Frecuencia</label>
            <select name="frecuencia" value={formData.frecuencia} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white">
              <option value="diaria">Diaria</option>
              <option value="semanal">Semanal</option>
              <option value="quincenal">Quincenal (15 días)</option>
              <option value="mensual">Mensual</option>
            </select>
          </div>
          {!esSinPlazo && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cuotas</label>
              <input name="num_cuotas" value={formData.num_cuotas} onChange={handleChange} type="number" min="1" className="w-full border border-gray-300 rounded-xl px-4 py-3" />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio</label>
          <input name="fecha_inicio" type="date" value={formData.fecha_inicio} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-3" />
        </div>

        <button type="button" onClick={simulate} className="w-full bg-slate-100 text-slate-700 font-bold py-3 mt-2 rounded-xl hover:bg-slate-200 transition-colors">
          Simular Amortización
        </button>

        {simulation.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-4 animate-in fade-in">
             <h4 className="font-bold text-slate-800 mb-3">
               {esSinPlazo ? 'Proyección de períodos (sin plazo)' : 'Tabla de Cuotas Prevista'}
             </h4>
             <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
               {simulation.map((s) => (
                  <div key={s.numero} className="flex flex-col gap-1 bg-slate-50 p-2 rounded text-sm border border-slate-100 sm:flex-row sm:items-center sm:justify-between">
                   <span className="font-medium text-slate-500">#{s.numero}</span>
                   <span className="text-slate-600">{new Date(s.fecha_vencimiento).toLocaleDateString()}</span>
                   <span className="text-slate-500 text-xs">Int: ${s.monto_interes}</span>
                   <span className="font-bold text-slate-800">${s.monto_cuota}</span>
                 </div>
               ))}
             </div>

             <button type="submit" className="w-full bg-emerald-500 text-white font-bold py-3 mt-6 rounded-xl hover:bg-emerald-600 active:scale-[0.98] transition-transform min-h-[56px] shadow-sm flex justify-center items-center gap-2">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
               </svg>
               Generar Contrato PDF
             </button>
          </div>
        )}
      </form>
    </div>
  );
}
