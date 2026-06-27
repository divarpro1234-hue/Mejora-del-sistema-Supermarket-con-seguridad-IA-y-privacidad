'use client';



import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Archive,
  CheckCircle2,
  Clock,
  Database,
  FileCode2,
  HardDrive,
  RotateCcw,
  Server,
  ShieldCheck,
  XCircle,
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

function esActivo(valor: unknown) {
  return valor === true || String(valor).toLowerCase() === 'true';
}

function normalizarRespuesta(data: unknown): Registro[] {
  if (Array.isArray(data)) return data as Registro[];

  if (data && typeof data === 'object') {
    return [data as Registro];
  }

  return [{ resultado: data }];
}

function TarjetaOps({
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

function TablaOps({
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
                      className="max-w-[300px] truncate border-b px-4 py-3"
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

function BloqueCodigo({
  titulo,
  descripcion,
  filas,
}: {
  titulo: string;
  descripcion: string;
  filas: Registro[];
}) {
  return (
    <article className="overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="border-b p-5">
        <h3 className="text-lg font-black text-slate-900">{titulo}</h3>
        <p className="mt-1 text-sm text-slate-500">{descripcion}</p>
      </div>

      <div className="grid gap-4 p-5">
        {filas.length === 0 ? (
          <div className="p-6 text-center text-sm font-bold text-slate-500">
            No hay datos disponibles.
          </div>
        ) : (
          filas.map((fila, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border">
              <div className="bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">
                {valorLegible(fila.herramienta ?? fila.plantilla ?? `Item ${index + 1}`)}
              </div>

              <pre className="max-h-80 overflow-auto bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                {valorLegible(fila.comando ?? fila.contenido ?? fila.resultado)}
              </pre>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

export default function ModuloOperaciones() {
  const [politicas, setPoliticas] = useState<Registro[]>([]);
  const [estadoBackups, setEstadoBackups] = useState<Registro[]>([]);
  const [ejecuciones, setEjecuciones] = useState<Registro[]>([]);
  const [verificaciones, setVerificaciones] = useState<Registro[]>([]);
  const [cumplimiento, setCumplimiento] = useState<Registro[]>([]);
  const [ha, setHa] = useState<Registro[]>([]);
  const [comandos, setComandos] = useState<Registro[]>([]);
  const [plantillas, setPlantillas] = useState<Registro[]>([]);
  const [configBackupAutomatico, setConfigBackupAutomatico] = useState<Registro | null>(null);
  const [frecuenciaBackup, setFrecuenciaBackup] = useState(24);
  const [backupAutomaticoActivo, setBackupAutomaticoActivo] = useState(true);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [ejecutandoBackup, setEjecutandoBackup] = useState(false);
  const [mensajeOperacion, setMensajeOperacion] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  async function cargarModuloOperaciones() {
    try {
      setCargando(true);
      setError('');

      const [
        resPoliticas,
        resEstado,
        resEjecuciones,
        resVerificaciones,
        resCumplimiento,
        resHa,
        resComandos,
        resPlantillas,
        resConfigAutomatico,
      ] = await Promise.all([
        fetch(`${API_URL}/backups/politicas`),
        fetch(`${API_URL}/backups/estado`),
        fetch(`${API_URL}/backups/ejecuciones`),
        fetch(`${API_URL}/backups/verificaciones`),
        fetch(`${API_URL}/backups/cumplimiento`),
        fetch(`${API_URL}/backups/ha`),
        fetch(`${API_URL}/backups/comandos`),
        fetch(`${API_URL}/backups/plantillas`),
        fetch(`${API_URL}/backups/automatico/configuracion`),
      ]);

      if (
        !resPoliticas.ok ||
        !resEstado.ok ||
        !resEjecuciones.ok ||
        !resVerificaciones.ok ||
        !resCumplimiento.ok ||
        !resHa.ok ||
        !resComandos.ok ||
        !resPlantillas.ok ||
        !resConfigAutomatico.ok
      ) {
        throw new Error('No se pudieron cargar todos los datos de backups.');
      }

      const config = (await resConfigAutomatico.json()) as Registro;

      setPoliticas(normalizarRespuesta(await resPoliticas.json()));
      setEstadoBackups(normalizarRespuesta(await resEstado.json()));
      setEjecuciones(normalizarRespuesta(await resEjecuciones.json()));
      setVerificaciones(normalizarRespuesta(await resVerificaciones.json()));
      setCumplimiento(normalizarRespuesta(await resCumplimiento.json()));
      setHa(normalizarRespuesta(await resHa.json()));
      setComandos(normalizarRespuesta(await resComandos.json()));
      setPlantillas(normalizarRespuesta(await resPlantillas.json()));
      setConfigBackupAutomatico(config);
      setFrecuenciaBackup(Number(config.frecuencia_horas || 24));
      setBackupAutomaticoActivo(esActivo(config.activo));
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los datos del módulo Backups y Operaciones.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarModuloOperaciones();
  }, []);

  async function guardarConfiguracionBackup() {
    try {
      setGuardandoConfig(true);
      setMensajeOperacion('Guardando configuración de backups automáticos...');

      const respuesta = await fetch(`${API_URL}/backups/automatico/configuracion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frecuenciaHoras: frecuenciaBackup,
          activo: backupAutomaticoActivo,
          usuario: 'admin',
        }),
      });

      if (!respuesta.ok) {
        throw new Error('No se pudo guardar la configuración automática.');
      }

      const config = (await respuesta.json()) as Registro;
      setConfigBackupAutomatico(config);
      setFrecuenciaBackup(Number(config.frecuencia_horas || frecuenciaBackup));
      setBackupAutomaticoActivo(esActivo(config.activo));
      setMensajeOperacion('Configuración guardada correctamente.');
      await cargarModuloOperaciones();
    } catch (err) {
      console.error(err);
      setMensajeOperacion('No se pudo guardar la configuración de backups automáticos.');
    } finally {
      setGuardandoConfig(false);
    }
  }

  async function ejecutarBackupAhora() {
    try {
      setEjecutandoBackup(true);
      setMensajeOperacion('Ejecutando copia de seguridad desde el backend...');

      const respuesta = await fetch(`${API_URL}/backups/automatico/ejecutar-ahora`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'admin' }),
      });

      const data = (await respuesta.json()) as Registro;

      if (!respuesta.ok || data.ok === false) {
        throw new Error(String(data.mensaje || 'La copia de seguridad no pudo ejecutarse.'));
      }

      setMensajeOperacion(`Copia ejecutada correctamente: ${valorLegible(data.archivo)}`);
      await cargarModuloOperaciones();
    } catch (err) {
      console.error(err);
      setMensajeOperacion(`No se pudo ejecutar la copia: ${err instanceof Error ? err.message : 'error desconocido'}`);
      await cargarModuloOperaciones();
    } finally {
      setEjecutandoBackup(false);
    }
  }

  const metricas = useMemo(() => {
    const politicasActivas = politicas.filter((item) => esActivo(item.activo)).length;

    const exitosos = ejecuciones.filter(
      (item) =>
        obtenerTexto(item, ['estado']).toUpperCase() === 'EXITOSO' ||
        obtenerTexto(item, ['estado']).toUpperCase() === 'VERIFICADO',
    ).length;

    const fallidos = ejecuciones.filter(
      (item) => obtenerTexto(item, ['estado']).toUpperCase() === 'FALLIDO',
    ).length;

    const verificados = verificaciones.filter((item) =>
      esActivo(item.restauracion_exitosa),
    ).length;

    const cifradoObligatorio = politicas.filter((item) =>
      esActivo(item.cifrado_obligatorio),
    ).length;

    const comprimidoObligatorio = politicas.filter((item) =>
      esActivo(item.compresion_obligatoria),
    ).length;

    const elementosHa = ha.filter(
      (item) => obtenerTexto(item, ['seccion']).toUpperCase() === 'HA',
    ).length;

    const elementosBackup = ha.filter(
      (item) => obtenerTexto(item, ['seccion']).toUpperCase() === 'BACKUP',
    ).length;

    return {
      politicas: politicas.length,
      politicasActivas,
      ejecuciones: ejecuciones.length,
      exitosos,
      fallidos,
      verificados,
      cifradoObligatorio,
      comprimidoObligatorio,
      cumplimiento: cumplimiento.length,
      elementosHa,
      elementosBackup,
    };
  }, [politicas, ejecuciones, verificaciones, cumplimiento, ha]);

  const opcionesBackup = useMemo(() => {
    const opciones = configBackupAutomatico?.opciones;

    if (Array.isArray(opciones)) {
      return opciones as Registro[];
    }

    return [
      { horas: 1, etiqueta: 'Cada 1 hora' },
      { horas: 4, etiqueta: 'Cada 4 horas' },
      { horas: 7, etiqueta: 'Cada 7 horas' },
      { horas: 9, etiqueta: 'Cada 9 horas' },
      { horas: 12, etiqueta: 'Cada 12 horas' },
      { horas: 24, etiqueta: 'Cada 24 horas' },
    ];
  }, [configBackupAutomatico]);

  if (cargando) {
    return (
      <div className="p-8 text-center font-black text-slate-500">
        Cargando módulo Backups y Operaciones...
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
        <TarjetaOps
          titulo="Políticas"
          valor={metricas.politicas}
          descripcion={`${metricas.politicasActivas} políticas activas`}
          icono={<Database size={24} />}
        />

        <TarjetaOps
          titulo="Ejecuciones"
          valor={metricas.ejecuciones}
          descripcion="Backups registrados en la bitácora"
          icono={<Archive size={24} />}
        />

        <TarjetaOps
          titulo="Exitosos"
          valor={metricas.exitosos}
          descripcion="Backups exitosos o verificados"
          icono={<CheckCircle2 size={24} />}
        />

        <TarjetaOps
          titulo="Fallidos"
          valor={metricas.fallidos}
          descripcion="Backups con error registrado"
          icono={<XCircle size={24} />}
          peligro={metricas.fallidos > 0}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TarjetaOps
          titulo="Restauraciones"
          valor={metricas.verificados}
          descripcion="Pruebas de restauración exitosas"
          icono={<RotateCcw size={24} />}
        />

        <TarjetaOps
          titulo="Cifrado"
          valor={metricas.cifradoObligatorio}
          descripcion="Políticas que exigen cifrado"
          icono={<ShieldCheck size={24} />}
        />

        <TarjetaOps
          titulo="Alta disponibilidad"
          valor={metricas.elementosHa}
          descripcion="Elementos HA reportados"
          icono={<Server size={24} />}
        />

        <TarjetaOps
          titulo="Cumplimiento"
          valor={metricas.cumplimiento}
          descripcion="Reglas de retención evaluadas"
          icono={<Clock size={24} />}
        />
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-orange-600">
              Backups automáticos
            </p>
            <h3 className="mt-1 text-2xl font-black text-slate-900">
              Programación de copias de seguridad
            </h3>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              El administrador puede definir cada cuántas horas el backend NestJS ejecutará una copia con pg_dump. La configuración se guarda en PostgreSQL y se mantiene aunque se reinicie el sistema.
            </p>
          </div>

          <div className={`rounded-full px-4 py-2 text-sm font-black ${backupAutomaticoActivo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
            {backupAutomaticoActivo ? 'Automático activo' : 'Automático desactivado'}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border bg-slate-50 p-4">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">
              Frecuencia de copias
            </label>

            <select
              value={frecuenciaBackup}
              onChange={(event) => setFrecuenciaBackup(Number(event.target.value))}
              className="mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm font-black text-slate-800 outline-none focus:border-orange-500"
            >
              {opcionesBackup.map((opcion) => (
                <option key={String(opcion.horas)} value={Number(opcion.horas)}>
                  {valorLegible(opcion.etiqueta || `Cada ${opcion.horas} horas`)}
                </option>
              ))}
            </select>

            <label className="mt-4 flex items-center gap-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={backupAutomaticoActivo}
                onChange={(event) => setBackupAutomaticoActivo(event.target.checked)}
                className="h-5 w-5 rounded border-slate-300 accent-orange-600"
              />
              Mantener copias automáticas activas
            </label>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={guardarConfiguracionBackup}
                disabled={guardandoConfig || ejecutandoBackup}
                className="rounded-2xl bg-orange-600 px-5 py-3 text-sm font-black text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardandoConfig ? 'Guardando...' : 'Guardar programación'}
              </button>

              <button
                type="button"
                onClick={ejecutarBackupAhora}
                disabled={guardandoConfig || ejecutandoBackup}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {ejecutandoBackup ? 'Ejecutando...' : 'Ejecutar copia ahora'}
              </button>
            </div>

            {mensajeOperacion && (
              <p className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">
                {mensajeOperacion}
              </p>
            )}
          </div>

          <div className="grid gap-3 rounded-2xl border bg-white p-4 text-sm">
            <div className="flex items-center justify-between gap-3 border-b pb-2">
              <span className="font-bold text-slate-500">Estado</span>
              <span className="font-black text-slate-900">
                {valorLegible(configBackupAutomatico?.estado_programacion || configBackupAutomatico?.estado_ultima_ejecucion)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 border-b pb-2">
              <span className="font-bold text-slate-500">Frecuencia actual</span>
              <span className="font-black text-slate-900">
                {valorLegible(configBackupAutomatico?.frecuencia_label || `Cada ${frecuenciaBackup} horas`)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 border-b pb-2">
              <span className="font-bold text-slate-500">Última ejecución</span>
              <span className="max-w-[260px] truncate font-black text-slate-900" title={valorLegible(configBackupAutomatico?.ultima_ejecucion)}>
                {valorLegible(configBackupAutomatico?.ultima_ejecucion)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 border-b pb-2">
              <span className="font-bold text-slate-500">Próxima ejecución</span>
              <span className="max-w-[260px] truncate font-black text-slate-900" title={valorLegible(configBackupAutomatico?.proxima_ejecucion)}>
                {valorLegible(configBackupAutomatico?.proxima_ejecucion)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="font-bold text-slate-500">Último archivo</span>
              <span className="max-w-[260px] truncate font-black text-slate-900" title={valorLegible(configBackupAutomatico?.ultimo_archivo)}>
                {valorLegible(configBackupAutomatico?.ultimo_archivo)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <TablaOps
        titulo="Políticas de backup"
        descripcion="Reglas empresariales de backup, retención, cifrado y compresión."
        filas={politicas}
        columnasPreferidas={[
          'id_politica',
          'nombre',
          'tipo',
          'frecuencia',
          'hora_recomendada',
          'retencion_dias',
          'cifrado_obligatorio',
          'compresion_obligatoria',
          'activo',
        ]}
      />

      <TablaOps
        titulo="Estado de backups"
        descripcion="Último estado conocido por política de backup."
        filas={estadoBackups}
        columnasPreferidas={[
          'politica',
          'tipo',
          'frecuencia',
          'retencion_dias',
          'id_backup',
          'iniciado_en',
          'finalizado_en',
          'estado',
          'ubicacion',
          'ejecutado_por',
        ]}
      />

      <TablaOps
        titulo="Ejecuciones de backup"
        descripcion="Bitácora de inicio, fin, hash, tamaño, estado y responsable."
        filas={ejecuciones}
        columnasPreferidas={[
          'id_backup',
          'id_politica',
          'tipo',
          'iniciado_en',
          'finalizado_en',
          'ubicacion',
          'cifrado',
          'comprimido',
          'estado',
          'ejecutado_por',
        ]}
      />

      <TablaOps
        titulo="Pruebas de restauración"
        descripcion="Verificaciones de restauración para demostrar que el backup sirve."
        filas={verificaciones}
        columnasPreferidas={[
          'id_verificacion',
          'id_backup',
          'fecha',
          'verificado_por',
          'restauracion_exitosa',
          'mensaje',
        ]}
      />

      <TablaOps
        titulo="Cumplimiento de backup empresarial"
        descripcion="Evaluación de retención y copias disponibles por política."
        filas={cumplimiento}
      />

      <TablaOps
        titulo="Alta disponibilidad y backups"
        descripcion="Reporte consolidado de nodos HA, replicación y backups."
        filas={ha}
        columnasPreferidas={['seccion', 'elemento', 'estado', 'detalle', 'fecha']}
      />

      <BloqueCodigo
        titulo="Comandos externos de backup"
        descripcion="Comandos generados por la base para ejecutar desde servidor: pg_dump y pgBackRest."
        filas={comandos}
      />

      <BloqueCodigo
        titulo="Plantillas operacionales seguras"
        descripcion="Plantillas para pg_hba.conf, TLS/SSL y firewall UFW."
        filas={plantillas}
      />

      
    </div>
  );
}