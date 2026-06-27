'use client';
import PanelReportesEmpresariales from './PanelReportesEmpresariales';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  FileText,
  History,
  PackageSearch,
  Printer,
  ShieldCheck,
  ShoppingCart,
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

function normalizarRespuesta(data: unknown): Registro[] {
  if (Array.isArray(data)) return data as Registro[];
  if (data && typeof data === 'object') return [data as Registro];
  return [{ resultado: data }];
}

function TarjetaReporte({
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

function TablaReportes({
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
        <div>
          <h3 className="text-lg font-black text-slate-900">{titulo}</h3>
          <p className="mt-1 text-sm text-slate-500">{descripcion}</p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
        >
          <Printer size={16} />
          Imprimir
        </button>
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

export default function ModuloReportes() {
  const [ventasDiarias, setVentasDiarias] = useState<Registro[]>([]);
  const [inventarioCritico, setInventarioCritico] = useState<Registro[]>([]);
  const [seguridad, setSeguridad] = useState<Registro[]>([]);
  const [alertasIA, setAlertasIA] = useState<Registro[]>([]);
  const [cumplimiento, setCumplimiento] = useState<Registro[]>([]);
  const [privacidad, setPrivacidad] = useState<Registro[]>([]);
  const [monitoreo, setMonitoreo] = useState<Registro[]>([]);
  const [haBackups, setHaBackups] = useState<Registro[]>([]);
  const [historial, setHistorial] = useState<Registro[]>([]);
  const [registrando, setRegistrando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargarModuloReportes() {
      try {
        const [
          resVentas,
          resInventario,
          resSeguridad,
          resAlertas,
          resCumplimiento,
          resPrivacidad,
          resMonitoreo,
          resHa,
          resHistorial,
        ] = await Promise.all([
          fetch(`${API_URL}/reportes/ventas-diarias`),
          fetch(`${API_URL}/reportes/inventario-critico`),
          fetch(`${API_URL}/seguridad/reporte`),
          fetch(`${API_URL}/reportes/alertas-ia`),
          fetch(`${API_URL}/reportes/cumplimiento-seguridad`),
          fetch(`${API_URL}/reportes/privacidad-retencion`),
          fetch(`${API_URL}/reportes/monitoreo-seguridad`),
          fetch(`${API_URL}/backups/ha`),
          fetch(`${API_URL}/reportes/historial`),
        ]);

        setVentasDiarias(normalizarRespuesta(await resVentas.json()));
        setInventarioCritico(normalizarRespuesta(await resInventario.json()));
        setSeguridad(normalizarRespuesta(await resSeguridad.json()));
        setAlertasIA(normalizarRespuesta(await resAlertas.json()));
        setCumplimiento(normalizarRespuesta(await resCumplimiento.json()));
        setPrivacidad(normalizarRespuesta(await resPrivacidad.json()));
        setMonitoreo(normalizarRespuesta(await resMonitoreo.json()));
        setHaBackups(normalizarRespuesta(await resHa.json()));
        setHistorial(normalizarRespuesta(await resHistorial.json()));
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar los reportes.');
      } finally {
        setCargando(false);
      }
    }

    cargarModuloReportes();
  }, []);

  const metricas = useMemo(() => {
    return {
      reportesDisponibles: 8,
      ventas: ventasDiarias.length,
      inventarioCritico: inventarioCritico.length,
      seguridad: seguridad.length,
      alertasIA: alertasIA.length,
      cumplimiento: cumplimiento.length,
      historial: historial.length,
    };
  }, [
    ventasDiarias,
    inventarioCritico,
    seguridad,
    alertasIA,
    cumplimiento,
    historial,
  ]);

  async function registrarReporte(tipo: string) {
    setRegistrando(true);
    setMensaje('');

    try {
      const respuesta = await fetch(`${API_URL}/reportes/registrar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo,
          formato: 'PDF',
          parametros: {
            modulo: 'rpt',
            origen: 'panel_empresarial',
            fecha_generacion_ui: new Date().toISOString(),
          },
          confidencial: true,
        }),
      });

      const data = await respuesta.json();
      setMensaje(`Reporte registrado correctamente: ${valorLegible(data[0]?.id_reporte)}`);

      const nuevoHistorial = await fetch(`${API_URL}/reportes/historial`);
      setHistorial(normalizarRespuesta(await nuevoHistorial.json()));
    } catch (err) {
      console.error(err);
      setMensaje('No se pudo registrar el reporte.');
    } finally {
      setRegistrando(false);
    }
  }

  if (cargando) {
    return (
      <div className="p-8 text-center font-black text-slate-500">
        Cargando módulo Reportes...
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
        <TarjetaReporte
          titulo="Reportes"
          valor={metricas.reportesDisponibles}
          descripcion="Reportes empresariales disponibles"
          icono={<FileText size={24} />}
        />

        <TarjetaReporte
          titulo="Ventas diarias"
          valor={metricas.ventas}
          descripcion="Filas de ventas por día"
          icono={<ShoppingCart size={24} />}
        />

        <TarjetaReporte
          titulo="Inventario crítico"
          valor={metricas.inventarioCritico}
          descripcion="Productos evaluados por stock"
          icono={<PackageSearch size={24} />}
          peligro={metricas.inventarioCritico > 0}
        />

        <TarjetaReporte
          titulo="Alertas IA"
          valor={metricas.alertasIA}
          descripcion="Alertas incluidas en reportes"
          icono={<AlertTriangle size={24} />}
          peligro={metricas.alertasIA > 0}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <TarjetaReporte
          titulo="Seguridad"
          valor={metricas.seguridad}
          descripcion="Intentos y accesos consolidados"
          icono={<ShieldCheck size={24} />}
        />

        <TarjetaReporte
          titulo="Cumplimiento"
          valor={metricas.cumplimiento}
          descripcion="Controles de seguridad evaluados"
          icono={<ClipboardCheck size={24} />}
        />

        <TarjetaReporte
          titulo="Historial"
          valor={metricas.historial}
          descripcion="Reportes registrados/auditados"
          icono={<History size={24} />}
        />
      </section>

      <article className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black">Registro auditado de reportes</h3>
            <p className="mt-1 text-sm text-slate-500">
              Simula la generación de un reporte y registra el evento en `rpt.reportes_generados`.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              disabled={registrando}
              onClick={() => registrarReporte('VENTAS_DIARIAS')}
              className="rounded-2xl bg-orange-600 px-4 py-2 text-sm font-black text-white hover:bg-orange-700 disabled:opacity-60"
            >
              Registrar ventas diarias
            </button>

            <button
              disabled={registrando}
              onClick={() => registrarReporte('INVENTARIO_CRITICO')}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
            >
              Registrar inventario crítico
            </button>
          </div>
        </div>

        {mensaje && (
          <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-700">
            {mensaje}
          </div>
        )}
      </article>

      <TablaReportes
        titulo="Reporte de ventas diarias"
        descripcion="Ventas agrupadas por fecha y sucursal."
        filas={ventasDiarias}
        columnasPreferidas={[
          'fecha',
          'sucursal',
          'cantidad_ventas',
          'subtotal',
          'descuentos',
          'impuestos',
          'total_vendido',
        ]}
      />

      <TablaReportes
        titulo="Reporte de inventario crítico"
        descripcion="Productos evaluados por stock mínimo, máximo y estado."
        filas={inventarioCritico}
        columnasPreferidas={[
          'sucursal',
          'codigo_barra',
          'producto',
          'stock_actual',
          'stock_minimo',
          'stock_maximo',
          'estado_stock',
        ]}
      />

      <TablaReportes
        titulo="Reporte de seguridad"
        descripcion="Logins correctos, fallidos y último intento por usuario e IP."
        filas={seguridad}
        columnasPreferidas={[
          'fecha',
          'username',
          'ip',
          'logins_correctos',
          'logins_fallidos',
          'ultimo_intento',
        ]}
      />

      <TablaReportes
        titulo="Reporte de alertas IA"
        descripcion="Alertas de seguridad y negocio generadas por el sistema inteligente."
        filas={alertasIA}
        columnasPreferidas={[
          'categoria',
          'fecha',
          'nivel',
          'tipo',
          'descripcion',
          'id_sucursal',
          'atendida',
        ]}
      />

      <TablaReportes
        titulo="Reporte de cumplimiento de seguridad"
        descripcion="Controles, criticidad, estado, responsable y evidencia."
        filas={cumplimiento}
        columnasPreferidas={[
          'categoria',
          'codigo',
          'nombre',
          'nivel_criticidad',
          'estado',
          'responsable',
          'evidencia',
        ]}
      />

      <TablaReportes
        titulo="Reporte de privacidad y retención"
        descripcion="Políticas de conservación y tratamiento de datos personales."
        filas={privacidad}
      />

      <TablaReportes
        titulo="Reporte de monitoreo de seguridad"
        descripcion="Indicadores operativos capturados por el módulo de monitoreo."
        filas={monitoreo}
      />

      <TablaReportes
        titulo="Reporte de alta disponibilidad y backups"
        descripcion="Estado consolidado de backups, replicación y alta disponibilidad."
        filas={haBackups}
      />

      <TablaReportes
        titulo="Historial de reportes generados"
        descripcion="Reportes registrados con formato, parámetros, usuario, rol y hash."
        filas={historial}
        columnasPreferidas={[
          'fecha',
          'tipo',
          'formato',
          'usuario_app',
          'rol_app',
          'id_sucursal',
          'confidencial',
          'hash_reporte',
        ]}
      />

      <PanelReportesEmpresariales />
    </div>
  );
}