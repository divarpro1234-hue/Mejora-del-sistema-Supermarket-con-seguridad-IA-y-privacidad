'use client';

import { useEffect, useState } from 'react';
import { Lock, ShieldCheck, X, User, KeyRound } from 'lucide-react';

type LoginResponse = {
  exito: boolean;
  accion: string;
  riesgo: string;
  severidad: string;
  mensaje: string;
  id_sesion: string | null;
};

type SesionUsuario = LoginResponse & {
  username: string;
  fecha_login: string;
};

type LoginModalProps = {
  abierto: boolean;
  onCerrar: () => void;
  onLoginCorrecto: (data: SesionUsuario) => void;
};

export default function LoginModal({
  abierto,
  onCerrar,
  onLoginCorrecto,
}: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [codigoMfa, setCodigoMfa] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<LoginResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (abierto) {
      setUsername('');
      setPassword('');
      setCodigoMfa('');
      setResultado(null);
      setError('');
      setCargando(false);
    }
  }, [abierto]);

  if (!abierto) return null;

  async function iniciarSesion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCargando(true);
    setError('');
    setResultado(null);

    try {
      const respuesta = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          ip: '127.0.0.1',
          navegador:
            typeof navigator !== 'undefined'
              ? navigator.userAgent
              : 'Frontend Next.js',
          codigoMfa,
        }),
      });

      const data: LoginResponse = await respuesta.json();
      setResultado(data);

      if (data.exito) {
        const sesion = {
          ...data,
          username,
          fecha_login: new Date().toISOString(),
        };

        localStorage.setItem('supermarket_sesion', JSON.stringify(sesion));
        setUsername('');
        setPassword('');
        setCodigoMfa('');
        onLoginCorrecto(sesion);
      } else {
        setError(data.mensaje || 'Acceso denegado por la política de seguridad.');
      }
    } catch (err) {
      console.error(err);
      setError('No se pudo conectar con el backend.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="grid md:grid-cols-[1.1fr_0.9fr]">
          <section className="bg-gradient-to-br from-orange-600 via-orange-500 to-blue-900 p-8 text-white">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg font-black text-orange-600">
                SM
              </div>
              <div>
                <h2 className="text-2xl font-black">Acceso seguro</h2>
                <p className="text-sm text-orange-50">
                  Supermarket empresarial
                </p>
              </div>
            </div>

            <h3 className="text-4xl font-black leading-tight">
              Login conectado a PostgreSQL, IA defensiva y auditoría.
            </h3>

            <p className="mt-4 text-sm leading-6 text-orange-50">
              Esta pantalla no simula el acceso. El formulario llama al backend
              NestJS y el backend ejecuta la función segura de la base de datos.
            </p>

            <div className="mt-8 grid gap-3">
              <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                <p className="text-sm font-black">1. Verificación de usuario</p>
                <p className="text-xs text-orange-50">
                  Usuario, contraseña, estado activo y MFA.
                </p>
              </div>

              <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                <p className="text-sm font-black">2. Seguridad contextual</p>
                <p className="text-xs text-orange-50">
                  IP, firewall lógico, horarios y bloqueo defensivo.
                </p>
              </div>

              <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                <p className="text-sm font-black">3. IA y auditoría</p>
                <p className="text-xs text-orange-50">
                  Riesgo de login, severidad, sesión segura y registro auditado.
                </p>
              </div>
            </div>
          </section>

          <section className="relative p-8">
            <button
              onClick={onCerrar}
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              <X size={18} />
            </button>

            <div className="mb-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                <ShieldCheck />
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                Iniciar sesión
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Usa las credenciales de prueba validadas en PostgreSQL.
              </p>
            </div>

            <form onSubmit={iniciarSesion} className="grid gap-4" autoComplete="off">
              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">
                  Usuario
                </span>
                <div className="flex items-center gap-2 rounded-2xl border px-4 py-3">
                  <User size={18} className="text-slate-400" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full outline-none"
                    placeholder="Ingresa tu usuario"
                    autoComplete="off"
                    name="supermarket_usuario_seguro"
                  />
                </div>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">
                  Contraseña
                </span>
                <div className="flex items-center gap-2 rounded-2xl border px-4 py-3">
                  <Lock size={18} className="text-slate-400" />
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    className="w-full outline-none"
                    placeholder="Ingresa tu contraseña"
                    autoComplete="new-password"
                    name="supermarket_password_seguro"
                  />
                </div>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">
                  Código MFA
                </span>
                <div className="flex items-center gap-2 rounded-2xl border px-4 py-3">
                  <KeyRound size={18} className="text-slate-400" />
                  <input
                    value={codigoMfa}
                    onChange={(e) => setCodigoMfa(e.target.value)}
                    className="w-full outline-none"
                    placeholder="Ingresa tu código MFA"
                    autoComplete="one-time-code"
                    name="supermarket_codigo_mfa"
                  />
                </div>
              </label>

              <button
                disabled={cargando}
                className="mt-2 rounded-2xl bg-orange-600 px-4 py-3 font-black text-white hover:bg-orange-700 disabled:opacity-60"
              >
                {cargando ? 'Validando seguridad...' : 'Entrar al sistema'}
              </button>
            </form>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            {resultado && (
              <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-900">
                  Resultado de seguridad
                </p>

                <div className="mt-3 grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estado:</span>
                    <span
                      className={`font-black ${
                        resultado.exito ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {resultado.exito ? 'Permitido' : 'Bloqueado'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Acción:</span>
                    <span className="font-black">{resultado.accion}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Riesgo IA:</span>
                    <span className="font-black">{resultado.riesgo}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Severidad:</span>
                    <span className="font-black">{resultado.severidad}</span>
                  </div>

                  <div className="rounded-xl bg-white p-3 text-xs text-slate-600">
                    {resultado.mensaje}
                  </div>
                </div>

                {resultado.exito && (
                  <button
                    onClick={onCerrar}
                    className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 font-black text-white hover:bg-slate-800"
                  >
                    Continuar
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}