'use client';

import PanelPrivacidadCumplimiento from './PanelPrivacidadCumplimiento';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  CheckCircle2,
  Eye,
  FileClock,
  LockKeyhole,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  UserX,
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

function TarjetaPrivacidad({
  titulo,
  valor,
  descripcion,
  icono,
  peligro = false,
}: {
  titulo: string;
  valor: string | number;
  descripcion: string;
  icono: ReactNode;
  peligro?: boolean;
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
              peligro ? 'text-red-600' : 'text-slate-900'
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
              : 'bg-violet-100 text-violet-700'
          }`}
        >
          {icono}
        </div>
      </div>
    </article>
  );
}

function TablaPrivacidad({
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
          <table className="w-full min-w-[900px] text-sm">
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
                <tr key={index} className="hover:bg-violet-50/40">
                  {columnas.map((columna) => (
                    <td
                      key={columna}
                      className="max-w-[280px] truncate border-b px-4 py-3"
                      title={valorLegible(fila[columna])}
                    >
                      {valorLegible(fila[columna])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

export default function ModuloPrivacidad() {
  const [retencion, setRetencion] = useState<Registro[]>([]);
  const [solicitudes, setSolicitudes] = useState<Registro[]>([]);
  const [anonimizaciones, setAnonimizaciones] = useState<Registro[]>([]);
  const [evaluacion, setEvaluacion] = useState<Registro[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [cargandoAccion, setCargandoAccion] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  async function cargarModuloPrivacidad() {
    try {
      const [resRetencion, resSolicitudes, resAnonimizaciones, resEvaluacion] =
        await Promise.all([
          fetch(`${API_URL}/privacidad/retencion`),
          fetch(`${API_URL}/privacidad/solicitudes`),
          fetch(`${API_URL}/privacidad/anonimizaciones`),
          fetch(`${API_URL}/privacidad/evaluar-clientes`),
        ]);

      setRetencion(normalizarRespuesta(await resRetencion.json()));
      setSolicitudes(normalizarRespuesta(await resSolicitudes.json()));
      setAnonimizaciones(normalizarRespuesta(await resAnonimizaciones.json()));
      setEvaluacion(normalizarRespuesta(await resEvaluacion.json()));
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los datos del módulo Privacidad.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarModuloPrivacidad();
  }, []);

  const metricas = useMemo(() => {
    const pendientes = solicitudes.filter(
      (item) => texto(item, 'estado') === 'PENDIENTE',
    ).length;

    const enRevision = solicitudes.filter(
      (item) => texto(item, 'estado') === 'EN_REVISION',
    ).length;

    const anonimizar = evaluacion.filter(
      (item) =>
        texto(item, 'recomendacion') === 'ANONIMIZAR' ||
        texto(item, 'recomendacion') === 'SIN_COMPRAS_REGISTRADAS',
    ).length;

    const politicasActivas = retencion.filter(
      (item) => item.activo === true || String(item.activo) === 'true',
    ).length;

    return {
      politicas: retencion.length,
      politicasActivas,
      solicitudes: solicitudes.length,
      pendientes,
      enRevision,
      anonimizaciones: anonimizaciones.length,
      candidatos: evaluacion.length,
      anonimizar,
    };
  }, [retencion, solicitudes, anonimizaciones, evaluacion]);

  async function registrarSolicitud() {
    setCargandoAccion(true);
    setMensaje('');

    try {
      const respuesta = await fetch(`${API_URL}/privacidad/solicitudes/registrar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: 'ACCESO',
          motivo: 'Solicitud de acceso a datos personales registrada desde el panel empresarial.',
        }),
      });

      const data = await respuesta.json();

      setMensaje(
        `Solicitud registrada correctamente: ${valorLegible(
          data[0]?.id_solicitud,
        )}`,
      );

      await cargarModuloPrivacidad();
    } catch (err) {
      console.error(err);
      setMensaje('No se pudo registrar la solicitud de privacidad.');
    } finally {
      setCargandoAccion(false);
    }
  }

  async function resolverPrimeraSolicitud() {
    const solicitud = solicitudes.find(
      (item) => texto(item, 'estado') === 'PENDIENTE',
    );

    if (!solicitud) {
      setMensaje('No hay solicitudes pendientes para resolver.');
      return;
    }

    setCargandoAccion(true);
    setMensaje('');

    try {
      await fetch(`${API_URL}/privacidad/solicitudes/resolver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idSolicitud: solicitud.id_solicitud,
          estado: 'EN_REVISION',
          resolucion:
            'Solicitud marcada en revisión desde el panel empresarial.',
        }),
      });

      setMensaje('La primera solicitud pendiente fue marcada en revisión.');
      await cargarModuloPrivacidad();
    } catch (err) {
      console.error(err);
      setMensaje('No se pudo actualizar la solicitud.');
    } finally {
      setCargandoAccion(false);
    }
  }

  if (cargando) {
    return (
      <div className="p-8 text-center font-black text-slate-500">
        Cargando módulo Privacidad...
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
        <TarjetaPrivacidad
          titulo="Políticas"
          valor={metricas.politicas}
          descripcion={`${metricas.politicasActivas} políticas activas`}
          icono={<FileClock size={24} />}
        />

        <TarjetaPrivacidad
          titulo="Solicitudes"
          valor={metricas.solicitudes}
          descripcion="Peticiones sobre datos personales"
          icono={<Eye size={24} />}
        />

        <TarjetaPrivacidad
          titulo="Pendientes"
          valor={metricas.pendientes}
          descripcion="Solicitudes sin resolver"
          icono={<ShieldAlert size={24} />}
          peligro={metricas.pendientes > 0}
        />

        <TarjetaPrivacidad
          titulo="Anonimizaciones"
          valor={metricas.anonimizaciones}
          descripcion="Procesos ejecutados"
          icono={<UserX size={24} />}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <TarjetaPrivacidad
          titulo="Candidatos"
          valor={metricas.candidatos}
          descripcion="Clientes evaluados"
          icono={<RefreshCcw size={24} />}
        />

        <TarjetaPrivacidad
          titulo="Requieren acción"
          valor={metricas.anonimizar}
          descripcion="Recomendados para revisión"
          icono={<LockKeyhole size={24} />}
          peligro={metricas.anonimizar > 0}
        />

        <TarjetaPrivacidad
          titulo="En revisión"
          valor={metricas.enRevision}
          descripcion="Solicitudes en análisis"
          icono={<CheckCircle2 size={24} />}
        />
      </section>

      <article className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Gestión de solicitudes de privacidad
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Registra solicitudes y actualiza el estado de atención sin exponer datos sensibles.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              disabled={cargandoAccion}
              onClick={registrarSolicitud}
              className="rounded-2xl bg-violet-700 px-4 py-2 text-sm font-black text-white hover:bg-violet-800 disabled:opacity-60"
            >
              Registrar solicitud
            </button>

            <button
              disabled={cargandoAccion}
              onClick={resolverPrimeraSolicitud}
              className="rounded-2xl border px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Marcar primera en revisión
            </button>
          </div>
        </div>

        {mensaje && (
          <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-700">
            {mensaje}
          </div>
        )}
      </article>

      <TablaPrivacidad
        titulo="Matriz de retención de datos"
        descripcion="Define cuánto tiempo se conserva cada dato y qué acción corresponde."
        filas={retencion}
        columnasPreferidas={[
          'esquema',
          'tabla',
          'tipo_dato',
          'conservar_dias',
          'accion',
          'descripcion',
          'activo',
        ]}
      />

      <TablaPrivacidad
        titulo="Solicitudes de privacidad"
        descripcion="Registro de acceso, rectificación, anonimización, eliminación lógica u oposición."
        filas={solicitudes}
        columnasPreferidas={[
          'id_solicitud',
          'cliente',
          'tipo',
          'estado',
          'motivo',
          'solicitado_por',
          'fecha_solicitud',
          'fecha_resolucion',
          'resolucion',
        ]}
      />

      <TablaPrivacidad
        titulo="Clientes candidatos a anonimización"
        descripcion="Evaluación automática de clientes inactivos o sin compras registradas."
        filas={evaluacion}
        columnasPreferidas={[
          'id_cliente',
          'cliente',
          'ultima_compra',
          'recomendacion',
        ]}
      />

      <TablaPrivacidad
        titulo="Historial de anonimizaciones"
        descripcion="Procesos ejecutados sobre datos personales."
        filas={anonimizaciones}
        columnasPreferidas={[
          'id_anonimizacion',
          'id_cliente',
          'fecha',
          'ejecutado_por',
          'motivo',
          'hash_cliente',
          'observacion',
        ]}
      />

      <article className="rounded-3xl border bg-gradient-to-br from-violet-950 via-fuchsia-900 to-slate-900 p-6 text-white shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <ShieldCheck size={24} />
          </div>

          <div>
            <h3 className="text-xl font-black">
              Privacidad y protección de datos
            </h3>
            <p className="text-sm text-violet-100">
              Retención · Solicitudes · Anonimización · Auditoría de datos personales
            </p>
          </div>
        </div>

        <p className="text-sm leading-6 text-violet-50">
          Este módulo demuestra que la base de datos no solo protege accesos,
          sino que también define políticas de conservación, solicitudes de privacidad
          y procesos de anonimización de datos personales.
        </p>
      </article>
      <PanelPrivacidadCumplimiento />
    </div>
  );
}