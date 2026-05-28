import React, { useState } from 'react';
import { apiService } from '../lib/api.service';

interface FormErrors {
  nombre?: string;
  cedula?: string;
  telefono?: string;
}

const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

export default function NewClientWizard() {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    nombre: '',
    cedula: '',
    telefono: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name as keyof FormErrors]) {
      setErrors({ ...errors, [name]: undefined });
    }
  };

  const validate = (): FormErrors => {
    const fieldErrors: FormErrors = {};

    if (!formData.nombre.trim() || formData.nombre.trim().length < 3) {
      fieldErrors.nombre = 'Ingresa el nombre completo';
    }
    if (!formData.cedula.trim() || formData.cedula.trim().length < 3) {
      fieldErrors.cedula = 'Ingresa la cedula o DPI';
    }
    if (!formData.telefono.trim()) {
      fieldErrors.telefono = 'El telefono es obligatorio';
    } else if (!PHONE_RE.test(formData.telefono.trim())) {
      fieldErrors.telefono = 'Telefono invalido, minimo 7 digitos';
    }

    return fieldErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const client = await apiService.post('/api/clients', {
        nombre: formData.nombre.trim(),
        cedula: formData.cedula.trim(),
        telefono: formData.telefono.trim()
      });

      if (client?.id) {
        window.location.href = `/clientes/detalle?id=${client.id}`;
      }
    } catch (error: any) {
      alert(error.message || 'Error al guardar cliente');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: keyof FormErrors) =>
    `w-full rounded-2xl border px-4 py-4 text-lg font-bold text-slate-800 outline-none transition-all placeholder:text-slate-300 ${
      errors[field]
        ? 'border-red-400 bg-red-50 focus:ring-4 focus:ring-red-100'
        : 'border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
    }`;

  const FieldError = ({ field }: { field: keyof FormErrors }) =>
    errors[field] ? (
      <p className="mt-2 text-sm font-bold text-red-500">{errors[field]}</p>
    ) : null;

  return (
    <div className="mx-auto w-full max-w-xl rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-6 rounded-3xl bg-gradient-to-br from-blue-50 to-slate-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">Nuevo cliente</p>
        <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Solo lo esencial</h3>
        <p className="mt-1 text-sm text-slate-500">
          Guarda el cliente rapido. Los prestamos y documentos se agregan despues desde su perfil.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label className="mb-2 block text-sm font-black uppercase tracking-wide text-slate-500">
            Nombre
          </label>
          <input
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            type="text"
            placeholder="Ej: Juan Perez"
            autoComplete="name"
            className={inputClass('nombre')}
          />
          <FieldError field="nombre" />
        </div>

        <div>
          <label className="mb-2 block text-sm font-black uppercase tracking-wide text-slate-500">
            Telefono
          </label>
          <input
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            type="tel"
            inputMode="tel"
            placeholder="Ej: 5555-1234"
            autoComplete="tel"
            className={inputClass('telefono')}
          />
          <FieldError field="telefono" />
        </div>

        <div>
          <label className="mb-2 block text-sm font-black uppercase tracking-wide text-slate-500">
            Cedula / DPI
          </label>
          <input
            name="cedula"
            value={formData.cedula}
            onChange={handleChange}
            type="text"
            placeholder="Ej: 123456789"
            autoComplete="off"
            className={inputClass('cedula')}
          />
          <FieldError field="cedula" />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="min-h-[58px] w-full rounded-2xl bg-blue-500 px-5 py-4 text-lg font-black text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Guardando...' : 'Guardar cliente'}
        </button>
      </form>
    </div>
  );
}
