'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Bot,
  Brain,
  Check,
  ClipboardList,
  Copy,
  Database,
  MessageCircle,
  MessageSquarePlus,
  PackageSearch,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Trash2,
} from 'lucide-react';

const API_URL = 'http://localhost:3000/api';
const STORAGE_KEY = 'supermarket_ia_conversaciones_v2';

type MensajeChat = {
  rol: 'usuario' | 'ia';
  contenido: string;
};

type ConversacionChat = {
  id: string;
  titulo: string;
  fecha: string;
  mensajes: MensajeChat[];
};

type SugerenciaChat = {
  texto: string;
  descripcion: string;
  icono: ReactNode;
};

const mensajeInicial: MensajeChat = {
  rol: 'ia',
  contenido:
    'Hola. Soy tu asistente IA de Supermarket. Puedo ayudarte a revisar ventas, inventario, pedidos, seguridad, backups y la base de datos con información real del sistema. Pregúntame como lo harías en ChatGPT.',
};

const preguntasSugeridas: SugerenciaChat[] = [
  {
    texto: '¿Cómo van las ventas del sistema?',
    descripcion: 'Resumen de ventas, total vendido y sucursal destacada.',
    icono: <ShoppingCart size={18} />,
  },
  {
    texto: '¿Hay productos con stock bajo?',
    descripcion: 'Revisión rápida del inventario por sucursal.',
    icono: <PackageSearch size={18} />,
  },
  {
    texto: '¿Existen alertas críticas de seguridad?',
    descripcion: 'Intentos fallidos, riesgo de acceso y recomendaciones.',
    icono: <ShieldCheck size={18} />,
  },
  {
    texto: '¿Cómo están los backups del sistema?',
    descripcion: 'Estado de copias automáticas y última ejecución.',
    icono: <Database size={18} />,
  },
  {
    texto: 'Explícame cómo funciona el pedido virtual',
    descripcion: 'Flujo desde cliente visitante hasta confirmación en caja.',
    icono: <ClipboardList size={18} />,
  },
  {
    texto: '¿Qué tablas importantes tiene la base de datos?',
    descripcion: 'Esquemas, tablas, vistas y funciones principales.',
    icono: <Brain size={18} />,
  },
];

function crearIdConversacion() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function crearNuevaConversacion(): ConversacionChat {
  return {
    id: crearIdConversacion(),
    titulo: 'Nueva conversación',
    fecha: new Date().toISOString(),
    mensajes: [mensajeInicial],
  };
}

function generarTitulo(mensajes: MensajeChat[]) {
  const primerMensajeUsuario = mensajes.find((m) => m.rol === 'usuario');

  if (!primerMensajeUsuario) {
    return 'Nueva conversación';
  }

  const texto = primerMensajeUsuario.contenido.trim();

  if (texto.length <= 42) {
    return texto;
  }

  return `${texto.slice(0, 42)}...`;
}

function formatearFecha(fecha: string) {
  try {
    return new Date(fecha).toLocaleString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function normalizarRespuestaIA(texto: string) {
  return texto
    .replace(/POSTGRESQL_IA_CONTROLADA/g, 'datos reales del sistema')
    .replace(/Proveedor:\s*/gi, '')
    .trim();
}

function esLineaLista(linea: string) {
  return /^[-•]\s+/.test(linea.trim()) || /^\d+[.)]\s+/.test(linea.trim());
}

function limpiarMarcaLista(linea: string) {
  return linea.trim().replace(/^[-•]\s+/, '').replace(/^\d+[.)]\s+/, '');
}

function RenderMensajeAmigable({ contenido }: { contenido: string }) {
  const lineas = normalizarRespuestaIA(contenido).split('\n');
  const elementos: React.ReactNode[] = [];
  let listaTemporal: string[] = [];

  function cerrarLista() {
    if (listaTemporal.length === 0) return;

    elementos.push(
      <ul key={`lista-${elementos.length}`} className="my-3 grid gap-2">
        {listaTemporal.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-2 text-sm leading-6 text-slate-700">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>,
    );

    listaTemporal = [];
  }

  lineas.forEach((lineaOriginal, index) => {
    const linea = lineaOriginal.trim();

    if (!linea) {
      cerrarLista();
      return;
    }

    if (esLineaLista(linea)) {
      listaTemporal.push(limpiarMarcaLista(linea));
      return;
    }

    cerrarLista();

    if (linea.endsWith(':') || index === 0) {
      elementos.push(
        <p key={`titulo-${index}`} className="mb-2 mt-1 text-sm font-black leading-6 text-slate-950">
          {linea}
        </p>,
      );
      return;
    }

    elementos.push(
      <p key={`parrafo-${index}`} className="my-2 text-sm leading-6 text-slate-700">
        {linea}
      </p>,
    );
  });

  cerrarLista();

  return <div>{elementos}</div>;
}

export default function PanelAsistenteIA() {
  const [pregunta, setPregunta] = useState('');
  const [mensajes, setMensajes] = useState<MensajeChat[]>([mensajeInicial]);
  const [conversaciones, setConversaciones] = useState<ConversacionChat[]>([]);
  const [conversacionActivaId, setConversacionActivaId] = useState('');
  const [cargando, setCargando] = useState(false);
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  const [copiado, setCopiado] = useState<number | null>(null);

  const contenedorMensajesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const guardadas = localStorage.getItem(STORAGE_KEY);
      const conversacionesGuardadas: ConversacionChat[] = guardadas
        ? JSON.parse(guardadas)
        : [];

      if (Array.isArray(conversacionesGuardadas) && conversacionesGuardadas.length > 0) {
        setConversaciones(conversacionesGuardadas);
        setConversacionActivaId(conversacionesGuardadas[0].id);
        setMensajes(conversacionesGuardadas[0].mensajes);
        return;
      }

      const nueva = crearNuevaConversacion();
      setConversaciones([nueva]);
      setConversacionActivaId(nueva.id);
      setMensajes(nueva.mensajes);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([nueva]));
    } catch (error) {
      console.warn('No se pudo cargar el historial IA', error);
      const nueva = crearNuevaConversacion();
      setConversaciones([nueva]);
      setConversacionActivaId(nueva.id);
      setMensajes(nueva.mensajes);
    }
  }, []);

  useEffect(() => {
    const contenedor = contenedorMensajesRef.current;

    if (!contenedor) {
      return;
    }

    contenedor.scrollTo({
      top: contenedor.scrollHeight,
      behavior: 'smooth',
    });
  }, [mensajes.length, cargando]);

  const conversacionesFiltradas = useMemo(() => {
    const texto = busquedaHistorial.trim().toLowerCase();

    if (!texto) return conversaciones;

    return conversaciones.filter((conv) =>
      `${conv.titulo} ${conv.mensajes.map((m) => m.contenido).join(' ')}`
        .toLowerCase()
        .includes(texto),
    );
  }, [busquedaHistorial, conversaciones]);

  function guardarConversacion(nuevosMensajes: MensajeChat[]) {
    setConversaciones((actuales) => {
      const actualizadas = actuales.map((conv) => {
        if (conv.id !== conversacionActivaId) {
          return conv;
        }

        return {
          ...conv,
          titulo: generarTitulo(nuevosMensajes),
          fecha: new Date().toISOString(),
          mensajes: nuevosMensajes,
        };
      });

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizadas));
      } catch (error) {
        console.warn('No se pudo guardar el historial IA', error);
      }

      return actualizadas;
    });
  }

  function crearChatNuevo() {
    const nueva = crearNuevaConversacion();

    setConversaciones((actuales) => {
      const actualizadas = [nueva, ...actuales];

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizadas));
      } catch (error) {
        console.warn('No se pudo guardar la nueva conversación', error);
      }

      return actualizadas;
    });

    setConversacionActivaId(nueva.id);
    setMensajes(nueva.mensajes);
    setPregunta('');
  }

  function abrirConversacion(conversacion: ConversacionChat) {
    setConversacionActivaId(conversacion.id);
    setMensajes(conversacion.mensajes);
    setPregunta('');
  }

  function eliminarConversacion(id: string) {
    setConversaciones((actuales) => {
      const restantes = actuales.filter((conv) => conv.id !== id);

      if (restantes.length === 0) {
        const nueva = crearNuevaConversacion();
        setConversacionActivaId(nueva.id);
        setMensajes(nueva.mensajes);
        localStorage.setItem(STORAGE_KEY, JSON.stringify([nueva]));
        return [nueva];
      }

      if (id === conversacionActivaId) {
        setConversacionActivaId(restantes[0].id);
        setMensajes(restantes[0].mensajes);
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(restantes));
      } catch (error) {
        console.warn('No se pudo eliminar la conversación', error);
      }

      return restantes;
    });
  }

  function limpiarChatActual() {
    const mensajesReiniciados: MensajeChat[] = [
      {
        rol: 'ia',
        contenido:
          'Listo, reinicié este chat. Puedes preguntarme por ventas, inventario, pedidos virtuales, seguridad, auditoría, backups o la estructura de la base de datos.',
      },
    ];

    setMensajes(mensajesReiniciados);
    setPregunta('');
    guardarConversacion(mensajesReiniciados);
  }

  async function copiarMensaje(texto: string, index: number) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(index);
      window.setTimeout(() => setCopiado(null), 1200);
    } catch (error) {
      console.warn('No se pudo copiar el mensaje', error);
    }
  }

  async function enviarMensaje(textoManual?: string) {
    const textoUsuario = (textoManual || pregunta).trim();

    if (!textoUsuario || cargando) {
      return;
    }

    const mensajeUsuario: MensajeChat = {
      rol: 'usuario',
      contenido: textoUsuario,
    };

    const historialActualizado = [...mensajes, mensajeUsuario];

    setMensajes(historialActualizado);
    guardarConversacion(historialActualizado);
    setPregunta('');
    setCargando(true);

    try {
      const respuestaBackend = await fetch(`${API_URL}/ia/asistente/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pregunta: textoUsuario,
          historial: historialActualizado,
        }),
      });

      const data = await respuestaBackend.json();

      if (!respuestaBackend.ok) {
        throw new Error(data.message || 'No se pudo consultar el asistente IA.');
      }

      const respuestaTexto = Array.isArray(data)
        ? data[0]?.respuesta
        : data?.respuesta;

      const mensajeIA: MensajeChat = {
        rol: 'ia',
        contenido:
          respuestaTexto ||
          'No encontré una respuesta disponible para esa consulta. Intenta preguntar sobre ventas, inventario, pedidos, seguridad, backups o base de datos.',
      };

      const mensajesFinales = [...historialActualizado, mensajeIA];
      setMensajes(mensajesFinales);
      guardarConversacion(mensajesFinales);
    } catch (error) {
      console.error(error);

      const mensajeError: MensajeChat = {
        rol: 'ia',
        contenido:
          'No pude obtener una respuesta del sistema en este momento. Verifica que el backend NestJS esté activo en localhost:3000 y vuelve a intentarlo.',
      };

      const mensajesFinales = [...historialActualizado, mensajeError];
      setMensajes(mensajesFinales);
      guardarConversacion(mensajesFinales);
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border bg-white shadow-sm">
      <div className="border-b bg-gradient-to-br from-slate-950 via-blue-950 to-orange-600 px-6 py-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-white/15 backdrop-blur">
              <Sparkles size={28} />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-100">
                Asistente empresarial
              </p>
              <h3 className="mt-2 text-2xl font-black md:text-3xl">
                Pregúntale a Supermarket IA
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100">
                Chat conversacional con respuestas claras, historial por conversación y datos reales consultados desde PostgreSQL.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-black backdrop-blur">
            <span className="mr-2 inline-flex h-2.5 w-2.5 rounded-full bg-green-300" />
            Conectado
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
        <aside className="border-b bg-slate-50 p-5 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Historial
              </p>
              <h4 className="text-lg font-black text-slate-900">Conversaciones</h4>
            </div>

            <button
              type="button"
              onClick={crearChatNuevo}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm hover:bg-orange-600"
              title="Nueva conversación"
            >
              <MessageSquarePlus size={19} />
            </button>
          </div>

          <div className="mb-4 flex items-center gap-2 rounded-2xl border bg-white px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              value={busquedaHistorial}
              onChange={(e) => setBusquedaHistorial(e.target.value)}
              placeholder="Buscar en historial..."
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="grid max-h-[520px] gap-2 overflow-y-auto pr-1">
            {conversacionesFiltradas.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 rounded-3xl border p-3 transition ${
                  conv.id === conversacionActivaId
                    ? 'border-orange-500 bg-orange-50 shadow-sm'
                    : 'bg-white hover:border-slate-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => abrirConversacion(conv)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-black text-slate-900">
                    {conv.titulo}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {formatearFecha(conv.fecha)}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => eliminarConversacion(conv.id)}
                  className="rounded-full p-2 text-slate-400 opacity-80 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                  title="Eliminar conversación"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {conversacionesFiltradas.length === 0 && (
              <div className="rounded-3xl border border-dashed bg-white p-5 text-center text-sm font-bold text-slate-400">
                No hay conversaciones con esa búsqueda.
              </div>
            )}
          </div>
        </aside>

        <div className="bg-gradient-to-b from-white to-slate-50 p-5 md:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                <Bot size={22} />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-950">Chat inteligente</h4>
                <p className="text-sm font-semibold text-slate-500">
                  Responde como asistente, no como tabla técnica.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={limpiarChatActual}
              className="rounded-full border bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm hover:border-orange-400 hover:text-orange-600"
            >
              Limpiar chat
            </button>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {preguntasSugeridas.map((item) => (
              <button
                key={item.texto}
                type="button"
                onClick={() => enviarMensaje(item.texto)}
                disabled={cargando}
                className="rounded-3xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                  {item.icono}
                </div>
                <p className="text-sm font-black text-slate-950">{item.texto}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.descripcion}</p>
              </button>
            ))}
          </div>

          <div className="rounded-[1.75rem] border bg-white shadow-sm">
            <div ref={contenedorMensajesRef} className="max-h-[620px] overflow-y-auto overscroll-contain px-4 py-5 md:px-6">
              <div className="space-y-5">
                {mensajes.map((mensaje, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      mensaje.rol === 'usuario' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {mensaje.rol === 'ia' && (
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                        <Bot size={17} />
                      </div>
                    )}

                    <div
                      className={`max-w-[88%] rounded-[1.5rem] px-5 py-4 shadow-sm ${
                        mensaje.rol === 'usuario'
                          ? 'bg-orange-600 text-white'
                          : 'border bg-slate-50 text-slate-900'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span
                          className={`text-xs font-black uppercase tracking-widest ${
                            mensaje.rol === 'usuario'
                              ? 'text-orange-50'
                              : 'text-slate-500'
                          }`}
                        >
                          {mensaje.rol === 'usuario' ? 'Tú' : 'Supermarket IA'}
                        </span>

                        {mensaje.rol === 'ia' && (
                          <button
                            type="button"
                            onClick={() => copiarMensaje(mensaje.contenido, index)}
                            className="rounded-full p-1.5 text-slate-400 hover:bg-white hover:text-slate-900"
                            title="Copiar respuesta"
                          >
                            {copiado === index ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        )}
                      </div>

                      {mensaje.rol === 'usuario' ? (
                        <p className="whitespace-pre-wrap text-sm font-bold leading-6">
                          {mensaje.contenido}
                        </p>
                      ) : (
                        <RenderMensajeAmigable contenido={mensaje.contenido} />
                      )}
                    </div>
                  </div>
                ))}

                {cargando && (
                  <div className="flex justify-start gap-3">
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Bot size={17} />
                    </div>
                    <div className="rounded-[1.5rem] border bg-slate-50 px-5 py-4 shadow-sm">
                      <div className="flex items-center gap-3 text-sm font-black text-slate-600">
                        <RefreshCw size={18} className="animate-spin text-orange-600" />
                        Consultando datos reales del sistema...
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            <div className="border-t bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <textarea
                  value={pregunta}
                  onChange={(e) => setPregunta(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      enviarMensaje();
                    }
                  }}
                  placeholder="Pregúntame sobre ventas, inventario, pedidos, seguridad o backups..."
                  className="min-h-[64px] resize-none rounded-3xl border bg-white px-5 py-4 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-orange-500"
                />

                <button
                  type="button"
                  onClick={() => enviarMensaje()}
                  disabled={cargando || !pregunta.trim()}
                  className="flex min-w-[150px] items-center justify-center gap-2 rounded-3xl bg-slate-950 px-6 py-4 text-sm font-black text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {cargando ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                  Enviar
                </button>
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-2xl bg-blue-50 p-3 text-xs font-semibold leading-5 text-blue-700">
                <MessageCircle size={16} className="mt-0.5 shrink-0" />
                <p>
                  Las respuestas empresariales salen del backend y PostgreSQL. El historial se guarda solo en este navegador.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
