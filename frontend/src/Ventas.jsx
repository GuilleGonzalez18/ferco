import { useEffect, useMemo, useRef, useState } from 'react';
import './Ventas.css';
import { api } from './api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

function todayISODate() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

export default function Ventas({ user, productos = [], setProductos }) {
  const [paso, setPaso] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [vistaProductos, setVistaProductos] = useState('grid');
  const [selectorClienteAbierto, setSelectorClienteAbierto] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState('');

  const [carrito, setCarrito] = useState([]);
  const [descuentoItemModal, setDescuentoItemModal] = useState({
    open: false,
    itemId: null,
    tipo: 'porcentaje',
    valor: '',
  });
  const [descuentoTotalTipo, setDescuentoTotalTipo] = useState('ninguno');
  const [descuentoTotalValor, setDescuentoTotalValor] = useState('');
  const [descuentoGlobalModal, setDescuentoGlobalModal] = useState({
    open: false,
    tipo: 'porcentaje',
    valor: '',
  });

  const [clienteId, setClienteId] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [observacion, setObservacion] = useState('');
  const [ventaFinalizada, setVentaFinalizada] = useState(null);
  const [ticketImpreso, setTicketImpreso] = useState(false);
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

  const stockReservadoPorProducto = useMemo(() => {
    return carrito.reduce((acc, item) => {
      acc[item.productoId] = (acc[item.productoId] || 0) + toNumber(item.unidadesSolicitadas);
      return acc;
    }, {});
  }, [carrito]);

  const getStockDisponible = (productoId) => {
    const producto = productos.find((p) => p.id === productoId);
    const stockBase = Math.floor(toNumber(producto?.stock || 0));
    const reservado = Math.floor(toNumber(stockReservadoPorProducto[productoId] || 0));
    return Math.max(0, stockBase - reservado);
  };

  const addToCart = (producto, modo = 'unidad') => {
    const unidadesPorEmpaque = getEmpaqueUnits(producto);
    const unidadesAgregar = modo === 'empaque' ? unidadesPorEmpaque : 1;

    const stockDisponible = getStockDisponible(producto.id);
    const itemExistente = carrito.find((i) => i.productoId === producto.id);
    const unidadesYaEnCarrito = toNumber(itemExistente?.unidadesSolicitadas || 0);

    if (unidadesYaEnCarrito + unidadesAgregar > stockDisponible + unidadesYaEnCarrito) {
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
    setDescuentoItemModal((prev) =>
      prev.itemId === itemId ? { open: false, itemId: null, tipo: 'porcentaje', valor: '' } : prev
    );
  };

  const updateItem = (itemId, patch) => {
    setCarrito((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
  };

  const updateUnits = (itemId, nextValue) => {
    const unidades = Math.max(1, Math.floor(toNumber(nextValue)));
    const item = carrito.find((i) => i.id === itemId);
    if (!item) return;
    const producto = productos.find((p) => p.id === item.productoId);
    const stockBase = Math.floor(toNumber(producto?.stock || 0));
    const reservadoOtros = Math.floor(toNumber(stockReservadoPorProducto[item.productoId] || 0)) - toNumber(item.unidadesSolicitadas);
    const stock = Math.max(0, stockBase - Math.max(0, reservadoOtros));
    if (unidades > stock) {
      window.alert(`Stock insuficiente para ${item.nombre}. Disponible: ${stock} unidad(es).`);
      return;
    }
    updateItem(itemId, { unidadesSolicitadas: unidades });
  };

  const openDiscountModal = (item) => {
    setDescuentoItemModal({
      open: true,
      itemId: item.id,
      tipo: item.descuentoTipo === 'fijo' ? 'fijo' : 'porcentaje',
      valor: item.descuentoValor || '',
    });
  };

  const closeDiscountModal = () => {
    setDescuentoItemModal({ open: false, itemId: null, tipo: 'porcentaje', valor: '' });
  };

  const applyItemDiscount = () => {
    if (!descuentoItemModal.itemId) return;
    updateItem(descuentoItemModal.itemId, {
      descuentoTipo: descuentoItemModal.tipo,
      descuentoValor: descuentoItemModal.valor,
    });
    closeDiscountModal();
  };

  const removeItemDiscount = (itemId) => {
    updateItem(itemId, { descuentoTipo: 'ninguno', descuentoValor: '' });
  };

  const openGlobalDiscountModal = () => {
    setDescuentoGlobalModal({
      open: true,
      tipo: descuentoTotalTipo === 'fijo' ? 'fijo' : 'porcentaje',
      valor: descuentoTotalValor || '',
    });
  };

  const closeGlobalDiscountModal = () => {
    setDescuentoGlobalModal({ open: false, tipo: 'porcentaje', valor: '' });
  };

  const applyGlobalDiscount = () => {
    setDescuentoTotalTipo(descuentoGlobalModal.tipo);
    setDescuentoTotalValor(descuentoGlobalModal.valor);
    closeGlobalDiscountModal();
  };

  const removeGlobalDiscount = () => {
    setDescuentoTotalTipo('ninguno');
    setDescuentoTotalValor('');
    closeGlobalDiscountModal();
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
  const clienteSeleccionado = clientes.find((c) => String(c.id) === String(clienteId));

  const goNext = () => {
    if (carrito.length === 0) {
      window.alert('Agrega al menos un producto al carrito.');
      return;
    }
    setPaso(2);
  };

  const goBack = () => setPaso(1);

  const resetVenta = () => {
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
  };

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const imprimirTicket = async () => {
    if (!ventaFinalizada) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let cursorY = 12;

    try {
      const logo = await loadImage('/images/encabezadofacturacion.png');
      const logoWidth = 120;
      const logoHeight = 24;
      const x = (pageWidth - logoWidth) / 2;
      doc.addImage(logo, 'PNG', x, cursorY, logoWidth, logoHeight);
      cursorY += logoHeight + 6;
    } catch {
      cursorY += 2;
    }

    doc.setFontSize(14);
    doc.text('Ticket de venta', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 6;

    doc.setFontSize(10);
    doc.text(`Venta: ${ventaFinalizada.id ? `#${ventaFinalizada.id}` : 'Sin número'}`, 14, cursorY);
    doc.text(`Fecha: ${new Date(ventaFinalizada.fecha).toLocaleString('es-UY')}`, 120, cursorY);
    cursorY += 5;
    doc.text(`Cliente: ${ventaFinalizada.clienteNombre}`, 14, cursorY);
    cursorY += 5;
    doc.text(`Vendedor: ${ventaFinalizada.vendedorNombre}`, 14, cursorY);
    cursorY += 5;
    doc.text(`Entrega: ${new Date(ventaFinalizada.fechaEntrega).toLocaleDateString('es-UY')}`, 14, cursorY);
    cursorY += 6;

    autoTable(doc, {
      startY: cursorY,
      head: [['Producto', 'Cant.', 'P. Unit.', 'Desc.', 'Subtotal']],
      body: ventaFinalizada.items.map((item) => [
        item.nombre,
        item.unidadesSolicitadas,
        money(item.precioUnitario),
        money(item.descuentoAplicado),
        money(item.subtotalFinal),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [55, 95, 140] },
    });

    const finalY = doc.lastAutoTable?.finalY ?? cursorY + 8;
    doc.setFontSize(10);
    doc.text(`Subtotal: ${money(ventaFinalizada.subtotal)}`, 14, finalY + 8);
    doc.text(`Descuento total: -${money(ventaFinalizada.descuentoGlobal)}`, 14, finalY + 14);
    doc.setFontSize(12);
    doc.text(`TOTAL: ${money(ventaFinalizada.total)}`, 14, finalY + 22);

    if (ventaFinalizada.observacion) {
      doc.setFontSize(9);
      doc.text(`Observación: ${ventaFinalizada.observacion}`, 14, finalY + 30);
    }

    doc.save(`ticket-venta-${ventaFinalizada.id || Date.now()}.pdf`);
    setTicketImpreso(true);
  };

  const iniciarNuevaVenta = () => {
    setVentaFinalizada(null);
    setTicketImpreso(false);
    resetVenta();
  };

  const cerrarVentaFinalDesdeBackdrop = () => {
    if (!ventaFinalizada) return;
    if (!ticketImpreso) {
      const ok = window.confirm('Aún no imprimiste el ticket. ¿Cerrar igual y comenzar nueva venta?');
      if (!ok) return;
    }
    iniciarNuevaVenta();
  };

  const confirmarVenta = async () => {
    if (!clienteId || !fechaEntrega) {
      window.alert('Debes seleccionar cliente y fecha de entrega.');
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
      const ventaCreada = await api.createVenta({
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
      setVentaFinalizada({
        id: ventaCreada?.id ?? null,
        fecha: new Date().toISOString(),
        clienteNombre: cliente?.nombre || 'Cliente',
        vendedorNombre: user?.nombre || user?.usuario || 'Vendedor',
        fechaEntrega,
        observacion,
        items: carritoCalculado,
        subtotal,
        descuentoGlobal,
        total,
      });
      setSelectorClienteAbierto(false);
      setBusquedaCliente('');
    } catch (error) {
      window.alert(`No se pudo registrar la venta: ${error.message}`);
    }
  };

  return (
    <div className="ventas-main">
      <div className="ventas-layout">
        <section className="ventas-contenido">
          <div className="ventas-steps">
            {PASOS.map((titulo, i) => {
              const n = i + 1;
              const state = n < paso ? 'done' : n === paso ? 'active' : 'pending';
              return (
                <div className="ventas-step-wrap" key={titulo}>
                  <div className={`ventas-step ${state}`}>
                  <span className="step-index">{state === 'done' ? '✓' : `${n}.`}</span>
                  <span className="step-title">{titulo}</span>
                </div>
                  {i < PASOS.length - 1 && <span className="step-arrow">→</span>}
                </div>
              );
            })}
          </div>

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
                      <small>Stock disponible: {getStockDisponible(p.id)}</small>
                      <div className="card-actions">
                        <button
                          type="button"
                          onClick={() => addToCart(p, 'unidad')}
                          disabled={getStockDisponible(p.id) < 1}
                        >
                          + Unidad
                        </button>
                        <button
                          type="button"
                          onClick={() => addToCart(p, 'empaque')}
                          disabled={getStockDisponible(p.id) < getEmpaqueUnits(p)}
                        >
                          + {p.tipoEmpaque || 'Empaque'} ({getEmpaqueUnits(p)} u.)
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
                  Fecha de entrega
                  <input
                    type="date"
                    min={todayISODate()}
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

              <div className="ticket-resumen">
                <h4>Resumen de la venta</h4>
                <div className="ticket-grid">
                  <p><span>Cliente:</span> {clienteSeleccionado?.nombre || 'Sin seleccionar'}</p>
                  <p><span>Entrega:</span> {fechaEntrega || 'Sin definir'}</p>
                  <p><span>Ítems:</span> {carritoCalculado.length}</p>
                  <p><span>Unidades:</span> {carritoCalculado.reduce((acc, i) => acc + toNumber(i.unidadesSolicitadas), 0)}</p>
                </div>
                <ul className="ticket-items">
                  {carritoCalculado.map((item) => (
                    <li key={item.id}>
                      <span>{item.nombre} x {item.unidadesSolicitadas}</span>
                      <strong>{money(item.subtotalFinal)}</strong>
                    </li>
                  ))}
                </ul>
                <div className="ticket-totales">
                  <p>Subtotal <strong>{money(subtotal)}</strong></p>
                  <p>Descuento total <strong>-{money(descuentoGlobal)}</strong></p>
                  <p className="ticket-total-final">Total <strong>{money(total)}</strong></p>
                </div>
              </div>
            </div>
          )}

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
                     {item.descuentoTipo === 'ninguno' ? (
                       <button
                         type="button"
                         className="descuento-action-link"
                         onClick={() => openDiscountModal(item)}
                       >
                         Dar descuento
                       </button>
                     ) : (
                       <>
                         <span className="descuento-aplicado">
                           Descuento:{' '}
                           {item.descuentoTipo === 'porcentaje'
                             ? `${toNumber(item.descuentoValor)}%`
                             : money(item.descuentoValor)}
                         </span>
                         <button
                           type="button"
                           className="descuento-action-link"
                           onClick={() => removeItemDiscount(item.id)}
                         >
                           Eliminar descuento
                         </button>
                       </>
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

           <div className="carrito-footer">
             <div className="carrito-totales">
               <h4>Subtotal</h4>
               <p>{money(subtotal)}</p>
               <div className="descuento-global">
                 {descuentoTotalTipo === 'ninguno' ? (
                   <button
                     type="button"
                     className="descuento-action-link"
                     onClick={openGlobalDiscountModal}
                   >
                     Dar descuento total
                   </button>
                 ) : (
                   <>
                     <span className="descuento-aplicado">
                       Descuento total:{' '}
                       {descuentoTotalTipo === 'porcentaje'
                         ? `${toNumber(descuentoTotalValor)}%`
                         : money(descuentoTotalValor)}
                     </span>
                     <button
                       type="button"
                       className="descuento-action-link"
                       onClick={removeGlobalDiscount}
                     >
                       Eliminar descuento
                     </button>
                   </>
                 )}
               </div>
               <p className="total-final">Total: <strong>{money(total)}</strong></p>
             </div>
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

      <div
        className={`descuento-modal-overlay ${descuentoItemModal.open ? 'open' : ''}`}
        aria-hidden={!descuentoItemModal.open}
      >
        <div className="descuento-modal-backdrop" onClick={closeDiscountModal} />
        <div className="descuento-modal" role="dialog" aria-modal="true" aria-label="Aplicar descuento">
          <h4>Aplicar descuento</h4>
          <p>Selecciona el tipo de descuento para este producto.</p>
          <div className="descuento-modal-tipos">
            <button
              type="button"
              className={descuentoItemModal.tipo === 'porcentaje' ? 'active' : ''}
              onClick={() => setDescuentoItemModal((prev) => ({ ...prev, tipo: 'porcentaje' }))}
            >
              Porcentual (%)
            </button>
            <button
              type="button"
              className={descuentoItemModal.tipo === 'fijo' ? 'active' : ''}
              onClick={() => setDescuentoItemModal((prev) => ({ ...prev, tipo: 'fijo' }))}
            >
              Fijo ($)
            </button>
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={descuentoItemModal.valor}
            onChange={(e) => setDescuentoItemModal((prev) => ({ ...prev, valor: e.target.value }))}
            placeholder={descuentoItemModal.tipo === 'porcentaje' ? 'Ej: 10' : 'Ej: 500'}
          />
          <div className="descuento-modal-actions">
            <button type="button" className="secundario" onClick={closeDiscountModal}>
              Cancelar
            </button>
            <button type="button" onClick={applyItemDiscount}>
              Aplicar
            </button>
          </div>
        </div>
      </div>

      <div
        className={`descuento-modal-overlay ${descuentoGlobalModal.open ? 'open' : ''}`}
        aria-hidden={!descuentoGlobalModal.open}
      >
        <div className="descuento-modal-backdrop" onClick={closeGlobalDiscountModal} />
        <div className="descuento-modal" role="dialog" aria-modal="true" aria-label="Aplicar descuento total">
          <h4>Aplicar descuento total</h4>
          <p>Selecciona el tipo de descuento para toda la venta.</p>
          <div className="descuento-modal-tipos">
            <button
              type="button"
              className={descuentoGlobalModal.tipo === 'porcentaje' ? 'active' : ''}
              onClick={() => setDescuentoGlobalModal((prev) => ({ ...prev, tipo: 'porcentaje' }))}
            >
              Porcentual (%)
            </button>
            <button
              type="button"
              className={descuentoGlobalModal.tipo === 'fijo' ? 'active' : ''}
              onClick={() => setDescuentoGlobalModal((prev) => ({ ...prev, tipo: 'fijo' }))}
            >
              Fijo ($)
            </button>
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={descuentoGlobalModal.valor}
            onChange={(e) => setDescuentoGlobalModal((prev) => ({ ...prev, valor: e.target.value }))}
            placeholder={descuentoGlobalModal.tipo === 'porcentaje' ? 'Ej: 10' : 'Ej: 500'}
          />
          <div className="descuento-modal-actions">
            <button type="button" className="secundario" onClick={closeGlobalDiscountModal}>
              Cancelar
            </button>
            <button type="button" onClick={applyGlobalDiscount}>
              Aplicar
            </button>
          </div>
        </div>
      </div>

      <div
        className={`venta-final-overlay ${ventaFinalizada ? 'open' : ''}`}
        aria-hidden={!ventaFinalizada}
      >
        <div className="venta-final-backdrop" onClick={cerrarVentaFinalDesdeBackdrop} />
        <div className="venta-final-modal" role="dialog" aria-modal="true" aria-label="Venta confirmada">
          <h4>Venta confirmada</h4>
          {ventaFinalizada && (
            <>
              <p className="venta-final-cliente">
                Cliente: <strong>{ventaFinalizada.clienteNombre}</strong>
              </p>
              <ul className="venta-final-items">
                {ventaFinalizada.items.map((item) => (
                  <li key={item.id}>
                    <span>{item.nombre} x {item.unidadesSolicitadas}</span>
                    <strong>{money(item.subtotalFinal)}</strong>
                  </li>
                ))}
              </ul>
              <div className="venta-final-totales">
                <p>Subtotal <strong>{money(ventaFinalizada.subtotal)}</strong></p>
                <p>Descuento total <strong>-{money(ventaFinalizada.descuentoGlobal)}</strong></p>
                <p className="venta-final-total">Total <strong>{money(ventaFinalizada.total)}</strong></p>
              </div>
            </>
          )}
          <div className="venta-final-actions">
            <button type="button" className="secundario" onClick={iniciarNuevaVenta}>
              Nueva venta
            </button>
            <button type="button" onClick={imprimirTicket}>
              Imprimir ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
