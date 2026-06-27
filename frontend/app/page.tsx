'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  ShoppingCart,
  User,
  MapPin,
  Heart,
  Package,
  ShieldCheck,
  BarChart3,
  LogOut,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react';

import LoginModal from '@/components/LoginModal';


type Categoria = {
  id_categoria: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
};

type Producto = {
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

type ItemCarrito = Producto & {
  cantidad: number;
};

type VentaRegistrada = {
  id_venta: string;
  fecha: string;
  sucursal: string;
  caja: string;
  cajero: string;
  cliente: string;
  metodo_pago: string;
  referencia_pago?: string | null;
  estado_pago?: string | null;
  tarjeta_enmascarada?: string | null;
  codigo_autorizacion?: string | null;
  subtotal: string;
  descuento: string;
  impuesto: string;
  total: string;
  estado: string;

  nombre_factura?: string;
  nit_ci_factura?: string;
};

type SesionUsuario = {
  exito: boolean;
  accion: string;
  riesgo: string;
  severidad: string;
  mensaje: string;
  id_sesion: string | null;
  username: string;
  fecha_login: string;
};


type SesionLocal = {
  username?: string;
  usuario?: string;
  rol?: string;
  role?: string;
  id_sesion?: string | null;
};

type TicketPedido = {
  codigo: string;
  cliente: string;  
  telefonoCi: string;
  sucursal: string;
  fecha: string;
  total: number;
  estado: 'PENDIENTE' | 'CONFIRMADO' | 'CANCELADO' | 'VENCIDO';
  metodoPago?: string | null;
  referenciaPago?: string | null;
  estadoPago?: string | null;
  tarjetaEnmascarada?: string | null;
  codigoAutorizacion?: string | null;
  fechaVencimientoPago?: string | null;
  qrPayload?: any;
  items: Array<{
    id_producto: number;
    producto: string;
    cantidad: number;
    precio_venta: number;
    subtotal: number;
  }>;
};

function obtenerUsernameSesion(sesion: SesionLocal | null) {
  return String(sesion?.username || sesion?.usuario || '').toLowerCase();
}

function obtenerRolSesion(sesion: SesionLocal | null) {
  const rolDirecto = String(sesion?.rol || sesion?.role || '').toUpperCase();
  const username = obtenerUsernameSesion(sesion);

  if (rolDirecto) return rolDirecto;

  if (username === 'admin') return 'ADMIN';
  if (username === 'gerente') return 'GERENTE_GENERAL';
  if (username === 'auditor') return 'AUDITOR';
  if (username === 'ia_bot') return 'SISTEMA_IA';
  if (username.startsWith('cajero_')) return 'CAJERO';
  if (username.startsWith('almacen_')) return 'ALMACENERO';

  return 'SIN_ROL';
}

function puedeVerPanelEmpresarial(sesion: SesionLocal | null) {
  const rol = obtenerRolSesion(sesion);

  return ['ADMIN', 'GERENTE_GENERAL', 'AUDITOR', 'ALMACENERO'].includes(rol);
}

export default function Home() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sucursal, setSucursal] = useState<string>('Supermarket Centro');
  const [categoriaActiva, setCategoriaActiva] = useState<string>('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [cargando, setCargando] = useState(true);

  const [loginAbierto, setLoginAbierto] = useState(false);
  const [sesion, setSesion] = useState<SesionUsuario | null>(null);

  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [comprobante, setComprobante] = useState<VentaRegistrada | null>(null);
  const [mensajeVenta, setMensajeVenta] = useState('');

  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [tarjetaNumero, setTarjetaNumero] = useState('');
  const [tarjetaTitular, setTarjetaTitular] = useState('');
  const [tarjetaVencimiento, setTarjetaVencimiento] = useState('');
  const [tarjetaCvv, setTarjetaCvv] = useState('');
  const [tarjetaEnmascarada, setTarjetaEnmascarada] = useState('');
  const [codigoAutorizacion, setCodigoAutorizacion] = useState('');
  const [montoTarjetaAutorizado, setMontoTarjetaAutorizado] = useState(0);
  const [referenciaQr, setReferenciaQr] = useState('');
  const [codigoCpt, setCodigoCpt] = useState('');
  const [vencimientoCpt, setVencimientoCpt] = useState('');

  const [quiereFactura, setQuiereFactura] = useState(false);
  const [nombreFactura, setNombreFactura] = useState('');
  const [nitCiFactura, setNitCiFactura] = useState('' );
  const [detalleComprobante, setDetalleComprobante] = useState<
    (Producto & { cantidad: number })[]
  >([]);


  const [nombrePedido, setNombrePedido] = useState('');
  const [telefonoCiPedido, setTelefonoCiPedido] = useState('');
  const [ticketPedido, setTicketPedido] = useState<TicketPedido | null>(null);

  const [codigoPedidoBuscar, setCodigoPedidoBuscar] = useState('');
  const [pedidoVirtualEncontrado, setPedidoVirtualEncontrado] = useState<any>(null);
  const [mensajePedidoVirtual, setMensajePedidoVirtual] = useState('');
  const [metodoPagoPedidoVirtual, setMetodoPagoPedidoVirtual] = useState('EFECTIVO');
  const [confirmandoPedidoVirtual, setConfirmandoPedidoVirtual] = useState(false);



  async function cargarDatos() {
  try {
    setCargando(true);

    const [resCategorias, resProductos] = await Promise.all([
      fetch('http://localhost:3000/api/categorias'),
      fetch('http://localhost:3000/api/productos'),
    ]);

    if (!resCategorias.ok || !resProductos.ok) {
      throw new Error('No se pudieron cargar categorías o productos.');
    }

    const dataCategorias = await resCategorias.json();
    const dataProductos = await resProductos.json();

    setCategorias(dataCategorias);
    setProductos(dataProductos);
  } catch (error) {
    console.error('Error cargando datos:', error);
  } finally {
    setCargando(false);
  }
}

useEffect(() => {
  const sesionGuardada = localStorage.getItem('supermarket_sesion');

  if (sesionGuardada) {
    setSesion(JSON.parse(sesionGuardada));
  }

  cargarDatos();
}, []);

function obtenerIdCajaPorSucursal(nombreSucursal: string) {
  const cajasPorSucursal: Record<string, number> = {
    'Supermarket Centro': 1,
    'Supermarket Zona Sur': 3,
    'Supermarket El Alto': 5,
  };

  return cajasPorSucursal[nombreSucursal] || 1;
}

function agregarAlCarrito(producto: Producto) {
  setCarrito((prev) => {
    const hayOtraSucursal =
      prev.length > 0 && prev[0].sucursal !== producto.sucursal;

    if (hayOtraSucursal) {
      setMensajeVenta(
        `El carrito fue cambiado a ${producto.sucursal}. Solo se permite vender productos de una sucursal por comprobante.`,
      );

      return [{ ...producto, cantidad: 1 }];
    }

    const existe = prev.find(
      (item) =>
        item.id_producto === producto.id_producto &&
        item.sucursal === producto.sucursal,
    );

    if (existe) {
      return prev.map((item) =>
        item.id_producto === producto.id_producto &&
        item.sucursal === producto.sucursal
          ? { ...item, cantidad: item.cantidad + 1 }
          : item,
      );
    }

    return [...prev, { ...producto, cantidad: 1 }];
  });

  setComprobante(null);
}

function aumentarCantidad(idProducto: number, sucursalItem: string) {
  setCarrito((prev) =>
    prev.map((item) =>
      item.id_producto === idProducto && item.sucursal === sucursalItem
        ? { ...item, cantidad: item.cantidad + 1 }
        : item,
    ),
  );

  setMensajeVenta('');
  setComprobante(null);
}

function disminuirCantidad(idProducto: number, sucursalItem: string) {
  setCarrito((prev) =>
    prev
      .map((item) =>
        item.id_producto === idProducto && item.sucursal === sucursalItem
          ? { ...item, cantidad: item.cantidad - 1 }
          : item,
      )
      .filter((item) => item.cantidad > 0),
  );

  setMensajeVenta('');
  setComprobante(null);
}

function eliminarProductoCarrito(idProducto: number, sucursalItem: string) {
  setCarrito((prev) =>
    prev.filter(
      (item) =>
        !(item.id_producto === idProducto && item.sucursal === sucursalItem),
    ),
  );

  setMensajeVenta('');
  setComprobante(null);
}

function limpiarEstadoTransaccional() {
  setCarrito([]);
  setMetodoPago('EFECTIVO');
  setMontoRecibido('');
  limpiarDatosPagoElectronico();
  setQuiereFactura(false);
  setNombreFactura('');
  setNitCiFactura('');
  setDetalleComprobante([]);
  setComprobante(null);
  setMensajeVenta('');
  setProcesandoVenta(false);

  setNombrePedido('');
  setTelefonoCiPedido('');
  setTicketPedido(null);
  setCodigoPedidoBuscar('');
  setPedidoVirtualEncontrado(null);
  setMensajePedidoVirtual('');
  setMetodoPagoPedidoVirtual('EFECTIVO');
  setConfirmandoPedidoVirtual(false);
}

function limpiarEstadoPublico() {
  setBusqueda('');
  setCategoriaActiva('Todos');
  setSucursal('Supermarket Centro');
}

function vaciarCarrito() {
  limpiarEstadoTransaccional();
}

function sucursalPorUsuario(username: string) {
  if (username === 'cajero_centro') return 'Supermarket Centro';
  if (username === 'cajero_sur') return 'Supermarket Zona Sur';
  if (username === 'cajero_elalto') return 'Supermarket El Alto';
  if (username === 'almacen_centro') return 'Supermarket Centro';

  return null;
}

function cajaPorSucursal(nombreSucursal: string) {
  if (nombreSucursal === 'Supermarket Centro') return 1;
  if (nombreSucursal === 'Supermarket El Alto') return 2;
  if (nombreSucursal === 'Supermarket Zona Sur') return 3;

  return 1;
}

const usernameSesion = obtenerUsernameSesion(sesion);
const sucursalFijaUsuario = sucursalPorUsuario(usernameSesion);
const esCajero =
  usernameSesion === 'cajero_centro' ||
  usernameSesion === 'cajero_sur' ||
  usernameSesion === 'cajero_elalto';

const sucursalOperativa = esCajero && sucursalFijaUsuario
  ? sucursalFijaUsuario
  : sucursal;

useEffect(() => {
  if (esCajero && sucursalFijaUsuario && sucursal !== sucursalFijaUsuario) {
    setSucursal(sucursalFijaUsuario);
  }
}, [esCajero, sucursalFijaUsuario, sucursal]);  

 async function finalizarCompra() {
  if (carrito.length === 0) {
    setMensajeVenta('El carrito está vacío.');
    return;
  }

  setProcesandoVenta(true);
  setMensajeVenta('');
  setComprobante(null);

  try {
    const sesionGuardada = localStorage.getItem('supermarket_sesion');
    const sesionActual = sesionGuardada ? JSON.parse(sesionGuardada) : null;

    const sucursalVenta = carrito[0].sucursal;

    const carritoMismaSucursal = carrito.every(
      (item) => item.sucursal === sucursalVenta,
    );

    if (!carritoMismaSucursal) {
      throw new Error(
        'El carrito tiene productos de diferentes sucursales. Finaliza una venta por sucursal.',
      );
    }

    const idCaja = obtenerIdCajaPorSucursal(sucursalOperativa);

    const items = carrito.map((item) => ({
      id_producto: Number(item.id_producto),
      cantidad: Number(item.cantidad),
    }));


    if (metodoPago === 'EFECTIVO' && Number(montoRecibido || 0) < totalCarrito) {
      setMensajeVenta('El monto recibido no cubre el total de la venta.');
      return;
    }
    const itemsValidos = items.every(
      (item) =>
        Number.isFinite(item.id_producto) &&
        item.id_producto > 0 &&
        Number.isFinite(item.cantidad) &&
        item.cantidad > 0,
    );

    if (!itemsValidos) {
      throw new Error('Hay productos del carrito sin id_producto válido.');
    }

    const datosPago = obtenerDatosPagoActual();

    if (!datosPago) {
      return;
    }

    const respuesta = await fetch('http://localhost:3000/api/ventas/registrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idCaja,
        idCliente: null,
        metodoPago: datosPago.metodoPago,
        referenciaPago: datosPago.referenciaPago,
        estadoPago: datosPago.estadoPago,
        montoPago: datosPago.montoPago,
        tarjetaEnmascarada: datosPago.tarjetaEnmascarada,
        codigoAutorizacion: datosPago.codigoAutorizacion,
        fechaVencimientoPago: datosPago.fechaVencimientoPago,
        qrPayload: datosPago.qrPayload,
        descuento: 0,
        items,
        idSesion: sesion?.id_sesion || null,
      }),
    });

    const data = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(data.message || 'No se pudo registrar la venta.');
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('La venta se registró, pero no devolvió comprobante.');
    }

    setComprobante({
      ...data[0],
      nombre_factura: quiereFactura
        ? limpiarTexto(nombreFactura) || 'CONSUMIDOR FINAL'
        : 'CONSUMIDOR FINAL',
      nit_ci_factura: quiereFactura
        ? limpiarTexto(nitCiFactura) || 'SIN NIT/CI'
        : 'SIN NIT/CI',
    });
    setDetalleComprobante([...carrito]);
    setMensajeVenta(`Venta registrada correctamente en ${sucursalOperativa}.`);

    setCarrito([]);
    setMontoRecibido('');
    setMetodoPago('EFECTIVO');
    limpiarDatosPagoElectronico();
    setQuiereFactura(false);
    setNombreFactura('');
    setNitCiFactura('');
    setNombrePedido('');
    setTelefonoCiPedido('');
    setTicketPedido(null);
    setCodigoPedidoBuscar('');
    setPedidoVirtualEncontrado(null);
    setMensajePedidoVirtual('');
    setMetodoPagoPedidoVirtual('EFECTIVO');

    await cargarDatos();
  } catch (error) {
    console.warn(error);
    setMensajeVenta(
      error instanceof Error
        ? error.message
        : 'No se pudo finalizar la compra. Revisa el backend.',
    );
  } finally {
    setProcesandoVenta(false);
  }
}

function imprimirComprobante() {
  if (!comprobante) {
    setMensajeVenta('Primero debes registrar una venta.');
    return;
  }

  const ventana = window.open('', '_blank', 'width=800,height=900');

  if (!ventana) {
    setMensajeVenta('No se pudo abrir la ventana de impresión.');
    return;
  }

  const nombreCliente =
  comprobante.nombre_factura || 'CONSUMIDOR FINAL';

const documentoCliente =
  comprobante.nit_ci_factura || 'SIN NIT/CI';

  const detallePagoComprobante = `
          ${comprobante.referencia_pago ? `<strong>Referencia de pago:</strong> ${comprobante.referencia_pago}<br>` : ''}
          ${comprobante.estado_pago ? `<strong>Estado de pago:</strong> ${comprobante.estado_pago}<br>` : ''}
          ${comprobante.tarjeta_enmascarada ? `<strong>Tarjeta:</strong> ${comprobante.tarjeta_enmascarada}<br>` : ''}
          ${comprobante.codigo_autorizacion ? `<strong>Autorización:</strong> ${comprobante.codigo_autorizacion}<br>` : ''}
  `;

  const filasProductos = detalleComprobante
    .map(
      (item) => `
        <tr>
          <td>${item.producto}</td>
          <td style="text-align:center;">${item.cantidad}</td>
          <td style="text-align:right;">Bs ${Number(item.precio_venta).toFixed(2)}</td>
          <td style="text-align:right;">Bs ${(Number(item.precio_venta) * item.cantidad).toFixed(2)}</td>
        </tr>
      `,
    )
    .join('');

  ventana.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Comprobante de venta</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 32px;
            color: #111827;
          }

          .header {
            text-align: center;
            border-bottom: 2px solid #f97316;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }

          .logo {
            display: inline-flex;
            width: 56px;
            height: 56px;
            border-radius: 999px;
            background: #f97316;
            color: white;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 24px;
          }

          h1 {
            margin: 10px 0 4px;
            font-size: 24px;
          }

          .info {
            margin: 18px 0;
            font-size: 14px;
            line-height: 1.7;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            font-size: 14px;
          }

          th {
            background: #f97316;
            color: white;
            padding: 10px;
            text-align: left;
          }

          td {
            border-bottom: 1px solid #e5e7eb;
            padding: 10px;
          }

          .totales {
            margin-top: 20px;
            text-align: right;
            font-size: 15px;
            line-height: 1.8;
          }

          .total-final {
            font-size: 24px;
            font-weight: 900;
            color: #f97316;
          }

          .nota {
            margin-top: 28px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
          }

          @media print {
            button {
              display: none;
            }
          }
        </style>
      </head>

      <body>
        <div class="header">
          <div class="logo">SM</div>
          <h1>Supermarket</h1>
          <p>Comprobante de venta</p>
        </div>

        <div class="info">
          <strong>ID venta:</strong> ${comprobante.id_venta}<br>
          <strong>Sucursal:</strong> ${comprobante.sucursal}<br>
          <strong>Caja:</strong> ${comprobante.caja}<br>
          <strong>Cajero:</strong> ${comprobante.cajero}<br>
          <strong>Fecha:</strong> ${comprobante.fecha}<br>
          <strong>Método de pago:</strong> ${comprobante.metodo_pago}<br>
          ${detallePagoComprobante}
          <strong>Cliente:</strong> ${nombreCliente}<br>
          <strong>NIT / CI:</strong> ${documentoCliente}
        </div>

        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th style="text-align:center;">Cantidad</th>
              <th style="text-align:right;">Precio</th>
              <th style="text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${filasProductos}
          </tbody>
        </table>

        <div class="totales">
          <div><strong>Subtotal:</strong> Bs ${comprobante.subtotal}</div>
          <div><strong>Descuento:</strong> Bs ${comprobante.descuento}</div>
          <div><strong>Impuesto:</strong> Bs ${comprobante.impuesto}</div>
          <div class="total-final">Total: Bs ${comprobante.total}</div>
        </div>

        <p class="nota">
          Documento generado por el sistema Supermarket. No sustituye una factura fiscal oficial.
        </p>

        <script>
          window.print();
        </script>
      </body>
    </html>
  `);

  ventana.document.close();
}


  const sucursales = useMemo(() => {
    return Array.from(new Set(productos.map((p) => p.sucursal)));
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideSucursal = p.sucursal === sucursalOperativa;
      const coincideCategoria =
        categoriaActiva === 'Todos' || p.categoria === categoriaActiva;
      const coincideBusqueda =
        p.producto.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.categoria.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.codigo_barra.includes(busqueda);

      return coincideSucursal && coincideCategoria && coincideBusqueda;
    });
  }, [productos, sucursal, categoriaActiva, busqueda]);

  

 const totalCarrito = carrito.reduce(
  (total, producto) =>
    total + Number(producto.precio_venta) * producto.cantidad,
  0,
);
  const cambio =
    metodoPago === 'EFECTIVO'
      ? Number(montoRecibido || 0) - totalCarrito
      : 0;

  useEffect(() => {
    if (metodoPago === 'QR' && totalCarrito > 0) {
      setReferenciaQr(generarReferenciaPago('QR-SM'));
    }

    if (metodoPago === 'TRANSFERENCIA' && totalCarrito > 0) {
      setCodigoCpt(generarReferenciaPago('SM-CPT'));
      setVencimientoCpt(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
    }

    if (
      metodoPago === 'TARJETA' &&
      codigoAutorizacion &&
      Number(montoTarjetaAutorizado.toFixed(2)) !== Number(totalCarrito.toFixed(2))
    ) {
      setTarjetaEnmascarada('');
      setCodigoAutorizacion('');
      setMontoTarjetaAutorizado(0);
      setMensajeVenta('El total cambió. Valida nuevamente la tarjeta ficticia.');
    }
  }, [metodoPago, totalCarrito, sucursalOperativa]);




 function imagenProducto(producto: Producto) {
  const iniciales = producto.producto
    .split(' ')
    .slice(0, 2)
    .map((palabra) => palabra[0])
    .join('')
    .toUpperCase();

  return (
    <div className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-orange-200 p-3">
      <div className="flex h-full w-full items-center justify-center rounded-xl bg-white/80 p-2 shadow-sm">
        <img
          src={`/productos/${producto.codigo_barra}.jpg`}
          alt={producto.producto}
          className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.style.display = 'none';

            const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;

            if (fallback) {
              fallback.style.display = 'flex';
            }
          }}
        />

        <div className="hidden h-full w-full items-center justify-center text-3xl font-black text-orange-700">
          {iniciales}
        </div>
      </div>
    </div>
  );
}

function claseEstadoStock(estado: string) {
  const e = estado.toUpperCase();

  if (e.includes('NORMAL')) {
    return 'bg-green-100 text-green-700';
  }

  if (e.includes('BAJO')) {
    return 'bg-yellow-100 text-yellow-700';
  }

  if (e.includes('CRITICO') || e.includes('AGOTADO')) {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-orange-600 text-white';
}


    function generarCodigoPedido() {
      const fecha = new Date();
      const anio = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      const aleatorio = Math.floor(1000 + Math.random() * 9000);

      return `PED-${anio}${mes}${dia}-${aleatorio}`;
    }

    function limpiarTexto(valor: string) {
      return valor
        .replaceAll('<', '')
        .replaceAll('>', '')
        .replaceAll('"', '')
        .replaceAll("'", '')
        .trim();
    }

    function soloDigitos(valor: string) {
      return String(valor || '').replace(/\D/g, '');
    }

    function generarReferenciaPago(prefijo: string) {
      const fecha = new Date();
      const anio = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      const hora = String(fecha.getHours()).padStart(2, '0');
      const minuto = String(fecha.getMinutes()).padStart(2, '0');
      const segundo = String(fecha.getSeconds()).padStart(2, '0');
      const aleatorio = Math.floor(1000 + Math.random() * 9000);

      return `${prefijo}-${anio}${mes}${dia}-${hora}${minuto}${segundo}-${aleatorio}`;
    }

    function enmascararTarjeta(numero: string) {
      const digitos = soloDigitos(numero);
      const ultimos = digitos.slice(-4);
      return `**** **** **** ${ultimos}`;
    }

    function limpiarDatosPagoElectronico() {
      setTarjetaNumero('');
      setTarjetaTitular('');
      setTarjetaVencimiento('');
      setTarjetaCvv('');
      setTarjetaEnmascarada('');
      setCodigoAutorizacion('');
      setMontoTarjetaAutorizado(0);
      setReferenciaQr('');
      setCodigoCpt('');
      setVencimientoCpt('');
    }

    function cambiarMetodoPago(nuevoMetodo: string) {
      setMetodoPago(nuevoMetodo);
      setMensajeVenta('');
      setMontoRecibido('');

      if (nuevoMetodo !== 'TARJETA') {
        setTarjetaNumero('');
        setTarjetaTitular('');
        setTarjetaVencimiento('');
        setTarjetaCvv('');
        setTarjetaEnmascarada('');
        setCodigoAutorizacion('');
        setMontoTarjetaAutorizado(0);
      }

      if (nuevoMetodo === 'QR') {
        setReferenciaQr(generarReferenciaPago('QR-SM'));
      }

      if (nuevoMetodo === 'TRANSFERENCIA') {
        const vencimiento = new Date(Date.now() + 24 * 60 * 60 * 1000);
        setCodigoCpt(generarReferenciaPago('SM-CPT'));
        setVencimientoCpt(vencimiento.toISOString());
      }

      if (nuevoMetodo === 'EFECTIVO') {
        setReferenciaQr('');
        setCodigoCpt('');
        setVencimientoCpt('');
      }
    }

    function validarTarjetaFicticia() {
      const numero = soloDigitos(tarjetaNumero);
      const cvv = soloDigitos(tarjetaCvv);
      const vencimientoValido = /^(0[1-9]|1[0-2])\/\d{2}$/.test(tarjetaVencimiento.trim());

      if (numero.length !== 16) {
        setMensajeVenta('El número de tarjeta debe tener 16 dígitos.');
        return;
      }

      if (!tarjetaTitular.trim()) {
        setMensajeVenta('Ingresa el nombre del titular de la tarjeta.');
        return;
      }

      if (!vencimientoValido) {
        setMensajeVenta('El vencimiento debe tener formato MM/AA.');
        return;
      }

      if (cvv.length !== 3) {
        setMensajeVenta('El CVV debe tener 3 dígitos.');
        return;
      }

      const mascara = enmascararTarjeta(numero);
      const autorizacion = generarReferenciaPago('AUT-TAR');

      setTarjetaEnmascarada(mascara);
      setCodigoAutorizacion(autorizacion);
      setMontoTarjetaAutorizado(totalCarrito);
      setMensajeVenta(`Tarjeta validada correctamente. Autorización: ${autorizacion}.`);
    }

    function construirPayloadQr(monto = totalCarrito) {
      return {
        comercio: 'Supermarket',
        sucursal: sucursalOperativa,
        monto: Number(monto.toFixed(2)),
        moneda: 'BOB',
        referencia: referenciaQr || 'QR-SM-PENDIENTE',
        concepto: 'Pago pedido virtual Supermarket',
        generadoEn: new Date().toISOString(),
      };
    }

    function obtenerDatosPagoActual() {
      const monto = Number(totalCarrito.toFixed(2));

      if (metodoPago === 'EFECTIVO') {
        return {
          metodoPago: 'EFECTIVO',
          referenciaPago: null,
          estadoPago: sesion ? 'CONFIRMADO' : 'PENDIENTE',
          montoPago: monto,
          tarjetaEnmascarada: null,
          codigoAutorizacion: null,
          fechaVencimientoPago: null,
          qrPayload: null,
        };
      }

      if (metodoPago === 'TARJETA') {
        if (!codigoAutorizacion || !tarjetaEnmascarada) {
          setMensajeVenta('Primero valida la tarjeta ficticia antes de continuar.');
          return null;
        }

        if (Number(montoTarjetaAutorizado.toFixed(2)) !== monto) {
          setMensajeVenta('El total cambió después de validar la tarjeta. Valida la tarjeta nuevamente.');
          return null;
        }

        return {
          metodoPago: 'TARJETA',
          referenciaPago: codigoAutorizacion,
          estadoPago: 'AUTORIZADO',
          montoPago: monto,
          tarjetaEnmascarada,
          codigoAutorizacion,
          fechaVencimientoPago: null,
          qrPayload: null,
        };
      }

      if (metodoPago === 'QR') {
        const referencia = referenciaQr || generarReferenciaPago('QR-SM');
        const payload = {
          ...construirPayloadQr(monto),
          referencia,
        };

        return {
          metodoPago: 'QR',
          referenciaPago: referencia,
          estadoPago: 'PENDIENTE_CONFIRMACION',
          montoPago: monto,
          tarjetaEnmascarada: null,
          codigoAutorizacion: null,
          fechaVencimientoPago: null,
          qrPayload: payload,
        };
      }

      if (metodoPago === 'TRANSFERENCIA') {
        const referencia = codigoCpt || generarReferenciaPago('SM-CPT');
        const vencimiento = vencimientoCpt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        return {
          metodoPago: 'TRANSFERENCIA',
          referenciaPago: referencia,
          estadoPago: 'PENDIENTE',
          montoPago: monto,
          tarjetaEnmascarada: null,
          codigoAutorizacion: null,
          fechaVencimientoPago: vencimiento,
          qrPayload: null,
        };
      }

      return null;
    }

    function renderQrSimulado(texto: string) {
      const base = String(texto || 'SUPERMARKET');
      const celdas = Array.from({ length: 121 }, (_, index) => {
        const codigo = base.charCodeAt(index % base.length) || 83;
        const fijo =
          index < 22 ||
          index % 11 < 2 ||
          (index % 11 > 8 && index < 55) ||
          (index > 88 && index % 11 > 7);
        const activo = fijo || ((codigo + index * 7) % 5 < 2);

        return (
          <span
            key={index}
            className={`h-2.5 w-2.5 rounded-[2px] ${activo ? 'bg-slate-950' : 'bg-white'}`}
          />
        );
      });

      return (
        <div className="inline-grid grid-cols-11 gap-1 rounded-2xl border bg-white p-4 shadow-sm">
          {celdas}
        </div>
      );
    }

    function renderDetallesPagoResumen(datos: {
      metodoPago?: string | null;
      referenciaPago?: string | null;
      estadoPago?: string | null;
      tarjetaEnmascarada?: string | null;
      codigoAutorizacion?: string | null;
      fechaVencimientoPago?: string | null;
    }) {
      if (!datos?.metodoPago) return null;

      return (
        <div className="mt-4 rounded-2xl border bg-white p-4 text-sm">
          <p className="font-black text-slate-900">Datos de pago</p>
          <p><span className="font-bold">Método:</span> {datos.metodoPago}</p>
          {datos.referenciaPago && <p><span className="font-bold">Referencia:</span> {datos.referenciaPago}</p>}
          {datos.estadoPago && <p><span className="font-bold">Estado de pago:</span> {datos.estadoPago}</p>}
          {datos.tarjetaEnmascarada && <p><span className="font-bold">Tarjeta:</span> {datos.tarjetaEnmascarada}</p>}
          {datos.codigoAutorizacion && <p><span className="font-bold">Autorización:</span> {datos.codigoAutorizacion}</p>}
          {datos.fechaVencimientoPago && (
            <p><span className="font-bold">Válido hasta:</span> {new Date(datos.fechaVencimientoPago).toLocaleString('es-BO')}</p>
          )}
        </div>
      );
    }

    function renderPanelPagoElectronico() {
      if (metodoPago === 'TARJETA') {
        return (
          <div className="mt-4 rounded-3xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">Pago con tarjeta ficticia</p>
                <p className="text-xs font-semibold text-slate-500">
                  La tarjeta se valida de forma simulada. Solo se guarda el número enmascarado.
                </p>
              </div>
              {tarjetaEnmascarada && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                  AUTORIZADA
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={tarjetaNumero}
                onChange={(e) => {
                  setTarjetaNumero(e.target.value.replace(/\D/g, '').slice(0, 16));
                  setTarjetaEnmascarada('');
                  setCodigoAutorizacion('');
                  setMontoTarjetaAutorizado(0);
                }}
                placeholder="Número de tarjeta ficticia, 16 dígitos"
                className="rounded-2xl border bg-white px-4 py-3 text-sm font-bold outline-none focus:border-orange-600"
              />
              <input
                type="text"
                value={tarjetaTitular}
                onChange={(e) => {
                  setTarjetaTitular(e.target.value);
                  setTarjetaEnmascarada('');
                  setCodigoAutorizacion('');
                  setMontoTarjetaAutorizado(0);
                }}
                placeholder="Titular de la tarjeta"
                className="rounded-2xl border bg-white px-4 py-3 text-sm font-bold outline-none focus:border-orange-600"
              />
              <input
                type="text"
                value={tarjetaVencimiento}
                onChange={(e) => setTarjetaVencimiento(e.target.value.slice(0, 5))}
                placeholder="MM/AA"
                className="rounded-2xl border bg-white px-4 py-3 text-sm font-bold outline-none focus:border-orange-600"
              />
              <input
                type="password"
                value={tarjetaCvv}
                onChange={(e) => setTarjetaCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="CVV"
                className="rounded-2xl border bg-white px-4 py-3 text-sm font-bold outline-none focus:border-orange-600"
              />
            </div>

            <button
              type="button"
              onClick={validarTarjetaFicticia}
              className="mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"
            >
              Validar tarjeta ficticia
            </button>

            {tarjetaEnmascarada && (
              <div className="mt-4 rounded-2xl bg-white p-4 text-sm font-bold text-slate-700">
                Tarjeta: {tarjetaEnmascarada} · Autorización: {codigoAutorizacion} · Monto: Bs {totalCarrito.toFixed(2)}
              </div>
            )}
          </div>
        );
      }

      if (metodoPago === 'QR') {
        const referencia = referenciaQr || 'QR-SM-PENDIENTE';
        const payload = JSON.stringify({ ...construirPayloadQr(totalCarrito), referencia });

        return (
          <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
              <div className="text-center">
                {renderQrSimulado(payload)}
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">QR dinámico de pago</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Este QR simulado cambia según el total del carrito. No se conecta a un banco real.
                </p>
                <div className="mt-3 rounded-2xl bg-white p-4 text-sm">
                  <p><span className="font-bold">Monto:</span> Bs {totalCarrito.toFixed(2)}</p>
                  <p><span className="font-bold">Referencia:</span> {referencia}</p>
                  <p><span className="font-bold">Estado:</span> PENDIENTE DE CONFIRMACIÓN</p>
                </div>
              </div>
            </div>
          </div>
        );
      }

      if (metodoPago === 'TRANSFERENCIA') {
        const referencia = codigoCpt || 'SM-CPT-PENDIENTE';
        const vencimiento = vencimientoCpt
          ? new Date(vencimientoCpt).toLocaleString('es-BO')
          : '-';

        return (
          <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-sm font-black text-slate-900">Transferencia tipo CPT</p>
            <p className="mt-1 text-xs font-semibold text-orange-800">
              El sistema genera un código de pago para que el cliente lo use como referencia, similar al flujo CPT.
            </p>
            <div className="mt-4 rounded-2xl border-2 border-dashed border-orange-400 bg-white p-4 text-center">
              <p className="text-xs font-black uppercase text-slate-500">Código CPT</p>
              <p className="text-2xl font-black text-orange-600">{referencia}</p>
            </div>
            <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <p><span className="font-bold">Monto:</span> Bs {totalCarrito.toFixed(2)}</p>
              <p><span className="font-bold">Válido hasta:</span> {vencimiento}</p>
              <p className="md:col-span-2"><span className="font-bold">Concepto:</span> Pedido virtual Supermarket</p>
            </div>
          </div>
        );
      }

      return null;
    }


    async function generarTicketPedido() {
  try {
    setMensajeVenta('');

    if (carrito.length === 0) {
      setMensajeVenta('El carrito está vacío.');
      return;
    }

    if (!nombrePedido.trim()) {
      setMensajeVenta('Ingresa el nombre del cliente para generar el ticket.');
      return;
    }

    if (!telefonoCiPedido.trim()) {
      setMensajeVenta('Ingresa teléfono, CI o referencia del cliente.');
      return;
    }

    const itemsPedido = carrito.map((item) => ({
      id_producto: Number(item.id_producto),
      cantidad: Number(item.cantidad),
    }));

    const datosPago = obtenerDatosPagoActual();

    if (!datosPago) {
      return;
    }

    const respuesta = await fetch(
      'http://localhost:3000/api/pedidos-virtuales/registrar',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cliente: limpiarTexto(nombrePedido),
          telefonoCi: limpiarTexto(telefonoCiPedido),
          sucursal: sucursalOperativa,
          metodoPago: datosPago.metodoPago,
          referenciaPago: datosPago.referenciaPago,
          estadoPago: datosPago.estadoPago,
          montoPago: datosPago.montoPago,
          tarjetaEnmascarada: datosPago.tarjetaEnmascarada,
          codigoAutorizacion: datosPago.codigoAutorizacion,
          fechaVencimientoPago: datosPago.fechaVencimientoPago,
          qrPayload: datosPago.qrPayload,
          items: itemsPedido,
        }),
      },
    );

    const data = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(data.message || 'No se pudo registrar el pedido virtual.');
    }

    if (!Array.isArray(data) || data.length === 0) {
      setMensajeVenta('No se pudo generar el ticket de pedido.');
      return;
    }

    const pedido = data[0];

    setTicketPedido({
      codigo: pedido.codigo,
      cliente: pedido.cliente,
      telefonoCi: pedido.telefono_ci,
      sucursal: pedido.sucursal,
      fecha: new Date(pedido.fecha_creacion).toLocaleString('es-BO'),
      total: Number(pedido.total_estimado || 0),
      estado: pedido.estado,
      metodoPago: pedido.metodo_pago || datosPago.metodoPago,
      referenciaPago: pedido.referencia_pago || datosPago.referenciaPago,
      estadoPago: pedido.estado_pago || datosPago.estadoPago,
      tarjetaEnmascarada: pedido.tarjeta_enmascarada || datosPago.tarjetaEnmascarada,
      codigoAutorizacion: pedido.codigo_autorizacion || datosPago.codigoAutorizacion,
      fechaVencimientoPago: pedido.fecha_vencimiento_pago || datosPago.fechaVencimientoPago,
      qrPayload: pedido.qr_payload || datosPago.qrPayload,
      items: pedido.items || [],
    });

    setMensajeVenta(
      'Ticket de pedido generado y guardado correctamente. Preséntalo en caja para confirmar la compra.',
    );
    setCarrito([]);
    setNombrePedido('');
    setTelefonoCiPedido('');
    setMetodoPago('EFECTIVO');
    setMontoRecibido('');
    limpiarDatosPagoElectronico();
  } catch (error) {
    console.error(error);
    setMensajeVenta('No se pudo generar el ticket de pedido.');
  }
}




function imprimirTicketPedido() {
  if (!ticketPedido) {
    setMensajeVenta('Primero debes generar un ticket de pedido.');
    return;
  }

  const ventana = window.open('', '_blank', 'width=800,height=900');

  if (!ventana) {
    setMensajeVenta('No se pudo abrir la ventana de impresión.');
    return;
  }

  const filasProductos = ticketPedido.items
    .map(
      (item) => `
        <tr>
          <td>${limpiarTexto(item.producto)}</td>
          <td style="text-align:center;">${item.cantidad}</td>
          <td style="text-align:right;">Bs ${Number(item.precio_venta).toFixed(2)}</td>
          <td style="text-align:right;">Bs ${(Number(item.precio_venta) * item.cantidad).toFixed(2)}</td>
        </tr>
      `,
    )
    .join('');

  ventana.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Ticket de pedido</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 32px;
            color: #111827;
          }

          .header {
            text-align: center;
            border-bottom: 2px solid #f97316;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }

          .logo {
            display: inline-flex;
            width: 56px;
            height: 56px;
            border-radius: 999px;
            background: #f97316;
            color: white;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 24px;
          }

          h1 {
            margin: 10px 0 4px;
            font-size: 24px;
          }

          .codigo {
            margin: 20px 0;
            padding: 18px;
            border: 2px dashed #f97316;
            text-align: center;
            font-size: 26px;
            font-weight: 900;
            color: #f97316;
          }

          .info {
            margin: 18px 0;
            font-size: 14px;
            line-height: 1.7;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            font-size: 14px;
          }

          th {
            background: #f97316;
            color: white;
            padding: 10px;
            text-align: left;
          }

          td {
            border-bottom: 1px solid #e5e7eb;
            padding: 10px;
          }

          .total-final {
            margin-top: 20px;
            text-align: right;
            font-size: 24px;
            font-weight: 900;
            color: #f97316;
          }

          .nota {
            margin-top: 28px;
            padding: 14px;
            border-radius: 12px;
            background: #fff7ed;
            color: #9a3412;
            font-size: 13px;
            line-height: 1.6;
          }

          @media print {
            button {
              display: none;
            }
          }
        </style>
      </head>

      <body>
        <div class="header">
          <div class="logo">SM</div>
          <h1>Supermarket</h1>
          <p>Ticket de pedido para pago en sucursal</p>
        </div>

        <div class="codigo">
          ${ticketPedido.codigo}
        </div>

        <div class="info">
          <strong>Cliente:</strong> ${ticketPedido.cliente}<br>
          <strong>Teléfono / CI:</strong> ${ticketPedido.telefonoCi}<br>
          <strong>Sucursal:</strong> ${ticketPedido.sucursal}<br>
          <strong>Fecha:</strong> ${ticketPedido.fecha}<br>
          <strong>Estado:</strong> ${ticketPedido.estado}<br>
          <strong>Método de pago:</strong> ${ticketPedido.metodoPago || 'EFECTIVO'}<br>
          ${ticketPedido.referenciaPago ? `<strong>Referencia:</strong> ${ticketPedido.referenciaPago}<br>` : ''}
          ${ticketPedido.estadoPago ? `<strong>Estado de pago:</strong> ${ticketPedido.estadoPago}<br>` : ''}
          ${ticketPedido.tarjetaEnmascarada ? `<strong>Tarjeta:</strong> ${ticketPedido.tarjetaEnmascarada}<br>` : ''}
          ${ticketPedido.codigoAutorizacion ? `<strong>Autorización:</strong> ${ticketPedido.codigoAutorizacion}<br>` : ''}
          ${ticketPedido.fechaVencimientoPago ? `<strong>Válido hasta:</strong> ${new Date(ticketPedido.fechaVencimientoPago).toLocaleString('es-BO')}<br>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th style="text-align:center;">Cantidad</th>
              <th style="text-align:right;">Precio</th>
              <th style="text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${filasProductos}
          </tbody>
        </table>

        <div class="total-final">
          Total estimado: Bs ${ticketPedido.total.toFixed(2)}
        </div>

        <div class="nota">
          Este ticket no confirma una venta final ni descuenta inventario. 
          Presenta este código en caja para confirmar disponibilidad, realizar el pago y retirar los productos.
        </div>

        <script>
          window.print();
        </script>
      </body>
    </html>
  `);

  ventana.document.close();
}


      async function descargarTicketPedidoPDF() {
        if (!ticketPedido) {
          setMensajeVenta('Primero debes generar un ticket de pedido.');
          return;
        }

        const { default: jsPDF } = await import('jspdf');

        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'letter',
        });

        const margenX = 15;
        let y = 18;

        doc.setFillColor(249, 115, 22);
        doc.roundedRect(margenX, y, 18, 18, 4, 4, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('SM', margenX + 5, y + 12);

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(18);
        doc.text('Supermarket', margenX + 24, y + 7);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('Ticket de pedido para pago y retiro en sucursal', margenX + 24, y + 14);

        y += 28;

        doc.setDrawColor(249, 115, 22);
        doc.setLineWidth(0.8);
        doc.line(margenX, y, 200, y);

        y += 12;

        doc.setTextColor(249, 115, 22);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text(ticketPedido.codigo, 105, y, { align: 'center' });

        y += 10;

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Estado:', margenX, y);
        doc.setFont('helvetica', 'normal');
        doc.text(ticketPedido.estado, margenX + 18, y);

        y += 8;

        doc.setFont('helvetica', 'bold');
        doc.text('Cliente:', margenX, y);
        doc.setFont('helvetica', 'normal');
        doc.text(ticketPedido.cliente || 'CONSUMIDOR FINAL', margenX + 20, y);

        y += 8;

        doc.setFont('helvetica', 'bold');
        doc.text('Teléfono / CI:', margenX, y);
        doc.setFont('helvetica', 'normal');
        doc.text(ticketPedido.telefonoCi || '-', margenX + 32, y);

        y += 8;

        doc.setFont('helvetica', 'bold');
        doc.text('Sucursal de retiro:', margenX, y);
        doc.setFont('helvetica', 'normal');
        doc.text(ticketPedido.sucursal, margenX + 42, y);

        y += 8;

        doc.setFont('helvetica', 'bold');
        doc.text('Fecha:', margenX, y);
        doc.setFont('helvetica', 'normal');
        doc.text(ticketPedido.fecha, margenX + 18, y);

        y += 8;

        doc.setFont('helvetica', 'bold');
        doc.text('Método de pago:', margenX, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(ticketPedido.metodoPago || 'EFECTIVO'), margenX + 36, y);

        y += 8;

        if (ticketPedido.referenciaPago) {
          doc.setFont('helvetica', 'bold');
          doc.text('Referencia:', margenX, y);
          doc.setFont('helvetica', 'normal');
          doc.text(String(ticketPedido.referenciaPago), margenX + 28, y);
          y += 8;
        }

        if (ticketPedido.tarjetaEnmascarada) {
          doc.setFont('helvetica', 'bold');
          doc.text('Tarjeta:', margenX, y);
          doc.setFont('helvetica', 'normal');
          doc.text(String(ticketPedido.tarjetaEnmascarada), margenX + 22, y);
          y += 8;
        }

        if (ticketPedido.codigoAutorizacion) {
          doc.setFont('helvetica', 'bold');
          doc.text('Autorización:', margenX, y);
          doc.setFont('helvetica', 'normal');
          doc.text(String(ticketPedido.codigoAutorizacion), margenX + 32, y);
          y += 8;
        }

        y += 6;

        doc.setFillColor(249, 115, 22);
        doc.rect(margenX, y, 185, 9, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('PRODUCTO', margenX + 2, y + 6);
        doc.text('CANT.', 118, y + 6);
        doc.text('P. UNIT.', 140, y + 6);
        doc.text('SUBTOTAL', 168, y + 6);

        y += 9;

        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        ticketPedido.items.forEach((item) => {
          if (y > 245) {
            doc.addPage();
            y = 20;
          }

          const producto = limpiarTexto(item.producto);
          const cantidad = item.cantidad;
          const precio = Number(item.precio_venta);
          const subtotal = precio * cantidad;

          const nombreCorto =
            producto.length > 42 ? producto.substring(0, 42) + '...' : producto;

          doc.text(nombreCorto, margenX + 2, y + 6);
          doc.text(String(cantidad), 123, y + 6, { align: 'center' });
          doc.text(`Bs ${precio.toFixed(2)}`, 154, y + 6, { align: 'right' });
          doc.text(`Bs ${subtotal.toFixed(2)}`, 195, y + 6, { align: 'right' });

          doc.setDrawColor(226, 232, 240);
          doc.line(margenX, y + 9, 200, y + 9);

          y += 10;
        });

        y += 8;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(249, 115, 22);
        doc.text(`Total estimado: Bs ${ticketPedido.total.toFixed(2)}`, 200, y, {
          align: 'right',
        });

        y += 14;

        doc.setFillColor(255, 247, 237);
        doc.roundedRect(margenX, y, 185, 25, 3, 3, 'F');

        doc.setTextColor(154, 52, 18);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        const nota =
          'Este ticket no confirma una venta final ni descuenta inventario. Presenta este código en caja para confirmar disponibilidad, realizar el pago y retirar los productos.';

        const notaLineas = doc.splitTextToSize(nota, 175);
        doc.text(notaLineas, margenX + 5, y + 8);

        doc.save(`ticket_${ticketPedido.codigo}.pdf`);
      }



      async function buscarPedidoVirtual() {
        try {
          setMensajePedidoVirtual('');
          setPedidoVirtualEncontrado(null);

          const codigo = codigoPedidoBuscar.trim();

          if (!codigo) {
            setMensajePedidoVirtual('Ingresa el código del pedido virtual.');
            return;
          }

          const respuesta = await fetch(
            `http://localhost:3000/api/pedidos-virtuales/${codigo}`,
          );

          const data = await respuesta.json();

          if (!Array.isArray(data) || data.length === 0) {
            setMensajePedidoVirtual('No se encontró ningún pedido con ese código.');
            return;
          }

          setPedidoVirtualEncontrado(data[0]);
          setMetodoPagoPedidoVirtual(data[0]?.metodo_pago || 'EFECTIVO');
          setMensajePedidoVirtual('Pedido encontrado correctamente.');
        } catch (error) {
          console.error(error);
          setMensajePedidoVirtual('No se pudo buscar el pedido virtual.');
        }
      }

      async function confirmarPedidoVirtualDesdeInterfaz() {
        try {
          setMensajePedidoVirtual('');
          setConfirmandoPedidoVirtual(true);

          if (!pedidoVirtualEncontrado?.codigo) {
            setMensajePedidoVirtual('Primero busca un pedido virtual.');
            return;
          }

          if (pedidoVirtualEncontrado.estado !== 'PENDIENTE') {
            setMensajePedidoVirtual(
              `Este pedido no se puede confirmar porque está en estado ${pedidoVirtualEncontrado.estado}.`,
            );
            return;
          }

          const respuesta = await fetch(
            `http://localhost:3000/api/pedidos-virtuales/${pedidoVirtualEncontrado.codigo}/confirmar`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                metodoPago: metodoPagoPedidoVirtual || pedidoVirtualEncontrado.metodo_pago || 'EFECTIVO',
                referenciaPago: pedidoVirtualEncontrado.referencia_pago || null,
                estadoPago: 'CONFIRMADO',
                montoPago: pedidoVirtualEncontrado.monto_pago || pedidoVirtualEncontrado.total_estimado,
                tarjetaEnmascarada: pedidoVirtualEncontrado.tarjeta_enmascarada || null,
                codigoAutorizacion: pedidoVirtualEncontrado.codigo_autorizacion || null,
                fechaVencimientoPago: pedidoVirtualEncontrado.fecha_vencimiento_pago || null,
                qrPayload: pedidoVirtualEncontrado.qr_payload || null,
                idSesion: sesion?.id_sesion || null,
              }),
            },
          );

          const data = await respuesta.json();

          if (!respuesta.ok) {
            throw new Error(data.message || 'No se pudo confirmar el pedido.');
          }

          if (!Array.isArray(data) || data.length === 0 || !data[0].exito) {
            setMensajePedidoVirtual(
              data?.[0]?.mensaje || 'No se pudo confirmar el pedido virtual.',
            );
            return;
          }

          setMensajePedidoVirtual('Pedido confirmado y venta registrada correctamente.');

          const codigoConfirmado = pedidoVirtualEncontrado.codigo;

          const pedidoActualizado = await fetch(
            `http://localhost:3000/api/pedidos-virtuales/${codigoConfirmado}`,
          );

          const pedidoActualizadoData = await pedidoActualizado.json();

          if (Array.isArray(pedidoActualizadoData) && pedidoActualizadoData.length > 0) {
            setPedidoVirtualEncontrado(pedidoActualizadoData[0]);
          }
        } catch (error) {
          console.error(error);
          setMensajePedidoVirtual('No se pudo confirmar el pedido virtual.');
        } finally {
          setConfirmandoPedidoVirtual(false);
        }
      }



      function imprimirFacturaPedidoVirtual() {
        if (!pedidoVirtualEncontrado) {
          setMensajePedidoVirtual('Primero busca un pedido virtual confirmado.');
          return;
        }

        if (pedidoVirtualEncontrado.estado !== 'CONFIRMADO') {
          setMensajePedidoVirtual('Solo se puede imprimir la factura cuando el pedido ya fue confirmado.');
          return;
        }

        const ventana = window.open('', '_blank', 'width=900,height=700');

        if (!ventana) {
          setMensajePedidoVirtual('No se pudo abrir la ventana de impresión.');
          return;
        }

        const filasProductos = (pedidoVirtualEncontrado.items || [])
          .map(
            (item: any) => `
              <tr>
                <td>${item.producto}</td>
                <td style="text-align:center;">${item.cantidad}</td>
                <td style="text-align:right;">Bs ${Number(item.precio_venta || 0).toFixed(2)}</td>
                <td style="text-align:right;">Bs ${Number(item.subtotal || 0).toFixed(2)}</td>
              </tr>
            `,
          )
          .join('');

        ventana.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Factura - ${pedidoVirtualEncontrado.codigo}</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  padding: 32px;
                  color: #111827;
                }

                .header {
                  display: flex;
                  justify-content: space-between;
                  border-bottom: 2px solid #111827;
                  padding-bottom: 16px;
                  margin-bottom: 24px;
                }

                .logo {
                  font-size: 28px;
                  font-weight: 900;
                  color: #f04405;
                }

                .badge {
                  border: 1px solid #111827;
                  border-radius: 12px;
                  padding: 10px 14px;
                  font-weight: 700;
                  text-align: center;
                }

                h1 {
                  margin: 0;
                  font-size: 24px;
                }

                .info {
                  margin: 16px 0;
                  line-height: 1.7;
                }

                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 20px;
                }

                th, td {
                  border: 1px solid #111827;
                  padding: 10px;
                  font-size: 14px;
                }

                th {
                  background: #f1f5f9;
                  text-align: left;
                }

                .total {
                  margin-top: 24px;
                  text-align: right;
                  font-size: 24px;
                  font-weight: 900;
                }

                .footer {
                  margin-top: 32px;
                  font-size: 12px;
                  color: #475569;
                  border-top: 1px solid #cbd5e1;
                  padding-top: 12px;
                }

                @media print {
                  button {
                    display: none;
                  }
                }
              </style>
            </head>

            <body>
              <div class="header">
                <div>
                  <div class="logo">Supermarket</div>
                  <p>Sistema empresarial de supermercado</p>
                </div>

                <div class="badge">
                  FACTURA / COMPROBANTE<br />
                  ${pedidoVirtualEncontrado.codigo}
                </div>
              </div>

              <h1>Comprobante de venta</h1>

              <div class="info">
                <strong>Cliente:</strong> ${pedidoVirtualEncontrado.cliente}<br />
                <strong>Teléfono / CI:</strong> ${pedidoVirtualEncontrado.telefono_ci}<br />
                <strong>Sucursal:</strong> ${pedidoVirtualEncontrado.sucursal}<br />
                <strong>Estado:</strong> ${pedidoVirtualEncontrado.estado}<br />
                <strong>ID venta:</strong> ${pedidoVirtualEncontrado.id_venta || '-'}<br />
                <strong>Método de pago:</strong> ${pedidoVirtualEncontrado.metodo_pago || 'EFECTIVO'}<br />
                ${pedidoVirtualEncontrado.referencia_pago ? `<strong>Referencia de pago:</strong> ${pedidoVirtualEncontrado.referencia_pago}<br />` : ''}
                ${pedidoVirtualEncontrado.estado_pago ? `<strong>Estado de pago:</strong> ${pedidoVirtualEncontrado.estado_pago}<br />` : ''}
                ${pedidoVirtualEncontrado.tarjeta_enmascarada ? `<strong>Tarjeta:</strong> ${pedidoVirtualEncontrado.tarjeta_enmascarada}<br />` : ''}
                ${pedidoVirtualEncontrado.codigo_autorizacion ? `<strong>Autorización:</strong> ${pedidoVirtualEncontrado.codigo_autorizacion}<br />` : ''}
                <strong>Fecha de confirmación:</strong> ${
                  pedidoVirtualEncontrado.fecha_confirmacion
                    ? new Date(pedidoVirtualEncontrado.fecha_confirmacion).toLocaleString('es-BO')
                    : '-'
                }
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio unitario</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${filasProductos}
                </tbody>
              </table>

              <div class="total">
                Total pagado: Bs ${Number(pedidoVirtualEncontrado.total_estimado || 0).toFixed(2)}
              </div>

              <div class="footer">
                Documento generado para respaldo de compra virtual confirmada en caja.
                Este comprobante corresponde al pedido ${pedidoVirtualEncontrado.codigo}.
              </div>

              <script>
                window.onload = function() {
                  window.print();
                };
              </script>
            </body>
          </html>
        `);

        ventana.document.close();
      }





 function cerrarSesion() {
    localStorage.removeItem('supermarket_sesion');
    setSesion(null);
    setLoginAbierto(false);
    limpiarEstadoTransaccional();
    limpiarEstadoPublico();
    cargarDatos();
  }

  function loginCorrecto(data: SesionUsuario) {
    limpiarEstadoTransaccional();
    setSesion(data);

    const username = obtenerUsernameSesion(data);
    const sucursalUsuario = sucursalPorUsuario(username);

    if (sucursalUsuario) {
      setSucursal(sucursalUsuario);
    }
  }


  return (
    <main className="min-h-screen bg-[#f8f8f8] text-slate-900">
      <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-600 text-lg font-black text-white">
              SM
            </div>
            <div>
              <h1 className="text-lg font-black leading-none text-orange-600">
                Supermarket
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Sistema empresarial seguro
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border bg-slate-50 px-3 py-2 md:flex">
            <MapPin size={17} className="text-orange-600" />
            <select
              value={sucursal}
              onChange={(e) => setSucursal(e.target.value)}
              disabled={esCajero}
              className="bg-transparent text-sm font-semibold outline-none"
            >
              {sucursales.length === 0 ? (
                <option>Supermarket Centro</option>
              ) : (
                sucursales.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex flex-1 items-center rounded-full border bg-slate-50 px-4 py-2">
            <Search size={18} className="text-slate-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto, categoría o código..."
              className="w-full bg-transparent px-3 text-sm outline-none"
            />
          </div>

          {sesion ? (
              <div className="hidden items-center gap-2 md:flex">
                {puedeVerPanelEmpresarial(sesion) && (
                    <a
                      href="/admin"
                      className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                    >
                      Panel empresarial
                    </a>
                  )}

                <div className="flex items-center gap-2 rounded-full border bg-green-50 px-3 py-2 text-sm font-black text-green-700">
                  <ShieldCheck size={18} />
                  {sesion.username}

                  <button
                    onClick={cerrarSesion}
                    className="ml-2 rounded-full bg-white p-1 text-slate-500 hover:text-red-600"
                    title="Cerrar sesión"
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setLoginAbierto(true)}
                className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 md:flex"
              >
                <User size={18} />
                Iniciar sesión
              </button>


              
            )}

          <button className="relative flex items-center gap-2 rounded-full bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700">
            <ShoppingCart size={18} />
            <span className="hidden md:inline">Carrito</span>
            {carrito.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-xs">
                {carrito.length}
              </span>
            )}
          </button>
        </div>

        <nav className="bg-orange-600">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2">
            <button
              onClick={() => setCategoriaActiva('Todos')}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-black uppercase ${
                categoriaActiva === 'Todos'
                  ? 'bg-white text-orange-600'
                  : 'text-white hover:bg-orange-700'
              }`}
            >
              Todos
            </button>

            {categorias.map((cat) => (
              <button
                key={cat.id_categoria}
                onClick={() => setCategoriaActiva(cat.nombre)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-black uppercase ${
                  categoriaActiva === cat.nombre
                    ? 'bg-white text-orange-600'
                    : 'text-white hover:bg-orange-700'
                }`}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-blue-700 to-orange-500 p-8 text-white shadow-lg">
              <p className="mb-2 text-sm font-bold uppercase tracking-widest text-orange-200">
                {sesion ? 'COMPRA RÁPIDA Y SEGURA' : 'PEDIDO VIRTUAL'}
              </p>

              <h2 className="max-w-2xl text-4xl font-black">
                {sesion
                  ? 'Encuentra productos y registra ventas por sucursal'
                  : 'Arma tu pedido y recógelo en sucursal'}
              </h2>

              <p className="mt-3 max-w-2xl text-sm text-blue-50">
                {sesion
                  ? 'Revisa el stock disponible, agrega productos al carrito y finaliza la venta con la caja correspondiente.'
                  : 'Agrega productos al carrito, genera tu ticket PDF y preséntalo en caja para confirmar el pago.'}
              </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                <p className="text-xs text-blue-100">{sesion ? 'Sucursal activa' : 'Sucursal de retiro'}</p>
                <p className="font-black">{sucursal}</p>
              </div>

              <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                <p className="text-xs text-blue-100">Productos visibles</p>
                <p className="font-black">{productosFiltrados.length}</p>
              </div>

              <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                <p className="text-xs text-blue-100">Total carrito</p>
                <p className="font-black">Bs {totalCarrito.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-black">{sesion ? 'Acciones rápidas' : 'Compra como visitante'}</h3>

            <div className="grid gap-3">
              {sesion ? (
                <>
                  <div className="flex items-center gap-3 rounded-2xl border p-3">
                    <Package size={22} />
                    <div>
                      <p className="text-sm font-black">Stock disponible</p>
                      <p className="text-xs text-slate-500">
                        Consulta productos por sucursal
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border p-3">
                    <ShieldCheck size={22} />
                    <div>
                      <p className="text-sm font-black">Venta segura</p>
                      <p className="text-xs text-slate-500">
                        Registra ventas con usuario activo
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border p-3">
                    <BarChart3 size={22} />
                    <div>
                      <p className="text-sm font-black">Comprobante</p>
                      <p className="text-xs text-slate-500">
                        Visualiza el detalle al finalizar
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 rounded-2xl border p-3">
                    <Package size={22} />
                    <div>
                      <p className="text-sm font-black">Productos disponibles</p>
                      <p className="text-xs text-slate-500">
                        Explora el catálogo por sucursal
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border p-3">
                    <ShieldCheck size={22} />
                    <div>
                      <p className="text-sm font-black">Ticket de pedido</p>
                      <p className="text-xs text-slate-500">
                        Genera un código para caja
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border p-3">
                    <BarChart3 size={22} />
                    <div>
                      <p className="text-sm font-black">Descargar PDF</p>
                      <p className="text-xs text-slate-500">
                        Guarda el ticket en tu celular
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black">
              {categoriaActiva === 'Todos' ? 'Productos disponibles' : categoriaActiva}
            </h2>
            <p className="text-sm text-slate-500">
              Selecciona productos disponibles en {sucursalOperativa}.
            </p>
          </div>

          <button className="text-sm font-black text-orange-600 hover:underline">
            Ver más
          </button>
        </div>

        {cargando ? (
          <div className="rounded-3xl bg-white p-10 text-center font-bold shadow-sm">
            Cargando productos...
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center font-bold shadow-sm">
            No se encontraron productos.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {productosFiltrados.map((producto) => (
              <article
                key={`${producto.sucursal}-${producto.codigo_barra}`}
                className="group rounded-3xl bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative">
                  {imagenProducto(producto)}

                  <button className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow">
                    <Heart size={16} className="text-slate-500" />
                  </button>

                  <span
                    className={`absolute left-2 top-2 rounded-full px-2 py-1 text-xs font-black ${claseEstadoStock(
                      producto.estado_stock,
                    )}`}
                  >
                    {producto.estado_stock}
                  </span>
                </div>

                <div className="p-2">
                  <p className="mt-2 line-clamp-2 min-h-10 text-sm font-black">
                    {producto.producto}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {producto.categoria} · {producto.ubicacion}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Stock: {Number(producto.stock_actual).toFixed(0)} unidades
                  </p>

                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-lg font-black text-slate-900">
                      Bs {Number(producto.precio_venta).toFixed(2)}
                    </p>
                  </div>

                  <button
                    onClick={() => agregarAlCarrito(producto)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-3 py-2 text-sm font-black text-white hover:bg-orange-700"
                  >
                    <ShoppingCart size={16} />
                    Agregar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        
            {sesion && (
              <section className="mx-auto mt-10 max-w-7xl rounded-3xl bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black">Atender pedido virtual</h2>
                    <p className="text-sm text-slate-500">
                      Busca el código del ticket presentado por el cliente y confirma la venta en caja.
                    </p>
                  </div>

                  <span className="rounded-full bg-orange-100 px-4 py-2 text-xs font-black text-orange-700">
                    Personal autorizado
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
                  <input
                    value={codigoPedidoBuscar}
                    onChange={(e) => setCodigoPedidoBuscar(e.target.value)}
                    placeholder="Ej: PED-20260612-9866"
                    className="rounded-2xl border px-4 py-3 text-sm font-bold outline-none"
                  />

                  <select
                    value={metodoPagoPedidoVirtual}
                    onChange={(e) => setMetodoPagoPedidoVirtual(e.target.value)}
                    className="rounded-2xl border px-4 py-3 text-sm font-bold outline-none"
                  >
                    <option value="EFECTIVO">EFECTIVO</option>
                    <option value="TARJETA">TARJETA</option>
                    <option value="QR">QR</option>
                    <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                  </select>

                  <button
                    type="button"
                    onClick={buscarPedidoVirtual}
                    className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white"
                  >
                    Buscar pedido
                  </button>
                </div>

                {pedidoVirtualEncontrado && (
                  <div className="mt-5 rounded-3xl border p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500">
                          Código de pedido
                        </p>
                        <h3 className="text-xl font-black">
                          {pedidoVirtualEncontrado.codigo}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Cliente: {pedidoVirtualEncontrado.cliente} · Tel/CI:{' '}
                          {pedidoVirtualEncontrado.telefono_ci}
                        </p>
                        <p className="text-sm text-slate-500">
                          Sucursal: {pedidoVirtualEncontrado.sucursal}
                        </p>
                        <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm">
                          <p><span className="font-bold">Método de pago:</span> {pedidoVirtualEncontrado.metodo_pago || metodoPagoPedidoVirtual}</p>
                          {pedidoVirtualEncontrado.referencia_pago && (
                            <p><span className="font-bold">Referencia:</span> {pedidoVirtualEncontrado.referencia_pago}</p>
                          )}
                          {pedidoVirtualEncontrado.tarjeta_enmascarada && (
                            <p><span className="font-bold">Tarjeta:</span> {pedidoVirtualEncontrado.tarjeta_enmascarada}</p>
                          )}
                          {pedidoVirtualEncontrado.codigo_autorizacion && (
                            <p><span className="font-bold">Autorización:</span> {pedidoVirtualEncontrado.codigo_autorizacion}</p>
                          )}
                          {pedidoVirtualEncontrado.fecha_vencimiento_pago && (
                            <p><span className="font-bold">Válido hasta:</span> {new Date(pedidoVirtualEncontrado.fecha_vencimiento_pago).toLocaleString('es-BO')}</p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`rounded-full px-4 py-2 text-xs font-black ${
                            pedidoVirtualEncontrado.estado === 'PENDIENTE'
                              ? 'bg-yellow-100 text-yellow-700'
                              : pedidoVirtualEncontrado.estado === 'CONFIRMADO'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {pedidoVirtualEncontrado.estado}
                        </span>

                        <p className="mt-3 text-2xl font-black text-orange-600">
                          Bs {Number(pedidoVirtualEncontrado.total_estimado || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 overflow-x-auto rounded-2xl border">
                      <table className="w-full min-w-[700px] text-sm">
                        <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Producto</th>
                            <th className="px-4 py-3">Cantidad</th>
                            <th className="px-4 py-3">Precio</th>
                            <th className="px-4 py-3">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(pedidoVirtualEncontrado.items || []).map(
                            (item: any, index: number) => (
                              <tr key={index} className="border-t">
                                <td className="px-4 py-3 font-bold">{item.producto}</td>
                                <td className="px-4 py-3">{item.cantidad}</td>
                                <td className="px-4 py-3">
                                  Bs {Number(item.precio_venta || 0).toFixed(2)}
                                </td>
                                <td className="px-4 py-3">
                                  Bs {Number(item.subtotal || 0).toFixed(2)}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>

                    {pedidoVirtualEncontrado.id_venta && (
                      <div className="mt-4 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700">
                        Venta registrada: {pedidoVirtualEncontrado.id_venta}
                      </div>
                    )}


                    {pedidoVirtualEncontrado.estado === 'CONFIRMADO' && (
                      <button
                        type="button"
                        onClick={imprimirFacturaPedidoVirtual}
                        className="mt-4 w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white"
                      >
                        Imprimir factura / comprobante del cliente
                      </button>
                    )}




                    <button
                      type="button"
                      onClick={confirmarPedidoVirtualDesdeInterfaz}
                      disabled={
                        confirmandoPedidoVirtual ||
                        pedidoVirtualEncontrado.estado !== 'PENDIENTE'
                      }
                      className="mt-5 w-full rounded-2xl bg-orange-600 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {confirmandoPedidoVirtual
                        ? 'Confirmando pedido...'
                        : pedidoVirtualEncontrado.estado === 'PENDIENTE'
                          ? 'Confirmar pedido y registrar venta'
                          : 'Pedido ya procesado'}
                    </button>
                  </div>
                )}

                {mensajePedidoVirtual && (
                  <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-700">
                    {mensajePedidoVirtual}
                  </div>
                )}
              </section>
            )}

          <div className="mt-8 rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black">Carrito de compra</h3>
                <p className="text-sm text-slate-500">
                  Revisa los productos agregados y selecciona el método de pago.
                </p>
              </div>

              <div className="rounded-2xl bg-orange-100 px-4 py-2 text-sm font-black text-orange-700">
                {carrito.length} productos
              </div>
            </div>

            {carrito.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-center text-sm font-bold text-slate-500">
                Todavía no agregaste productos al carrito.
              </div>
            ) : (
              <div className="grid gap-3">
                {carrito.map((item) => (
                <div
                  key={`${item.id_producto}-${item.sucursal}`}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-3"
                >
                  <div>
                    <p className="font-black">{item.producto}</p>
                    <p className="text-xs text-slate-500">
                      {item.categoria} · Sucursal: {item.sucursal}
                    </p>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => disminuirCantidad(item.id_producto, item.sucursal)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border bg-white font-black hover:bg-red-50 hover:text-red-600"
                      >
                        <Minus size={16} />
                      </button>

                      <span className="min-w-[42px] rounded-xl bg-slate-100 px-3 py-2 text-center text-sm font-black">
                        {item.cantidad}
                      </span>

                      <button
                        type="button"
                        onClick={() => aumentarCantidad(item.id_producto, item.sucursal)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border bg-white font-black hover:bg-green-50 hover:text-green-600"
                      >
                        <Plus size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminarProductoCarrito(item.id_producto, item.sucursal)}
                        className="ml-2 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-100"
                      >
                        <Trash2 size={15} />
                        Quitar
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-500">
                      Bs {Number(item.precio_venta).toFixed(2)} c/u
                    </p>

                    <p className="text-lg font-black">
                      Bs {(Number(item.precio_venta) * item.cantidad).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}

              {carrito.length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={vaciarCarrito}
                      className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-600 hover:bg-red-100"
                    >
                      Vaciar carrito
                    </button>
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between border-t pt-4">
                  <p className="text-sm font-bold text-slate-500">Total</p>
                  <p className="text-2xl font-black">
                    Bs {totalCarrito.toFixed(2)}
                  </p>

                  
                </div>


                  {sesion ? (
                    <>
                      <div className="mt-5 rounded-3xl border bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-900">Método de pago</p>
                            <p className="text-xs font-semibold text-slate-500">
                              Selecciona cómo pagará el cliente.
                            </p>
                          </div>

                          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">
                            {metodoPago}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                          {['EFECTIVO', 'TARJETA', 'QR', 'TRANSFERENCIA'].map((metodo) => (
                            <button
                              key={metodo}
                              type="button"
                              onClick={() => cambiarMetodoPago(metodo)}
                              className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                                metodoPago === metodo
                                  ? 'border-orange-600 bg-orange-600 text-white shadow-md'
                                  : 'border-slate-300 bg-white text-slate-700 hover:bg-orange-50'
                              }`}
                            >
                              {metodo}
                            </button>
                          ))}
                        </div>

                        {metodoPago === 'EFECTIVO' && (
                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <div>
                              <label className="text-xs font-black uppercase text-slate-500">
                                Total a pagar
                              </label>
                              <div className="mt-1 rounded-2xl border bg-white px-4 py-3 text-lg font-black">
                                Bs {totalCarrito.toFixed(2)}
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-black uppercase text-slate-500">
                                Monto recibido
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={montoRecibido}
                                onChange={(e) => setMontoRecibido(e.target.value)}
                                placeholder="Ej: 50"
                                className="mt-1 w-full rounded-2xl border bg-white px-4 py-3 text-lg font-black outline-none focus:border-orange-600"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-black uppercase text-slate-500">
                                Cambio
                              </label>
                              <div
                                className={`mt-1 rounded-2xl border px-4 py-3 text-lg font-black ${
                                  cambio >= 0
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-red-50 text-red-700'
                                }`}
                              >
                                Bs {Number.isFinite(cambio) ? cambio.toFixed(2) : '0.00'}
                              </div>
                            </div>
                          </div>
                        )}

                        {renderPanelPagoElectronico()}
                      </div>

                      <div className="mt-5 rounded-3xl border bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-900">
                              Comprobante para el cliente
                            </p>
                            <p className="text-xs font-semibold text-slate-500">
                              Opcionalmente registra nombre y NIT/CI para imprimir el comprobante.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setQuiereFactura(!quiereFactura)}
                            className={`rounded-2xl px-4 py-2 text-sm font-black ${
                              quiereFactura
                                ? 'bg-orange-600 text-white'
                                : 'border bg-white text-slate-700'
                            }`}
                          >
                            {quiereFactura ? 'Con datos' : 'Consumidor final'}
                          </button>
                        </div>

                        {quiereFactura && (
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div>
                              <label className="text-xs font-black uppercase text-slate-500">
                                Nombre o razón social
                              </label>
                              <input
                                type="text"
                                value={nombreFactura}
                                onChange={(e) => setNombreFactura(e.target.value)}
                                placeholder="Ej: Juan Pérez"
                                className="mt-1 w-full rounded-2xl border bg-white px-4 py-3 text-sm font-bold outline-none focus:border-orange-600"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-black uppercase text-slate-500">
                                NIT / CI
                              </label>
                              <input
                                type="text"
                                value={nitCiFactura}
                                onChange={(e) => setNitCiFactura(e.target.value)}
                                placeholder="Ej: 1234567"
                                className="mt-1 w-full rounded-2xl border bg-white px-4 py-3 text-sm font-bold outline-none focus:border-orange-600"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={finalizarCompra}
                        disabled={procesandoVenta || carrito.length === 0}
                        className="mt-4 w-full rounded-2xl bg-orange-600 px-4 py-3 text-sm font-black text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {procesandoVenta ? 'Procesando venta...' : 'Finalizar compra'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="mt-6 rounded-3xl border bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-900">
                              Pedido virtual para recoger en tienda
                            </p>
                            <p className="text-xs font-semibold text-slate-500">
                              Genera un ticket y preséntalo en caja para confirmar el pago y retirar tus productos.
                            </p>
                          </div>

                          <span className="rounded-full bg-orange-100 px-4 py-2 text-xs font-black text-orange-700">
                            Sin sesión
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div>
                            <label className="text-xs font-black uppercase text-slate-500">
                              Nombre del cliente
                            </label>
                            <input
                              type="text"
                              value={nombrePedido}
                              onChange={(e) => setNombrePedido(e.target.value)}
                              placeholder="Ej: Juan Pérez"
                              className="mt-1 w-full rounded-2xl border bg-white px-4 py-3 text-sm font-bold outline-none focus:border-orange-600"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-black uppercase text-slate-500">
                              Teléfono / CI
                            </label>
                            <input
                              type="text"
                              value={telefonoCiPedido}
                              onChange={(e) => setTelefonoCiPedido(e.target.value)}
                              placeholder="Ej: 76543210"
                              className="mt-1 w-full rounded-2xl border bg-white px-4 py-3 text-sm font-bold outline-none focus:border-orange-600"
                            />
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl bg-white p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-black uppercase text-slate-500">
                                Sucursal de retiro
                              </p>
                              <p className="text-lg font-black text-slate-900">
                                {sucursalOperativa}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-xs font-black uppercase text-slate-500">
                                Total estimado
                              </p>
                              <p className="text-2xl font-black text-orange-600">
                                Bs {totalCarrito.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 rounded-3xl border bg-white p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-slate-900">Método de pago</p>
                              <p className="text-xs font-semibold text-slate-500">
                                Elige cómo se pagará el pedido al momento de confirmar en caja.
                              </p>
                            </div>
                            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">
                              {metodoPago}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-4">
                            {['EFECTIVO', 'TARJETA', 'QR', 'TRANSFERENCIA'].map((metodo) => (
                              <button
                                key={metodo}
                                type="button"
                                onClick={() => cambiarMetodoPago(metodo)}
                                className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                                  metodoPago === metodo
                                    ? 'border-orange-600 bg-orange-600 text-white shadow-md'
                                    : 'border-slate-300 bg-white text-slate-700 hover:bg-orange-50'
                                }`}
                              >
                                {metodo}
                              </button>
                            ))}
                          </div>

                          {renderPanelPagoElectronico()}
                        </div>

                        <button
                          type="button"
                          onClick={generarTicketPedido}
                          disabled={carrito.length === 0}
                          className="mt-4 w-full rounded-2xl bg-orange-600 px-4 py-3 text-sm font-black text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Generar ticket de pedido
                        </button>
                      </div>

                      {ticketPedido && (
                        <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-black">Ticket generado</p>
                              <p className="text-xs font-semibold text-orange-800">
                                Presenta este código en caja para confirmar la compra.
                              </p>
                            </div>

                            <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-orange-700">
                              {ticketPedido.estado}
                            </span>
                          </div>

                          <div className="mt-4 rounded-2xl border-2 border-dashed border-orange-400 bg-white p-4 text-center">
                            <p className="text-xs font-black uppercase text-slate-500">
                              Código de pedido
                            </p>
                            <p className="text-3xl font-black text-orange-600">
                              {ticketPedido.codigo}
                            </p>
                          </div>

                          <div className="mt-4 grid gap-1">
                            <p>
                              <span className="font-bold">Cliente:</span> {ticketPedido.cliente}
                            </p>
                            <p>
                              <span className="font-bold">Teléfono / CI:</span>{' '}
                              {ticketPedido.telefonoCi}
                            </p>
                            <p>
                              <span className="font-bold">Sucursal:</span> {ticketPedido.sucursal}
                            </p>
                            <p>
                              <span className="font-bold">Total estimado:</span> Bs{' '}
                              {ticketPedido.total.toFixed(2)}
                            </p>
                          </div>

                          {renderDetallesPagoResumen({
                            metodoPago: ticketPedido.metodoPago,
                            referenciaPago: ticketPedido.referenciaPago,
                            estadoPago: ticketPedido.estadoPago,
                            tarjetaEnmascarada: ticketPedido.tarjetaEnmascarada,
                            codigoAutorizacion: ticketPedido.codigoAutorizacion,
                            fechaVencimientoPago: ticketPedido.fechaVencimientoPago,
                          })}

                          <button
                            type="button"
                            onClick={imprimirTicketPedido}
                            className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"
                          >
                            Imprimir ticket
                          </button>

                          <button
                            type="button"
                            onClick={descargarTicketPedidoPDF}
                            className="mt-3 w-full rounded-2xl bg-orange-600 px-4 py-3 text-sm font-black text-white hover:bg-orange-700"
                          >
                            Descargar ticket PDF
                          </button>
                        </div>
                      )}
                    </>
                  )}
              </div>
            )}

            {carrito.length === 0 && ticketPedido && (
              <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black">Ticket generado</p>
                    <p className="text-xs font-semibold text-orange-800">
                      Presenta este código en caja para confirmar la compra.
                    </p>
                  </div>

                  <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-orange-700">
                    {ticketPedido.estado}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl border-2 border-dashed border-orange-400 bg-white p-4 text-center">
                  <p className="text-xs font-black uppercase text-slate-500">
                    Código de pedido
                  </p>
                  <p className="text-3xl font-black text-orange-600">
                    {ticketPedido.codigo}
                  </p>
                </div>

                <div className="mt-4 grid gap-1">
                  <p>
                    <span className="font-bold">Cliente:</span> {ticketPedido.cliente}
                  </p>
                  <p>
                    <span className="font-bold">Teléfono / CI:</span>{' '}
                    {ticketPedido.telefonoCi}
                  </p>
                  <p>
                    <span className="font-bold">Sucursal:</span> {ticketPedido.sucursal}
                  </p>
                  <p>
                    <span className="font-bold">Total estimado:</span> Bs{' '}
                    {ticketPedido.total.toFixed(2)}
                  </p>
                </div>

                {renderDetallesPagoResumen({
                  metodoPago: ticketPedido.metodoPago,
                  referenciaPago: ticketPedido.referenciaPago,
                  estadoPago: ticketPedido.estadoPago,
                  tarjetaEnmascarada: ticketPedido.tarjetaEnmascarada,
                  codigoAutorizacion: ticketPedido.codigoAutorizacion,
                  fechaVencimientoPago: ticketPedido.fechaVencimientoPago,
                })}

                <button
                  type="button"
                  onClick={imprimirTicketPedido}
                  className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"
                >
                  Imprimir ticket
                </button>

                <button
                  type="button"
                  onClick={descargarTicketPedidoPDF}
                  className="mt-3 w-full rounded-2xl bg-orange-600 px-4 py-3 text-sm font-black text-white hover:bg-orange-700"
                >
                  Descargar ticket PDF
                </button>
              </div>
            )}

            {mensajeVenta && (
              <div
                className={`mt-3 rounded-2xl p-3 text-sm font-bold ${
                  mensajeVenta.toLowerCase().includes('no cubre') ||
                  mensajeVenta.toLowerCase().includes('no se pudo') ||
                  mensajeVenta.toLowerCase().includes('vacío') ||
                  mensajeVenta.toLowerCase().includes('internal') ||
                  mensajeVenta.toLowerCase().includes('error')
                    ? 'bg-red-50 text-red-700'
                    : 'bg-green-50 text-green-700'
                }`}
              >
                {mensajeVenta}
              </div>
            )}
            {comprobante && (
              <div className="mt-4 rounded-3xl border bg-green-50 p-4 text-sm text-green-900">
                <p className="font-black">Venta completada</p>

                <div className="mt-2 grid gap-1">
                  <p>
                    <span className="font-bold">ID venta:</span> {comprobante.id_venta}
                  </p>
                  <p>
                    <span className="font-bold">Sucursal:</span> {comprobante.sucursal}
                  </p>
                  <p>
                    <span className="font-bold">Caja:</span> {comprobante.caja}
                  </p>
                  <p>
                    <span className="font-bold">Cajero:</span> {comprobante.cajero}
                  </p>
                  <p>
                    <span className="font-bold">Método:</span> {comprobante.metodo_pago}
                  </p>
                  {comprobante.referencia_pago && (
                    <p><span className="font-bold">Referencia:</span> {comprobante.referencia_pago}</p>
                  )}
                  {comprobante.estado_pago && (
                    <p><span className="font-bold">Estado de pago:</span> {comprobante.estado_pago}</p>
                  )}
                  {comprobante.tarjeta_enmascarada && (
                    <p><span className="font-bold">Tarjeta:</span> {comprobante.tarjeta_enmascarada}</p>
                  )}
                  {comprobante.codigo_autorizacion && (
                    <p><span className="font-bold">Autorización:</span> {comprobante.codigo_autorizacion}</p>
                  )}
                  <p className="text-lg font-black">
                    Total: Bs {comprobante.total}
                  </p>
                  <p>
                    <span className="font-bold">Estado:</span> {comprobante.estado}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={imprimirComprobante}
                  className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"
                >
                  Imprimir comprobante
                </button>


              </div>
            )}
          </div>
      </section>

      <footer className="mt-16 bg-orange-600 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:grid-cols-3">
          {!sesion ? (
            <>
              <div>
                <h3 className="text-xl font-black">Supermarket</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-orange-50">
                  Compra rápida y organizada desde la tienda virtual.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-black">Pedido virtual</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-orange-50">
                  Agrega productos al carrito y genera un ticket para presentarlo en caja.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-black">Retiro en sucursal</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-orange-50">
                  Muestra el código del ticket en la sucursal seleccionada para confirmar el pago y retirar tus productos.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="text-xl font-black">Supermarket</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-orange-50">
                  Compra rápida, segura y organizada por sucursal.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-black">Atención en tienda</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-orange-50">
                  Productos disponibles, carrito de compra y comprobante de venta.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-black">Panel empresarial</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-orange-50">
                  Administración, reportes, seguridad e inventario para el personal autorizado.
                </p>
              </div>
            </>
          )}
        </div>
      </footer>

      <LoginModal
        abierto={loginAbierto}
        onCerrar={() => setLoginAbierto(false)}
        onLoginCorrecto={loginCorrecto}
      />

    </main>
  );
}