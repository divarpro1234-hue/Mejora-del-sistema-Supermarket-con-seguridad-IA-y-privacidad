'use client';

import { useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';

type Fuente = {
  id_fuente?: string;
  nombre?: string;
  fuente?: string;
};

const API_URL = 'http://localhost:3000/api';

export default function PanelIntegracionEmpresarial() {
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [fuenteSeleccionada, setFuenteSeleccionada] = useState('BD Proveedores Externos');
  const [estadoSinc, setEstadoSinc] = useState('EXITOSO');
  const [filasLeidas, setFilasLeidas] = useState('120');
  const [filasInsertadas, setFilasInsertadas] = useState('30');
  const [filasActualizadas, setFilasActualizadas] = useState('12');

  const [cargando, setCargando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  async function cargarFuentes() {
    try {
      setCargando(true);
      setError('');

      const respuesta = await fetch(`${API_URL}/integracion/fuentes`);

      if (!respuesta.ok) {
        throw new Error('No se pudieron cargar las fuentes externas.');
      }

      const data = await respuesta.json();
      const lista = Array.isArray(data) ? data : [];

      setFuentes(lista);

      if (lista.length > 0) {
        setFuenteSeleccionada(lista[0].nombre || lista[0].fuente || 'BD Proveedores Externos');
      }
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar las fuentes externas.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarFuentes();
  }, []);

  async function registrarSincronizacion() {
    try {
      setRegistrando(true);
      setMensaje('');
      setError('');

      const respuesta = await fetch(`${API_URL}/integracion/sincronizaciones/registrar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fuente: fuenteSeleccionada,
          estado: estadoSinc,
          filasLeidas: Number(filasLeidas),
          filasInsertadas: Number(filasInsertadas),
          filasActualizadas: Number(filasActualizadas),
        }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.message || 'No se pudo registrar la sincronización.');
      }

      setMensaje('Sincronización registrada correctamente. Presiona Actualizar en el módulo para verla en la tabla.');
    } catch (err) {
      console.error(err);
      setError('No se pudo registrar la sincronización.');
    } finally {
      setRegistrando(false);
    }
  }

  return (
    <section className="grid gap-6">
      <article className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Registrar sincronización
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Registra una nueva sincronización sin duplicar las tablas del módulo.
            </p>
          </div>

          <button
            onClick={cargarFuentes}
            disabled={cargando}
            className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
          >
            <RefreshCcw size={16} />
            {cargando ? 'Cargando...' : 'Actualizar fuentes'}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <select
            value={fuenteSeleccionada}
            onChange={(e) => setFuenteSeleccionada(e.target.value)}
            className="rounded-2xl border bg-white px-4 py-3 text-sm font-bold outline-none"
          >
            {fuentes.length === 0 ? (
              <option value="BD Proveedores Externos">
                BD Proveedores Externos
              </option>
            ) : (
              fuentes.map((fuente, index) => {
                const nombre = fuente.nombre || fuente.fuente || `Fuente ${index + 1}`;

                return (
                  <option key={`${nombre}-${index}`} value={nombre}>
                    {nombre}
                  </option>
                );
              })
            )}
          </select>

          <select
            value={estadoSinc}
            onChange={(e) => setEstadoSinc(e.target.value)}
            className="rounded-2xl border bg-white px-4 py-3 text-sm font-bold outline-none"
          >
            <option value="EXITOSO">EXITOSO</option>
            <option value="FALLIDO">FALLIDO</option>
            <option value="PENDIENTE">PENDIENTE</option>
          </select>

          <button
            onClick={registrarSincronizacion}
            disabled={registrando}
            className="rounded-2xl bg-orange-600 px-5 py-3 text-sm font-black text-white hover:bg-orange-700 disabled:opacity-60"
          >
            {registrando ? 'Registrando...' : 'Registrar sincronización'}
          </button>

          <input
            value={filasLeidas}
            onChange={(e) => setFilasLeidas(e.target.value)}
            className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-semibold outline-none"
            placeholder="Filas leídas"
          />

          <input
            value={filasInsertadas}
            onChange={(e) => setFilasInsertadas(e.target.value)}
            className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-semibold outline-none"
            placeholder="Filas insertadas"
          />

          <input
            value={filasActualizadas}
            onChange={(e) => setFilasActualizadas(e.target.value)}
            className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-semibold outline-none"
            placeholder="Filas actualizadas"
          />
        </div>

        {mensaje && (
          <div className="mt-3 rounded-2xl bg-green-50 p-3 text-sm font-bold text-green-700">
            {mensaje}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}
      </article>
    </section>
  );
}