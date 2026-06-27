'use client';

import PanelAlertasIA from './PanelAlertasIA';
import PanelAsistenteIA from './PanelAsistenteIA';


import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Brain,
  CircleAlert,
  Cpu,
  FileSearch,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';

type Registro = Record<string, unknown>;

const API_URL = 'http://localhost:3000/api';

function valorLegible(valor: unknown) {
  if (valor === null || valor === undefined) return '-';

  if (typeof valor === 'object') {
    return JSON.stringify(valor);
  }

  return String(valor);
}

function obtenerTexto(fila: Registro, campos: string[]) {
  for (const campo of campos) {
    const valor = fila[campo];

    if (valor !== null && valor !== undefined) {
      return String(valor);
    }
  }

  return '';
}

function obtenerNumero(fila: Registro, campos: string[]) {
  for (const campo of campos) {
    const valor = fila[campo];

    if (valor !== null && valor !== undefined && !Number.isNaN(Number(valor))) {
      return Number(valor);
    }
  }

  return 0;
}

function normalizarRespuesta(data: unknown): Registro[] {
  if (Array.isArray(data)) return data as Registro[];

  if (data && typeof data === 'object') {
    return [data as Registro];
  }

  return [{ resultado: data }];
}

function TarjetaIA({
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
              : 'bg-orange-100 text-orange-600'
          }`}
        >
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
  columnasPreferidas,
}: {
  titulo: string;
  descripcion: string;
  filas: Registro[];
  columnasPreferidas?: string[];
}) {
  const columnas =
    columnasPreferidas && columnasPreferidas.length > 0
      ? columnasPreferidas.filter((col) => filas[0] && col in filas[0])
      : filas.length > 0
        ? Object.keys(filas[0]).slice(0, 8)
        : [];

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
          <table className="w-full min-w-[860px] text-sm">
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
                <tr key={index} className="hover:bg-orange-50/40">
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

export default function ModuloIA() {
  const [alertas, setAlertas] = useState<Registro[]>([]);
  const [panelAvanzado, setPanelAvanzado] = useState<Registro[]>([]);
  const [resumenChatbot, setResumenChatbot] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });

    async function cargarModuloIA() {
      try {
        const [resAlertas, resPanel, resChatbot] = await Promise.all([
          fetch(`${API_URL}/ia/alertas`),
          fetch(`${API_URL}/ia/panel-avanzado`),
          fetch(`${API_URL}/ia/chatbot-resumen`),
        ]);

        const dataAlertas = await resAlertas.json();
        const dataPanel = await resPanel.json();
        const dataChatbot = await resChatbot.json();

        setAlertas(Array.isArray(dataAlertas) ? dataAlertas : []);
        setPanelAvanzado(normalizarRespuesta(dataPanel));
        setResumenChatbot(normalizarRespuesta(dataChatbot));
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar los datos del módulo de Inteligencia Artificial.');
      } finally {
        setCargando(false);
      }
    }

    cargarModuloIA();
  }, []);

  const metricas = useMemo(() => {
    const alertasCriticas = alertas.filter((item) => {
      const severidad = obtenerTexto(item, ['severidad', 'nivel', 'criticidad']).toUpperCase();
      return severidad.includes('CRITICA') || severidad.includes('CRITICO');
    }).length;

    const alertasAltas = alertas.filter((item) => {
      const severidad = obtenerTexto(item, ['severidad', 'nivel', 'criticidad']).toUpperCase();
      return severidad.includes('ALTA') || severidad.includes('ALTO');
    }).length;

    const alertasPendientes = alertas.filter((item) => {
      const atendida = item.atendida;
      const estado = obtenerTexto(item, ['estado']).toUpperCase();

      return atendida === false || estado.includes('PENDIENTE') || estado === '';
    }).length;

    const riesgoMaximo = Math.max(
      0,
      ...panelAvanzado.map((item) =>
        obtenerNumero(item, [
          'riesgo',
          'riesgo_promedio',
          'score_riesgo',
          'probabilidad_fraude',
          'puntaje',
        ]),
      ),
    );

    const modelosDetectados = new Set(
      panelAvanzado.map((item) =>
        obtenerTexto(item, ['modelo', 'nombre_modelo', 'tipo_modelo', 'tipo']),
      ),
    );

    return {
      totalAlertas: alertas.length,
      alertasPendientes,
      alertasCriticas,
      alertasAltas,
      registrosPanel: panelAvanzado.length,
      modelos: Array.from(modelosDetectados).filter(Boolean).length,
      riesgoMaximo,
      resumenes: resumenChatbot.length,
    };
  }, [alertas, panelAvanzado, resumenChatbot]);

  if (cargando) {
    return (
      <div className="p-8 text-center font-black text-slate-500">
        Cargando módulo de Inteligencia Artificial...
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
        <TarjetaIA
          titulo="Alertas IA"
          valor={metricas.totalAlertas}
          descripcion="Alertas registradas por el motor inteligente"
          icono={<Brain size={24} />}
          peligro={metricas.alertasCriticas > 0}
        />

        <TarjetaIA
          titulo="Pendientes"
          valor={metricas.alertasPendientes}
          descripcion="Alertas que requieren revisión"
          icono={<CircleAlert size={24} />}
          peligro={metricas.alertasPendientes > 0}
        />

        <TarjetaIA
          titulo="Críticas"
          valor={metricas.alertasCriticas}
          descripcion="Alertas con severidad crítica"
          icono={<ShieldAlert size={24} />}
          peligro={metricas.alertasCriticas > 0}
        />

        <TarjetaIA
          titulo="Altas"
          valor={metricas.alertasAltas}
          descripcion="Alertas con prioridad alta"
          icono={<AlertTriangle size={24} />}
          peligro={metricas.alertasAltas > 0}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TarjetaIA
          titulo="Panel avanzado"
          valor={metricas.registrosPanel}
          descripcion="Registros consolidados de IA"
          icono={<Cpu size={24} />}
        />

        <TarjetaIA
          titulo="Modelos"
          valor={metricas.modelos}
          descripcion="Modelos o tipos IA detectados"
          icono={<Bot size={24} />}
        />

        <TarjetaIA
          titulo="Riesgo máximo"
          valor={metricas.riesgoMaximo.toFixed(2)}
          descripcion="Mayor puntaje detectado por IA"
          icono={<TrendingUp size={24} />}
          peligro={metricas.riesgoMaximo >= 70}
        />

        <TarjetaIA
          titulo="Resumen gerencial"
          valor={metricas.resumenes}
          descripcion="Salida del chatbot gerencial"
          icono={<FileSearch size={24} />}
        />
      </section>

      <PanelAsistenteIA />

      <section className="rounded-3xl border bg-slate-50 p-5">
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Información técnica IA
          </p>
          <h3 className="text-xl font-black text-slate-900">
            Métricas, alertas y panel avanzado
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Esta sección mantiene los datos técnicos del módulo para auditoría y defensa.
          </p>
        </div>
      </section>

      <article className="rounded-3xl border bg-gradient-to-br from-blue-950 via-blue-800 to-orange-600 p-6 text-white shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <Bot size={24} />
          </div>

          <div>
            <h3 className="text-xl font-black">Chatbot gerencial IA</h3>
            <p className="text-sm text-blue-100">
              Resumen ejecutivo generado desde funciones de la base de datos.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white/15 p-4 text-sm leading-6 backdrop-blur">
          {resumenChatbot.length === 0 ? (
            <p>No hay resumen disponible.</p>
          ) : (
            resumenChatbot.map((item, index) => (
              <p key={index}>{valorLegible(item.resumen ?? item.resultado ?? item)}</p>
            ))
          )}
        </div>
      </article>

      <TablaIA
        titulo="Alertas pendientes de IA"
        descripcion="Alertas generadas por reglas, riesgo, fraude, stock o seguridad."
        filas={alertas}
        columnasPreferidas={[
          'fecha',
          'severidad',
          'tipo',
          'descripcion',
          'id_sucursal',
          'id_usuario',
          'id_venta',
          'atendida',
        ]}
      />

      <TablaIA
        titulo="Panel avanzado de IA"
        descripcion="Vista consolidada con predicciones, riesgo, modelos y resultados."
        filas={panelAvanzado}
      />

      <TablaIA
        titulo="Resumen IA gerencial"
        descripcion="Respuesta estructurada del chatbot gerencial."
        filas={resumenChatbot}
      />
      <PanelAlertasIA />
    </div>
    
  );
}