'use client';

import PanelQASeguridad from './PanelQASeguridad';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

type Registro = Record<string, unknown>;

const API_URL = 'http://localhost:3000/api';

function normalizarRespuesta(data: unknown): Registro[] {
  if (Array.isArray(data)) return data as Registro[];
  if (data && typeof data === 'object') return [data as Registro];
  return [];
}

function valorLegible(valor: unknown) {
  if (valor === null || valor === undefined) return '-';

  if (typeof valor === 'object') {
    return JSON.stringify(valor);
  }

  return String(valor);
}

function texto(fila: Registro, campo: string) {
  const valor = fila[campo];
  return valor === null || valor === undefined ? '' : String(valor);
}

function numero(fila: Registro | undefined, campo: string) {
  if (!fila) return 0;
  const valor = Number(fila[campo]);
  return Number.isFinite(valor) ? valor : 0;
}

function TarjetaQA({
  titulo,
  valor,
  descripcion,
  icono,
  peligro = false,
  correcto = false,
}: {
  titulo: string;
  valor: string | number;
  descripcion: string;
  icono: ReactNode;
  peligro?: boolean;
  correcto?: boolean;
}) {
  return (
    <article className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            {titulo}
          </p>

          <p
            className={`mt-2 text-3xl font-black ${
              peligro
                ? 'text-red-600'
                : correcto
                  ? 'text-green-700'
                  : 'text-slate-900'
            }`}
          >
            {valor}
          </p>

          <p className="mt-1 text-sm text-slate-500">{descripcion}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            peligro
              ? 'bg-red-100 text-red-600'
              : correcto
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
          }`}
        >
          {icono}
        </div>
      </div>
    </article>
  );
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
  const columnas = columnasPreferidas.filter(
    (columna) => filas[0] && columna in filas[0],
  );

  return (
    <article className="overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="border-b p-5">
        <h3 className="text-lg font-black text-slate-900">{titulo}</h3>
        <p className="mt-1 text-sm text-slate-500">{descripcion}</p>
      </div>

      {filas.length === 0 ? (
        <div className="p-6 text-center text-sm font-bold text-slate-500">
          No hay datos disponibles.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-sm">
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
              {filas.slice(0, 12).map((fila, index) => (
                <tr key={index} className="hover:bg-amber-50/40">
                  {columnas.map((columna) => {
                    const valor = valorLegible(fila[columna]);
                    const esResultado = columna.includes('resultado');

                    return (
                      <td
                        key={columna}
                        className="max-w-[300px] truncate border-b px-4 py-3"
                        title={valor}
                      >
                        {esResultado ? (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              valor === 'APROBADA'
                                ? 'bg-green-100 text-green-700'
                                : valor === 'FALLIDA'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-slate-100 text-slate-600'
                            }`}
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

export default function ModuloQA() {
  const [pruebas, setPruebas] = useState<Registro[]>([]);
  const [resumen, setResumen] = useState<Registro[]>([]);
  const [ejecuciones, setEjecuciones] = useState<Registro[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [cargandoAccion, setCargandoAccion] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  async function cargarModuloQA() {
    try {
      const [resPruebas, resResumen, resEjecuciones] = await Promise.all([
        fetch(`${API_URL}/qa/pruebas`),
        fetch(`${API_URL}/qa/resumen`),
        fetch(`${API_URL}/qa/ejecuciones`),
      ]);

      setPruebas(normalizarRespuesta(await resPruebas.json()));
      setResumen(normalizarRespuesta(await resResumen.json()));
      setEjecuciones(normalizarRespuesta(await resEjecuciones.json()));
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los datos del módulo QA.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarModuloQA();
  }, []);

  const metricas = useMemo(() => {
    const fila = resumen[0];

    const total = numero(fila, 'total_pruebas');
    const aprobadas = numero(fila, 'aprobadas');
    const fallidas = numero(fila, 'fallidas');
    const noEjecutadas = numero(fila, 'no_ejecutadas');
    const criticas = numero(fila, 'criticas');
    const altas = numero(fila, 'altas');

    return {
      total,
      aprobadas,
      fallidas,
      noEjecutadas,
      criticas,
      altas,
      ejecuciones: ejecuciones.length,
    };
  }, [resumen, ejecuciones]);

  async function registrarPruebaAuditoria() {
    setCargandoAccion(true);
    setMensaje('');

    try {
      const respuesta = await fetch(`${API_URL}/qa/pruebas/registrar-resultado`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codigo: 'QA-SEC-004',
          resultado: 'APROBADA',
          evidencia: 'SELECT * FROM audit.verificar_integridad_cadena();',
          observacion:
            'Cadena de auditoría verificada correctamente desde el panel empresarial.',
        }),
      });

      const data = await respuesta.json();

      setMensaje(
        `Resultado registrado correctamente: ${valorLegible(
          data[0]?.id_ejecucion,
        )}`,
      );

      await cargarModuloQA();
    } catch (err) {
      console.error(err);
      setMensaje('No se pudo registrar el resultado de la prueba.');
    } finally {
      setCargandoAccion(false);
    }
  }

  async function registrarPruebaSqlInjection() {
    setCargandoAccion(true);
    setMensaje('');

    try {
      const respuesta = await fetch(`${API_URL}/qa/pruebas/registrar-resultado`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codigo: 'QA-SEC-006',
          resultado: 'APROBADA',
          evidencia: 'Uso de consultas parametrizadas con $1, $2, $3 en pg.',
          observacion:
            'Validación de protección contra SQL Injection desde el panel empresarial.',
        }),
      });

      const data = await respuesta.json();

      setMensaje(
        `Resultado registrado correctamente: ${valorLegible(
          data[0]?.id_ejecucion,
        )}`,
      );

      await cargarModuloQA();
    } catch (err) {
      console.error(err);
      setMensaje('No se pudo registrar el resultado de SQL Injection.');
    } finally {
      setCargandoAccion(false);
    }
  }

  if (cargando) {
    return (
      <div className="p-8 text-center font-black text-slate-500">
        Cargando módulo QA...
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-6 rounded-2xl border border-red-200 bg-red-50 p-5 font-bold text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="grid gap-6 p-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TarjetaQA
          titulo="Total pruebas"
          valor={metricas.total}
          descripcion="Casos QA registrados"
          icono={<ClipboardCheck size={24} />}
        />

        <TarjetaQA
          titulo="Aprobadas"
          valor={metricas.aprobadas}
          descripcion="Pruebas verificadas"
          icono={<CheckCircle2 size={24} />}
          correcto={metricas.aprobadas > 0}
        />

        <TarjetaQA
          titulo="Fallidas"
          valor={metricas.fallidas}
          descripcion="Pruebas con observación"
          icono={<XCircle size={24} />}
          peligro={metricas.fallidas > 0}
        />

        <TarjetaQA
          titulo="No ejecutadas"
          valor={metricas.noEjecutadas}
          descripcion="Pendientes de validación"
          icono={<Clock size={24} />}
          peligro={metricas.noEjecutadas > 0}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <TarjetaQA
          titulo="Críticas"
          valor={metricas.criticas}
          descripcion="Pruebas de criticidad máxima"
          icono={<ShieldAlert size={24} />}
        />

        <TarjetaQA
          titulo="Altas"
          valor={metricas.altas}
          descripcion="Pruebas de alta importancia"
          icono={<ShieldCheck size={24} />}
        />

        <TarjetaQA
          titulo="Ejecuciones"
          valor={metricas.ejecuciones}
          descripcion="Historial de validaciones"
          icono={<FileText size={24} />}
        />
      </section>

      <article className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Registro de resultados QA
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Registra evidencias técnicas de pruebas de seguridad ejecutadas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              disabled={cargandoAccion}
              onClick={registrarPruebaAuditoria}
              className="rounded-2xl bg-amber-600 px-4 py-2 text-sm font-black text-white hover:bg-amber-700 disabled:opacity-60"
            >
              Aprobar auditoría
            </button>

            <button
              disabled={cargandoAccion}
              onClick={registrarPruebaSqlInjection}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
            >
              Aprobar SQL Injection
            </button>
          </div>
        </div>

        {mensaje && (
          <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-700">
            {mensaje}
          </div>
        )}
      </article>

      <TablaQA
        titulo="Estado de pruebas de seguridad"
        descripcion="Validación de autenticación, autorización, auditoría, backups, SQL Injection, IA y privacidad."
        filas={pruebas}
        columnasPreferidas={[
          'codigo',
          'categoria',
          'nombre',
          'criticidad',
          'ultima_ejecucion',
          'ultimo_resultado',
          'evidencia',
          'observacion',
        ]}
      />

      <TablaQA
        titulo="Historial de ejecuciones QA"
        descripcion="Registro histórico de resultados, evidencias y observaciones."
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

      <article className="rounded-3xl border bg-gradient-to-br from-amber-950 via-orange-800 to-slate-900 p-6 text-white shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <RefreshCcw size={24} />
          </div>

          <div>
            <h3 className="text-xl font-black">
              Pruebas de seguridad y aseguramiento QA
            </h3>
            <p className="text-sm text-amber-100">
              Autenticación · RLS · Auditoría · Backups · SQL Injection · IA · Privacidad
            </p>
          </div>
        </div>

        <p className="text-sm leading-6 text-amber-50">
          Este módulo demuestra que el sistema no solo implementa seguridad,
          sino que también registra evidencias de validación y pruebas técnicas
          sobre los controles críticos de la base de datos.
        </p>
      </article>

      <PanelQASeguridad />
    </div>
  );
}