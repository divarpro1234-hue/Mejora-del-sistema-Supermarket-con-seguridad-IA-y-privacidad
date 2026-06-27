'use client';

import PanelGobiernoEmpresarial from './PanelGobiernoEmpresarial';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Building2,
  CheckCircle2,
  FileStack,
  Flag,
  Gauge,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

type Registro = Record<string, unknown>;

const API_URL = 'http://localhost:3000/api';

function normalizarRespuesta(data: unknown): Registro[] {
  if (Array.isArray(data)) return data as Registro[];
  if (data && typeof data === 'object') return [data as Registro];
  return [];
}

function valorLegible(valor: unknown) {
  if (valor === null || valor === undefined) return '-';

  if (typeof valor === 'object') {
    return JSON.stringify(valor);
  }

  return String(valor);
}

function texto(fila: Registro, campo: string) {
  const valor = fila[campo];
  return valor === null || valor === undefined ? '' : String(valor);
}

function numero(valor: unknown) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function TarjetaGobierno({
  titulo,
  valor,
  descripcion,
  icono,
  peligro = false,
  correcto = false,
}: {
  titulo: string;
  valor: string | number;
  descripcion: string;
  icono: ReactNode;
  peligro?: boolean;
  correcto?: boolean;
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
              peligro
                ? 'text-red-600'
                : correcto
                  ? 'text-green-700'
                  : 'text-slate-900'
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
              : correcto
                ? 'bg-green-100 text-green-700'
                : 'bg-orange-100 text-orange-700'
          }`}
        >
          {icono}
        </div>
      </div>
    </article>
  );
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
  const columnas = columnasPreferidas.filter(
    (columna) => filas[0] && columna in filas[0],
  );

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
              {filas.slice(0, 12).map((fila, index) => (
                <tr key={index} className="hover:bg-orange-50/40">
                  {columnas.map((columna) => {
                    const valor = valorLegible(fila[columna]);
                    const esEstado = columna === 'estado';

                    return (
                      <td
                        key={columna}
                        className="max-w-[320px] truncate border-b px-4 py-3"
                        title={valor}
                      >
                        {esEstado ? (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              valor === 'IMPLEMENTADO'
                                ? 'bg-green-100 text-green-700'
                                : valor === 'PROPUESTO'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : valor === 'EN_REVISION'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-100 text-slate-600'
                            }`}
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

export default function ModuloGobierno() {
  const [controles, setControles] = useState<Registro[]>([]);
  const [postura, setPostura] = useState<Registro[]>([]);
  const [resumenPostura, setResumenPostura] = useState<Registro[]>([]);
  const [ambientes, setAmbientes] = useState<Registro[]>([]);
  const [versiones, setVersiones] = useState<Registro[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [cargandoAccion, setCargandoAccion] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  async function cargarModuloGobierno() {
    try {
      const [
        resControles,
        resPostura,
        resResumenPostura,
        resAmbientes,
        resVersiones,
      ] = await Promise.all([
        fetch(`${API_URL}/gobierno/controles`),
        fetch(`${API_URL}/gobierno/postura`),
        fetch(`${API_URL}/gobierno/resumen-postura`),
        fetch(`${API_URL}/gobierno/ambientes`),
        fetch(`${API_URL}/gobierno/versiones`),
      ]);

      setControles(normalizarRespuesta(await resControles.json()));
      setPostura(normalizarRespuesta(await resPostura.json()));
      setResumenPostura(normalizarRespuesta(await resResumenPostura.json()));
      setAmbientes(normalizarRespuesta(await resAmbientes.json()));
      setVersiones(normalizarRespuesta(await resVersiones.json()));
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los datos del módulo Gobierno.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarModuloGobierno();
  }, []);

  const metricas = useMemo(() => {
    const implementados = controles.filter(
      (item) => texto(item, 'estado') === 'IMPLEMENTADO',
    ).length;

    const pendientes = controles.filter(
      (item) => texto(item, 'estado') !== 'IMPLEMENTADO',
    ).length;

    const criticos = controles.filter(
      (item) => texto(item, 'nivel_criticidad') === 'CRITICO',
    ).length;

    const criticosPendientes = controles.filter(
      (item) =>
        texto(item, 'nivel_criticidad') === 'CRITICO' &&
        texto(item, 'estado') !== 'IMPLEMENTADO',
    ).length;

    const produccion = ambientes.find(
      (item) => texto(item, 'nombre') === 'PRODUCCION',
    );

    const produccionSegura =
      produccion?.requiere_tls === true &&
      produccion?.requiere_backup === true &&
      produccion?.permite_datos_reales === true;

    const avancePromedio =
      resumenPostura.length > 0
        ? resumenPostura.reduce(
            (acc, item) => acc + numero(item.porcentaje_avance),
            0,
          ) / resumenPostura.length
        : 0;

    return {
      controles: controles.length,
      implementados,
      pendientes,
      criticos,
      criticosPendientes,
      ambientes: ambientes.length,
      versiones: versiones.length,
      avancePromedio: avancePromedio.toFixed(2),
      produccionSegura,
      posturaCategorias: resumenPostura.length,
      posturaGlobal: postura.length,
    };
  }, [controles, ambientes, versiones, resumenPostura, postura]);

  async function implementarSqlInjection() {
    setCargandoAccion(true);
    setMensaje('');

    try {
      const respuesta = await fetch(`${API_URL}/gobierno/control/actualizar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codigo: 'SEC-007',
          estado: 'IMPLEMENTADO',
          evidencia:
            'Backend usa consultas parametrizadas con pg y parámetros $1, $2, $3.',
        }),
      });

      const data = await respuesta.json();

      setMensaje(
        `Control actualizado correctamente: ${valorLegible(data[0]?.codigo)}`,
      );

      await cargarModuloGobierno();
    } catch (err) {
      console.error(err);
      setMensaje('No se pudo actualizar el control de gobierno.');
    } finally {
      setCargandoAccion(false);
    }
  }

  async function registrarVersionPanel() {
    setCargandoAccion(true);
    setMensaje('');

    try {
      const respuesta = await fetch(`${API_URL}/gobierno/versiones/registrar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: '2.1-panel',
          descripcion:
            'Versión del panel empresarial con módulos app, sec, audit, ai, ops, rpt, integ, mon, privacy, qa y gov.',
          hashScript: 'panel-empresarial-v2-1-demo',
        }),
      });

      const data = await respuesta.json();

      setMensaje(
        `Versión registrada correctamente: ${valorLegible(data[0]?.version)}`,
      );

      await cargarModuloGobierno();
    } catch (err) {
      console.error(err);
      setMensaje('No se pudo registrar la versión.');
    } finally {
      setCargandoAccion(false);
    }
  }

  if (cargando) {
    return (
      <div className="p-8 text-center font-black text-slate-500">
        Cargando módulo Gobierno Empresarial...
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
        <TarjetaGobierno
          titulo="Controles"
          valor={metricas.controles}
          descripcion="Controles empresariales"
          icono={<ShieldCheck size={24} />}
        />

        <TarjetaGobierno
          titulo="Implementados"
          valor={metricas.implementados}
          descripcion="Controles ya cumplidos"
          icono={<CheckCircle2 size={24} />}
          correcto={metricas.implementados > 0}
        />

        <TarjetaGobierno
          titulo="Pendientes"
          valor={metricas.pendientes}
          descripcion="Controles propuestos o en revisión"
          icono={<XCircle size={24} />}
          peligro={metricas.pendientes > 0}
        />

        <TarjetaGobierno
          titulo="Críticos pendientes"
          valor={metricas.criticosPendientes}
          descripcion={`${metricas.criticos} controles críticos totales`}
          icono={<ShieldAlert size={24} />}
          peligro={metricas.criticosPendientes > 0}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <TarjetaGobierno
          titulo="Ambientes"
          valor={metricas.ambientes}
          descripcion="Desarrollo, pruebas, producción y más"
          icono={<Building2 size={24} />}
        />

        <TarjetaGobierno
          titulo="Versiones"
          valor={metricas.versiones}
          descripcion="Versionamiento de BD"
          icono={<FileStack size={24} />}
        />

        <TarjetaGobierno
          titulo="Avance"
          valor={`${metricas.avancePromedio}%`}
          descripcion="Promedio por categoría"
          icono={<Gauge size={24} />}
          correcto={Number(metricas.avancePromedio) >= 70}
        />

        <TarjetaGobierno
          titulo="Producción"
          valor={metricas.produccionSegura ? 'SEGURA' : 'REVISAR'}
          descripcion="TLS, backups y datos reales"
          icono={<Flag size={24} />}
          peligro={!metricas.produccionSegura}
          correcto={metricas.produccionSegura}
        />
      </section>

      <article className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Acciones de gobierno
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Actualiza controles empresariales y registra versiones de la base de datos.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              disabled={cargandoAccion}
              onClick={implementarSqlInjection}
              className="rounded-2xl bg-orange-600 px-4 py-2 text-sm font-black text-white hover:bg-orange-700 disabled:opacity-60"
            >
              Implementar SEC-007
            </button>

            <button
              disabled={cargandoAccion}
              onClick={registrarVersionPanel}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
            >
              Registrar versión 2.1
            </button>
          </div>
        </div>

        {mensaje && (
          <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-700">
            {mensaje}
          </div>
        )}
      </article>

      <TablaGobierno
        titulo="Controles de seguridad empresarial"
        descripcion="Gobierno, cumplimiento, criticidad, evidencia y estado de controles."
        filas={controles}
        columnasPreferidas={[
          'codigo',
          'categoria',
          'nombre',
          'nivel_criticidad',
          'responsable',
          'estado',
          'evidencia',
          'updated_at',
        ]}
      />

      <TablaGobierno
        titulo="Postura de seguridad por categoría"
        descripcion="Resumen de controles implementados, pendientes y avance porcentual."
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
        titulo="Ambientes empresariales"
        descripcion="Control de ambientes, uso de datos reales, TLS y backups."
        filas={ambientes}
        columnasPreferidas={[
          'id_ambiente',
          'nombre',
          'descripcion',
          'permite_datos_reales',
          'requiere_tls',
          'requiere_backup',
          'activo',
        ]}
      />

      <TablaGobierno
        titulo="Versiones de base de datos"
        descripcion="Historial de versiones aplicadas, responsables y hash del script."
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

      <article className="rounded-3xl border bg-gradient-to-br from-orange-950 via-slate-900 to-blue-950 p-6 text-white shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <RefreshCcw size={24} />
          </div>

          <div>
            <h3 className="text-xl font-black">
              Gobierno empresarial de base de datos
            </h3>
            <p className="text-sm text-orange-100">
              Controles · Ambientes · Cumplimiento · Versiones · Evidencias
            </p>
          </div>
        </div>

        <p className="text-sm leading-6 text-orange-50">
          Este módulo centraliza la postura de seguridad de la base de datos:
          controles implementados, pendientes, criticidad, ambientes seguros,
          versionamiento y evidencias de cumplimiento empresarial.
        </p>
      </article>
      <PanelGobiernoEmpresarial />
    </div>
  );
}
