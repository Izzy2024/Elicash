import React, { useState } from 'react';
import { apiService } from '../lib/api.service';

export default function NewClientWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    direccion: '',
    foto_url: '',
    
    // Referencias
    ref1_nombre: '',
    ref1_telefono: '',
    ref2_nombre: '',
    ref2_telefono: '',

    // Fiador
    fiador_nombre: '',
    fiador_cedula: '',
    fiador_telefono: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => setStep(step + 1);
  const handlePrev = () => setStep(step - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        nombre: formData.nombre,
        cedula: formData.cedula,
        telefono: formData.telefono,
        direccion: formData.direccion,
        foto_url: formData.foto_url,
        references: [],
        guarantors: []
      } as any;

      if (formData.ref1_nombre) {
        payload.references.push({ 
          nombre: formData.ref1_nombre, 
          telefono: formData.ref1_telefono, 
          relacion: 'Personal' 
        });
      }
      if (formData.ref2_nombre) {
        payload.references.push({ 
          nombre: formData.ref2_nombre, 
          telefono: formData.ref2_telefono, 
          relacion: 'Personal' 
        });
      }

      if (formData.fiador_nombre) {
        payload.guarantors.push({
          nombre: formData.fiador_nombre,
          cedula: formData.fiador_cedula,
          telefono: formData.fiador_telefono
        });
      }

      const client = await apiService.post('/api/clients', payload);
      if (client) {
        alert('Cliente guardado exitosamente!');
        window.location.href = `/clientes/detalle?id=${client.id}`;
      }
    } catch (error: any) {
      alert(error.message || 'Error al guardar cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl w-full mx-auto">
      
      {/* Progress Dots */}
      <div className="flex justify-center gap-2 mb-8">
        {[1,2,3].map(i => (
          <div key={i} className={`h-2 w-full rounded-full ${step >= i ? 'bg-blue-500' : 'bg-gray-200'}`} />
        ))}
      </div>

      <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="space-y-5">
        
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
              <input required name="nombre" value={formData.nombre} onChange={handleChange} type="text" className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cédula / DPI</label>
              <input required name="cedula" value={formData.cedula} onChange={handleChange} type="text" className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input required name="telefono" value={formData.telefono} onChange={handleChange} type="tel" className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
              <input required name="direccion" value={formData.direccion} onChange={handleChange} type="text" className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-xl font-bold text-slate-800">Referencias</h3>
            
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
               <h4 className="font-semibold text-slate-700 text-sm">Referencia 1</h4>
               <input placeholder="Nombre" name="ref1_nombre" value={formData.ref1_nombre} onChange={handleChange} type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
               <input placeholder="Teléfono" name="ref1_telefono" value={formData.ref1_telefono} onChange={handleChange} type="tel" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
               <h4 className="font-semibold text-slate-700 text-sm">Referencia 2</h4>
               <input placeholder="Nombre" name="ref2_nombre" value={formData.ref2_nombre} onChange={handleChange} type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
               <input placeholder="Teléfono" name="ref2_telefono" value={formData.ref2_telefono} onChange={handleChange} type="tel" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-xl font-bold text-slate-800">Fiador (Opcional)</h3>
            <p className="text-sm text-slate-500 mb-4">Un trato con fiador aumenta el score del cliente y su capacidad de monto.</p>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
              <input name="fiador_nombre" value={formData.fiador_nombre} onChange={handleChange} type="text" className="w-full border border-gray-300 rounded-xl px-4 py-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cédula</label>
              <input name="fiador_cedula" value={formData.fiador_cedula} onChange={handleChange} type="text" className="w-full border border-gray-300 rounded-xl px-4 py-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input name="fiador_telefono" value={formData.fiador_telefono} onChange={handleChange} type="tel" className="w-full border border-gray-300 rounded-xl px-4 py-3" />
            </div>
          </div>
        )}

        <div className="pt-6 flex gap-3">
          {step > 1 && (
            <button type="button" onClick={handlePrev} className="flex-1 bg-white border-2 border-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-transform min-h-[56px]">
              Atrás
            </button>
          )}
          <button type="submit" className="flex-[2] bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-blue-600 active:scale-[0.98] transition-transform min-h-[56px]">
            {step === 3 ? 'Guardar Cliente' : 'Siguiente'}
          </button>
        </div>
      </form>
    </div>
  );
}
