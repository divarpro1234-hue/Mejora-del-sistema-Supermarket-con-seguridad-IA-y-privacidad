'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  RefreshCcw,
  Search,
  TrendingUp,
} from 'lucide-react';

type ProductoInventario = {
  id_producto: number;
  sucursal: string;
  codigo_barra: string;
  producto: string;
  categoria: string;
  stock_actual: string;
  stock_minimo: string;
  stock_maximo: string;
  estado_stock: string;
  precio_venta: string;
  ubicacion: string;
  updated_at: string;
};

type MovimientoInventario = {
  id_movimiento: string;
  fecha: string;
  sucursal: string;
  producto: string;
  tipo: string;
  cantidad: string;
  stock_anterior: string;
  stock_nuevo: string;
  referencia: string;
  descripcion: string;
};

const API_URL = 'http://localhost:3000/api';

function numero(valor: string | number | undefined) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function formatoFecha(fecha: string) {
  if (!fecha) return '-';

  try {
    return new Date(fecha).toLocaleString('es-BO');
  } catch {
    return fecha;
  }
}

function claseEstado(estado: string) {
  if (estado === 'CRITICO') {
    return 'bg-red-100 text-red-700 border-red-200';
  }

  if (estado === 'ALTO') {
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  }

  return 'bg-green-100 text-green-700 border-green-200';
}

function textoEstado(estado: string) {
  if (estado === 'CRITICO') return 'Stock crítico';
  if (estado === 'ALTO') return 'Stock alto';
  return 'Stock normal';
}

function porcentajeStock(producto: ProductoInventario) {
  const actual = numero(producto.stock_actual);
  const maximo = numero(producto.stock_maximo);

  if (maximo <= 0) return 0;

  return Math.min(100, Math.max(0, (actual / maximo) * 100));
}

function TarjetaInventario({
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

export default function PanelInventarioTiempoReal() {
  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [sucursal, setSucursal] = useState('Todas');
  const [categoria, setCategoria] = useState('Todas');
  const [estado, setEstado] = useState('Todos');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  async function cargarInventario() {
    try {
      setCargando(true);
      setError('');

      const [resProductos, resMovimientos] = await Promise.all([
        fetch(`${API_URL}/productos`),
        fetch(`${API_URL}/inventario/movimientos`),
      ]);

      if (!resProductos.ok || !resMovimientos.ok) {
        throw new Error('No se pudo cargar inventario o movimientos.');
      }

      const productosData = await resProductos.json();
      const movimientosData = await resMovimientos.json();

      setProductos(Array.isArray(productosData) ? productosData : []);
      setMovimientos(Array.isArray(movimientosData) ? movimientosData : []);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el inventario en tiempo real.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarInventario();
  }, []);

  const sucursales = useMemo(() => {
    return ['Todas', ...Array.from(new Set(productos.map((p) => p.sucursal)))];
  }, [productos]);

  const categorias = useMemo(() => {
    return ['Todas', ...Array.from(new Set(productos.map((p) => p.categoria)))];
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    return productos.filter((producto) => {
      const coincideBusqueda =
        producto.producto.toLowerCase().includes(q) ||
        producto.categoria.toLowerCase().includes(q) ||
        producto.codigo_barra.toLowerCase().includes(q) ||
        producto.sucursal.toLowerCase().includes(q);

      const coincideSucursal =
        sucursal === 'Todas' || producto.sucursal === sucursal;

      const coincideCategoria =
        categoria === 'Todas' || producto.categoria === categoria;

      const coincideEstado =
        estado === 'Todos' || producto.estado_stock === estado;

      return (
        coincideBusqueda &&
        coincideSucursal &&
        coincideCategoria &&
        coincideEstado
      );
    });
  }, [productos, busqueda, sucursal, categoria, estado]);

  const metricas = useMemo(() => {
    const criticos = productos.filter((p) => p.estado_stock === 'CRITICO');
    const normales = productos.filter((p) => p.estado_stock === 'NORMAL');
    const altos = productos.filter((p) => p.estado_stock === 'ALTO');

    const unidades = productos.reduce(
      (total, producto) => total + numero(producto.stock_actual),
      0,
    );

    return {
      totalProductos: productos.length,
      criticos: criticos.length,
      normales: normales.length,
      altos: altos.length,
      unidades,
    };
  }, [productos]);

  if (cargando) {
    return (
      <div className="rounded-3xl border bg-white p-8 text-center font-black text-slate-500">
        Cargando inventario en tiempo real...
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
          Inventario en tiempo real
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Control de stock por sucursal, alertas visuales y movimientos recientes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TarjetaInventario
          titulo="Productos visibles"
          valor={metricas.totalProductos}
          descripcion="Productos por sucursal"
          icono={<Boxes size={24} />}
        />

        <TarjetaInventario
          titulo="Stock crítico"
          valor={metricas.criticos}
          descripcion="Requieren reposición"
          icono={<AlertTriangle size={24} />}
        />

        <TarjetaInventario
          titulo="Stock normal"
          valor={metricas.normales}
          descripcion="Dentro del rango esperado"
          icono={<CheckCircle2 size={24} />}
        />

        <TarjetaInventario
          titulo="Unidades"
          valor={metricas.unidades.toFixed(0)}
          descripcion="Stock total acumulado"
          icono={<TrendingUp size={24} />}
        />
      </div>

      <article className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Filtros de inventario
            </h3>
            <p className="text-sm text-slate-500">
              Busca productos por nombre, código, categoría o sucursal.
            </p>
          </div>

          <button
            onClick={cargarInventario}
            className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
          >
            <RefreshCcw size={16} />
            Actualizar
          </button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          <div className="flex items-center gap-2 rounded-2xl border bg-slate-50 px-4 py-3 lg:col-span-1">
            <Search size={18} className="text-slate-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full bg-transparent text-sm font-semibold outline-none"
            />
          </div>

          <select
            value={sucursal}
            onChange={(e) => setSucursal(e.target.value)}
            className="rounded-2xl border bg-white px-4 py-3 text-sm font-bold outline-none"
          >
            {sucursales.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="rounded-2xl border bg-white px-4 py-3 text-sm font-bold outline-none"
          >
            {categorias.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="rounded-2xl border bg-white px-4 py-3 text-sm font-bold outline-none"
          >
            <option value="Todos">Todos</option>
            <option value="CRITICO">Crítico</option>
            <option value="NORMAL">Normal</option>
            <option value="ALTO">Alto</option>
          </select>
        </div>
      </article>

      <article className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h3 className="text-lg font-black text-slate-900">
            Stock por producto y sucursal
          </h3>
          <p className="text-sm text-slate-500">
            Vista operativa para controlar niveles de stock.
          </p>
        </div>

        {productosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-sm font-bold text-slate-500">
            No se encontraron productos con esos filtros.
          </div>
        ) : (
          <div className="grid gap-4 p-5 xl:grid-cols-2">
            {productosFiltrados.slice(0, 30).map((producto) => {
              const porcentaje = porcentajeStock(producto);

              return (
                <div
                  key={`${producto.id_producto}-${producto.sucursal}`}
                  className="rounded-3xl border p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-black text-slate-900">
                        {producto.producto}
                      </p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                        {producto.categoria} · {producto.sucursal}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Código: {producto.codigo_barra} · {producto.ubicacion}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${claseEstado(
                        producto.estado_stock,
                      )}`}
                    >
                      {textoEstado(producto.estado_stock)}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-500">
                        Stock actual
                      </span>
                      <span className="font-black text-slate-900">
                        {numero(producto.stock_actual).toFixed(0)} /{' '}
                        {numero(producto.stock_maximo).toFixed(0)}
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-orange-600"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>

                    <div className="mt-2 flex justify-between text-xs text-slate-500">
                      <span>Mínimo: {numero(producto.stock_minimo).toFixed(0)}</span>
                      <span>Precio: Bs {producto.precio_venta}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </article>

      <article className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h3 className="text-lg font-black text-slate-900">
            Últimos movimientos de inventario
          </h3>
          <p className="text-sm text-slate-500">
            Entradas y salidas generadas por ventas u operaciones.
          </p>
        </div>

        {movimientos.length === 0 ? (
          <div className="p-8 text-center text-sm font-bold text-slate-500">
            No hay movimientos registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  {[
                    'fecha',
                    'sucursal',
                    'producto',
                    'tipo',
                    'cantidad',
                    'stock_anterior',
                    'stock_nuevo',
                    'descripcion',
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
                {movimientos.slice(0, 15).map((movimiento) => (
                  <tr key={movimiento.id_movimiento} className="hover:bg-orange-50/40">
                    <td className="border-b px-4 py-3">
                      {formatoFecha(movimiento.fecha)}
                    </td>
                    <td className="border-b px-4 py-3">
                      {movimiento.sucursal}
                    </td>
                    <td className="border-b px-4 py-3 font-bold">
                      {movimiento.producto}
                    </td>
                    <td className="border-b px-4 py-3">
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">
                        {movimiento.tipo}
                      </span>
                    </td>
                    <td className="border-b px-4 py-3">
                      {movimiento.cantidad}
                    </td>
                    <td className="border-b px-4 py-3">
                      {movimiento.stock_anterior}
                    </td>
                    <td className="border-b px-4 py-3 font-black">
                      {movimiento.stock_nuevo}
                    </td>
                    <td className="border-b px-4 py-3">
                      {movimiento.descripcion}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}