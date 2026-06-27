'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArchiveRestore,
  CheckCircle2,
  Database,
  FileTerminal,
  RefreshCcw,
  Search,
  ServerCog,
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

  if (
    e.includes('OK') ||
    e.includes('EXITOSO') ||
    e.includes('COMPLETADO') ||
    e.includes('ACTIVO') ||
    e.includes('CUMPLE')
  ) {
    return 'bg-green-100 text-green-700 border-green-200';
  }

  if (
    e.includes('PENDIENTE') ||
    e.includes('ADVERTENCIA') ||
    e.includes('EN_PROCESO')
  ) {
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  }

  if (
    e.includes('ERROR') ||
    e.includes('FALLIDO') ||
    e.includes('CRITICO') ||
    e.includes('NO_CUMPLE')
  ) {
    return 'bg-red-100 text-red-700 border-red-200';
  }

  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function TablaOperaciones({
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
                        columna.toLowerCase().includes('resultado') ||
                        columna.toLowerCase().includes('cumplimiento') ? (
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

function TarjetaOperaciones({
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

export default function PanelBackupsOperaciones() {
  const [estadoBackup, setEstadoBackup] = useState<Registro[]>([]);
  const [cumplimiento, setCumplimiento] = useState<Registro[]>([]);
  const [ha, setHa] = useState<Registro[]>([]);
  const [politicas, setPoliticas] = useState<Registro[]>([]);
  const [ejecuciones, setEjecuciones] = useState<Registro[]>([]);
  const [verificaciones, setVerificaciones] = useState<Registro[]>([]);
  const [comandos, setComandos] = useState<Registro[]>([]);
  const [plantillas, setPlantillas] = useState<Registro[]>([]);

  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  async function cargarOperaciones() {
    try {
      setCargando(true);
      setError('');

      const [
        resEstado,
        resCumplimiento,
        resHa,
        resPoliticas,
        resEjecuciones,
        resVerificaciones,
        resComandos,
        resPlantillas,
      ] = await Promise.all([
        fetch(`${API_URL}/backups/estado`),
        fetch(`${API_URL}/backups/cumplimiento`),
        fetch(`${API_URL}/backups/ha`),
        fetch(`${API_URL}/backups/politicas`),
        fetch(`${API_URL}/backups/ejecuciones`),
        fetch(`${API_URL}/backups/verificaciones`),
        fetch(`${API_URL}/backups/comandos`),
        fetch(`${API_URL}/backups/plantillas`),
      ]);

      if (
        !resEstado.ok ||
        !resCumplimiento.ok ||
        !resHa.ok ||
        !resPoliticas.ok ||
        !resEjecuciones.ok ||
        !resVerificaciones.ok ||
        !resComandos.ok ||
        !resPlantillas.ok
      ) {
        throw new Error('No se pudieron cargar datos de operaciones.');
      }

      setEstadoBackup(normalizar(await resEstado.json()));
      setCumplimiento(normalizar(await resCumplimiento.json()));
      setHa(normalizar(await resHa.json()));
      setPoliticas(normalizar(await resPoliticas.json()));
      setEjecuciones(normalizar(await resEjecuciones.json()));
      setVerificaciones(normalizar(await resVerificaciones.json()));
      setComandos(normalizar(await resComandos.json()));
      setPlantillas(normalizar(await resPlantillas.json()));
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el panel de backups y operaciones.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarOperaciones();
  }, []);

  const ejecucionesFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    if (!q) return ejecuciones;

    return ejecuciones.filter((fila) =>
      Object.values(fila).some((valor) =>
        String(valor ?? '').toLowerCase().includes(q),
      ),
    );
  }, [ejecuciones, busqueda]);

  const metricas = useMemo(() => {
    const exitosas = ejecuciones.filter((fila) => {
      const estado =
        texto(fila, 'estado') ||
        texto(fila, 'resultado') ||
        texto(fila, 'cumplimiento');

      return (
        estado.toUpperCase().includes('EXITOSO') ||
        estado.toUpperCase().includes('OK') ||
        estado.toUpperCase().includes('COMPLETADO')
      );
    }).length;

    return {
      politicas: politicas.length,
      ejecuciones: ejecuciones.length,
      exitosas,
      verificaciones: verificaciones.length,
      comandos: comandos.length,
      nodosHa: ha.length,
    };
  }, [politicas, ejecuciones, verificaciones, comandos, ha]);

  if (cargando) {
    return (
      <div className="rounded-3xl border bg-white p-8 text-center font-black text-slate-500">
        Cargando backups y operaciones...
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
          Backups y operaciones
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Políticas de respaldo, verificaciones, alta disponibilidad y comandos operativos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TarjetaOperaciones
          titulo="Políticas"
          valor={metricas.politicas}
          descripcion="Reglas de respaldo"
          icono={<Database size={24} />}
        />

        <TarjetaOperaciones
          titulo="Ejecuciones"
          valor={metricas.ejecuciones}
          descripcion={`${metricas.exitosas} exitosas`}
          icono={<ArchiveRestore size={24} />}
        />

        <TarjetaOperaciones
          titulo="Verificaciones"
          valor={metricas.verificaciones}
          descripcion="Pruebas de restauración"
          icono={<CheckCircle2 size={24} />}
        />

        <TarjetaOperaciones
          titulo="Alta disponibilidad"
          valor={metricas.nodosHa}
          descripcion="Nodos o registros HA"
          icono={<ServerCog size={24} />}
        />
      </div>

      <article className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Buscar operaciones
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Busca ejecuciones, estados, políticas o resultados operativos.
            </p>
          </div>

          <button
            onClick={cargarOperaciones}
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
            placeholder="Buscar en ejecuciones de backup..."
            className="w-full bg-transparent text-sm font-semibold outline-none"
          />
        </div>
      </article>

      <TablaOperaciones
        titulo="Estado de backups"
        descripcion="Vista resumida del estado actual de respaldos."
        filas={estadoBackup}
        columnasPreferidas={[
          'politica',
          'tipo',
          'frecuencia',
          'estado',
          'ultima_ejecucion',
          'ultimo_resultado',
          'observacion',
        ]}
      />

      <TablaOperaciones
        titulo="Cumplimiento de backups"
        descripcion="Validación de cumplimiento operativo y restaurabilidad."
        filas={cumplimiento}
        columnasPreferidas={[
          'politica',
          'cumplimiento',
          'ultima_verificacion',
          'resultado',
          'observacion',
        ]}
      />

      <TablaOperaciones
        titulo="Alta disponibilidad"
        descripcion="Nodos, réplicas o configuraciones de continuidad operativa."
        filas={ha}
        columnasPreferidas={[
          'nodo',
          'rol',
          'host',
          'estado',
          'replicacion',
          'ultimo_check',
          'observacion',
        ]}
      />

      <TablaOperaciones
        titulo="Políticas de backup"
        descripcion="Configuración de respaldos definidos para la base de datos."
        filas={politicas}
        columnasPreferidas={[
          'id_politica',
          'nombre',
          'tipo',
          'frecuencia',
          'retencion_dias',
          'ruta_destino',
          'activo',
          'created_at',
        ]}
      />

      <TablaOperaciones
        titulo="Ejecuciones de backup"
        descripcion="Historial de respaldos realizados."
        filas={ejecucionesFiltradas}
        columnasPreferidas={[
          'id_ejecucion',
          'politica',
          'tipo',
          'inicio',
          'fin',
          'estado',
          'tamano_mb',
          'archivo',
          'observacion',
        ]}
      />

      <TablaOperaciones
        titulo="Verificaciones de restauración"
        descripcion="Pruebas de restauración y evidencia técnica."
        filas={verificaciones}
        columnasPreferidas={[
          'id_verificacion',
          'id_ejecucion',
          'fecha',
          'resultado',
          'ambiente_prueba',
          'evidencia',
          'observacion',
        ]}
      />

      <TablaOperaciones
        titulo="Comandos operativos"
        descripcion="Comandos sugeridos para respaldo, restauración, firewall o monitoreo."
        filas={comandos}
        columnasPreferidas={[
          'categoria',
          'nombre',
          'descripcion',
          'comando',
          'sistema_operativo',
          'riesgo',
        ]}
      />

      <TablaOperaciones
        titulo="Plantillas operacionales"
        descripcion="Plantillas técnicas para administración y seguridad."
        filas={plantillas}
        columnasPreferidas={[
          'categoria',
          'nombre',
          'descripcion',
          'contenido',
        ]}
      />
    </section>
  );
}