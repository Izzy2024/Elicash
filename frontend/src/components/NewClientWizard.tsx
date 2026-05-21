import React, { useState } from 'react';
import { apiService } from '../lib/api.service';

interface FormErrors {
  nombre?: string;
  cedula?: string;
  telefono?: string;
  direccion?: string;
  ref1_telefono?: string;
  ref1_nombre?: string;
  ref2_telefono?: string;
  ref2_nombre?: string;
  fiador_cedula?: string;
  fiador_telefono?: string;
}

const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

export default function NewClientWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    direccion: '',
    foto_url: '',
    ref1_nombre: '',
    ref1_telefono: '',
    ref2_nombre: '',
    ref2_telefono: '',
    fiador_nombre: '',
    fiador_cedula: '',
    fiador_telefono: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setFormData({ ...formData, [name]: e.target.value });
    if (errors[name as keyof FormErrors]) {
      setErrors({ ...errors, [name]: undefined });
    }
  };

  const validateStep1 = (): FormErrors => {
    const e: FormErrors = {};
    if (!formData.nombre.trim() || formData.nombre.trim().length < 3)
      e.nombre = 'Ingresa el nombre completo (mínimo 3 caracteres)';
    if (!formData.cedula.trim() || formData.cedula.trim().length < 3)
      e.cedula = 'Ingresa la cédula o DPI';
    if (!formData.telefono.trim())
      e.telefono = 'El teléfono es obligatorio';
    else if (!PHONE_RE.test(formData.telefono.trim()))
      e.telefono = 'Teléfono inválido (mínimo 7 dígitos)';
    if (!formData.direccion.trim() || formData.direccion.trim().length < 5)
      e.direccion = 'Ingresa la dirección completa';
    return e;
  };

  const validateStep2 = (): FormErrors => {
    const e: FormErrors = {};
    const r1n = formData.ref1_nombre.trim();
    const r1t = formData.ref1_telefono.trim();
    const r2n = formData.ref2_nombre.trim();
    const r2t = formData.ref2_telefono.trim();

    if (r1n && !r1t) e.ref1_telefono = 'Agrega el teléfono de la referencia 1';
    if (r1t && !r1n) e.ref1_nombre = 'Agrega el nombre de la referencia 1';
    if (r1t && !PHONE_RE.test(r1t)) e.ref1_telefono = 'Teléfono inválido';

    if (r2n && !r2t) e.ref2_telefono = 'Agrega el teléfono de la referencia 2';
    if (r2t && !r2n) e.ref2_nombre = 'Agrega el nombre de la referencia 2';
    if (r2t && !PHONE_RE.test(r2t)) e.ref2_telefono = 'Teléfono inválido';

    return e;
  };

  const validateStep3 = (): FormErrors => {
    const e: FormErrors = {};
    const fn = formData.fiador_nombre.trim();
    const fc = formData.fiador_cedula.trim();
    const ft = formData.fiador_telefono.trim();
    const anyFilled = fn || fc || ft;

    if (anyFilled) {
      if (!fc) e.fiador_cedula = 'Ingresa la cédula del fiador';
      if (!ft) e.fiador_telefono = 'Ingresa el teléfono del fiador';
      else if (!PHONE_RE.test(ft)) e.fiador_telefono = 'Teléfono inválido';
    }
    return e;
  };

  const handleNext = () => {
    const fieldErrors = step === 1 ? validateStep1() : validateStep2();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setStep(step + 1);
  };

  const handlePrev = () => {
    setErrors({});
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors = validateStep3();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        nombre: formData.nombre.trim(),
        cedula: formData.cedula.trim(),
        telefono: formData.telefono.trim(),
        direccion: formData.direccion.trim(),
        foto_url: formData.foto_url || null,
        references: [],
        guarantors: []
      };

      if (formData.ref1_nombre.trim()) {
        payload.references.push({
          nombre: formData.ref1_nombre.trim(),
          telefono: formData.ref1_telefono.trim(),
          relacion: 'Personal'
        });
      }
      if (formData.ref2_nombre.trim()) {
        payload.references.push({
          nombre: formData.ref2_nombre.trim(),
          telefono: formData.ref2_telefono.trim(),
          relacion: 'Personal'
        });
      }
      if (formData.fiador_nombre.trim()) {
        payload.guarantors.push({
          nombre: formData.fiador_nombre.trim(),
          cedula: formData.fiador_cedula.trim(),
          telefono: formData.fiador_telefono.trim()
        });
      }

      const client = await apiService.post('/api/clients', payload);
      if (client?.id) {
        alert('Cliente guardado exitosamente!');
        window.location.href = `/clientes/detalle?id=${client.id}`;
      }
    } catch (error: any) {
      alert(error.message || 'Error al guardar cliente');
    } finally {
      setLoading(false);
    }
  };

  const ic = (field: keyof FormErrors) =>
    `w-full border rounded-xl px-4 py-3 focus:outline-none transition-colors ${
      errors[field]
        ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-300'
        : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
    }`;

  const icSm = (field: keyof FormErrors) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${
      errors[field]
        ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-300'
        : 'border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-300'
    }`;

  const Err = ({ field }: { field: keyof FormErrors }) =>
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

      {/* Progress bar */}
      <div className="flex justify-center gap-2 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className={`h-2 w-full rounded-full transition-colors ${step >= i ? 'bg-blue-500' : 'bg-gray-200'}`} />
        ))}
      </div>

      <form
        onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}
        className="space-y-5"
        noValidate
      >

        {/* Step 1 — Datos personales */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-xl font-bold text-slate-800">Datos Personales</h3>

            <div className="flex justify-center mb-4">
              <label className="w-24 h-24 bg-slate-100 rounded-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 cursor-pointer overflow-hidden relative">
                <input type="file" accept="image/*" capture="user" className="hidden" />
                <svg className="w-8 h-8 text-slate-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-[10px] text-slate-500 font-medium text-center leading-tight">Tomar<br/>Foto</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo <span className="text-red-400">*</span></label>
              <input name="nombre" value={formData.nombre} onChange={handleChange} type="text" placeholder="Ej: Juan Pérez García" className={ic('nombre')} />
              <Err field="nombre" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cédula / DPI <span className="text-red-400">*</span></label>
              <input name="cedula" value={formData.cedula} onChange={handleChange} type="text" placeholder="Ej: 1234567890123" className={ic('cedula')} />
              <Err field="cedula" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono <span className="text-red-400">*</span></label>
              <input name="telefono" value={formData.telefono} onChange={handleChange} type="tel" placeholder="Ej: +502 5555-1234" className={ic('telefono')} />
              <Err field="telefono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dirección <span className="text-red-400">*</span></label>
              <input name="direccion" value={formData.direccion} onChange={handleChange} type="text" placeholder="Zona, calle, número de casa..." className={ic('direccion')} />
              <Err field="direccion" />
            </div>
          </div>
        )}

        {/* Step 2 — Referencias */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Referencias</h3>
              <p className="text-sm text-slate-400 mt-1">Opcional. Si agregas nombre, el teléfono es requerido y viceversa.</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
              <h4 className="font-semibold text-slate-700 text-sm">Referencia 1</h4>
              <div>
                <input placeholder="Nombre" name="ref1_nombre" value={formData.ref1_nombre} onChange={handleChange} type="text" className={icSm('ref1_nombre')} />
                <Err field="ref1_nombre" />
              </div>
              <div>
                <input placeholder="Teléfono" name="ref1_telefono" value={formData.ref1_telefono} onChange={handleChange} type="tel" className={icSm('ref1_telefono')} />
                <Err field="ref1_telefono" />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
              <h4 className="font-semibold text-slate-700 text-sm">Referencia 2</h4>
              <div>
                <input placeholder="Nombre" name="ref2_nombre" value={formData.ref2_nombre} onChange={handleChange} type="text" className={icSm('ref2_nombre')} />
                <Err field="ref2_nombre" />
              </div>
              <div>
                <input placeholder="Teléfono" name="ref2_telefono" value={formData.ref2_telefono} onChange={handleChange} type="tel" className={icSm('ref2_telefono')} />
                <Err field="ref2_telefono" />
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Fiador */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Fiador <span className="text-slate-400 font-normal text-base">(Opcional)</span></h3>
              <p className="text-sm text-slate-500 mt-1">Un trato con fiador aumenta el score del cliente y su capacidad de monto.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
              <input name="fiador_nombre" value={formData.fiador_nombre} onChange={handleChange} type="text" placeholder="Ej: María López" className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cédula</label>
              <input name="fiador_cedula" value={formData.fiador_cedula} onChange={handleChange} type="text" className={ic('fiador_cedula')} />
              <Err field="fiador_cedula" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input name="fiador_telefono" value={formData.fiador_telefono} onChange={handleChange} type="tel" className={ic('fiador_telefono')} />
              <Err field="fiador_telefono" />
            </div>
          </div>
        )}

        <div className="pt-6 flex gap-3">
          {step > 1 && (
            <button type="button" onClick={handlePrev} className="flex-1 bg-white border-2 border-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-transform min-h-[56px]">
              Atrás
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex-[2] bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-blue-600 active:scale-[0.98] transition-transform min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Guardando...' : step === 3 ? 'Guardar Cliente' : 'Siguiente →'}
          </button>
        </div>
      </form>
    </div>
  );
}
