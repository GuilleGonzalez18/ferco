import { useEffect, useMemo, useRef, useState } from 'react';
import './Ventas.css';
import { api } from './api';

const PASOS = ['Productos y carrito', 'Datos de entrega'];

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return `$${toNumber(value).toFixed(2)}`;
}

function getEmpaqueUnits(producto) {
  const n = Math.floor(toNumber(producto?.cantidadEmpaque));
  return n > 0 ? n : 1;
}

export default function Ventas({ user, productos = [], setProductos }) {
  const [paso, setPaso] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [vistaProductos, setVistaProductos] = useState('grid');
  const [selectorClienteAbierto, setSelectorClienteAbierto] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState('');

  const [carrito, setCarrito] = useState([]);
  const [descuentoTotalTipo, setDescuentoTotalTipo] = useState('ninguno');
  const [descuentoTotalValor, setDescuentoTotalValor] = useState('');

  const [clienteId, setClienteId] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [observacion, setObservacion] = useState('');
  const [clientes, setClientes] = useState([]);
  const clienteDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!selectorClienteAbierto) return;
      if (!clienteDropdownRef.current) return;
      if (!clienteDropdownRef.current.contains(event.target)) {
        setSelectorClienteAbierto(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [selectorClienteAbierto]);

  useEffect(() => {
    const loadClientes = async () => {
      try {
        const rows = await api.getClientes();
        setClientes(rows.map((c) => ({ id: c.id, nombre: c.nombre })));
      } catch (error) {
        console.error('Error cargando clientes', error);
      }
    };
    loadClientes();
  }, []);

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter((p) =>
      `${p.nombre || ''} ${p.ean || ''}`.toLowerCase().includes(q)
    );
  }, [productos, busqueda]);

  const clientesFiltrados = useMemo(() => {
    const q = busquedaCliente.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => c.nombre.toLowerCase().includes(q));
  }, [busquedaCliente, clientes]);

  const addToCart = (producto, modo = 'unidad') => {
    const unidadesPorEmpaque = getEmpaqueUnits(producto);
    const unidadesAgregar = modo === 'empaque' ? unidadesPorEmpaque : 1;

    const stockDisponible = Math.floor(toNumber(producto.stock));
    const itemExistente = carrito.find((i) => i.productoId === producto.id);
    const unidadesYaEnCarrito = toNumber(itemExistente?.unidadesSolicitadas || 0);

    if (unidadesYaEnCarrito + unidadesAgregar > stockDisponible) {
      window.alert(`Stock insuficiente para ${producto.nombre}. Disponible: ${stockDisponible} unidad(es).`);
      return;
    }

    const precioUnitario = toNumber(producto.venta);
    if (itemExistente) {
      setCarrito((prev) =>
        prev.map((item) =>
          item.productoId === producto.id
            ? { ...item, unidadesSolicitadas: toNumber(item.unidadesSolicitadas) + unidadesAgregar }
            : item
        )
      );
      return;
    }

    setCarrito((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        productoId: producto.id,
        nombre: producto.nombre,
        unidadesSolicitadas: unidadesAgregar,
        precioUnitario,
        descuentoTipo: 'ninguno',
        descuentoValor: '',
      },
    ]);
  };

  const removeItem = (itemId) => {
    setCarrito((prev) => prev.filter((i) => i.id !== itemId));
  };

  const updateItem = (itemId, patch) => {
    setCarrito((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
  };

  const updateUnits = (itemId, nextValue) => {
    const unidades = Math.max(1, Math.floor(toNumber(nextValue)));
    const item = carrito.find((i) => i.id === itemId);
    if (!item) return;
    const producto = productos.find((p) => p.id === item.productoId);
    const stock = Math.floor(toNumber(producto?.stock || 0));
    if (unidades > stock) {
      window.alert(`Stock insuficiente para ${item.nombre}. Disponible: ${stock} unidad(es).`);
      return;
    }
    updateItem(itemId, { unidadesSolicitadas: unidades });
  };

  const carritoCalculado = useMemo(() => {
    return carrito.map((item) => {
      const base = toNumber(item.unidadesSolicitadas) * toNumber(item.precioUnitario);
      const valor = toNumber(item.descuentoValor);
      let descuento = 0;

      if (item.descuentoTipo === 'porcentaje') {
        const pct = Math.max(0, Math.min(100, valor));
        descuento = (base * pct) / 100;
      } else if (item.descuentoTipo === 'fijo') {
        descuento = Math.max(0, Math.min(base, valor));
      }

      return {
        ...item,
        descuentoAplicado: descuento,
        subtotalFinal: Math.max(0, base - descuento),
      };
    });
  }, [carrito]);

  const subtotal = useMemo(
    () => carritoCalculado.reduce((acc, i) => acc + toNumber(i.subtotalFinal), 0),
    [carritoCalculado]
  );

  const descuentoGlobal = useMemo(() => {
    const v = toNumber(descuentoTotalValor);
    if (descuentoTotalTipo === 'porcentaje') {
      const pct = Math.max(0, Math.min(100, v));
      return (subtotal * pct) / 100;
    }
    if (descuentoTotalTipo === 'fijo') {
      return Math.max(0, Math.min(subtotal, v));
    }
    return 0;
  }, [descuentoTotalTipo, descuentoTotalValor, subtotal]);

  const total = Math.max(0, subtotal - descuentoGlobal);

  const goNext = () => {
    if (carrito.length === 0) {
      window.alert('Agrega al menos un producto al carrito.');
      return;
    }
    setPaso(2);
  };

  const goBack = () => setPaso(1);

  const confirmarVenta = async () => {
    if (!clienteId || !fechaEntrega) {
      window.alert('Debes seleccionar cliente y fecha/hora de entrega.');
      return;
    }
    if (!setProductos) return;

    const demanda = carritoCalculado.reduce((acc, i) => {
      acc[i.productoId] = (acc[i.productoId] || 0) + toNumber(i.unidadesSolicitadas);
      return acc;
    }, {});

    for (const p of productos) {
      const need = toNumber(demanda[p.id] || 0);
      const stock = Math.floor(toNumber(p.stock));
      if (need > stock) {
        window.alert(`Stock insuficiente para ${p.nombre}.`);
        return;
      }
    }

    try {
      await api.createVenta({
        usuario_id: user?.id ?? null,
        cliente_id: Number(clienteId),
        fecha_entrega: fechaEntrega,
        observacion,
        descuento_total_tipo: descuentoTotalTipo,
        descuento_total_valor: toNumber(descuentoTotalValor),
        detalle: carritoCalculado.map((item) => ({
          producto_id: item.productoId,
          cantidad: item.unidadesSolicitadas,
          precio_unitario: item.precioUnitario,
        })),
      });

      setProductos(
        productos.map((p) => {
          const need = toNumber(demanda[p.id] || 0);
          if (!need) return p;
          const stock = Math.floor(toNumber(p.stock));
          return { ...p, stock: String(Math.max(0, stock - need)) };
        })
      );

      const cliente = clientes.find((c) => String(c.id) === String(clienteId));
      window.alert(`Venta registrada para ${cliente?.nombre || 'cliente'}.\nTotal: ${money(total)}`);

      setPaso(1);
      setBusqueda('');
      setCarrito([]);
      setSelectorClienteAbierto(false);
      setBusquedaCliente('');
      setDescuentoTotalTipo('ninguno');
      setDescuentoTotalValor('');
      setClienteId('');
      setFechaEntrega('');
      setObservacion('');
    } catch (error) {
      window.alert(`No se pudo registrar la venta: ${error.message}`);
    }
  };

  return (
    <div className="ventas-main">
      <div className="ventas-steps">
        {PASOS.map((titulo, i) => {
          const n = i + 1;
          const state = n < paso ? 'done' : n === paso ? 'active' : 'pending';
          return (
            <div className={`ventas-step ${state}`} key={titulo}>
              <span className="step-index">{n}</span>
              <span className="step-title">{titulo}</span>
            </div>
          );
        })}
      </div>

      <div className="ventas-layout">
        <section className="ventas-contenido">
          {paso === 1 && (
            <div className="ventas-panel">
              <div className="catalogo-top">
                <h3>Seleccionar productos</h3>
                <input
                  type="text"
                  placeholder="Buscar por nombre o código..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                <button
                  type="button"
                  className="vista-toggle"
                  onClick={() => setVistaProductos((v) => (v === 'grid' ? 'list' : 'grid'))}
                  title={vistaProductos === 'grid' ? 'Cambiar a lista' : 'Cambiar a cuadrícula'}
                >
                  <img
                    src={vistaProductos === 'grid' ? '/list-view.svg' : '/grid-view.svg'}
                    alt={vistaProductos === 'grid' ? 'Vista lista' : 'Vista cuadrícula'}
                  />
                </button>
              </div>

              <div className={`catalogo-grid ${vistaProductos === 'list' ? 'catalogo-list' : ''}`}>
                {productosFiltrados.length === 0 && <p className="muted">No hay productos para mostrar.</p>}
                {productosFiltrados.map((p) => (
                  <article key={p.id} className={`producto-card ${vistaProductos === 'list' ? 'list' : ''}`}>
                    <div className="producto-image-wrap">
                      {p.imagenPreview ? (
                        <img src={p.imagenPreview} alt={p.nombre} className="producto-image" />
                      ) : (
                        <div className="producto-image placeholder">Sin imagen</div>
                      )}
                      <div className="overlay">
                        <h4>{p.nombre}</h4>
                        <span>{money(p.venta)}</span>
                      </div>
                    </div>
                    <div className="card-footer">
                      <small>Stock: {p.stock}</small>
                      <div className="card-actions">
                        <button type="button" onClick={() => addToCart(p, 'unidad')}>+ Unidad</button>
                        <button type="button" onClick={() => addToCart(p, 'empaque')}>
                          + {p.tipoEmpaque || 'Empaque'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {paso === 2 && (
            <div className="ventas-panel">
              <h3>Cliente y entrega</h3>
              <div className="form-entrega">
                <label>
                  Cliente
                  <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                    <option value="">Seleccionar cliente</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Fecha y hora de entrega
                  <input
                    type="datetime-local"
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                  />
                </label>

                <label className="full">
                  Observación (opcional)
                  <textarea
                    rows="4"
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    placeholder="Detalle para entrega..."
                  />
                </label>
              </div>
            </div>
          )}

          <div className="ventas-footer">
            {paso === 1 ? (
              <button type="button" onClick={goNext}>Siguiente</button>
            ) : (
              <>
                <button type="button" className="secundario" onClick={goBack}>Atrás</button>
                <button type="button" className="confirmar" onClick={confirmarVenta}>Confirmar venta</button>
              </>
            )}
          </div>
        </section>

        <aside className="ventas-carrito">
          <div className="cliente-cabecera">
            <button
              type="button"
              className="cliente-toggle"
              onClick={() => {
                setSelectorClienteAbierto((prev) => !prev);
                setBusquedaCliente('');
              }}
            >
              {clienteId
                ? `Cliente: ${clientes.find((c) => String(c.id) === String(clienteId))?.nombre || 'Seleccionado'}`
                : 'Agregar cliente'}
            </button>
          </div>

          <h3>Carrito</h3>
          {carritoCalculado.length === 0 && <p className="muted">Aún no agregaste productos.</p>}
          <div className="carrito-list">
            {carritoCalculado.map((item) => (
              <div key={item.id} className="carrito-item">
                <div>
                  <strong>{item.nombre}</strong>
                  <p>{item.unidadesSolicitadas} unidad(es)</p>
                  <div className="unidades-edit">
                    <label htmlFor={`units-${item.id}`}>Unidades</label>
                    <input
                      id={`units-${item.id}`}
                      type="number"
                      min="1"
                      step="1"
                      value={item.unidadesSolicitadas}
                      onChange={(e) => updateUnits(item.id, e.target.value)}
                    />
                  </div>
                  <div className="descuentos-item">
                    <select
                      value={item.descuentoTipo}
                      onChange={(e) => updateItem(item.id, { descuentoTipo: e.target.value, descuentoValor: '' })}
                    >
                      <option value="ninguno">Sin desc.</option>
                      <option value="porcentaje">% item</option>
                      <option value="fijo">$ item</option>
                    </select>
                    {item.descuentoTipo !== 'ninguno' && (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.descuentoValor}
                        onChange={(e) => updateItem(item.id, { descuentoValor: e.target.value })}
                        placeholder={item.descuentoTipo === 'porcentaje' ? '%' : '$'}
                      />
                    )}
                  </div>
                </div>
                <div className="carrito-right">
                  <span>{money(item.subtotalFinal)}</span>
                  <button type="button" onClick={() => removeItem(item.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>

          <div className="carrito-totales">
            <h4>Subtotal</h4>
            <p>{money(subtotal)}</p>
            <div className="descuento-global">
              <select
                value={descuentoTotalTipo}
                onChange={(e) => {
                  setDescuentoTotalTipo(e.target.value);
                  setDescuentoTotalValor('');
                }}
              >
                <option value="ninguno">Sin desc. global</option>
                <option value="porcentaje">% global</option>
                <option value="fijo">$ global</option>
              </select>
              {descuentoTotalTipo !== 'ninguno' && (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={descuentoTotalValor}
                  onChange={(e) => setDescuentoTotalValor(e.target.value)}
                  placeholder={descuentoTotalTipo === 'porcentaje' ? '%' : '$'}
                />
              )}
            </div>
            <p className="total-final">Total: <strong>{money(total)}</strong></p>
          </div>
        </aside>
      </div>

      <div
        className={`cliente-overlay ${selectorClienteAbierto ? 'open' : ''}`}
        aria-hidden={!selectorClienteAbierto}
      >
        <div className="cliente-overlay-backdrop" />
        <div className="cliente-drawer" ref={clienteDropdownRef}>
          <div className="cliente-dropdown-head">
            <h4>Seleccionar cliente</h4>
            <button
              type="button"
              className="cliente-cerrar"
              onClick={() => setSelectorClienteAbierto(false)}
            >
              ✕
            </button>
          </div>
          <div className="cliente-busqueda-wrap">
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={busquedaCliente}
              onChange={(e) => setBusquedaCliente(e.target.value)}
            />
          </div>
          <div className="cliente-dropdown-list full">
            {clientesFiltrados.length === 0 && (
              <p className="cliente-sin-resultados">Sin resultados</p>
            )}
            {clientesFiltrados.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`cliente-opcion ${String(clienteId) === String(c.id) ? 'active' : ''}`}
                onClick={() => {
                  setClienteId(String(c.id));
                  setSelectorClienteAbierto(false);
                  setBusquedaCliente('');
                }}
              >
                {c.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
