'use client';
import ModuloSupermercado from './ModuloSupermercado';
import ModuloSeguridad from './ModuloSeguridad';
import ModuloAuditoria from './ModuloAuditoria';
import { useEffect, useMemo, useState } from 'react';
import ModuloOperaciones from './ModuloOperaciones';
import ModuloIA from './ModuloIA';
import ModuloReportes from './ModuloReportes';
import ModuloIntegracion from './ModuloIntegracion';
import ModuloMonitoreo from './ModuloMonitoreo';
import ModuloPrivacidad from './ModuloPrivacidad';
import ModuloQA from './ModuloQA';
import ModuloGobierno from './ModuloGobierno';


import {
  ShieldCheck,
  Package,
  Brain,
  FileText,
  Database,
  Activity,
  Lock,
  ClipboardCheck,
  Server,
  Users,
  BarChart3,
  LogOut,
  Home,
} from 'lucide-react';


type SesionUsuario = {
  exito: boolean;
  accion: string;
  riesgo: string;
  severidad: string;
  mensaje: string;
  id_sesion: string | null;
  username: string;
  fecha_login: string;
};

type Modulo = {
  id: string;
  esquema: string;
  nombre: string;
  descripcion: string;
  endpoint: string;
};

type SesionLocal = {
  username?: string;
  usuario?: string;
  rol?: string;
  role?: string;
  id_sesion?: string;
};

function obtenerUsernameSesion(sesion: SesionLocal | null) {
  return String(sesion?.username || sesion?.usuario || '').toLowerCase();
}

function obtenerRolSesion(sesion: SesionLocal | null) {
  const rolDirecto = String(sesion?.rol || sesion?.role || '').toUpperCase();
  const username = obtenerUsernameSesion(sesion);

  if (rolDirecto) return rolDirecto;

  if (username === 'admin') return 'ADMIN';
  if (username === 'gerente') return 'GERENTE_GENERAL';
  if (username === 'auditor') return 'AUDITOR';
  if (username === 'ia_bot') return 'SISTEMA_IA';
  if (username.startsWith('cajero_')) return 'CAJERO';
  if (username.startsWith('almacen_')) return 'ALMACENERO';

  return 'SIN_ROL';
}

const permisosPorRol: Record<string, string[]> = {
  ADMIN: [
    'app',
    'sec',
    'audit',
    'ai',
    'ops',
    'rpt',
    'integ',
    'mon',
    'privacy',
    'qa',
    'gov',
  ],

  GERENTE_GENERAL: [
    'app',
    'ai',
    'ops',
    'rpt',
    'mon',
    'privacy',
    'gov',
  ],

  AUDITOR: [
    'sec',
    'audit',
    'rpt',
    'mon',
    'privacy',
    'qa',
    'gov',
  ],

  ALMACENERO: ['app'],

  CAJERO: [],

  SISTEMA_IA: [],

  SIN_ROL: [],
};

function obtenerModulosPermitidos(rol: string) {
  return permisosPorRol[rol] || [];
}

const modulos: Modulo[] = [
  {
    id: 'app',
    esquema: 'app',
    nombre: 'Supermercado',
    descripcion: 'Sucursales, productos, inventario, clientes, cajas y ventas.',
    endpoint: 'http://localhost:3000/api/inventario',
  },
  {
    id: 'sec',
    esquema: 'sec',
    nombre: 'Seguridad',
    descripcion: 'Login seguro, firewall lógico, horarios, MFA, secretos y sesiones.',
    endpoint: 'http://localhost:3000/api/seguridad/secretos',
  },
  {
    id: 'audit',
    esquema: 'audit',
    nombre: 'Auditoría',
    descripcion: 'Eventos, cambios, intentos de login e integridad de auditoría.',
    endpoint: 'http://localhost:3000/api/auditoria/eventos',
  },
  {
    id: 'ai',
    esquema: 'ai',
    nombre: 'Inteligencia Artificial',
    descripcion: 'Alertas, riesgo de acceso, fraude, modelos externos y chatbot.',
    endpoint: 'http://localhost:3000/api/ia/alertas',
  },
  {
    id: 'ops',
    esquema: 'ops',
    nombre: 'Backups y Operaciones',
    descripcion: 'Políticas de backup, restauración, retención y alta disponibilidad.',
    endpoint: 'http://localhost:3000/api/backups/cumplimiento',
  },
  {
    id: 'rpt',
    esquema: 'rpt',
    nombre: 'Reportes',
    descripcion: 'Reportes imprimibles de ventas, seguridad, IA, privacidad y backups.',
    endpoint: 'http://localhost:3000/api/reportes/ventas-diarias',
  },
  {
    id: 'integ',
    esquema: 'integ',
    nombre: 'Integración',
    descripcion: 'Fuentes externas, sincronizaciones y preparación para tablas federadas.',
    endpoint: 'http://localhost:3000/api/integracion/fuentes',
  },
  {
    id: 'mon',
    esquema: 'mon',
    nombre: 'Monitoreo',
    descripcion: 'Métricas, umbrales, alertas operacionales y dashboard operativo.',
    endpoint: 'http://localhost:3000/api/monitoreo/dashboard',
    
  },
  {
    id: 'privacy',
    esquema: 'privacy',
    nombre: 'Privacidad',
    descripcion: 'Retención, anonimización y solicitudes sobre datos personales.',
    endpoint: 'http://localhost:3000/api/privacidad/retencion',
  },
  {
    id: 'qa',
    esquema: 'qa',
    nombre: 'Pruebas de Seguridad',
    descripcion: 'Validación de login, firewall, RLS, auditoría, backups e IA.',
    endpoint: 'http://localhost:3000/api/qa/pruebas',
  },
  {
    id: 'gov',
    esquema: 'gov',
    nombre: 'Gobierno Empresarial',
    descripcion: 'Controles, ambientes, versiones y postura de seguridad.',
    endpoint: 'http://localhost:3000/api/gobierno/controles',
  },

];


const iconos: Record<string, React.ReactNode> = {
  app: <Package size={22} />,
  sec: <Lock size={22} />,
  audit: <FileText size={22} />,
  ai: <Brain size={22} />,
  ops: <Server size={22} />,
  rpt: <BarChart3 size={22} />,
  integ: <Database size={22} />,
  mon: <Activity size={22} />,
  privacy: <Users size={22} />,
  qa: <ClipboardCheck size={22} />,
  gov: <ShieldCheck size={22} />,
};

function valorLegible(valor: unknown) {
  if (valor === null || valor === undefined) return '-';

  if (typeof valor === 'object') {
    return JSON.stringify(valor);
  }

  return String(valor);
}

function normalizarRespuesta(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];

  if (data && typeof data === 'object') {
    return [data as Record<string, unknown>];
  }

  return [{ resultado: data }];
}

export default function AdminPage() {
  const [sesion, setSesion] = useState<SesionUsuario | null>(null);
  const [moduloActivo, setModuloActivo] = useState('app');
  const [datos, setDatos] = useState<Record<string, Record<string, unknown>[]>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [sesionLocal, setSesionLocal] = useState<SesionLocal | null>(null);
  const [verificandoSesion, setVerificandoSesion] = useState(true);

  const rolSesion = obtenerRolSesion(sesionLocal);
  const usernameSesion = obtenerUsernameSesion(sesionLocal);
  const modulosPermitidos = obtenerModulosPermitidos(rolSesion);

  const modulosVisibles = modulos.filter((modulo) =>
    modulosPermitidos.includes(modulo.id),
  );

  useEffect(() => {
      try {
        const sesionGuardada = localStorage.getItem('supermarket_sesion');
        const sesion = sesionGuardada ? JSON.parse(sesionGuardada) : null;

        setSesionLocal(sesion);
      } catch (error) {
        console.warn('No se pudo leer la sesión local', error);
        setSesionLocal(null);
      } finally {
        setVerificandoSesion(false);
      }
    }, []);

    useEffect(() => {
    if (
      modulosVisibles.length > 0 &&
      !modulosVisibles.some((modulo) => modulo.id === moduloActivo)
    ) {
      setModuloActivo(modulosVisibles[0].id);
    }
  }, [rolSesion, moduloActivo]);

  useEffect(() => {
    const sesionGuardada = localStorage.getItem('supermarket_sesion');

    if (!sesionGuardada) {
      setCargando(false);
      return;
    }

    const sesionParseada = JSON.parse(sesionGuardada);
    setSesion(sesionParseada);

    async function cargarPanel() {
      try {
        const resultados = await Promise.all(
          modulosVisibles.map(async (modulo) => {
            const respuesta = await fetch(modulo.endpoint);
            const data = await respuesta.json();

            return {
              id: modulo.id,
              data: normalizarRespuesta(data),
            };
          }),
        );

        const nuevoEstado: Record<string, Record<string, unknown>[]> = {};

        resultados.forEach((item) => {
          nuevoEstado[item.id] = item.data;
        });

        setDatos(nuevoEstado);
      } catch (err) {
        console.error(err);
        setError('No se pudo cargar el panel empresarial.');
      } finally {
        setCargando(false);
      }
    }

    cargarPanel();
  }, [rolSesion]);

  const moduloSeleccionado = useMemo(() => {
    return modulos.find((m) => m.id === moduloActivo) || modulos[0];
  }, [moduloActivo]);

  const filas = datos[moduloActivo] || [];
  const columnas = filas.length > 0 ? Object.keys(filas[0]).slice(0, 8) : [];

  const totalRegistros = Object.values(datos).reduce(
    (total, filasModulo) => total + filasModulo.length,
    0,
  );

  function cerrarSesion() {
    localStorage.removeItem('supermarket_sesion');
    window.location.href = '/';
  }

  if (!sesion && !cargando) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10">
        <section className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
            <Lock size={30} />
          </div>

          <h1 className="text-2xl font-black text-slate-900">
            Acceso administrativo bloqueado
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            Debes iniciar sesión desde la página principal para acceder al panel
            empresarial seguro.
          </p>

          <a
            href="/"
            className="mt-6 inline-flex rounded-2xl bg-orange-600 px-5 py-3 font-black text-white hover:bg-orange-700"
          >
            Volver al supermercado
          </a>
        </section>
      </main>
    );
  }

  if (verificandoSesion) {
          return (
            <main className="flex min-h-screen items-center justify-center bg-slate-100">
              <div className="rounded-3xl border bg-white p-8 text-center shadow-sm">
                <p className="text-lg font-black text-slate-900">
                  Verificando acceso...
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Validando permisos del usuario.
                </p>
              </div>
            </main>
          );
        }

        if (!sesionLocal || modulosVisibles.length === 0) {
          return (
            <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
              <section className="max-w-xl rounded-3xl border bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">
                  🔒
                </div>

                <h1 className="mt-4 text-2xl font-black text-slate-900">
                  Acceso restringido
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                  El usuario{' '}
                  <span className="font-black text-slate-900">
                    {usernameSesion || 'sin sesión'}
                  </span>{' '}
                  no tiene permisos para ingresar al panel empresarial.
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Los cajeros deben operar desde la tienda principal para registrar ventas.
                </p>

                <a
                  href="/"
                  className="mt-6 inline-flex rounded-2xl bg-orange-600 px-5 py-3 text-sm font-black text-white hover:bg-orange-700"
                >
                  Volver a la tienda
                </a>
              </section>
            </main>
          );
        }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-40 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-600 text-lg font-black text-white">
              SM
            </div>

            <div>
              <h1 className="text-lg font-black text-orange-600">
                Panel empresarial
              </h1>
              <p className="text-xs font-semibold text-slate-500">
                Seguridad · Auditoría · IA · Reportes · Gobierno
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              className="hidden items-center gap-2 rounded-full border px-4 py-2 text-sm font-black hover:bg-slate-50 md:flex"
            >
              <Home size={16} />
              Tienda
            </a>

            <div className="rounded-full border bg-green-50 px-4 py-2 text-sm font-black text-green-700">
              {sesion?.username || 'Usuario'}
            </div>

            <button
              onClick={cerrarSesion}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
            >
              <span className="hidden md:inline">Cerrar sesión</span>
              <LogOut className="md:hidden" size={18} />
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 px-2 text-sm font-black uppercase tracking-widest text-slate-400">
            Módulos de la BD
          </h2>

          <div className="grid gap-2">
            {modulosVisibles.map((modulo) => (
              <button
                key={modulo.id}
                onClick={() => setModuloActivo(modulo.id)}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                  moduloActivo === modulo.id
                    ? 'bg-orange-600 text-white shadow'
                    : 'hover:bg-slate-100'
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    moduloActivo === modulo.id
                      ? 'bg-white/20'
                      : 'bg-orange-100 text-orange-600'
                  }`}
                >
                  {iconos[modulo.id]}
                </span>

                <span>
                  <span className="block text-sm font-black">
                    {modulo.nombre}
                  </span>
                  <span
                    className={`text-xs ${
                      moduloActivo === modulo.id
                        ? 'text-orange-50'
                        : 'text-slate-500'
                    }`}
                  >
                    esquema {modulo.esquema}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-4">
            <article className="rounded-3xl bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase text-slate-400">
                Módulos
              </p>
              <p className="mt-2 text-3xl font-black">{modulosVisibles.length}</p>
            </article>

            <article className="rounded-3xl bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase text-slate-400">
                Datos cargados
              </p>
              <p className="mt-2 text-3xl font-black">{totalRegistros}</p>
            </article>

            <article className="rounded-3xl bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase text-slate-400">
                Riesgo login
              </p>
              <p className="mt-2 text-3xl font-black text-green-600">
                {sesion?.riesgo || '0.00'}
              </p>
            </article>

            <article className="rounded-3xl bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase text-slate-400">
                Severidad
              </p>
              <p className="mt-2 text-3xl font-black text-green-600">
                {sesion?.severidad || 'BAJA'}
              </p>
            </article>
          </div>

          <article className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="border-b p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                      {iconos[moduloSeleccionado.id]}
                    </div>

                    <div>
                      <h2 className="text-2xl font-black">
                        {moduloSeleccionado.nombre}
                      </h2>
                      <p className="text-sm font-semibold text-orange-600">
                        Esquema: {moduloSeleccionado.esquema}
                      </p>
                    </div>
                  </div>

                  <p className="max-w-3xl text-sm leading-6 text-slate-500">
                    {moduloSeleccionado.descripcion}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-right">
                  <p className="text-xs font-black uppercase text-slate-400">
                    Registros
                  </p>
                  <p className="text-2xl font-black">{filas.length}</p>
                </div>
              </div>
            </div>

            {moduloActivo === 'app' ? (
            <ModuloSupermercado />
            ) : moduloActivo === 'sec' ? (
            <ModuloSeguridad />
            ) : moduloActivo === 'audit' ? (
            <ModuloAuditoria />
            ) : moduloActivo === 'ai' ? (
            <ModuloIA />
            ) : moduloActivo === 'ops' ? (
            <ModuloOperaciones />
            ) : moduloActivo === 'rpt' ? (
            <ModuloReportes />
            ) : moduloActivo === 'integ' ? (
            <ModuloIntegracion />
            ) : moduloActivo === 'mon' ? (
            <ModuloMonitoreo />
            ) : moduloActivo === 'privacy' ? (
            <ModuloPrivacidad />
            ) : moduloActivo === 'qa' ? (
            <ModuloQA />
            ) : moduloActivo === 'gov' ? (
            <ModuloGobierno />
            ) : cargando ? (
            <div className="p-10 text-center font-black">
                Cargando panel empresarial...
            </div>
            ) : error ? (
            <div className="m-6 rounded-2xl border border-red-200 bg-red-50 p-5 font-bold text-red-700">
                {error}
            </div>
            ) : filas.length === 0 ? (
            <div className="p-10 text-center font-black text-slate-500">
                No hay registros para este módulo.
            </div>
            ) : (
            <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                    <tr className="bg-slate-50 text-left">
                    {columnas.map((columna) => (
                        <th
                        key={columna}
                        className="border-b px-4 py-3 font-black uppercase text-slate-500"
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
        </section>
      </section>
     
    </main>
    
  );
}