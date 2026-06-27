'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  PackageCheck,
  ReceiptText,
  RefreshCcw,
  Search,
  ShoppingCart,
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

function normalizarRespuesta(data: unknown): Registro[] {
  if (Array.isArray(data)) return data as Registro[];
  if (data && typeof data === 'object') return [data as Registro];
  return [];
}

function numero(valor: unknown) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function texto(fila: Registro, campo: string) {
  const valor = fila[campo];
  return valor === null || valor === undefined ? '' : String(valor);
}

function TarjetaVentas({
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

function TablaSimple({
  titulo,
  descripcion,
  filas,
  columnas,
}: {
  titulo: string;
  descripcion: string;
  filas: Registro[];
  columnas: string[];
}) {
  const columnasValidas = columnas.filter(
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
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                {columnasValidas.map((columna) => (
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
              {filas.slice(0, 15).map((fila, index) => (
                <tr key={index} className="hover:bg-orange-50/40">
                  {columnasValidas.map((columna) => (
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

export default function PanelVentasReales() {
  const [ventas, setVentas] = useState<Registro[]>([]);
  const [movimientos, setMovimientos] = useState<Registro[]>([]);
  const [detalleVenta, setDetalleVenta] = useState<Registro[]>([]);
  const [ventaSeleccionada, setVentaSeleccionada] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [error, setError] = useState('');

  async function cargarPanelVentas() {
    try {
      setCargando(true);
      setError('');

      const [resVentas, resMovimientos] = await Promise.all([
        fetch(`${API_URL}/ventas/resumen`),
        fetch(`${API_URL}/inventario/movimientos`),
      ]);

      if (!resVentas.ok || !resMovimientos.ok) {
        throw new Error('No se pudieron cargar ventas o movimientos.');
      }

      setVentas(normalizarRespuesta(await resVentas.json()));
      setMovimientos(normalizarRespuesta(await resMovimientos.json()));
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el historial de ventas.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarPanelVentas();
  }, []);

  const ventasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    if (!q) return ventas;

    return ventas.filter((venta) => {
      return (
        texto(venta, 'id_venta').toLowerCase().includes(q) ||
        texto(venta, 'sucursal').toLowerCase().includes(q) ||
        texto(venta, 'cajero').toLowerCase().includes(q) ||
        texto(venta, 'metodo_pago').toLowerCase().includes(q) ||
        texto(venta, 'estado').toLowerCase().includes(q)
      );
    });
  }, [ventas, busqueda]);

  const metricas = useMemo(() => {
    const totalVendido = ventas.reduce(
      (total, venta) => total + numero(venta.total),
      0,
    );

    const ventasCompletadas = ventas.filter(
      (venta) => texto(venta, 'estado') === 'COMPLETADA',
    ).length;

    const productosMovidos = movimientos.reduce(
      (total, mov) => total + numero(mov.cantidad),
      0,
    );

    return {
      totalVentas: ventas.length,
      totalVendido,
      ventasCompletadas,
      movimientos: movimientos.length,
      productosMovidos,
    };
  }, [ventas, movimientos]);

  async function verDetalleVenta(idVenta: string) {
    try {
      setCargandoDetalle(true);
      setVentaSeleccionada(idVenta);
      setDetalleVenta([]);

      const respuesta = await fetch(`${API_URL}/ventas/${idVenta}/detalle`);

      if (!respuesta.ok) {
        throw new Error('No se pudo cargar el detalle de venta.');
      }

      setDetalleVenta(normalizarRespuesta(await respuesta.json()));
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el detalle de la venta seleccionada.');
    } finally {
      setCargandoDetalle(false);
    }
  }

  if (cargando) {
    return (
      <div className="rounded-3xl border bg-white p-8 text-center font-black text-slate-500">
        Cargando historial de ventas...
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TarjetaVentas
          titulo="Ventas"
          valor={metricas.totalVentas}
          descripcion="Ventas registradas"
          icono={<ReceiptText size={24} />}
        />

        <TarjetaVentas
          titulo="Completadas"
          valor={metricas.ventasCompletadas}
          descripcion="Ventas en estado completada"
          icono={<ShoppingCart size={24} />}
        />

        <TarjetaVentas
          titulo="Total vendido"
          valor={`Bs ${metricas.totalVendido.toFixed(2)}`}
          descripcion="Acumulado en ventas"
          icono={<ReceiptText size={24} />}
        />

        <TarjetaVentas
          titulo="Movimientos"
          valor={metricas.movimientos}
          descripcion={`${metricas.productosMovidos.toFixed(2)} unidades movidas`}
          icono={<PackageCheck size={24} />}
        />
      </div>

      <article className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Historial de ventas reales
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Consulta ventas registradas, detalle de productos y movimientos de inventario.
            </p>
          </div>

          <button
            onClick={cargarPanelVentas}
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
            placeholder="Buscar por ID, sucursal, cajero, método o estado..."
            className="w-full bg-transparent text-sm font-semibold outline-none"
          />
        </div>
      </article>

      <article className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h3 className="text-lg font-black text-slate-900">
            Ventas registradas
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Selecciona una venta para ver el detalle de productos vendidos.
          </p>
        </div>

        {ventasFiltradas.length === 0 ? (
          <div className="p-6 text-center text-sm font-bold text-slate-500">
            No existen ventas para mostrar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  {[
                    'id_venta',
                    'sucursal',
                    'caja',
                    'cajero',
                    'fecha',
                    'subtotal',
                    'descuento',
                    'impuesto',
                    'total',
                    'metodo_pago',
                    'estado',
                    'detalle',
                  ].map((columna) => (
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
                {ventasFiltradas.slice(0, 15).map((venta) => (
                  <tr
                    key={String(venta.id_venta)}
                    className="hover:bg-orange-50/40"
                  >
                    <td
                      className="max-w-[120px] truncate border-b px-4 py-3"
                      title={texto(venta, 'id_venta')}
                    >
                      {texto(venta, 'id_venta')}
                    </td>
                    <td className="border-b px-4 py-3">
                      {texto(venta, 'sucursal')}
                    </td>
                    <td className="border-b px-4 py-3">
                      {texto(venta, 'caja')}
                    </td>
                    <td className="border-b px-4 py-3">
                      {texto(venta, 'cajero')}
                    </td>
                    <td className="border-b px-4 py-3">
                      {texto(venta, 'fecha')}
                    </td>
                    <td className="border-b px-4 py-3">
                      Bs {texto(venta, 'subtotal')}
                    </td>
                    <td className="border-b px-4 py-3">
                      Bs {texto(venta, 'descuento')}
                    </td>
                    <td className="border-b px-4 py-3">
                      Bs {texto(venta, 'impuesto')}
                    </td>
                    <td className="border-b px-4 py-3 font-black">
                      Bs {texto(venta, 'total')}
                    </td>
                    <td className="border-b px-4 py-3">
                      {texto(venta, 'metodo_pago')}
                    </td>
                    <td className="border-b px-4 py-3">
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                        {texto(venta, 'estado')}
                      </span>
                    </td>
                    <td className="border-b px-4 py-3">
                      <button
                        onClick={() => verDetalleVenta(texto(venta, 'id_venta'))}
                        className="rounded-xl bg-orange-600 px-3 py-2 text-xs font-black text-white hover:bg-orange-700"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <TablaSimple
        titulo={
          ventaSeleccionada
            ? `Detalle de venta ${ventaSeleccionada}`
            : 'Detalle de venta'
        }
        descripcion={
          cargandoDetalle
            ? 'Cargando detalle...'
            : 'Productos vendidos, cantidades, precios unitarios y subtotales.'
        }
        filas={detalleVenta}
        columnas={[
          'id_detalle',
          'id_venta',
          'id_producto',
          'producto',
          'cantidad',
          'precio_unitario',
          'subtotal',
        ]}
      />

      <TablaSimple
        titulo="Movimientos de inventario por ventas"
        descripcion="Salidas automáticas generadas al completar ventas."
        filas={movimientos}
        columnas={[
          'id_movimiento',
          'fecha',
          'sucursal',
          'producto',
          'tipo',
          'cantidad',
          'stock_anterior',
          'stock_nuevo',
          'referencia',
          'descripcion',
        ]}
      />
    </section>
  );
}