'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Database,
  RefreshCcw,
  Server,
  ShieldCheck,
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

function numero(valor: unknown) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function texto(fila: Registro, campo: string) {
  const valor = fila[campo];
  return valor === null || valor === undefined ? '' : String(valor);
}

function TarjetaMonitoreo({
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
              : 'bg-cyan-100 text-cyan-700'
          }`}
        >
          {icono}
        </div>
      </div>
    </article>
  );
}

function TablaMonitoreo({
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
                <tr key={index} className="hover:bg-cyan-50/40">
                  {columnas.map((columna) => (
                    <td
                      key={columna}
                      className="max-w-[260px] truncate border-b px-4 py-3"
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

export default function ModuloMonitoreo() {
  const [dashboard, setDashboard] = useState<Registro[]>([]);
  const [metricas, setMetricas] = useState<Registro[]>([]);
  const [umbrales, setUmbrales] = useState<Registro[]>([]);
  const [alertas, setAlertas] = useState<Registro[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [cargandoAccion, setCargandoAccion] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  async function cargarModuloMonitoreo() {
    try {
      const [resDashboard, resMetricas, resUmbrales, resAlertas] =
        await Promise.all([
          fetch(`${API_URL}/monitoreo/dashboard`),
          fetch(`${API_URL}/monitoreo/metricas`),
          fetch(`${API_URL}/monitoreo/umbrales`),
          fetch(`${API_URL}/monitoreo/alertas`),
        ]);

      setDashboard(normalizarRespuesta(await resDashboard.json()));
      setMetricas(normalizarRespuesta(await resMetricas.json()));
      setUmbrales(normalizarRespuesta(await resUmbrales.json()));
      setAlertas(normalizarRespuesta(await resAlertas.json()));
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los datos del módulo Monitoreo.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarModuloMonitoreo();
  }, []);

  const metricasCalculadas = useMemo(() => {
    const alertasAbiertas = alertas.filter(
      (item) => texto(item, 'estado') !== 'CERRADA',
    ).length;

    const alertasCriticas = alertas.filter(
      (item) => texto(item, 'severidad') === 'CRITICA',
    ).length;

    const umbralesActivos = umbrales.filter(
      (item) => item.activo === true || String(item.activo) === 'true',
    ).length;

    const ultimaConexion = metricas.find(
      (item) => texto(item, 'nombre') === 'conexiones_activas',
    );

    const cacheHit = metricas.find(
      (item) => texto(item, 'nombre') === 'ratio_cache_hit',
    );

    return {
      indicadores: dashboard.length,
      metricas: metricas.length,
      alertasAbiertas,
      alertasCriticas,
      umbralesActivos,
      conexiones: numero(ultimaConexion?.valor_numeric),
      cacheHit: numero(cacheHit?.valor_numeric),
    };
  }, [dashboard, metricas, umbrales, alertas]);

  async function capturarMetricas() {
    setCargandoAccion(true);
    setMensaje('');

    try {
      await fetch(`${API_URL}/monitoreo/capturar`, {
        method: 'POST',
      });

      setMensaje('Métricas capturadas correctamente.');
      await cargarModuloMonitoreo();
    } catch (err) {
      console.error(err);
      setMensaje('No se pudieron capturar las métricas.');
    } finally {
      setCargandoAccion(false);
    }
  }

  async function evaluarAlertas() {
    setCargandoAccion(true);
    setMensaje('');

    try {
      const respuesta = await fetch(`${API_URL}/monitoreo/evaluar-alertas`, {
        method: 'POST',
      });

      const data = await respuesta.json();
      const total = data[0]?.alertas_generadas ?? 0;

      setMensaje(`Evaluación finalizada. Alertas generadas: ${total}`);
      await cargarModuloMonitoreo();
    } catch (err) {
      console.error(err);
      setMensaje('No se pudieron evaluar las alertas.');
    } finally {
      setCargandoAccion(false);
    }
  }

  async function cerrarPrimeraAlerta() {
    const alertaAbierta = alertas.find(
      (item) => texto(item, 'estado') !== 'CERRADA',
    );

    if (!alertaAbierta) {
      setMensaje('No hay alertas abiertas para cerrar.');
      return;
    }

    setCargandoAccion(true);
    setMensaje('');

    try {
      await fetch(`${API_URL}/monitoreo/cerrar-alerta`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idAlerta: alertaAbierta.id_alerta,
          atendidoPor: 'admin',
        }),
      });

      setMensaje('Alerta operacional cerrada correctamente.');
      await cargarModuloMonitoreo();
    } catch (err) {
      console.error(err);
      setMensaje('No se pudo cerrar la alerta.');
    } finally {
      setCargandoAccion(false);
    }
  }

  if (cargando) {
    return (
      <div className="p-8 text-center font-black text-slate-500">
        Cargando módulo Monitoreo...
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
        <TarjetaMonitoreo
          titulo="Indicadores"
          valor={metricasCalculadas.indicadores}
          descripcion="Dashboard operativo"
          icono={<Activity size={24} />}
        />

        <TarjetaMonitoreo
          titulo="Métricas"
          valor={metricasCalculadas.metricas}
          descripcion="Capturas registradas"
          icono={<Database size={24} />}
        />

        <TarjetaMonitoreo
          titulo="Alertas abiertas"
          valor={metricasCalculadas.alertasAbiertas}
          descripcion="Pendientes de atención"
          icono={<Bell size={24} />}
          peligro={metricasCalculadas.alertasAbiertas > 0}
        />

        <TarjetaMonitoreo
          titulo="Críticas"
          valor={metricasCalculadas.alertasCriticas}
          descripcion="Nivel crítico operacional"
          icono={<AlertTriangle size={24} />}
          peligro={metricasCalculadas.alertasCriticas > 0}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <TarjetaMonitoreo
          titulo="Umbrales activos"
          valor={metricasCalculadas.umbralesActivos}
          descripcion="Reglas de control"
          icono={<ShieldCheck size={24} />}
        />

        <TarjetaMonitoreo
          titulo="Conexiones"
          valor={metricasCalculadas.conexiones}
          descripcion="Conexiones activas BD"
          icono={<Server size={24} />}
        />

        <TarjetaMonitoreo
          titulo="Cache hit"
          valor={`${metricasCalculadas.cacheHit}%`}
          descripcion="Eficiencia de caché"
          icono={<CheckCircle2 size={24} />}
          peligro={
            metricasCalculadas.cacheHit > 0 && metricasCalculadas.cacheHit < 95
          }
        />
      </section>

      <article className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Acciones de monitoreo
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Captura métricas del sistema, evalúa umbrales y permite cerrar alertas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              disabled={cargandoAccion}
              onClick={capturarMetricas}
              className="rounded-2xl bg-cyan-700 px-4 py-2 text-sm font-black text-white hover:bg-cyan-800 disabled:opacity-60"
            >
              Capturar métricas
            </button>

            <button
              disabled={cargandoAccion}
              onClick={evaluarAlertas}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
            >
              Evaluar alertas
            </button>

            <button
              disabled={cargandoAccion}
              onClick={cerrarPrimeraAlerta}
              className="rounded-2xl border px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cerrar primera alerta
            </button>
          </div>
        </div>

        {mensaje && (
          <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-700">
            {mensaje}
          </div>
        )}
      </article>

      <TablaMonitoreo
        titulo="Dashboard de seguridad operativa"
        descripcion="Resumen consolidado de alertas, IA, IPs bloqueadas y backups."
        filas={dashboard}
        columnasPreferidas={['indicador', 'valor', 'unidad', 'actualizado']}
      />

      <TablaMonitoreo
        titulo="Métricas del sistema"
        descripcion="Historial de conexiones, cache, deadlocks, logins fallidos e IPs bloqueadas."
        filas={metricas}
        columnasPreferidas={[
          'id_metrica',
          'fecha',
          'nombre',
          'valor_numeric',
          'valor_texto',
          'unidad',
          'severidad',
          'detalle',
        ]}
      />

      <TablaMonitoreo
        titulo="Umbrales de alerta"
        descripcion="Reglas configuradas para disparar alertas operacionales."
        filas={umbrales}
        columnasPreferidas={[
          'id_umbral',
          'nombre_metrica',
          'operador',
          'valor_umbral',
          'severidad',
          'descripcion',
          'activo',
        ]}
      />

      <TablaMonitoreo
        titulo="Alertas operacionales"
        descripcion="Alertas generadas por el sistema de monitoreo."
        filas={alertas}
        columnasPreferidas={[
          'id_alerta',
          'fecha',
          'tipo',
          'severidad',
          'mensaje',
          'estado',
          'atendido_por',
          'atendido_at',
          'detalle',
        ]}
      />

      <article className="rounded-3xl border bg-gradient-to-br from-slate-950 via-cyan-900 to-blue-800 p-6 text-white shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <RefreshCcw size={24} />
          </div>

          <div>
            <h3 className="text-xl font-black">
              Monitoreo operativo empresarial
            </h3>
            <p className="text-sm text-cyan-100">
              Métricas · Umbrales · Alertas · Seguridad · Disponibilidad
            </p>
          </div>
        </div>

        <p className="text-sm leading-6 text-cyan-50">
          Este módulo demuestra que la base no solo almacena productos y ventas,
          también controla métricas internas, eventos críticos, alertas de seguridad
          y estado operativo del sistema.
        </p>
      </article>
    </div>
  );
}