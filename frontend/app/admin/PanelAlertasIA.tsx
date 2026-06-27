'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  BrainCircuit,
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

function valor(valor: unknown) {
  if (valor === null || valor === undefined) return '-';
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
}

function texto(fila: Registro, campo: string) {
  const v = fila[campo];
  return v === null || v === undefined ? '' : String(v);
}

function claseSeveridad(severidad: string) {
  const s = severidad.toUpperCase();

  if (s.includes('CRITICA') || s.includes('ALTA')) {
    return 'bg-red-100 text-red-700 border-red-200';
  }

  if (s.includes('MEDIA')) {
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  }

  return 'bg-green-100 text-green-700 border-green-200';
}

function TarjetaIA({
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

function TablaIA({
  titulo,
  descripcion,
  filas,
  columnas,
}: {
  titulo: string;
  descripcion: string;
  filas: Registro[];
  columnas: string[];
}) {
  const columnasValidas = columnas.filter(
    (columna) => filas[0] && columna in filas[0],
  );

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
                {columnasValidas.map((columna) => (
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
              {filas.slice(0, 20).map((fila, index) => (
                <tr key={index} className="hover:bg-orange-50/40">
                  {columnasValidas.map((columna) => (
                    <td
                      key={columna}
                      className="max-w-[300px] truncate border-b px-4 py-3"
                      title={valor(fila[columna])}
                    >
                      {columna.toLowerCase().includes('severidad') ||
                        columna.toLowerCase().includes('riesgo') ||
                        columna.toLowerCase().includes('prioridad') ||
                        columna.toLowerCase().includes('nivel') ? (
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${claseSeveridad(
                            valor(fila[columna]),
                          )}`}
                        >
                          {valor(fila[columna])}
                        </span>
                      ) : (
                        valor(fila[columna])
                      )}
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

export default function PanelAlertasIA() {
  const [alertas, setAlertas] = useState<Registro[]>([]);
  const [panelAvanzado, setPanelAvanzado] = useState<Registro[]>([]);
  const [resumenChatbot, setResumenChatbot] = useState<Registro[]>([]);
  const [reporteAlertas, setReporteAlertas] = useState<Registro[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  async function cargarIA() {
    try {
      setCargando(true);
      setError('');

      const [
        resAlertas,
        resPanelAvanzado,
        resResumenChatbot,
        resReporteAlertas,
      ] = await Promise.all([
        fetch(`${API_URL}/ia/alertas`),
        fetch(`${API_URL}/ia/panel-avanzado`),
        fetch(`${API_URL}/ia/chatbot-resumen`),
        fetch(`${API_URL}/reportes/alertas-ia`),
      ]);

      if (
        !resAlertas.ok ||
        !resPanelAvanzado.ok ||
        !resResumenChatbot.ok ||
        !resReporteAlertas.ok
      ) {
        throw new Error('No se pudieron cargar los datos de IA.');
      }

      setAlertas(normalizar(await resAlertas.json()));
      setPanelAvanzado(normalizar(await resPanelAvanzado.json()));
      setResumenChatbot(normalizar(await resResumenChatbot.json()));
      setReporteAlertas(normalizar(await resReporteAlertas.json()));
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el panel de inteligencia artificial.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarIA();
  }, []);

  const alertasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    if (!q) return alertas;

    return alertas.filter((alerta) =>
      Object.values(alerta).some((valorCampo) =>
        String(valorCampo ?? '').toLowerCase().includes(q),
      ),
    );
  }, [alertas, busqueda]);

  const metricas = useMemo(() => {
    const total = alertas.length;

    const criticas = alertas.filter((alerta) => {
      const severidad =
        texto(alerta, 'prioridad') ||
        texto(alerta, 'severidad') ||
        texto(alerta, 'nivel') ||
        texto(alerta, 'riesgo');

      return (
        severidad.toUpperCase().includes('CRITICA') ||
        severidad.toUpperCase().includes('ALTA')
      );
    }).length;

    const medias = alertas.filter((alerta) => {
      const severidad =
        texto(alerta, 'severidad') ||
        texto(alerta, 'nivel_riesgo') ||
        texto(alerta, 'riesgo');

      return severidad.toUpperCase().includes('MEDIA');
    }).length;

    const bajas = Math.max(0, total - criticas - medias);

    return {
      total,
      criticas,
      medias,
      bajas,
    };
  }, [alertas]);

  if (cargando) {
    return (
      <div className="rounded-3xl border bg-white p-8 text-center font-black text-slate-500">
        Cargando alertas de inteligencia artificial...
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
          Inteligencia Artificial y alertas
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Detección automática de riesgos, ventas anómalas y eventos relevantes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TarjetaIA
          titulo="Alertas IA"
          valor={metricas.total}
          descripcion="Alertas generadas"
          icono={<BrainCircuit size={24} />}
        />

        <TarjetaIA
          titulo="Riesgo alto"
          valor={metricas.criticas}
          descripcion="Alertas críticas o altas"
          icono={<ShieldAlert size={24} />}
        />

        <TarjetaIA
          titulo="Riesgo medio"
          valor={metricas.medias}
          descripcion="Alertas en observación"
          icono={<AlertTriangle size={24} />}
        />

        <TarjetaIA
          titulo="Riesgo bajo"
          valor={metricas.bajas}
          descripcion="Eventos controlados"
          icono={<Bot size={24} />}
        />
      </div>

      <article className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Buscador de alertas IA
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Busca por tipo, descripción, severidad, estado o fecha.
            </p>
          </div>

          <button
            onClick={cargarIA}
            className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
          >
            <RefreshCcw size={16} />
            Actualizar
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border bg-slate-50 px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar alerta IA..."
            className="w-full bg-transparent text-sm font-semibold outline-none"
          />
        </div>
      </article>

      <TablaIA
        titulo="Alertas IA recientes"
        descripcion="Eventos detectados automáticamente por reglas inteligentes."
        filas={alertasFiltradas}
        columnas={[
            'origen',
            'id_alerta',
            'fecha',
            'prioridad',
            'tipo',
            'descripcion',
            'id_sucursal',
            'id_venta',
            'atendida',
        ]}
        />

      <TablaIA
        titulo="Panel avanzado de IA"
        descripcion="Modelos, motores inteligentes y predicciones registradas."
        filas={panelAvanzado}
        columnas={[
            'modelo',
            'tipo',
            'version',
            'proveedor',
            'total_predicciones',
            'predicciones_altas',
            'ultima_prediccion',
        ]}
        />

      <TablaIA
        titulo="Resumen inteligente"
        descripcion="Información resumida para interpretación ejecutiva."
        filas={resumenChatbot}
        columnas={[
            'resumen',
        ]}
        />

      <TablaIA
        titulo="Reporte de alertas IA"
        descripcion="Vista preparada para auditoría, reportes y seguimiento."
        filas={reporteAlertas}
        columnas={[
            'categoria',
            'fecha',
            'nivel',
            'tipo',
            'descripcion',
            'id_sucursal',
            'id_venta',
            'atendida',
        ]}
        />
    </section>
  );
}