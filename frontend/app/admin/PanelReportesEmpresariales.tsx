'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  RefreshCcw,
  Search,
  ShieldCheck,
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

function numero(valor: unknown) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function TablaReporte({
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
              {filas.slice(0, 20).map((fila, index) => (
                <tr key={index} className="hover:bg-orange-50/40">
                  {columnas.map((columna) => (
                    <td
                      key={columna}
                      className="max-w-[320px] truncate border-b px-4 py-3"
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

function TarjetaReporte({
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

export default function PanelReportesEmpresariales() {
  const [ventasDiarias, setVentasDiarias] = useState<Registro[]>([]);
  const [inventarioCritico, setInventarioCritico] = useState<Registro[]>([]);
  const [alertasIA, setAlertasIA] = useState<Registro[]>([]);
  const [privacidad, setPrivacidad] = useState<Registro[]>([]);
  const [monitoreo, setMonitoreo] = useState<Registro[]>([]);
  const [cumplimiento, setCumplimiento] = useState<Registro[]>([]);
  const [historial, setHistorial] = useState<Registro[]>([]);

  const [busqueda, setBusqueda] = useState('');
  const [tipoReporte, setTipoReporte] = useState('VENTAS_DIARIAS');
  const [cargando, setCargando] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  async function cargarReportes() {
    try {
      setCargando(true);
      setError('');
      setMensaje('');

      const [
        resVentas,
        resInventario,
        resAlertas,
        resPrivacidad,
        resMonitoreo,
        resCumplimiento,
        resHistorial,
      ] = await Promise.all([
        fetch(`${API_URL}/reportes/ventas-diarias`),
        fetch(`${API_URL}/reportes/inventario-critico`),
        fetch(`${API_URL}/reportes/alertas-ia`),
        fetch(`${API_URL}/reportes/privacidad-retencion`),
        fetch(`${API_URL}/reportes/monitoreo-seguridad`),
        fetch(`${API_URL}/reportes/cumplimiento-seguridad`),
        fetch(`${API_URL}/reportes/historial`),
      ]);

      if (
        !resVentas.ok ||
        !resInventario.ok ||
        !resAlertas.ok ||
        !resPrivacidad.ok ||
        !resMonitoreo.ok ||
        !resCumplimiento.ok ||
        !resHistorial.ok
      ) {
        throw new Error('No se pudieron cargar todos los reportes.');
      }

      setVentasDiarias(normalizar(await resVentas.json()));
      setInventarioCritico(normalizar(await resInventario.json()));
      setAlertasIA(normalizar(await resAlertas.json()));
      setPrivacidad(normalizar(await resPrivacidad.json()));
      setMonitoreo(normalizar(await resMonitoreo.json()));
      setCumplimiento(normalizar(await resCumplimiento.json()));
      setHistorial(normalizar(await resHistorial.json()));
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el panel de reportes empresariales.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarReportes();
  }, []);

  const historialFiltrado = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    if (!q) return historial;

    return historial.filter((fila) =>
      Object.values(fila).some((valor) =>
        String(valor ?? '').toLowerCase().includes(q),
      ),
    );
  }, [historial, busqueda]);

  const metricas = useMemo(() => {
    const totalVentas = ventasDiarias.reduce((total, fila) => {
      return (
        total +
        numero(fila.total_vendido) +
        numero(fila.total) +
        numero(fila.monto_total)
        );
    }, 0);

    return {
      reportesGenerados: historial.length,
      ventasDiarias: ventasDiarias.length,
      inventarioCritico: inventarioCritico.length,
      alertasIA: alertasIA.length,
      totalVentas,
    };
  }, [historial, ventasDiarias, inventarioCritico, alertasIA]);

  async function registrarReporte() {
    try {
      setRegistrando(true);
      setMensaje('');
      setError('');

      const respuesta = await fetch(`${API_URL}/reportes/registrar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: tipoReporte,
          formato: 'PDF',
          parametros: {
            origen: 'PANEL_EMPRESARIAL',
            generado_desde: 'frontend',
          },
          confidencial: true,
        }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.message || 'No se pudo registrar el reporte.');
      }

      setMensaje('Reporte registrado correctamente en el historial.');
      await cargarReportes();
    } catch (err) {
      console.error(err);
      setError('No se pudo registrar el reporte.');
    } finally {
      setRegistrando(false);
    }
  }

  if (cargando) {
    return (
      <div className="rounded-3xl border bg-white p-8 text-center font-black text-slate-500">
        Cargando reportes empresariales...
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
          Reportes empresariales
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Ventas, inventario crítico, IA, privacidad, monitoreo y cumplimiento.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TarjetaReporte
          titulo="Historial"
          valor={metricas.reportesGenerados}
          descripcion="Reportes registrados"
          icono={<FileText size={24} />}
        />

        <TarjetaReporte
          titulo="Ventas"
          valor={metricas.ventasDiarias}
          descripcion="Registros de ventas diarias"
          icono={<BarChart3 size={24} />}
        />

        <TarjetaReporte
          titulo="Inventario crítico"
          valor={metricas.inventarioCritico}
          descripcion="Productos en estado crítico"
          icono={<ClipboardCheck size={24} />}
        />

        <TarjetaReporte
          titulo="Alertas IA"
          valor={metricas.alertasIA}
          descripcion="Alertas reportadas"
          icono={<ShieldCheck size={24} />}
        />
      </div>

      <article className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Registrar reporte
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Genera una entrada en el historial de reportes empresariales.
            </p>
          </div>

          <button
            onClick={cargarReportes}
            className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
          >
            <RefreshCcw size={16} />
            Actualizar
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <select
            value={tipoReporte}
            onChange={(e) => setTipoReporte(e.target.value)}
            className="rounded-2xl border bg-white px-4 py-3 text-sm font-bold outline-none"
          >
            <option value="VENTAS_DIARIAS">VENTAS_DIARIAS</option>
            <option value="INVENTARIO_CRITICO">INVENTARIO_CRITICO</option>
            <option value="ALERTAS_IA">ALERTAS_IA</option>
            <option value="PRIVACIDAD_RETENCION">PRIVACIDAD_RETENCION</option>
            <option value="MONITOREO_SEGURIDAD">MONITOREO_SEGURIDAD</option>
            <option value="CUMPLIMIENTO_SEGURIDAD">CUMPLIMIENTO_SEGURIDAD</option>
          </select>

          <button
            onClick={registrarReporte}
            disabled={registrando}
            className="rounded-2xl bg-orange-600 px-5 py-3 text-sm font-black text-white hover:bg-orange-700 disabled:opacity-60"
          >
            {registrando ? 'Registrando...' : 'Registrar reporte'}
          </button>
        </div>

        {mensaje && (
          <div className="mt-3 rounded-2xl bg-green-50 p-3 text-sm font-bold text-green-700">
            {mensaje}
          </div>
        )}
      </article>

      <article className="rounded-3xl border bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-slate-900">
          Buscar en historial
        </h3>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border bg-slate-50 px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por tipo, formato, usuario, estado o fecha..."
            className="w-full bg-transparent text-sm font-semibold outline-none"
          />
        </div>
      </article>

      <TablaReporte
        titulo="Historial de reportes generados"
        descripcion="Reportes registrados desde el sistema."
        filas={historialFiltrado}
        columnasPreferidas={[
            'id_reporte',
            'fecha',
            'tipo',
            'formato',
            'usuario_app',
            'rol_app',
            'id_sucursal',
            'confidencial',
            'parametros',
            'hash_reporte',
        ]}
        />

      <TablaReporte
        titulo="Reporte de ventas diarias"
        descripcion="Información comercial de ventas registradas."
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

      <TablaReporte
        titulo="Reporte de inventario crítico"
        descripcion="Productos que requieren atención por bajo stock."
        filas={inventarioCritico}
        columnasPreferidas={[
          'sucursal',
          'producto',
          'categoria',
          'stock_actual',
          'stock_minimo',
          'estado_stock',
          'ubicacion',
        ]}
      />

      <TablaReporte
        titulo="Reporte de alertas IA"
        descripcion="Alertas inteligentes generadas por reglas de riesgo."
        filas={alertasIA}
        columnasPreferidas={[
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

      <TablaReporte
        titulo="Reporte de privacidad y retención"
        descripcion="Control de datos personales, anonimización y retención."
        filas={privacidad}
        columnasPreferidas={[
          'cliente',
          'tipo',
          'estado',
          'fecha_solicitud',
          'fecha_resolucion',
          'motivo',
        ]}
      />

      <TablaReporte
        titulo="Reporte de monitoreo de seguridad"
        descripcion="Indicadores operativos de monitoreo."
        filas={monitoreo}
        columnasPreferidas={[
            'indicador',
            'valor',
            'unidad',
            'actualizado',
            ]}
      />

      <TablaReporte
        titulo="Reporte de cumplimiento de seguridad"
        descripcion="Controles, evidencias y estado de cumplimiento."
        filas={cumplimiento}
        columnasPreferidas={[
            'codigo',
            'categoria',
            'nombre',
            'nivel_criticidad',
            'estado',
            'responsable',
            'evidencia',
            'updated_at',
            ]}
      />
    </section>
  );
}