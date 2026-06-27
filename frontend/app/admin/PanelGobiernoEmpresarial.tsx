'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  GitBranch,
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

function claseEstado(estado: string) {
  const e = estado.toUpperCase();

  if (e.includes('IMPLEMENTADO') || e.includes('ACTIVO') || e.includes('APROBADO')) {
    return 'bg-green-100 text-green-700 border-green-200';
  }

  if (e.includes('PENDIENTE') || e.includes('PROCESO')) {
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  }

  if (e.includes('CRITICO') || e.includes('ERROR') || e.includes('FALLIDO')) {
    return 'bg-red-100 text-red-700 border-red-200';
  }

  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function TablaGobierno({
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
                        {columna.toLowerCase().includes('estado') ||
                            columna.toLowerCase().includes('criticidad') ||
                            columna.toLowerCase().includes('nivel_criticidad') ||
                            columna.toLowerCase().includes('criticidad_maxima') ? (
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

function TarjetaGobierno({
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

export default function PanelGobiernoEmpresarial() {
  const [controles, setControles] = useState<Registro[]>([]);
  const [ambientes, setAmbientes] = useState<Registro[]>([]);
  const [versiones, setVersiones] = useState<Registro[]>([]);
  const [postura, setPostura] = useState<Registro[]>([]);
  const [resumenPostura, setResumenPostura] = useState<Registro[]>([]);

  const [busqueda, setBusqueda] = useState('');
  const [codigoControl, setCodigoControl] = useState('SEC-007');
  const [estadoControl, setEstadoControl] = useState('IMPLEMENTADO');
  const [evidenciaControl, setEvidenciaControl] = useState(
    'Control actualizado desde el panel de gobierno empresarial.',
  );

  const [versionNombre, setVersionNombre] = useState('v1.0.1-panel');
  const [versionDescripcion, setVersionDescripcion] = useState(
    'Versión registrada desde el frontend empresarial.',
  );

  const [cargando, setCargando] = useState(true);
  const [guardandoControl, setGuardandoControl] = useState(false);
  const [guardandoVersion, setGuardandoVersion] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  async function cargarGobierno() {
    try {
      setCargando(true);
      setError('');
      setMensaje('');

      const [
        resControles,
        resAmbientes,
        resVersiones,
        resPostura,
        resResumenPostura,
      ] = await Promise.all([
        fetch(`${API_URL}/gobierno/controles`),
        fetch(`${API_URL}/gobierno/ambientes`),
        fetch(`${API_URL}/gobierno/versiones`),
        fetch(`${API_URL}/gobierno/postura`),
        fetch(`${API_URL}/gobierno/resumen-postura`),
      ]);

      if (
        !resControles.ok ||
        !resAmbientes.ok ||
        !resVersiones.ok ||
        !resPostura.ok ||
        !resResumenPostura.ok
      ) {
        throw new Error('No se pudieron cargar datos de gobierno.');
      }

      const controlesData = normalizar(await resControles.json());

      setControles(controlesData);
      setAmbientes(normalizar(await resAmbientes.json()));
      setVersiones(normalizar(await resVersiones.json()));
      setPostura(normalizar(await resPostura.json()));
      setResumenPostura(normalizar(await resResumenPostura.json()));

      const primerCodigo = controlesData
        .map((control) => texto(control, 'codigo'))
        .find((codigo) => codigo.trim().length > 0);

      if (primerCodigo) {
        setCodigoControl(primerCodigo);
      }
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el panel de gobierno empresarial.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarGobierno();
  }, []);

  const controlesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    if (!q) return controles;

    return controles.filter((fila) =>
      Object.values(fila).some((valor) =>
        String(valor ?? '').toLowerCase().includes(q),
      ),
    );
  }, [controles, busqueda]);

  const metricas = useMemo(() => {
    const implementados = controles.filter((fila) =>
      texto(fila, 'estado').toUpperCase().includes('IMPLEMENTADO'),
    ).length;

    const pendientes = controles.filter((fila) =>
      texto(fila, 'estado').toUpperCase().includes('PENDIENTE'),
    ).length;

    const criticosPendientes = controles.filter((fila) => {
      const estado = texto(fila, 'estado').toUpperCase();
      const criticidad = texto(fila, 'nivel_criticidad').toUpperCase();

      return estado.includes('PENDIENTE') && criticidad.includes('CRITICA');
    }).length;

    const avance =
      controles.length > 0 ? (implementados / controles.length) * 100 : 0;

    return {
      controles: controles.length,
      implementados,
      pendientes,
      criticosPendientes,
      avance,
      ambientes: ambientes.length,
      versiones: versiones.length,
    };
  }, [controles, ambientes, versiones]);

  async function actualizarControl() {
    try {
      setGuardandoControl(true);
      setMensaje('');
      setError('');

      const respuesta = await fetch(`${API_URL}/gobierno/control/actualizar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codigo: codigoControl,
          estado: estadoControl,
          evidencia: evidenciaControl,
        }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.message || 'No se pudo actualizar el control.');
      }

      setMensaje('Control de gobierno actualizado correctamente.');
      await cargarGobierno();
    } catch (err) {
      console.error(err);
      setError('No se pudo actualizar el control de gobierno.');
    } finally {
      setGuardandoControl(false);
    }
  }

  async function registrarVersion() {
    try {
      setGuardandoVersion(true);
      setMensaje('');
      setError('');

      const respuesta = await fetch(`${API_URL}/gobierno/versiones/registrar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: versionNombre,
          descripcion: versionDescripcion,
          modulo: 'gov',
          ambiente: 'PRODUCCION',
        }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.message || 'No se pudo registrar la versión.');
      }

      setMensaje('Versión de gobierno registrada correctamente.');
      await cargarGobierno();
    } catch (err) {
      console.error(err);
      setError('No se pudo registrar la versión.');
    } finally {
      setGuardandoVersion(false);
    }
  }

  if (cargando) {
    return (
      <div className="rounded-3xl border bg-white p-8 text-center font-black text-slate-500">
        Cargando gobierno empresarial...
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
          Gobierno empresarial
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Controles, ambientes, versionamiento y postura de cumplimiento.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TarjetaGobierno
          titulo="Controles"
          valor={metricas.controles}
          descripcion="Controles definidos"
          icono={<ShieldCheck size={24} />}
        />

        <TarjetaGobierno
          titulo="Implementados"
          valor={metricas.implementados}
          descripcion="Controles cumplidos"
          icono={<CheckCircle2 size={24} />}
        />

        <TarjetaGobierno
          titulo="Pendientes"
          valor={metricas.pendientes}
          descripcion={`${metricas.criticosPendientes} críticos pendientes`}
          icono={<Building2 size={24} />}
        />

        <TarjetaGobierno
          titulo="Avance"
          valor={`${metricas.avance.toFixed(2)}%`}
          descripcion={`${metricas.ambientes} ambientes · ${metricas.versiones} versiones`}
          icono={<GitBranch size={24} />}
        />
      </div>

      <article className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Actualizar control
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Cambia el estado de un control y registra evidencia.
            </p>
          </div>

          <button
            onClick={cargarGobierno}
            className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
          >
            <RefreshCcw size={16} />
            Actualizar
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[220px_220px_1fr_auto]">
          <select
            value={codigoControl}
            onChange={(e) => setCodigoControl(e.target.value)}
            className="rounded-2xl border bg-white px-4 py-3 text-sm font-bold outline-none"
          >
            {controles.map((control, index) => {
              const codigo = texto(control, 'codigo') || `CONTROL-${index}`;

              return (
                <option key={`${codigo}-${index}`} value={codigo}>
                  {codigo}
                </option>
              );
            })}
          </select>

          <select
            value={estadoControl}
            onChange={(e) => setEstadoControl(e.target.value)}
            className="rounded-2xl border bg-white px-4 py-3 text-sm font-bold outline-none"
          >
            <option value="IMPLEMENTADO">IMPLEMENTADO</option>
            <option value="PENDIENTE">PENDIENTE</option>
            <option value="EN_PROCESO">EN_PROCESO</option>
          </select>

          <input
            value={evidenciaControl}
            onChange={(e) => setEvidenciaControl(e.target.value)}
            className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-semibold outline-none"
            placeholder="Evidencia del control..."
          />

          <button
            onClick={actualizarControl}
            disabled={guardandoControl}
            className="rounded-2xl bg-orange-600 px-5 py-3 text-sm font-black text-white hover:bg-orange-700 disabled:opacity-60"
          >
            {guardandoControl ? 'Guardando...' : 'Actualizar'}
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
          Registrar nueva versión
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Registra una versión lógica del sistema, base de datos o módulo empresarial.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-[240px_1fr_auto]">
          <input
            value={versionNombre}
            onChange={(e) => setVersionNombre(e.target.value)}
            className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-semibold outline-none"
            placeholder="Ej: v1.0.2"
          />

          <input
            value={versionDescripcion}
            onChange={(e) => setVersionDescripcion(e.target.value)}
            className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-semibold outline-none"
            placeholder="Descripción de la versión..."
          />

          <button
            onClick={registrarVersion}
            disabled={guardandoVersion}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {guardandoVersion ? 'Registrando...' : 'Registrar versión'}
          </button>
        </div>
      </article>

      <article className="rounded-3xl border bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-slate-900">
          Buscar controles
        </h3>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border bg-slate-50 px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código, control, categoría, estado o criticidad..."
            className="w-full bg-transparent text-sm font-semibold outline-none"
          />
        </div>
      </article>

      <TablaGobierno
        titulo="Controles de gobierno"
        descripcion="Controles críticos, evidencias y estado de implementación."
        filas={controlesFiltrados}
        columnasPreferidas={[
            'categoria',
            'codigo',
            'nombre',
            'nivel_criticidad',
            'estado',
            'responsable',
            'evidencia',
            'updated_at',
            ]}
      />

      <TablaGobierno
        titulo="Postura de gobierno"
        descripcion="Resumen general de postura de cumplimiento y seguridad."
        filas={postura}
        columnasPreferidas={[
            'categoria',
            'total_controles',
            'implementados',
            'pendientes',
            'criticidad_maxima',
            'porcentaje_avance',
            ]}
      />

      <TablaGobierno
        titulo="Resumen de postura"
        descripcion="Indicadores agregados de cumplimiento empresarial."
        filas={resumenPostura}
        columnasPreferidas={[
            'categoria',
            'total_controles',
            'implementados',
            'pendientes',
            'criticidad_maxima',
            'porcentaje_avance',
            ]}
      />

      <TablaGobierno
        titulo="Ambientes"
        descripcion="Ambientes controlados para operación, pruebas y despliegue."
        filas={ambientes}
        columnasPreferidas={[
            'id_ambiente',
            'nombre',
            'descripcion',
            'permite_datos_reales',
            'requiere_tls',
            'requiere_backup',
            'activo',
            'created_at',
            ]}
      />

      <TablaGobierno
        titulo="Versiones"
        descripcion="Historial de versiones registradas."
        filas={versiones}
        columnasPreferidas={[
            'id_version',
            'version',
            'descripcion',
            'aplicado_por',
            'hash_script',
            'fecha_aplicacion',
            ]}
      />
    </section>
  );
}