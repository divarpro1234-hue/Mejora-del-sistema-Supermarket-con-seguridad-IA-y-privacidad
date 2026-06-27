'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  FlaskConical,
  RefreshCcw,
  Search,
  ShieldAlert,
} from 'lucide-react';

type Registro = Record<string, unknown>;

const API_URL = 'http://localhost:3000/api';

function normalizar(data: unknown): Registro[] {
  if (Array.isArray(data)) return data as Registro[];
  if (data && typeof data === 'object') return [data as Registro];
  return [];
}

function valorLegible(valor: unknown) {
  if (valor === null || valor === undefined) return '-';
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
}

function texto(fila: Registro, campo: string) {
  const valor = fila[campo];
  return valor === null || valor === undefined ? '' : String(valor);
}

function claseResultado(resultado: string) {
  const r = resultado.toUpperCase();

  if (r.includes('APROBADA') || r.includes('OK') || r.includes('EXITOSO')) {
    return 'bg-green-100 text-green-700 border-green-200';
  }

  if (r.includes('FALLIDA') || r.includes('ERROR') || r.includes('RECHAZADA')) {
    return 'bg-red-100 text-red-700 border-red-200';
  }

  if (r.includes('PENDIENTE') || r.includes('NO_EJECUTADA')) {
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  }

  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function TablaQA({
  titulo,
  descripcion,
  filas,
  columnasPreferidas,
}: {
  titulo: string;
  descripcion: string;
  filas: Registro[];
  columnasPreferidas: string[];
}) {
  const columnas =
    filas.length > 0
      ? columnasPreferidas.filter((col) => col in filas[0]).length > 0
        ? columnasPreferidas.filter((col) => col in filas[0])
        : Object.keys(filas[0])
      : columnasPreferidas;

  return (
    <article className="overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="border-b p-5">
        <h3 className="text-lg font-black text-slate-900">{titulo}</h3>
        <p className="mt-1 text-sm text-slate-500">{descripcion}</p>
      </div>

      {filas.length === 0 ? (
        <div className="p-8 text-center text-sm font-bold text-slate-500">
          No hay datos disponibles.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                {columnas.map((columna) => (
                  <th
                    key={columna}
                    className="border-b px-4 py-3 text-xs font-black uppercase text-slate-500"
                  >
                    {columna}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filas.slice(0, 25).map((fila, index) => (
                <tr key={index} className="hover:bg-orange-50/40">
                  {columnas.map((columna) => {
                    const valor = valorLegible(fila[columna]);

                    return (
                      <td
                        key={columna}
                        className="max-w-[360px] truncate border-b px-4 py-3"
                        title={valor}
                      >
                        {columna.toLowerCase().includes('resultado') ||
                        columna.toLowerCase().includes('estado') ? (
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-black ${claseResultado(
                              valor,
                            )}`}
                          >
                            {valor}
                          </span>
                        ) : (
                          valor
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

function TarjetaQA({
  titulo,
  valor,
  descripcion,
  icono,
}: {
  titulo: string;
  valor: string | number;
  descripcion: string;
  icono: React.ReactNode;
}) {
  return (
    <article className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            {titulo}
          </p>

          <p className="mt-2 text-3xl font-black text-slate-900">{valor}</p>

          <p className="mt-1 text-sm text-slate-500">{descripcion}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
          {icono}
        </div>
      </div>
    </article>
  );
}

export default function PanelQASeguridad() {
  const [pruebas, setPruebas] = useState<Registro[]>([]);
  const [ejecuciones, setEjecuciones] = useState<Registro[]>([]);
  const [resumen, setResumen] = useState<Registro[]>([]);

  const [busqueda, setBusqueda] = useState('');
  const [codigo, setCodigo] = useState('QA-SEC-004');
  const [resultado, setResultado] = useState('APROBADA');
  const [evidencia, setEvidencia] = useState('Evidencia registrada desde el panel QA.');
  const [observacion, setObservacion] = useState('Prueba ejecutada desde el frontend empresarial.');

  const [cargando, setCargando] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  async function cargarQA() {
    try {
      setCargando(true);
      setError('');
      setMensaje('');

      const [resPruebas, resEjecuciones, resResumen] = await Promise.all([
        fetch(`${API_URL}/qa/pruebas`),
        fetch(`${API_URL}/qa/ejecuciones`),
        fetch(`${API_URL}/qa/resumen`),
      ]);

      if (!resPruebas.ok || !resEjecuciones.ok || !resResumen.ok) {
        throw new Error('No se pudieron cargar datos de QA.');
      }

      const pruebasData = normalizar(await resPruebas.json());
      const ejecucionesData = normalizar(await resEjecuciones.json());
      const resumenData = normalizar(await resResumen.json());

      setPruebas(pruebasData);
      setEjecuciones(ejecucionesData);
      setResumen(resumenData);

      const primerCodigo = pruebasData
        .map((p) => texto(p, 'codigo'))
        .find((c) => c.trim().length > 0);

      if (primerCodigo) {
        setCodigo(primerCodigo);
      }
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el panel QA.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarQA();
  }, []);

  const pruebasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    if (!q) return pruebas;

    return pruebas.filter((fila) =>
      Object.values(fila).some((valor) =>
        String(valor ?? '').toLowerCase().includes(q),
      ),
    );
  }, [pruebas, busqueda]);

  const metricas = useMemo(() => {
    const aprobadas = pruebas.filter((fila) => {
      const r =
        texto(fila, 'ultimo_resultado') ||
        texto(fila, 'resultado') ||
        texto(fila, 'estado');

      return r.toUpperCase().includes('APROBADA');
    }).length;

    const fallidas = pruebas.filter((fila) => {
      const r =
        texto(fila, 'ultimo_resultado') ||
        texto(fila, 'resultado') ||
        texto(fila, 'estado');

      return r.toUpperCase().includes('FALLIDA');
    }).length;

    const noEjecutadas = Math.max(0, pruebas.length - aprobadas - fallidas);

    return {
      totalPruebas: pruebas.length,
      aprobadas,
      fallidas,
      noEjecutadas,
      ejecuciones: ejecuciones.length,
    };
  }, [pruebas, ejecuciones]);

  async function registrarResultado() {
    try {
      setRegistrando(true);
      setMensaje('');
      setError('');

      const respuesta = await fetch(`${API_URL}/qa/pruebas/registrar-resultado`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codigo,
          resultado,
          evidencia,
          observacion,
        }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.message || 'No se pudo registrar el resultado QA.');
      }

      setMensaje('Resultado QA registrado correctamente.');
      await cargarQA();
    } catch (err) {
      console.error(err);
      setError('No se pudo registrar el resultado QA.');
    } finally {
      setRegistrando(false);
    }
  }

  if (cargando) {
    return (
      <div className="rounded-3xl border bg-white p-8 text-center font-black text-slate-500">
        Cargando pruebas QA...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-5 font-bold text-red-700">
        {error}
      </div>
    );
  }

  return (
    <section className="grid gap-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900">
          QA y pruebas de seguridad
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Validación de controles críticos, evidencia y resultados de pruebas.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TarjetaQA
          titulo="Pruebas"
          valor={metricas.totalPruebas}
          descripcion="Casos QA definidos"
          icono={<FlaskConical size={24} />}
        />

        <TarjetaQA
          titulo="Aprobadas"
          valor={metricas.aprobadas}
          descripcion="Controles validados"
          icono={<CheckCircle2 size={24} />}
        />

        <TarjetaQA
          titulo="No ejecutadas"
          valor={metricas.noEjecutadas}
          descripcion="Pendientes de validación"
          icono={<ClipboardCheck size={24} />}
        />

        <TarjetaQA
          titulo="Ejecuciones"
          valor={metricas.ejecuciones}
          descripcion="Historial QA registrado"
          icono={<ShieldAlert size={24} />}
        />
      </div>

      <article className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Registrar resultado de prueba
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Guarda evidencia y resultado de una prueba de seguridad.
            </p>
          </div>

          <button
            onClick={cargarQA}
            className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
          >
            <RefreshCcw size={16} />
            Actualizar
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <select
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="rounded-2xl border bg-white px-4 py-3 text-sm font-bold outline-none"
          >
            {pruebas.map((prueba, index) => {
              const codigoPrueba = texto(prueba, 'codigo') || `QA-${index}`;

              return (
                <option key={`${codigoPrueba}-${index}`} value={codigoPrueba}>
                  {codigoPrueba}
                </option>
              );
            })}
          </select>

          <select
            value={resultado}
            onChange={(e) => setResultado(e.target.value)}
            className="rounded-2xl border bg-white px-4 py-3 text-sm font-bold outline-none"
          >
            <option value="APROBADA">APROBADA</option>
            <option value="FALLIDA">FALLIDA</option>
            <option value="NO_EJECUTADA">NO_EJECUTADA</option>
          </select>

          <input
            value={evidencia}
            onChange={(e) => setEvidencia(e.target.value)}
            placeholder="Evidencia técnica..."
            className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-semibold outline-none"
          />

          <input
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Observación..."
            className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-semibold outline-none"
          />
        </div>

        <button
          onClick={registrarResultado}
          disabled={registrando}
          className="mt-4 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-black text-white hover:bg-orange-700 disabled:opacity-60"
        >
          {registrando ? 'Registrando...' : 'Registrar resultado QA'}
        </button>

        {mensaje && (
          <div className="mt-3 rounded-2xl bg-green-50 p-3 text-sm font-bold text-green-700">
            {mensaje}
          </div>
        )}
      </article>

      <article className="rounded-3xl border bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-slate-900">
          Buscar pruebas QA
        </h3>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border bg-slate-50 px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código, nombre, resultado o evidencia..."
            className="w-full bg-transparent text-sm font-semibold outline-none"
          />
        </div>
      </article>

      <TablaQA
        titulo="Pruebas de seguridad"
        descripcion="Casos QA definidos para validar controles críticos del sistema."
        filas={pruebasFiltradas}
        columnasPreferidas={[
          'codigo',
          'nombre',
          'descripcion',
          'categoria',
          'criticidad',
          'ultimo_resultado',
          'ultima_ejecucion',
          'evidencia',
          'observacion',
        ]}
      />

      <TablaQA
        titulo="Resumen QA"
        descripcion="Resumen agregado de pruebas y resultados."
        filas={resumen}
        columnasPreferidas={[
          'total_pruebas',
          'aprobadas',
          'fallidas',
          'no_ejecutadas',
          'porcentaje_aprobacion',
          'estado_general',
        ]}
      />

      <TablaQA
        titulo="Ejecuciones QA"
        descripcion="Historial de ejecuciones y evidencias registradas."
        filas={ejecuciones}
        columnasPreferidas={[
            'id_ejecucion',
            'codigo',
            'categoria',
            'nombre',
            'criticidad',
            'fecha',
            'ejecutado_por',
            'resultado',
            'evidencia',
            'observacion',
        ]}
      />
    </section>
  );
}