import React, { useState, useEffect } from 'react';
import { apiService } from '../lib/api.service';

interface FormErrors {
  client_id?: string;
  monto?: string;
  tasa_interes?: string;
  num_cuotas?: string;
  fecha_inicio?: string;
}

export default function NewLoanWizard() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
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
    apiService.get('/api/clients')
      .then(data => setClients(data))
      .catch(() => {});
  }, []);

  const validate = (requireClient = false): FormErrors => {
    const e: FormErrors = {};

    if (requireClient && !formData.client_id) {
      e.client_id = 'Selecciona un cliente';
    }

    const monto = Number(formData.monto);
    if (isNaN(monto) || monto <= 0) {
      e.monto = 'El monto debe ser mayor a 0';
    } else if (monto > 10_000_000) {
      e.monto = 'El monto parece demasiado alto, revísalo';
    }

    const tasa = Number(formData.tasa_interes);
    if (isNaN(tasa) || tasa < 0) {
      e.tasa_interes = 'Ingresa una tasa válida (puede ser 0)';
    } else if (tasa > 100) {
      e.tasa_interes = 'La tasa no puede superar 100%';
    }

    if (!esSinPlazo) {
      const cuotas = Number(formData.num_cuotas);
      if (!formData.num_cuotas || isNaN(cuotas) || cuotas < 1) {
        e.num_cuotas = 'Ingresa al menos 1 cuota';
      } else if (!Number.isInteger(cuotas)) {
        e.num_cuotas = 'Las cuotas deben ser un número entero';
      } else if (cuotas > 600) {
        e.num_cuotas = 'Máximo 600 cuotas permitidas';
      }
    }

    if (!formData.fecha_inicio) {
      e.fecha_inicio = 'Selecciona la fecha de inicio';
    } else {
      const fecha = new Date(formData.fecha_inicio);
      if (isNaN(fecha.getTime())) {
        e.fecha_inicio = 'Fecha inválida';
      }
    }

    return e;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);

    if (submitAttempted) {
      const newErrors = { ...errors };
      delete newErrors[name as keyof FormErrors];
      setErrors(newErrors);
    }
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
    setSubmitAttempted(true);
    const fieldErrors = validate(false);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
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
    setSubmitAttempted(true);
    const fieldErrors = validate(true);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const loan = await apiService.post('/api/loans', buildPayload(true));
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

  const inputClass = (field: keyof FormErrors) =>
    `w-full border rounded-xl px-4 py-3 transition-colors ${
      errors[field]
        ? 'border-red-400 bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300'
        : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-300'
    }`;

  const selectClass = (field: keyof FormErrors) =>
    `w-full border rounded-xl px-4 py-3 bg-white transition-colors ${
      errors[field]
        ? 'border-red-400 bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300'
        : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-300'
    }`;

  const FieldError = ({ field }: { field: keyof FormErrors }) =>
    errors[field] ? (
      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {errors[field]}
      </p>
    ) : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl w-full mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
          <select name="client_id" value={formData.client_id} onChange={handleChange} className={selectClass('client_id')}>
            <option value="">Seleccione un cliente...</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.nombre} ({c.cedula})</option>
            ))}
          </select>
          <FieldError field="client_id" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto ($)</label>
            <input
              name="monto"
              type="number"
              min="1"
              value={formData.monto}
              onChange={handleChange}
              className={inputClass('monto')}
              placeholder="Ej: 5000"
            />
            <FieldError field="monto" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tasa Interés (%)</label>
            <input
              name="tasa_interes"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.tasa_interes}
              onChange={handleChange}
              className={inputClass('tasa_interes')}
              placeholder="Ej: 10"
            />
            <FieldError field="tasa_interes" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Interés</label>
            <select name="tipo_interes" value={formData.tipo_interes} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white">
              <option value="simple">Simple</option>
              <option value="compuesto">Compuesto (francés)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Préstamo</label>
            <select name="tipo_prestamo" value={formData.tipo_prestamo} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white">
              <option value="cuotas">Cuotas fijas</option>
              <option value="sin_plazo">Sin plazo (pagos libres)</option>
            </select>
          </div>
        </div>
        {esSinPlazo && (
          <p className="text-xs text-slate-400 -mt-2">Cada pago descuenta primero intereses y luego capital. No hay cuotas fijas.</p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Frecuencia de pago</label>
            <select name="frecuencia" value={formData.frecuencia} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white">
              <option value="diaria">Diaria</option>
              <option value="semanal">Semanal</option>
              <option value="quincenal">Quincenal (15 días)</option>
              <option value="mensual">Mensual</option>
            </select>
          </div>
          {!esSinPlazo && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Número de cuotas</label>
              <input
                name="num_cuotas"
                type="number"
                min="1"
                max="600"
                step="1"
                value={formData.num_cuotas}
                onChange={handleChange}
                className={inputClass('num_cuotas')}
                placeholder="Ej: 12"
              />
              <FieldError field="num_cuotas" />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de inicio</label>
          <input
            name="fecha_inicio"
            type="date"
            value={formData.fecha_inicio}
            onChange={handleChange}
            className={inputClass('fecha_inicio')}
          />
          <FieldError field="fecha_inicio" />
        </div>

        <button
          type="button"
          onClick={simulate}
          disabled={loading}
          className="w-full bg-slate-100 text-slate-700 font-bold py-3 mt-2 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Calculando...' : 'Simular Amortización'}
        </button>

        {simulation.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <h4 className="font-bold text-slate-800 mb-3">
              {esSinPlazo ? 'Primera cuota estimada' : 'Tabla de Cuotas Prevista'}
            </h4>
            {esSinPlazo && (
              <p className="mb-3 text-xs text-slate-500">
                En préstamos sin plazo se genera una sola cuota inicial. Los siguientes períodos se recalculan
                según el saldo que vaya quedando después de cada pago.
              </p>
            )}
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {simulation.map((s) => (
                <div key={s.numero} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg text-sm border border-slate-100">
                  <span className="font-medium text-slate-400 w-8">#{s.numero}</span>
                  <span className="text-slate-600">{new Date(s.fecha_vencimiento).toLocaleDateString('es-ES')}</span>
                  <span className="text-slate-400 text-xs">Int: ${s.monto_interes}</span>
                  <span className="font-bold text-slate-800">${s.monto_cuota}</span>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 text-white font-bold py-3 mt-6 rounded-xl hover:bg-emerald-600 active:scale-[0.98] transition-transform min-h-[56px] shadow-sm flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              {loading ? 'Guardando...' : 'Generar Contrato PDF'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
