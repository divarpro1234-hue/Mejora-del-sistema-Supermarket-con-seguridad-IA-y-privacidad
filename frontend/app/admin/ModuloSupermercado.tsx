'use client';

import PanelVentasReales from './PanelVentasReales';
import PanelInventarioTiempoReal from './PanelInventarioTiempoReal';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  Building2,
  Package,
  ShoppingCart,
  UserCog,
  Users,
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

function obtenerNumero(fila: Registro, campos: string[]) {
  for (const campo of campos) {
    const valor = fila[campo];

    if (valor !== null && valor !== undefined && !Number.isNaN(Number(valor))) {
      return Number(valor);
    }
  }

  return 0;
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

function TarjetaResumen({
  titulo,
  valor,
  descripcion,
  icono,
  alerta = false,
}: {
  titulo: string;
  valor: string | number;
  descripcion: string;
  icono: React.ReactNode;
  alerta?: boolean;
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
              alerta ? 'text-red-600' : 'text-slate-900'
            }`}
          >
            {valor}
          </p>
          <p className="mt-1 text-sm text-slate-500">{descripcion}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            alerta
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

function TablaDatos({
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
              {filas.slice(0, 8).map((fila, index) => (
                <tr key={index} className="hover:bg-orange-50/40">
                  {columnas.map((columna) => (
                    <td
                      key={columna}
                      className="max-w-[250px] truncate border-b px-4 py-3"
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

export default function ModuloSupermercado() {
  const [inventario, setInventario] = useState<Registro[]>([]);
  const [ventas, setVentas] = useState<Registro[]>([]);
  const [clientes, setClientes] = useState<Registro[]>([]);
  const [usuarios, setUsuarios] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargarModuloApp() {
      try {
        const [resInventario, resVentas, resClientes, resUsuarios] =
          await Promise.all([
            fetch(`${API_URL}/inventario`),
            fetch(`${API_URL}/ventas/resumen`),
            fetch(`${API_URL}/clientes`),
            fetch(`${API_URL}/usuarios`),
          ]);

        const dataInventario = await resInventario.json();
        const dataVentas = await resVentas.json();
        const dataClientes = await resClientes.json();
        const dataUsuarios = await resUsuarios.json();

        setInventario(Array.isArray(dataInventario) ? dataInventario : []);
        setVentas(Array.isArray(dataVentas) ? dataVentas : []);
        setClientes(Array.isArray(dataClientes) ? dataClientes : []);
        setUsuarios(Array.isArray(dataUsuarios) ? dataUsuarios : []);
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar los datos del módulo Supermercado.');
      } finally {
        setCargando(false);
      }
    }

    cargarModuloApp();
  }, []);

  const metricas = useMemo(() => {
    const productosUnicos = new Set(
      inventario.map((item) =>
        obtenerTexto(item, ['codigo_barra', 'producto', 'id_producto']),
      ),
    ).size;

    const sucursales = new Set(
      inventario.map((item) => obtenerTexto(item, ['sucursal'])),
    ).size;

    const stockCritico = inventario.filter((item) => {
      const estado = obtenerTexto(item, ['estado_stock']).toUpperCase();
      return estado && estado !== 'NORMAL';
    }).length;

    const totalStock = inventario.reduce((total, item) => {
      return total + obtenerNumero(item, ['stock_actual']);
    }, 0);

    const totalVentas = ventas.reduce((total, item) => {
      return (
        total +
        obtenerNumero(item, [
          'total',
          'total_venta',
          'monto_total',
          'importe_total',
          'ventas_total',
        ])
      );
    }, 0);

    return {
      productosUnicos,
      sucursales,
      stockCritico,
      totalStock,
      totalVentas,
    };
  }, [inventario, ventas]);

  const inventarioCritico = inventario.filter((item) => {
    const estado = obtenerTexto(item, ['estado_stock']).toUpperCase();
    return estado && estado !== 'NORMAL';
  });

  if (cargando) {
    return (
      <div className="p-8 text-center font-black text-slate-500">
        Cargando módulo Supermercado...
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
        <TarjetaResumen
          titulo="Productos"
          valor={metricas.productosUnicos}
          descripcion="Productos únicos registrados"
          icono={<Package size={24} />}
        />

        <TarjetaResumen
          titulo="Sucursales"
          valor={metricas.sucursales}
          descripcion="Sucursales con inventario"
          icono={<Building2 size={24} />}
        />

        <TarjetaResumen
          titulo="Stock total"
          valor={metricas.totalStock.toFixed(0)}
          descripcion="Unidades disponibles"
          icono={<Boxes size={24} />}
        />

        <TarjetaResumen
          titulo="Stock crítico"
          valor={metricas.stockCritico}
          descripcion="Productos bajo mínimo"
          icono={<AlertTriangle size={24} />}
          alerta={metricas.stockCritico > 0}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <TarjetaResumen
          titulo="Ventas registradas"
          valor={ventas.length}
          descripcion="Filas del resumen de ventas"
          icono={<ShoppingCart size={24} />}
        />

        <TarjetaResumen
          titulo="Clientes protegidos"
          valor={clientes.length}
          descripcion="Clientes con datos cifrados/enmascarados"
          icono={<Users size={24} />}
        />

        <TarjetaResumen
          titulo="Usuarios protegidos"
          valor={usuarios.length}
          descripcion="Usuarios, roles y sucursales"
          icono={<UserCog size={24} />}
        />

        <TarjetaResumen
          titulo="Total ventas"
          valor={`Bs ${metricas.totalVentas.toFixed(2)}`}
          descripcion="Suma detectada en reportes de ventas"
          icono={<ShoppingCart size={24} />}
        />
      </section>

      <TablaDatos
        titulo="Inventario general"
        descripcion="Productos por sucursal, categoría, stock y precio."
        filas={inventario}
        columnasPreferidas={[
          'sucursal',
          'codigo_barra',
          'producto',
          'categoria',
          'stock_actual',
          'stock_minimo',
          'precio_venta',
          'ubicacion',
        ]}
      />

      <TablaDatos
        titulo="Ventas resumidas"
        descripcion="Resumen de ventas cargado desde la vista de la base de datos."
        filas={ventas}
      />

      <TablaDatos
        titulo="Clientes protegidos"
        descripcion="Datos de clientes mostrados desde la vista segura de privacidad."
        filas={clientes}
      />

      <TablaDatos
        titulo="Usuarios y roles"
        descripcion="Usuarios protegidos, roles y relación con sucursales."
        filas={usuarios}
      />

      <TablaDatos
        titulo="Inventario crítico"
        descripcion="Productos que no se encuentran en estado normal."
        filas={inventarioCritico}
        columnasPreferidas={[
          'sucursal',
          'producto',
          'categoria',
          'stock_actual',
          'stock_minimo',
          'estado_stock',
          'ubicacion',
        ]}
      />
      <PanelVentasReales />
      <PanelInventarioTiempoReal />
    </div>
  );
}