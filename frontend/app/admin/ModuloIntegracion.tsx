'use client';
import PanelIntegracionEmpresarial from './PanelIntegracionEmpresarial';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  CheckCircle2,
  Database,
  FileCode2,
  Globe2,
  Plug,
  RefreshCcw,
  Server,
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
  if (data && typeof data === 'object') return [data as Registro];
  return [{ resultado: data }];
}

function TarjetaIntegracion({
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

function TablaIntegracion({
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

export default function ModuloIntegracion() {
  const [fuentes, setFuentes] = useState<Registro[]>([]);
  const [sincronizaciones, setSincronizaciones] = useState<Registro[]>([]);
  const [plantillaFdw, setPlantillaFdw] = useState<Registro[]>([]);
  const [registrando, setRegistrando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargarModuloIntegracion() {
      try {
        const [resFuentes, resSincronizaciones, resPlantilla] =
          await Promise.all([
            fetch(`${API_URL}/integracion/fuentes`),
            fetch(`${API_URL}/integracion/sincronizaciones`),
            fetch(`${API_URL}/integracion/plantilla-fdw`),
          ]);

        setFuentes(normalizarRespuesta(await resFuentes.json()));
        setSincronizaciones(
          normalizarRespuesta(await resSincronizaciones.json()),
        );
        setPlantillaFdw(normalizarRespuesta(await resPlantilla.json()));
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar los datos del módulo Integración.');
      } finally {
        setCargando(false);
      }
    }

    cargarModuloIntegracion();
  }, []);

  const metricas = useMemo(() => {
    const activas = fuentes.filter((item) => esActivo(item.activa)).length;

    const exitosas = sincronizaciones.filter(
      (item) => obtenerTexto(item, ['estado']).toUpperCase() === 'EXITOSO',
    ).length;

    const fallidas = sincronizaciones.filter(
      (item) => obtenerTexto(item, ['estado']).toUpperCase() === 'FALLIDO',
    ).length;

    const enProceso = sincronizaciones.filter(
      (item) => obtenerTexto(item, ['estado']).toUpperCase() === 'EN_PROCESO',
    ).length;

    const tipos = new Set(
      fuentes.map((item) => obtenerTexto(item, ['tipo'])).filter(Boolean),
    ).size;

    return {
      fuentes: fuentes.length,
      activas,
      tipos,
      sincronizaciones: sincronizaciones.length,
      exitosas,
      fallidas,
      enProceso,
      plantillas: plantillaFdw.length,
    };
  }, [fuentes, sincronizaciones, plantillaFdw]);

  async function registrarSincronizacionPrueba() {
    setRegistrando(true);
    setMensaje('');

    try {
      const respuesta = await fetch(
        `${API_URL}/integracion/sincronizaciones/registrar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idFuente: 1,
            modulo: 'PROVEEDORES',
            estado: 'EXITOSO',
            filasLeidas: 120,
            filasInsertadas: 30,
            filasActualizadas: 12,
            mensaje: 'Sincronización registrada desde el panel empresarial.',
          }),
        },
      );

      const data = await respuesta.json();
      setMensaje(
        `Sincronización registrada correctamente: ${valorLegible(
          data[0]?.id_sinc,
        )}`,
      );

      const nuevo = await fetch(`${API_URL}/integracion/sincronizaciones`);
      setSincronizaciones(normalizarRespuesta(await nuevo.json()));
    } catch (err) {
      console.error(err);
      setMensaje('No se pudo registrar la sincronización.');
    } finally {
      setRegistrando(false);
    }
  }

  if (cargando) {
    return (
      <div className="p-8 text-center font-black text-slate-500">
        Cargando módulo Integración...
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
        <TarjetaIntegracion
          titulo="Fuentes externas"
          valor={metricas.fuentes}
          descripcion={`${metricas.activas} fuentes activas`}
          icono={<Database size={24} />}
        />

        <TarjetaIntegracion
          titulo="Tipos"
          valor={metricas.tipos}
          descripcion="Motores o servicios distintos"
          icono={<Globe2 size={24} />}
        />

        <TarjetaIntegracion
          titulo="Sincronizaciones"
          valor={metricas.sincronizaciones}
          descripcion="Procesos registrados"
          icono={<RefreshCcw size={24} />}
        />

        <TarjetaIntegracion
          titulo="Fallidas"
          valor={metricas.fallidas}
          descripcion="Sincronizaciones con error"
          icono={<XCircle size={24} />}
          peligro={metricas.fallidas > 0}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <TarjetaIntegracion
          titulo="Exitosas"
          valor={metricas.exitosas}
          descripcion="Sincronizaciones finalizadas"
          icono={<CheckCircle2 size={24} />}
        />

        <TarjetaIntegracion
          titulo="En proceso"
          valor={metricas.enProceso}
          descripcion="Sincronizaciones abiertas"
          icono={<FileCode2 size={24} />}
        />

        <TarjetaIntegracion
          titulo="FDW"
          valor={metricas.plantillas}
          descripcion="Plantilla postgres_fdw generada"
          icono={<FileCode2 size={24} />}
        />
      </section>

      <article className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black">
              Registro de sincronización externa
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Registra una sincronización de prueba contra la fuente de proveedores.
            </p>
          </div>

          <button
            disabled={registrando}
            onClick={registrarSincronizacionPrueba}
            className="rounded-2xl bg-orange-600 px-4 py-2 text-sm font-black text-white hover:bg-orange-700 disabled:opacity-60"
          >
            Registrar sincronización
          </button>
        </div>

        {mensaje && (
          <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-700">
            {mensaje}
          </div>
        )}
      </article>

      <TablaIntegracion
        titulo="Fuentes externas"
        descripcion="Bases externas, APIs o servicios preparados para integración."
        filas={fuentes}
        columnasPreferidas={[
          'id_fuente',
          'nombre',
          'tipo',
          'host_seguro',
          'base_datos',
          'puerto',
          'usa_ssl',
          'activa',
          'descripcion',
        ]}
      />

      <TablaIntegracion
        titulo="Sincronizaciones"
        descripcion="Historial de procesos de lectura, inserción y actualización."
        filas={sincronizaciones}
        columnasPreferidas={[
          'id_sinc',
          'fuente',
          'tipo_fuente',
          'modulo',
          'iniciado_en',
          'finalizado_en',
          'estado',
          'filas_leidas',
          'filas_insertadas',
          'filas_actualizadas',
          'mensaje',
        ]}
      />

      <article className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h3 className="text-lg font-black text-slate-900">
            Plantilla postgres_fdw
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Script base para preparar tablas federadas sin guardar contraseñas reales.
          </p>
        </div>

        <div className="grid gap-4 p-5">
          {plantillaFdw.length === 0 ? (
            <div className="p-6 text-center text-sm font-bold text-slate-500">
              No hay plantilla disponible.
            </div>
          ) : (
            plantillaFdw.map((fila, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border">
                <div className="bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">
                  srv_proveedores
                </div>

                <pre className="max-h-96 overflow-auto bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                  {valorLegible(fila.plantilla)}
                </pre>
              </div>
            ))
          )}
        </div>
      </article>

      <article className="rounded-3xl border bg-gradient-to-br from-blue-950 via-blue-800 to-orange-600 p-6 text-white shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <Server size={24} />
          </div>

          <div>
            <h3 className="text-xl font-black">
              Preparado para integración empresarial
            </h3>
            <p className="text-sm text-blue-100">
              Proveedores · Contabilidad · Base central · Sucursales externas · Modelos IA
            </p>
          </div>
        </div>

        <p className="text-sm leading-6 text-blue-50">
          Este módulo no obliga a conectarse ahora a otra base real, pero deja
          registrada la arquitectura para integraciones futuras con control,
          sincronización y preparación segura mediante postgres_fdw.
        </p>
      </article>
      <PanelIntegracionEmpresarial />
    </div>
  );
}