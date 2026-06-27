'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  Database,
  FileClock,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  ShieldX,
  UserCheck,
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

function esVerdadero(valor: unknown) {
  return valor === true || String(valor).toLowerCase() === 'true';
}

function TarjetaAuditoria({
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

function TablaAuditoria({
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

export default function ModuloAuditoria() {
  const [eventosRecientes, setEventosRecientes] = useState<Registro[]>([]);
  const [eventosCompletos, setEventosCompletos] = useState<Registro[]>([]);
  const [loginIntentos, setLoginIntentos] = useState<Registro[]>([]);
  const [integridad, setIntegridad] = useState<Registro[]>([]);
  const [cadena, setCadena] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargarModuloAuditoria() {
      try {
        const [
          resEventos,
          resEventosCompletos,
          resLoginIntentos,
          resIntegridad,
          resCadena,
        ] = await Promise.all([
          fetch(`${API_URL}/auditoria/eventos`),
          fetch(`${API_URL}/auditoria/eventos-completos`),
          fetch(`${API_URL}/auditoria/login-intentos`),
          fetch(`${API_URL}/auditoria/integridad`),
          fetch(`${API_URL}/auditoria/verificar-cadena`),
        ]);

        const dataEventos = await resEventos.json();
        const dataEventosCompletos = await resEventosCompletos.json();
        const dataLoginIntentos = await resLoginIntentos.json();
        const dataIntegridad = await resIntegridad.json();
        const dataCadena = await resCadena.json();

        setEventosRecientes(Array.isArray(dataEventos) ? dataEventos : []);
        setEventosCompletos(
          Array.isArray(dataEventosCompletos) ? dataEventosCompletos : [],
        );
        setLoginIntentos(
          Array.isArray(dataLoginIntentos) ? dataLoginIntentos : [],
        );
        setIntegridad(Array.isArray(dataIntegridad) ? dataIntegridad : []);
        setCadena(Array.isArray(dataCadena) ? dataCadena : []);
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar los datos del módulo Auditoría.');
      } finally {
        setCargando(false);
      }
    }

    cargarModuloAuditoria();
  }, []);

  const metricas = useMemo(() => {
    const loginsCorrectos = loginIntentos.filter((item) =>
      esVerdadero(item.exito),
    ).length;

    const loginsFallidos = loginIntentos.filter(
      (item) => item.exito !== undefined && !esVerdadero(item.exito),
    ).length;

    const operaciones = new Set(
      eventosRecientes.map((item) => obtenerTexto(item, ['operacion'])),
    ).size;

    const tablasAuditadas = new Set(
      eventosRecientes.map((item) => obtenerTexto(item, ['tabla'])),
    ).size;

    const cadenaInvalida = cadena.filter(
      (item) => item.valido !== undefined && !esVerdadero(item.valido),
    ).length;

    return {
      totalEventos: eventosRecientes.length,
      eventosCompletos: eventosCompletos.length,
      loginsCorrectos,
      loginsFallidos,
      operaciones,
      tablasAuditadas,
      cadenaInvalida,
      registrosCadena: cadena.length,
    };
  }, [eventosRecientes, eventosCompletos, loginIntentos, cadena]);

  if (cargando) {
    return (
      <div className="p-8 text-center font-black text-slate-500">
        Cargando módulo Auditoría...
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
        <TarjetaAuditoria
          titulo="Eventos recientes"
          valor={metricas.totalEventos}
          descripcion="Eventos registrados por triggers"
          icono={<FileClock size={24} />}
        />

        <TarjetaAuditoria
          titulo="Tablas auditadas"
          valor={metricas.tablasAuditadas}
          descripcion="Tablas con operaciones registradas"
          icono={<Database size={24} />}
        />

        <TarjetaAuditoria
          titulo="Logins correctos"
          valor={metricas.loginsCorrectos}
          descripcion="Intentos permitidos"
          icono={<UserCheck size={24} />}
        />

        <TarjetaAuditoria
          titulo="Logins fallidos"
          valor={metricas.loginsFallidos}
          descripcion="Intentos denegados o bloqueados"
          icono={<ShieldX size={24} />}
          peligro={metricas.loginsFallidos > 0}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TarjetaAuditoria
          titulo="Operaciones"
          valor={metricas.operaciones}
          descripcion="INSERT, UPDATE, DELETE u otras"
          icono={<Activity size={24} />}
        />

        <TarjetaAuditoria
          titulo="Cadena hash"
          valor={metricas.cadenaInvalida === 0 ? 'Válida' : 'Alterada'}
          descripcion={`${metricas.registrosCadena} registros verificados`}
          icono={<Fingerprint size={24} />}
          peligro={metricas.cadenaInvalida > 0}
        />

        <TarjetaAuditoria
          titulo="Auditoría inmutable"
          valor="Activa"
          descripcion="Protección contra UPDATE y DELETE"
          icono={<LockKeyhole size={24} />}
        />

        <TarjetaAuditoria
          titulo="Integridad"
          valor={integridad.length}
          descripcion="Registros de revisión de integridad"
          icono={<ShieldCheck size={24} />}
        />
      </section>

      <TablaAuditoria
        titulo="Eventos recientes"
        descripcion="Resumen de eventos capturados por auditoría."
        filas={eventosRecientes}
        columnasPreferidas={[
          'id_evento',
          'fecha',
          'usuario_db',
          'usuario_app',
          'rol_app',
          'sucursal_app',
          'esquema',
          'tabla',
          'operacion',
          'ip',
        ]}
      />

      <TablaAuditoria
        titulo="Eventos completos con hash"
        descripcion="Auditoría inmutable con hash anterior y hash actual."
        filas={eventosCompletos}
        columnasPreferidas={[
          'id_evento',
          'fecha',
          'usuario_app',
          'rol_app',
          'esquema',
          'tabla',
          'operacion',
          'fila_pk',
          'hash_anterior',
          'hash_evento',
        ]}
      />

      <TablaAuditoria
        titulo="Intentos de login"
        descripcion="Registro de accesos permitidos, fallidos o bloqueados."
        filas={loginIntentos}
        columnasPreferidas={[
          'id_intento',
          'fecha',
          'username',
          'exito',
          'motivo',
          'ip',
          'programa',
        ]}
      />

      <TablaAuditoria
        titulo="Verificación de cadena de auditoría"
        descripcion="Recalcula los hashes y compara contra los hashes guardados."
        filas={cadena}
        columnasPreferidas={[
          'id_evento',
          'valido',
          'hash_guardado',
          'hash_recalculado',
        ]}
      />

      <TablaAuditoria
        titulo="Integridad de auditoría"
        descripcion="Vista consolidada de integridad y estado de auditoría."
        filas={integridad}
      />
    </div>
  );
}