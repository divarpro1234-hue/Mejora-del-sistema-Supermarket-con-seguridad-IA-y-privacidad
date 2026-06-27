'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FileWarning,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
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

function claseEstado(estado: string) {
  const e = estado.toUpperCase();

  if (e.includes('RESUELTA') || e.includes('APROBADA') || e.includes('COMPLETADA')) {
    return 'bg-green-100 text-green-700 border-green-200';
  }

  if (e.includes('REVISION') || e.includes('PENDIENTE')) {
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  }

  if (e.includes('RECHAZADA') || e.includes('ERROR')) {
    return 'bg-red-100 text-red-700 border-red-200';
  }

  return 'bg-slate-100 text-slate-700 border-slate-200';
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
              {filas.slice(0, 20).map((fila, index) => (
                <tr key={index} className="hover:bg-orange-50/40">
                  {columnas.map((columna) => {
                    const valor = valorLegible(fila[columna]);

                    return (
                      <td
                        key={columna}
                        className="max-w-[320px] truncate border-b px-4 py-3"
                        title={valor}
                      >
                        {columna.toLowerCase().includes('estado') ? (
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-black ${claseEstado(
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

function TarjetaPrivacidad({
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

export default function PanelPrivacidadCumplimiento() {
  const [retencion, setRetencion] = useState<Registro[]>([]);
  const [solicitudes, setSolicitudes] = useState<Registro[]>([]);
  const [anonimizaciones, setAnonimizaciones] = useState<Registro[]>([]);
  const [evaluacionClientes, setEvaluacionClientes] = useState<Registro[]>([]);

  const [busqueda, setBusqueda] = useState('');
  const [tipoSolicitud, setTipoSolicitud] = useState('ACCESO');
  const [motivo, setMotivo] = useState('Solicitud registrada desde el panel empresarial.');
  const [cargando, setCargando] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  async function cargarPrivacidad() {
    try {
      setCargando(true);
      setError('');
      setMensaje('');

      const [
        resRetencion,
        resSolicitudes,
        resAnonimizaciones,
        resEvaluacionClientes,
      ] = await Promise.all([
        fetch(`${API_URL}/privacidad/retencion`),
        fetch(`${API_URL}/privacidad/solicitudes`),
        fetch(`${API_URL}/privacidad/anonimizaciones`),
        fetch(`${API_URL}/privacidad/evaluar-clientes`),
      ]);

      if (
        !resRetencion.ok ||
        !resSolicitudes.ok ||
        !resAnonimizaciones.ok ||
        !resEvaluacionClientes.ok
      ) {
        throw new Error('No se pudieron cargar datos de privacidad.');
      }

      setRetencion(normalizar(await resRetencion.json()));
      setSolicitudes(normalizar(await resSolicitudes.json()));
      setAnonimizaciones(normalizar(await resAnonimizaciones.json()));
      setEvaluacionClientes(normalizar(await resEvaluacionClientes.json()));
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el panel de privacidad.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarPrivacidad();
  }, []);

  const solicitudesFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    if (!q) return solicitudes;

    return solicitudes.filter((fila) =>
      Object.values(fila).some((valor) =>
        String(valor ?? '').toLowerCase().includes(q),
      ),
    );
  }, [solicitudes, busqueda]);

  const metricas = useMemo(() => {
    const pendientes = solicitudes.filter((fila) => {
      const estado = texto(fila, 'estado').toUpperCase();
      return estado.includes('PENDIENTE') || estado.includes('REVISION');
    }).length;

    const resueltas = solicitudes.filter((fila) => {
      const estado = texto(fila, 'estado').toUpperCase();
      return estado.includes('RESUELTA') || estado.includes('COMPLETADA');
    }).length;

    return {
      politicas: retencion.length,
      solicitudes: solicitudes.length,
      pendientes,
      resueltas,
      anonimizaciones: anonimizaciones.length,
      evaluados: evaluacionClientes.length,
    };
  }, [retencion, solicitudes, anonimizaciones, evaluacionClientes]);

  async function registrarSolicitud() {
    try {
      setRegistrando(true);
      setMensaje('');
      setError('');

      const respuesta = await fetch(`${API_URL}/privacidad/solicitudes/registrar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: tipoSolicitud,
          motivo,
        }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.message || 'No se pudo registrar la solicitud.');
      }

      setMensaje('Solicitud de privacidad registrada correctamente.');
      setMotivo('Solicitud registrada desde el panel empresarial.');
      await cargarPrivacidad();
    } catch (err) {
      console.error(err);
      setError('No se pudo registrar la solicitud de privacidad.');
    } finally {
      setRegistrando(false);
    }
  }

  if (cargando) {
    return (
      <div className="rounded-3xl border bg-white p-8 text-center font-black text-slate-500">
        Cargando privacidad y cumplimiento...
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
          Privacidad y cumplimiento de datos
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Retención, solicitudes de privacidad, evaluación de clientes y anonimización.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TarjetaPrivacidad
          titulo="Solicitudes"
          valor={metricas.solicitudes}
          descripcion="Solicitudes registradas"
          icono={<FileWarning size={24} />}
        />

        <TarjetaPrivacidad
          titulo="Pendientes"
          valor={metricas.pendientes}
          descripcion="En revisión o pendientes"
          icono={<UserCheck size={24} />}
        />

        <TarjetaPrivacidad
          titulo="Anonimizaciones"
          valor={metricas.anonimizaciones}
          descripcion="Procesos registrados"
          icono={<UserX size={24} />}
        />

        <TarjetaPrivacidad
          titulo="Políticas"
          valor={metricas.politicas}
          descripcion="Reglas de retención"
          icono={<ShieldCheck size={24} />}
        />
      </div>

      <article className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Registrar solicitud de privacidad
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Crea una solicitud de acceso, rectificación, supresión u oposición.
            </p>
          </div>

          <button
            onClick={cargarPrivacidad}
            className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
          >
            <RefreshCcw size={16} />
            Actualizar
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto]">
          <select
            value={tipoSolicitud}
            onChange={(e) => setTipoSolicitud(e.target.value)}
            className="rounded-2xl border bg-white px-4 py-3 text-sm font-bold outline-none"
          >
            <option value="ACCESO">ACCESO</option>
            <option value="RECTIFICACION">RECTIFICACION</option>
            <option value="SUPRESION">SUPRESION</option>
            <option value="OPOSICION">OPOSICION</option>
          </select>

          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-semibold outline-none"
            placeholder="Motivo de la solicitud..."
          />

          <button
            onClick={registrarSolicitud}
            disabled={registrando}
            className="rounded-2xl bg-orange-600 px-5 py-3 text-sm font-black text-white hover:bg-orange-700 disabled:opacity-60"
          >
            {registrando ? 'Registrando...' : 'Registrar'}
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
          Buscar solicitudes
        </h3>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border bg-slate-50 px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente, tipo, estado o motivo..."
            className="w-full bg-transparent text-sm font-semibold outline-none"
          />
        </div>
      </article>

      <TablaPrivacidad
        titulo="Solicitudes de privacidad"
        descripcion="Registro de solicitudes relacionadas con datos personales."
        filas={solicitudesFiltradas}
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
        titulo="Políticas de retención"
        descripcion="Tiempo de conservación y reglas de eliminación lógica o anonimización."
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
        titulo="Evaluación de clientes"
        descripcion="Clientes evaluados para retención, anonimización o control de cumplimiento."
        filas={evaluacionClientes}
        columnasPreferidas={[
            'id_cliente',
            'cliente',
            'ultima_compra',
            'recomendacion',
        ]}
      />

      <TablaPrivacidad
        titulo="Anonimizaciones"
        descripcion="Historial de procesos de anonimización ejecutados o registrados."
        filas={anonimizaciones}
        columnasPreferidas={[
            'id_anonimizacion',
            'id_cliente',
            'cliente',
            'fecha',
            'motivo',
            'estado',
            'usuario_app',
         ]}
      />
    </section>
  );
}