'use client';

import PanelSeguridadAccesos from './PanelSeguridadAccesos';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  Clock,
  KeyRound,
  Lock,
  Network,
  Server,
  ShieldAlert,
  ShieldCheck,
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

function estadoActivo(fila: Registro) {
  const valor = fila.activa ?? fila.activo;
  return valor === true || valor === 'true';
}

function TarjetaSeguridad({
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

function TablaSeguridad({
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
        ? Object.keys(filas[0]).slice(0, 7)
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
          <table className="w-full min-w-[760px] text-sm">
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
              {filas.slice(0, 10).map((fila, index) => (
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
  );
}

export default function ModuloSeguridad() {
  const [configuracion, setConfiguracion] = useState<Registro[]>([]);
  const [ipPermitidas, setIpPermitidas] = useState<Registro[]>([]);
  const [ipBloqueadas, setIpBloqueadas] = useState<Registro[]>([]);
  const [horarios, setHorarios] = useState<Registro[]>([]);
  const [politicaPassword, setPoliticaPassword] = useState<Registro[]>([]);
  const [mfa, setMfa] = useState<Registro[]>([]);
  const [sesiones, setSesiones] = useState<Registro[]>([]);
  const [secretos, setSecretos] = useState<Registro[]>([]);
  const [rotaciones, setRotaciones] = useState<Registro[]>([]);
  const [reporteSeguridad, setReporteSeguridad] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargarModuloSeguridad() {
      try {
        const [
          resConfiguracion,
          resIpPermitidas,
          resIpBloqueadas,
          resHorarios,
          resPoliticaPassword,
          resMfa,
          resSesiones,
          resSecretos,
          resRotaciones,
          resReporteSeguridad,
        ] = await Promise.all([
          fetch(`${API_URL}/seguridad/configuracion`),
          fetch(`${API_URL}/seguridad/ip-permitidas`),
          fetch(`${API_URL}/seguridad/ip-bloqueadas`),
          fetch(`${API_URL}/seguridad/horarios`),
          fetch(`${API_URL}/seguridad/politica-password`),
          fetch(`${API_URL}/seguridad/mfa`),
          fetch(`${API_URL}/seguridad/sesiones`),
          fetch(`${API_URL}/seguridad/secretos`),
          fetch(`${API_URL}/seguridad/rotaciones-secretos`),
          fetch(`${API_URL}/seguridad/reporte`),
        ]);

        const dataConfiguracion = await resConfiguracion.json();
        const dataIpPermitidas = await resIpPermitidas.json();
        const dataIpBloqueadas = await resIpBloqueadas.json();
        const dataHorarios = await resHorarios.json();
        const dataPoliticaPassword = await resPoliticaPassword.json();
        const dataMfa = await resMfa.json();
        const dataSesiones = await resSesiones.json();
        const dataSecretos = await resSecretos.json();
        const dataRotaciones = await resRotaciones.json();
        const dataReporteSeguridad = await resReporteSeguridad.json();

        setConfiguracion(Array.isArray(dataConfiguracion) ? dataConfiguracion : []);
        setIpPermitidas(Array.isArray(dataIpPermitidas) ? dataIpPermitidas : []);
        setIpBloqueadas(Array.isArray(dataIpBloqueadas) ? dataIpBloqueadas : []);
        setHorarios(Array.isArray(dataHorarios) ? dataHorarios : []);
        setPoliticaPassword(Array.isArray(dataPoliticaPassword) ? dataPoliticaPassword : []);
        setMfa(Array.isArray(dataMfa) ? dataMfa : []);
        setSesiones(Array.isArray(dataSesiones) ? dataSesiones : []);
        setSecretos(Array.isArray(dataSecretos) ? dataSecretos : []);
        setRotaciones(Array.isArray(dataRotaciones) ? dataRotaciones : []);
        setReporteSeguridad(Array.isArray(dataReporteSeguridad) ? dataReporteSeguridad : []);
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar los datos del módulo Seguridad.');
      } finally {
        setCargando(false);
      }
    }

    cargarModuloSeguridad();
  }, []);

  const metricas = useMemo(() => {
    const firewallActivo = configuracion.some(
      (item) =>
        item.clave === 'firewall_logico_activo' &&
        String(item.valor).toLowerCase() === 'true',
    );

    const bloqueoIpActivo = configuracion.some(
      (item) =>
        item.clave === 'bloqueo_ip_automatico' &&
        String(item.valor).toLowerCase() === 'true',
    );

    const ipsBloqueadasActivas = ipBloqueadas.filter((item) =>
      estadoActivo(item),
    ).length;

    const sesionesActivas = sesiones.filter(
      (item) => String(item.estado).toUpperCase() === 'ACTIVA',
    ).length;

    const secretosPorRotar = secretos.filter((item) => {
      const estado = String(item.estado_rotacion || '').toUpperCase();
      return estado === 'VENCIDO' || estado === 'POR_VENCER';
    }).length;

    return {
      firewallActivo,
      bloqueoIpActivo,
      ipsPermitidas: ipPermitidas.length,
      ipsBloqueadasActivas,
      sesionesActivas,
      mfaActivos: mfa.filter((item) => item.activo === true).length,
      secretosPorRotar,
      horarios: horarios.length,
    };
  }, [configuracion, ipPermitidas, ipBloqueadas, sesiones, mfa, secretos, horarios]);

  if (cargando) {
    return (
      <div className="p-8 text-center font-black text-slate-500">
        Cargando módulo Seguridad...
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
        <TarjetaSeguridad
          titulo="Firewall lógico"
          valor={metricas.firewallActivo ? 'Activo' : 'Inactivo'}
          descripcion="Validación de IP permitida o bloqueada"
          icono={<Network size={24} />}
          peligro={!metricas.firewallActivo}
        />

        <TarjetaSeguridad
          titulo="IPs permitidas"
          valor={metricas.ipsPermitidas}
          descripcion="Reglas de red autorizadas"
          icono={<ShieldCheck size={24} />}
        />

        <TarjetaSeguridad
          titulo="IPs bloqueadas"
          valor={metricas.ipsBloqueadasActivas}
          descripcion="Bloqueos activos por política o IA"
          icono={<ShieldAlert size={24} />}
          peligro={metricas.ipsBloqueadasActivas > 0}
        />

        <TarjetaSeguridad
          titulo="Sesiones activas"
          valor={metricas.sesionesActivas}
          descripcion="Sesiones abiertas en la base"
          icono={<Activity size={24} />}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TarjetaSeguridad
          titulo="MFA activos"
          valor={metricas.mfaActivos}
          descripcion="Usuarios con doble factor habilitado"
          icono={<UserCheck size={24} />}
        />

        <TarjetaSeguridad
          titulo="Horarios"
          valor={metricas.horarios}
          descripcion="Reglas de acceso por rol"
          icono={<Clock size={24} />}
        />

        <TarjetaSeguridad
          titulo="Secretos por rotar"
          valor={metricas.secretosPorRotar}
          descripcion="Secretos vencidos o próximos a vencer"
          icono={<KeyRound size={24} />}
          peligro={metricas.secretosPorRotar > 0}
        />

        <TarjetaSeguridad
          titulo="Bloqueo automático"
          valor={metricas.bloqueoIpActivo ? 'Activo' : 'Inactivo'}
          descripcion="Respuesta defensiva ante IP sospechosa"
          icono={<Lock size={24} />}
          peligro={!metricas.bloqueoIpActivo}
        />
      </section>

      <TablaSeguridad
        titulo="Configuración de seguridad"
        descripcion="Parámetros centrales usados por la base para firewall, riesgos y bloqueo."
        filas={configuracion}
        columnasPreferidas={['clave', 'valor', 'descripcion', 'updated_at']}
      />

      <TablaSeguridad
        titulo="Firewall lógico: IPs permitidas"
        descripcion="Redes autorizadas para conectarse al sistema."
        filas={ipPermitidas}
        columnasPreferidas={['id_ip', 'red', 'descripcion', 'rol', 'id_sucursal', 'activa']}
      />

      <TablaSeguridad
        titulo="IPs bloqueadas"
        descripcion="IPs bloqueadas manualmente o por respuesta defensiva de IA."
        filas={ipBloqueadas}
        columnasPreferidas={[
          'id_bloqueo',
          'ip',
          'motivo',
          'bloqueada_desde',
          'bloqueada_hasta',
          'severidad',
          'creada_por_ia',
          'activa',
        ]}
      />

      <TablaSeguridad
        titulo="Horarios de acceso por rol"
        descripcion="Control de ingreso por rol, día y rango horario."
        filas={horarios}
        columnasPreferidas={[
          'rol',
          'dia_semana',
          'hora_inicio',
          'hora_fin',
          'permitido',
          'descripcion',
        ]}
      />

      <TablaSeguridad
        titulo="Política de contraseñas"
        descripcion="Reglas de fortaleza, vigencia e historial de contraseñas."
        filas={politicaPassword}
      />

      <TablaSeguridad
        titulo="Usuarios con MFA"
        descripcion="Doble factor demo aplicado a roles críticos."
        filas={mfa}
        columnasPreferidas={[
          'username',
          'rol',
          'metodo',
          'activo',
          'codigo_expira_en',
          'ultimo_uso_en',
        ]}
      />

      <TablaSeguridad
        titulo="Sesiones activas"
        descripcion="Sesiones creadas por la función de autenticación segura."
        filas={sesiones}
        columnasPreferidas={[
          'username',
          'rol',
          'ip',
          'inicio_en',
          'ultimo_uso_en',
          'estado',
        ]}
      />

      <TablaSeguridad
        titulo="Secretos y rotación"
        descripcion="Referencias a secretos externos, sin almacenar valores reales."
        filas={secretos}
        columnasPreferidas={[
          'nombre',
          'proveedor',
          'ruta_referencia',
          'rotacion_dias',
          'ultima_rotacion',
          'proxima_rotacion',
          'estado_rotacion',
        ]}
      />

      <TablaSeguridad
        titulo="Historial de rotación de secretos"
        descripcion="Bitácora de rotaciones registradas."
        filas={rotaciones}
      />

      <TablaSeguridad
        titulo="Reporte de seguridad"
        descripcion="Vista consolidada de seguridad disponible para impresión o revisión."
        filas={reporteSeguridad}
      />

      <PanelSeguridadAccesos />
    </div>

    
  );
}