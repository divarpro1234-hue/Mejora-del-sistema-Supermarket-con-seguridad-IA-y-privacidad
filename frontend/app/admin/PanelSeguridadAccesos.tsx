'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  KeyRound,
  LockKeyhole,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserCheck,
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

function claseEstado(valor: string) {
  const v = valor.toUpperCase();

  if (v.includes('ACTIVA') || v.includes('VIGENTE') || v.includes('TRUE')) {
    return 'bg-green-100 text-green-700 border-green-200';
  }

  if (v.includes('INACTIVA') || v.includes('FALSE') || v.includes('NO_CONFIGURADO')) {
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  }

  if (v.includes('BLOQUEADO') || v.includes('EXPIRADO') || v.includes('CRITICA')) {
    return 'bg-red-100 text-red-700 border-red-200';
  }

  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function TablaSeguridad({
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
                        className="max-w-[340px] truncate border-b px-4 py-3"
                        title={valor}
                      >
                        {columna.toLowerCase().includes('estado') ||
                        columna.toLowerCase().includes('activo') ||
                        columna.toLowerCase().includes('metodo') ? (
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

function TarjetaSeguridad({
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

export default function PanelSeguridadAccesos() {
  const [mfa, setMfa] = useState<Registro[]>([]);
  const [sesiones, setSesiones] = useState<Registro[]>([]);
  const [rotaciones, setRotaciones] = useState<Registro[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  async function cargarSeguridadAccesos() {
    try {
      setCargando(true);
      setError('');

      const [resMfa, resSesiones, resRotaciones] = await Promise.all([
        fetch(`${API_URL}/seguridad/mfa`),
        fetch(`${API_URL}/seguridad/sesiones`),
        fetch(`${API_URL}/seguridad/rotaciones-secretos`),
      ]);

      if (!resMfa.ok || !resSesiones.ok || !resRotaciones.ok) {
        throw new Error('No se pudieron cargar MFA, sesiones o rotaciones.');
      }

      setMfa(normalizar(await resMfa.json()));
      setSesiones(normalizar(await resSesiones.json()));
      setRotaciones(normalizar(await resRotaciones.json()));
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el panel de accesos seguros.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarSeguridadAccesos();
  }, []);

  const mfaFiltrado = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    if (!q) return mfa;

    return mfa.filter((fila) =>
      Object.values(fila).some((valor) =>
        String(valor ?? '').toLowerCase().includes(q),
      ),
    );
  }, [mfa, busqueda]);

  const metricas = useMemo(() => {
    const usuariosMfa = mfa.filter((fila) => texto(fila, 'activo') === 'true').length;
    const usuariosSinMfa = mfa.length - usuariosMfa;
    const sesionesActivas = sesiones.filter(
      (fila) => texto(fila, 'estado').toUpperCase() === 'ACTIVA',
    ).length;

    return {
      usuarios: mfa.length,
      usuariosMfa,
      usuariosSinMfa,
      sesionesActivas,
      rotaciones: rotaciones.length,
    };
  }, [mfa, sesiones, rotaciones]);

  if (cargando) {
    return (
      <div className="rounded-3xl border bg-white p-8 text-center font-black text-slate-500">
        Cargando accesos seguros...
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
          Accesos seguros y MFA
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Usuarios con doble factor, sesiones activas y rotación de secretos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TarjetaSeguridad
          titulo="Usuarios"
          valor={metricas.usuarios}
          descripcion="Usuarios evaluados"
          icono={<UserCheck size={24} />}
        />

        <TarjetaSeguridad
          titulo="MFA activo"
          valor={metricas.usuariosMfa}
          descripcion="Usuarios protegidos"
          icono={<ShieldCheck size={24} />}
        />

        <TarjetaSeguridad
          titulo="Sin MFA"
          valor={metricas.usuariosSinMfa}
          descripcion="Usuarios pendientes"
          icono={<LockKeyhole size={24} />}
        />

        <TarjetaSeguridad
          titulo="Sesiones"
          valor={metricas.sesionesActivas}
          descripcion="Sesiones activas"
          icono={<KeyRound size={24} />}
        />
      </div>

      <article className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Buscar usuarios MFA
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Busca por usuario, rol, sucursal, método o estado.
            </p>
          </div>

          <button
            onClick={cargarSeguridadAccesos}
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
            placeholder="Buscar usuario, rol, sucursal o método..."
            className="w-full bg-transparent text-sm font-semibold outline-none"
          />
        </div>
      </article>

      <TablaSeguridad
        titulo="Usuarios MFA"
        descripcion="Usuarios con método de doble factor configurado o pendiente."
        filas={mfaFiltrado}
        columnasPreferidas={[
          'username',
          'nombre_completo',
          'rol',
          'sucursal',
          'metodo',
          'activo',
          'codigo_expira_en',
          'ultimo_uso_en',
        ]}
      />

      <TablaSeguridad
        titulo="Sesiones activas"
        descripcion="Sesiones abiertas registradas por el sistema de autenticación."
        filas={sesiones}
        columnasPreferidas={[
          'id_sesion',
          'username',
          'rol',
          'sucursal',
          'ip',
          'inicio_en',
          'ultimo_uso_en',
          'estado',
        ]}
      />

      <TablaSeguridad
        titulo="Rotaciones de secretos"
        descripcion="Historial de rotación de claves y secretos. Puede aparecer vacío si aún no se registraron rotaciones."
        filas={rotaciones}
        columnasPreferidas={[
          'id_rotacion',
          'nombre',
          'proveedor',
          'fecha_rotacion',
          'rotado_por',
          'estado',
          'observacion',
        ]}
      />
    </section>
  );
}