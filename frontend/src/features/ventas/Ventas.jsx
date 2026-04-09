import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './Ventas.css';
import { api } from '../../core/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { appAlert, appConfirm } from '../../shared/lib/appDialog';
import { formatHorarioCliente } from '../../shared/lib/horarios';
import AppInput from '../../shared/components/fields/AppInput';
import AppSelect from '../../shared/components/fields/AppSelect';
import AppTextarea from '../../shared/components/fields/AppTextarea';
import AppButton from '../../shared/components/button/AppButton';

const PASOS = ['Productos y carrito', 'Pago y preventa'];
const MEDIOS_PAGO = [
  { key: 'efectivo', label: 'Efectivo', icon: '/cash.svg' },
  { key: 'debito', label: 'Débito', icon: '/debit.svg' },
  { key: 'credito', label: 'Crédito', icon: '/credit.svg' },
  { key: 'transferencia', label: 'Transferencia', icon: '/transfer.svg' },
];

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

function money(value) {
  const rounded = roundMoney(value);
  return `$${rounded.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isSameMoney(a, b) {
  return Math.abs(roundMoney(a) - roundMoney(b)) < 0.001;
}

function getEmpaqueUnits(producto) {
  const n = Math.floor(toNumber(producto?.cantidadEmpaque));
  return n > 0 ? n : 1;
}

function splitByEmpaque(unidades, unidadesPorEmpaque) {
  const totalUnidades = Math.max(0, Math.floor(toNumber(unidades)));
  const packSize = Math.max(1, Math.floor(toNumber(unidadesPorEmpaque)));
  if (packSize <= 1) return { packs: 0, unidadesSueltas: totalUnidades };
  return {
    packs: Math.floor(totalUnidades / packSize),
    unidadesSueltas: totalUnidades % packSize,
  };
}

function formatEmpaqueSplit(item) {
  const packSize = Math.max(1, Math.floor(toNumber(item.unidadesPorEmpaque)));
  if (packSize <= 1) return `${Math.floor(toNumber(item.unidadesSolicitadas))} unidades`;
  const { packs, unidadesSueltas } = splitByEmpaque(item.unidadesSolicitadas, packSize);
  const packLabel = item.tipoEmpaque || 'empaque';
  if (packs > 0 && unidadesSueltas > 0) return `${packs} ${packLabel} + ${unidadesSueltas} unidades`;
  if (packs > 0) return `${packs} ${packLabel}`;
  return `${unidadesSueltas} unidades`;
}

function todayISODate() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

function formatMedioPago(value) {
  const v = String(value || 'efectivo').toLowerCase();
  if (v === 'credito') return 'Crédito';
  if (v === 'debito') return 'Débito';
  if (v === 'transferencia') return 'Transferencia';
  return 'Efectivo';
}

const ProductoCatalogCard = memo(function ProductoCatalogCard({
  producto,
  vistaProductos,
  pickerModo,
  pickerCantidad,
  stockDisponible,
  onSetPickerModo,
  onSetPickerCantidad,
  onAddToCart,
}) {
  const unidadesPorEmpaque = getEmpaqueUnits(producto);
  const precioEmpaque = roundMoney(producto.precioEmpaque);

  return (
    <article className={`producto-card ${vistaProductos === 'list' ? 'list' : ''}`}>
      <div className="producto-image-wrap">
        {producto.imagenPreview ? (
          <img src={producto.imagenPreview} alt={producto.nombre} className="producto-image" />
        ) : (
          <div className="producto-image placeholder">Sin imagen</div>
        )}
        <div className="overlay">
          <h4>{producto.nombre}</h4>
          <small className="overlay-code">Código: {producto.ean || '-'}</small>
          <span>{money(producto.venta)}</span>
        </div>
      </div>
      <div className="card-footer">
        <small>Stock disponible: {stockDisponible}</small>
        <div className="producto-pricing">
          <small>Unidad: {money(producto.venta)}</small>
          <small>{producto.tipoEmpaque || 'Empaque'}: {precioEmpaque > 0 ? money(precioEmpaque) : '-'}</small>
        </div>
        <div className="producto-picker">
          <div className="picker-mode">
            <button
              type="button"
              className={`picker-mode-btn ${pickerModo === 'unidad' ? 'active' : ''}`}
              onClick={() => onSetPickerModo(producto.id, 'unidad')}
            >
              Unidad
            </button>
            <button
              type="button"
              className={`picker-mode-btn ${pickerModo === 'empaque' ? 'active' : ''}`}
              onClick={() => onSetPickerModo(producto.id, 'empaque')}
            >
              {producto.tipoEmpaque || 'Empaque'} ({unidadesPorEmpaque}u)
            </button>
          </div>
          <div className="picker-qty">
            <button
              type="button"
              className="picker-step"
              onClick={() => onSetPickerCantidad(producto.id, pickerCantidad - 1)}
            >
              -
            </button>
            <AppInput
              type="number"
              className="picker-qty-input"
              min="1"
              step="1"
              value={pickerCantidad}
              onChange={(e) => onSetPickerCantidad(producto.id, e.target.value)}
            />
            <button
              type="button"
              className="picker-step"
              onClick={() => onSetPickerCantidad(producto.id, pickerCantidad + 1)}
            >
              +
            </button>
          </div>
          <AppButton
            type="button"
            className="picker-add-btn"
            onClick={() => onAddToCart(producto, pickerModo, pickerCantidad)}
          >
            Agregar
          </AppButton>
        </div>
      </div>
    </article>
  );
});

export default function Ventas({
  user,
  productos = [],
  setProductos,
  carritoDrawerOpen = false,
  onToggleCarritoDrawer,
  onCloseCarritoDrawer,
}) {
  const [paso, setPaso] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [vistaProductos, setVistaProductos] = useState('grid');
  const [selectorClienteAbierto, setSelectorClienteAbierto] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [productPicker, setProductPicker] = useState({});

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
  const [pagos, setPagos] = useState([
    { medio_pago: 'efectivo', activo: true, monto: '' },
    { medio_pago: 'debito', activo: false, monto: '' },
    { medio_pago: 'credito', activo: false, monto: '' },
    { medio_pago: 'transferencia', activo: false, monto: '' },
  ]);
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
        setClientes(rows.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          telefono: c.telefono || '',
          direccion: c.direccion || '',
          horario_apertura: c.horario_apertura || '',
          horario_cierre: c.horario_cierre || '',
          tiene_reapertura: Boolean(c.tiene_reapertura),
          horario_reapertura: c.horario_reapertura || '',
          horario_cierre_reapertura: c.horario_cierre_reapertura || '',
        })));
      } catch (error) {
        console.error('Error cargando clientes', error);
      }
    };
    loadClientes();
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem('ferco_replicar_venta');
    if (!raw) return;
    let venta = null;
    try {
      venta = JSON.parse(raw);
    } catch {
      sessionStorage.removeItem('ferco_replicar_venta');
      return;
    }
    if (!venta || typeof venta !== 'object') {
      sessionStorage.removeItem('ferco_replicar_venta');
      return;
    }

    const detalle = Array.isArray(venta.detalle) ? venta.detalle : [];
    const itemsReplicados = detalle
      .map((item, idx) => {
        const productoId = Number(item.producto_id);
        if (!Number.isFinite(productoId) || productoId <= 0) return null;
        const producto = productos.find((p) => Number(p.id) === productoId);
        const unidadesPorEmpaque = getEmpaqueUnits(producto);
        const cantidad = Math.max(1, Math.floor(toNumber(item.cantidad)));
        return {
          id: Date.now() + Math.random() + idx,
          productoId,
          nombre: producto?.nombre || item.producto_nombre || `Producto #${productoId}`,
          unidadesSolicitadas: cantidad,
          precioUnidad: roundMoney(producto?.venta ?? item.precio_unitario),
          precioEmpaque: roundMoney(producto?.precioEmpaque ?? 0),
          unidadesPorEmpaque,
          tipoEmpaque: String(producto?.tipoEmpaque || 'empaque').trim() || 'empaque',
          modoVenta: unidadesPorEmpaque > 1 && cantidad % unidadesPorEmpaque === 0 ? 'empaque' : 'unidad',
          descuentoTipo: 'ninguno',
          descuentoValor: '',
        };
      })
      .filter(Boolean);

    const pagosVenta = Array.isArray(venta.pagos) ? venta.pagos : [];
    const pagosReplicados = MEDIOS_PAGO.map((medio) => {
      const pago = pagosVenta.find((p) => p?.medio_pago === medio.key);
      return {
        medio_pago: medio.key,
        activo: Boolean(pago),
        monto: pago ? String(roundMoney(pago.monto)) : '',
      };
    });
    queueMicrotask(() => {
      if (itemsReplicados.length > 0) {
        setCarrito(itemsReplicados);
      }
      setClienteId(venta.cliente_id ? String(venta.cliente_id) : '');
      setFechaEntrega(venta.fecha_entrega ? String(venta.fecha_entrega).slice(0, 10) : '');
      setObservacion(venta.observacion || '');
      setDescuentoTotalTipo(
        venta.descuento_total_tipo === 'porcentaje' || venta.descuento_total_tipo === 'fijo'
          ? venta.descuento_total_tipo
          : 'ninguno'
      );
      setDescuentoTotalValor(
        venta.descuento_total_tipo === 'porcentaje' || venta.descuento_total_tipo === 'fijo'
          ? String(roundMoney(venta.descuento_total_valor))
          : ''
      );
      setPagos(
        pagosReplicados.some((p) => p.activo)
          ? pagosReplicados
          : [
            { medio_pago: 'efectivo', activo: true, monto: '' },
            { medio_pago: 'debito', activo: false, monto: '' },
            { medio_pago: 'credito', activo: false, monto: '' },
            { medio_pago: 'transferencia', activo: false, monto: '' },
          ]
      );
      setPaso(1);
      setVentaFinalizada(null);
      setTicketImpreso(false);
      setSelectorClienteAbierto(false);
      setBusquedaCliente('');
    });
    sessionStorage.removeItem('ferco_replicar_venta');
  }, [productos]);

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

  const stockBasePorProducto = useMemo(() => {
    return productos.reduce((acc, producto) => {
      acc[producto.id] = Math.floor(toNumber(producto.stock || 0));
      return acc;
    }, {});
  }, [productos]);

  const stockRestantePorProducto = useMemo(() => {
    const remaining = {};
    Object.keys(stockBasePorProducto).forEach((productoId) => {
      const base = Math.floor(toNumber(stockBasePorProducto[productoId]));
      const reservado = Math.floor(toNumber(stockReservadoPorProducto[productoId] || 0));
      remaining[productoId] = base - reservado;
    });
    return remaining;
  }, [stockBasePorProducto, stockReservadoPorProducto]);

  const setPickerModo = useCallback((productoId, modo) => {
    setProductPicker((prev) => {
      const current = prev[productoId] || { modo: 'unidad', cantidad: 1 };
      return {
        ...prev,
        [productoId]: { ...current, modo: modo === 'empaque' ? 'empaque' : 'unidad' },
      };
    });
  }, []);

  const setPickerCantidad = useCallback((productoId, cantidad) => {
    const next = Math.max(1, Math.floor(toNumber(cantidad || 1)));
    setProductPicker((prev) => {
      const current = prev[productoId] || { modo: 'unidad', cantidad: 1 };
      return {
        ...prev,
        [productoId]: { ...current, cantidad: next },
      };
    });
  }, []);

  const addToCartFromPicker = useCallback((producto, pickerModo, pickerCantidad) => {
    const modo = pickerModo === 'empaque' ? 'empaque' : 'unidad';
    const cantidad = Math.max(1, Math.floor(toNumber(pickerCantidad || 1)));
    const unidadesPorEmpaque = getEmpaqueUnits(producto);
    const multiplicador = modo === 'empaque' ? unidadesPorEmpaque : 1;
    const unidadesAgregar = cantidad * multiplicador;
    const precioUnidad = roundMoney(producto.venta);
    const precioEmpaque = roundMoney(producto.precioEmpaque);
    const tipoEmpaque = String(producto.tipoEmpaque || 'empaque').trim() || 'empaque';
    const modoVenta = modo;

    setCarrito((prev) => {
      const itemExistente = prev.find((i) => i.productoId === producto.id && i.modoVenta === modoVenta);
      if (itemExistente) {
        return prev.map((item) =>
          item.id === itemExistente.id
            ? {
              ...item,
              unidadesSolicitadas: toNumber(item.unidadesSolicitadas) + unidadesAgregar,
              precioUnidad,
              precioEmpaque,
              unidadesPorEmpaque,
              tipoEmpaque,
              modoVenta,
              ean: producto.ean || item.ean || '',
            }
            : item
        );
      }

      return [
        ...prev,
        {
          id: Date.now() + Math.random(),
          productoId: producto.id,
          nombre: producto.nombre,
          ean: producto.ean || '',
          unidadesSolicitadas: unidadesAgregar,
          precioUnidad,
          precioEmpaque,
          unidadesPorEmpaque,
          tipoEmpaque,
          modoVenta,
          descuentoTipo: 'ninguno',
          descuentoValor: '',
        },
      ];
    });
  }, []);

  const catalogoCards = useMemo(() => {
    if (productosFiltrados.length === 0) return null;

    return productosFiltrados.map((producto) => {
      const saved = productPicker[producto.id];
      const pickerModo = saved?.modo === 'empaque' ? 'empaque' : 'unidad';
      const pickerCantidad = Math.max(1, Math.floor(toNumber(saved?.cantidad || 1)));
      const stockDisponible = Math.floor(toNumber(stockRestantePorProducto[producto.id] || 0));

      return (
        <ProductoCatalogCard
          key={producto.id}
          producto={producto}
          vistaProductos={vistaProductos}
          pickerModo={pickerModo}
          pickerCantidad={pickerCantidad}
          stockDisponible={stockDisponible}
          onSetPickerModo={setPickerModo}
          onSetPickerCantidad={setPickerCantidad}
          onAddToCart={addToCartFromPicker}
        />
      );
    });
  }, [
    addToCartFromPicker,
    productosFiltrados,
    productPicker,
    setPickerCantidad,
    setPickerModo,
    stockRestantePorProducto,
    vistaProductos,
  ]);

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
    const item = carrito.find((i) => i.id === itemId);
    if (!item) return;
    const packSize = Math.max(1, Math.floor(toNumber(item.unidadesPorEmpaque)));
    const ingreso = Math.max(1, Math.floor(toNumber(nextValue)));
    const unidades = item.modoVenta === 'empaque' ? ingreso * packSize : ingreso;
    if (unidades <= 0) {
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
      const unidades = Math.max(0, Math.floor(toNumber(item.unidadesSolicitadas)));
      const packSize = Math.max(1, Math.floor(toNumber(item.unidadesPorEmpaque)));
      const precioUnidad = roundMoney(item.precioUnidad);
      const precioEmpaque = roundMoney(item.precioEmpaque);
      const puedeEmpaque = packSize > 1 && precioEmpaque > 0;
      const split = puedeEmpaque
        ? splitByEmpaque(unidades, packSize)
        : { packs: 0, unidadesSueltas: unidades };
      const base = puedeEmpaque
        ? roundMoney(split.packs * precioEmpaque + split.unidadesSueltas * precioUnidad)
        : roundMoney(unidades * precioUnidad);
      const valor = toNumber(item.descuentoValor);
      let descuento = 0;

      if (item.descuentoTipo === 'porcentaje') {
        const pct = Math.max(0, Math.min(100, valor));
        descuento = (base * pct) / 100;
      } else if (item.descuentoTipo === 'fijo') {
        const fijo = roundMoney(valor);
        descuento = Math.max(0, Math.min(base, fijo));
      }

      const descuentoAplicado = roundMoney(descuento);
      return {
        ...item,
        subtotalBase: base,
        packsCalculados: split.packs,
        unidadesSueltasCalculadas: split.unidadesSueltas,
        precioUnitarioCalculado: unidades > 0 ? (base / unidades) : 0,
        descuentoAplicado,
      };
    });
  }, [carrito]);

  const descuentoItemsTotal = useMemo(
    () => roundMoney(carritoCalculado.reduce((acc, i) => acc + toNumber(i.descuentoAplicado), 0)),
    [carritoCalculado]
  );

  const subtotal = useMemo(
    () => roundMoney(carritoCalculado.reduce((acc, i) => acc + toNumber(i.subtotalBase), 0)),
    [carritoCalculado]
  );

  const baseParaDescuentoGlobal = Math.max(0, subtotal - descuentoItemsTotal);

  const descuentoGlobal = useMemo(() => {
    const v = toNumber(descuentoTotalValor);
    if (descuentoTotalTipo === 'porcentaje') {
      const pct = Math.max(0, Math.min(100, v));
      return roundMoney((baseParaDescuentoGlobal * pct) / 100);
    }
    if (descuentoTotalTipo === 'fijo') {
      const fijo = roundMoney(v);
      return Math.max(0, Math.min(baseParaDescuentoGlobal, fijo));
    }
    return 0;
  }, [descuentoTotalTipo, descuentoTotalValor, baseParaDescuentoGlobal]);

  const descuentoTotalAplicado = roundMoney(Math.max(0, descuentoItemsTotal + descuentoGlobal));
  const total = roundMoney(Math.max(0, subtotal - descuentoTotalAplicado));
  const totalUnidadesCarrito = useMemo(
    () => carritoCalculado.reduce((acc, item) => acc + toNumber(item.unidadesSolicitadas), 0),
    [carritoCalculado]
  );
  const clienteSeleccionado = clientes.find((c) => String(c.id) === String(clienteId));
  const pagosActivos = useMemo(
    () => pagos.filter((p) => p.activo),
    [pagos]
  );
  const esPagoUnico = pagosActivos.length === 1;
  const pagosConMonto = useMemo(
    () => {
      if (pagosActivos.length === 1) {
        return [{ ...pagosActivos[0], montoNumber: total }];
      }
      return pagosActivos
        .map((p) => ({ ...p, montoNumber: roundMoney(p.monto) }))
        .filter((p) => p.montoNumber > 0);
    },
    [pagosActivos, total]
  );
  const totalPagos = useMemo(
    () => roundMoney(pagosConMonto.reduce((acc, p) => acc + p.montoNumber, 0)),
    [pagosConMonto]
  );

  const goNext = () => {
    if (carrito.length === 0) {
      appAlert('Agrega al menos un producto al carrito.');
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
    setProductPicker({});
    setDescuentoTotalTipo('ninguno');
    setDescuentoTotalValor('');
    setClienteId('');
    setFechaEntrega('');
    setPagos([
      { medio_pago: 'efectivo', activo: true, monto: '' },
      { medio_pago: 'debito', activo: false, monto: '' },
      { medio_pago: 'credito', activo: false, monto: '' },
      { medio_pago: 'transferencia', activo: false, monto: '' },
    ]);
    setObservacion('');
  };

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const buildTicketPdf = async () => {
    if (!ventaFinalizada) return null;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let cursorY = 12;

    try {
      const logo = await loadImage('/images/encabezadofacturacion.png');
      const logoWidth = 64;
      const logoHeight = 12;
      const x = (pageWidth - logoWidth) / 2;
      doc.addImage(logo, 'PNG', x, cursorY, logoWidth, logoHeight);
      cursorY += logoHeight + 4;
    } catch {
      cursorY += 2;
    }

    doc.setFontSize(14);
    doc.text('Ticket de venta', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 6;

    const leftX = 14;
    const rightX = pageWidth / 2 + 4;
    const lineH = 4.8;
    doc.setFontSize(9.5);
    doc.text(`Fecha Emisión: ${new Date(ventaFinalizada.fecha).toLocaleString('es-UY')}`, leftX, cursorY);
    doc.text(`Cliente: ${ventaFinalizada.clienteNombre || '-'}`, rightX, cursorY);
    cursorY += lineH;
    doc.text(`Número de ticket: ${ventaFinalizada.id ? `#${ventaFinalizada.id}` : 'Sin número'}`, leftX, cursorY);
    doc.text(`Número de teléfono: ${ventaFinalizada.clienteTelefono || '-'}`, rightX, cursorY);
    cursorY += lineH;
    doc.text(`Vendedor: ${ventaFinalizada.vendedorNombre || '-'}`, leftX, cursorY);
    doc.text(`Dirección: ${ventaFinalizada.clienteDireccion || '-'}`, rightX, cursorY, { maxWidth: pageWidth - rightX - 10 });
    cursorY += lineH;
    doc.text(`Horarios: ${ventaFinalizada.clienteHorarios || '-'}`, rightX, cursorY, { maxWidth: pageWidth - rightX - 10 });
    cursorY += lineH;
    doc.text(`Fecha de entrega: ${new Date(ventaFinalizada.fechaEntrega).toLocaleDateString('es-UY')}`, leftX, cursorY);
    cursorY += 6;

    autoTable(doc, {
      startY: cursorY,
      head: [['Producto', 'Cant.', 'Presentación', 'P. Unit.', 'Desc.', 'Subtotal']],
      body: ventaFinalizada.items.map((item) => [
        item.nombre,
        item.unidadesSolicitadas,
        formatEmpaqueSplit(item),
        money(item.precioUnitarioCalculado),
        money(item.descuentoAplicado),
        money(item.subtotalBase),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [55, 95, 140] },
    });

    const finalY = doc.lastAutoTable?.finalY ?? cursorY + 8;
    const totalsRightX = pageWidth - 14;
    const pagosLabelX = pageWidth - 52;
    const pagosValueX = pageWidth - 14;
    let totalsY = finalY + 8;
    doc.setFontSize(10);
    doc.text(`Subtotal: ${money(ventaFinalizada.subtotal)}`, totalsRightX, totalsY, { align: 'right' });
    totalsY += 5;
    doc.text(`Descuentos: -${money(ventaFinalizada.descuentoGlobal)}`, totalsRightX, totalsY, { align: 'right' });
    totalsY += 5;
    doc.setFontSize(12);
    doc.text(`Total: ${money(ventaFinalizada.total)}`, totalsRightX, totalsY, { align: 'right' });
    totalsY += 6;
    doc.setFontSize(10);
    doc.text('Pagos:', totalsRightX, totalsY, { align: 'right' });
    totalsY += 4;
    (ventaFinalizada.pagos || []).forEach((pago) => {
      doc.text(`- ${formatMedioPago(pago.medio_pago)}:`, pagosLabelX, totalsY, { align: 'right' });
      doc.text(`${money(pago.monto)}`, pagosValueX, totalsY, { align: 'right' });
      totalsY += 4;
    });

    if (ventaFinalizada.observacion) {
      doc.setFontSize(9);
      doc.text(`Observación: ${ventaFinalizada.observacion}`, 14, totalsY + 2);
    }

    const fileName = `ticket-venta-${ventaFinalizada.id || Date.now()}.pdf`;
    return { doc, fileName };
  };

  const imprimirTicket = async () => {
    const data = await buildTicketPdf();
    if (!data) return;
    const blob = data.doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
      }
    };
    document.body.appendChild(iframe);
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 7000);
    setTicketImpreso(true);
  };

  const descargarTicketPdf = async () => {
    const data = await buildTicketPdf();
    if (!data) return;
    data.doc.save(data.fileName);
    setTicketImpreso(true);
  };

  const enviarTicketWhatsApp = async () => {
    if (!ventaFinalizada) return;
    const data = await buildTicketPdf();
    if (!data) return;
    const pdfBlob = data.doc.output('blob');
    const file = new File([pdfBlob], data.fileName, { type: 'application/pdf' });
    const shareData = {
      files: [file],
      title: `Ticket ${ventaFinalizada.id || ''}`,
    };
    const canShareFile = typeof navigator !== 'undefined'
      && typeof navigator.share === 'function'
      && typeof navigator.canShare === 'function'
      && navigator.canShare(shareData);

    if (canShareFile) {
      try {
        await navigator.share(shareData);
        setTicketImpreso(true);
        return;
      } catch {
        // fallback below
      }
    }

    data.doc.save(data.fileName);
    window.open('https://web.whatsapp.com/', '_blank', 'noopener,noreferrer');
    setTicketImpreso(true);
  };

  const iniciarNuevaVenta = () => {
    setVentaFinalizada(null);
    setTicketImpreso(false);
    resetVenta();
  };

  const closeCarritoDrawer = () => {
    if (typeof onCloseCarritoDrawer === 'function') {
      onCloseCarritoDrawer();
    }
  };

  const toggleCarritoDrawer = () => {
    if (typeof onToggleCarritoDrawer === 'function') {
      onToggleCarritoDrawer();
    }
  };

  const cerrarVentaFinalDesdeBackdrop = () => {
    if (!ventaFinalizada) return;
    if (!ticketImpreso) {
      appConfirm('Aún no imprimiste el ticket. ¿Cerrar igual y comenzar nueva venta?', {
        title: 'Cerrar venta confirmada',
        confirmText: 'Cerrar igual',
        cancelText: 'Seguir aquí',
      }).then((ok) => {
        if (ok) iniciarNuevaVenta();
      });
      return;
    }
    iniciarNuevaVenta();
  };

  const confirmarVenta = async () => {
    if (!clienteId || !fechaEntrega) {
      await appAlert('Debes seleccionar cliente y fecha de entrega.');
      return;
    }
    if (pagosConMonto.length === 0) {
      await appAlert('Debes cargar al menos un medio de pago con monto.');
      return;
    }
    if (!isSameMoney(totalPagos, total)) {
      await appAlert(`La suma de pagos (${money(totalPagos)}) debe coincidir con el total (${money(total)}).`);
      return;
    }
    if (!setProductos) return;

    const demanda = carritoCalculado.reduce((acc, i) => {
      acc[i.productoId] = (acc[i.productoId] || 0) + toNumber(i.unidadesSolicitadas);
      return acc;
    }, {});

    try {
      const ventaCreada = await api.createVenta({
        usuario_id: user?.id ?? null,
        cliente_id: Number(clienteId),
        fecha_entrega: fechaEntrega,
        medio_pago: pagosConMonto[0]?.medio_pago || 'efectivo',
        pagos: pagosConMonto.map((p) => ({ medio_pago: p.medio_pago, monto: p.montoNumber })),
        observacion,
        descuento_total_tipo: 'fijo',
        descuento_total_valor: roundMoney(descuentoTotalAplicado),
        detalle: carritoCalculado.map((item) => ({
          producto_id: item.productoId,
          cantidad: item.unidadesSolicitadas,
          precio_unitario: toNumber(item.precioUnitarioCalculado),
        })),
      });

      window.dispatchEvent(
        new CustomEvent('ferco:stats-refresh', {
          detail: { source: 'venta-creada', ventaId: ventaCreada?.id ?? null },
        })
      );

      setProductos(
        productos.map((p) => {
          const need = toNumber(demanda[p.id] || 0);
          if (!need) return p;
          const stock = Math.floor(toNumber(p.stock));
          return { ...p, stock: String(stock - need) };
        })
      );

      const cliente = clientes.find((c) => String(c.id) === String(clienteId));
      setVentaFinalizada({
        id: ventaCreada?.id ?? null,
        fecha: new Date().toISOString(),
        clienteId: Number(clienteId),
        clienteNombre: cliente?.nombre || 'Cliente',
        clienteTelefono: cliente?.telefono || '',
        clienteDireccion: cliente?.direccion || '',
        clienteHorarios: formatHorarioCliente(cliente || {}),
        vendedorNombre: user?.nombre || user?.usuario || 'Vendedor',
        fechaEntrega,
        pagos: (ventaCreada?.pagos || pagosConMonto).map((p) => ({
          medio_pago: p.medio_pago,
          monto: toNumber(p.montoNumber ?? p.monto),
        })),
        observacion,
        items: carritoCalculado,
        subtotal,
        descuentoGlobal: descuentoTotalAplicado,
        descuentoTotalTipo,
        descuentoTotalValor,
        total,
      });
      setSelectorClienteAbierto(false);
      setBusquedaCliente('');
    } catch (error) {
      await appAlert(`No se pudo registrar la venta: ${error.message}`);
    }
  };

  return (
    <div className="ventas-main">
      <div
        className={`ventas-carrito-overlay ${carritoDrawerOpen ? 'open' : ''}`}
        onClick={closeCarritoDrawer}
        aria-hidden={!carritoDrawerOpen}
      />
      <div className="ventas-layout">
        <section className={`ventas-contenido ${paso === 1 ? 'paso-productos' : paso === 2 ? 'paso-preventa' : ''}`}>

          {paso === 1 && (
            <div className="ventas-panel ventas-panel-catalogo">
              <div className="catalogo-head">
                {/* {pasosHeader} */}
                <div className="catalogo-top">
                  <h3>Buscar</h3>
                  <AppInput
                    type="text"
                    placeholder="Buscar por nombre o código..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                  <AppButton
                    type="button"
                    className="vista-toggle"
                    onClick={() => setVistaProductos((v) => (v === 'grid' ? 'list' : 'grid'))}
                    title={vistaProductos === 'grid' ? 'Cambiar a lista' : 'Cambiar a cuadrícula'}
                  >
                    <img
                      src={vistaProductos === 'grid' ? '/list-view.svg' : '/grid-view.svg'}
                      alt={vistaProductos === 'grid' ? 'Vista lista' : 'Vista cuadrícula'}
                    />
                  </AppButton>
                </div>
              </div>

              <div className={`catalogo-grid catalogo-grid-scroll ${vistaProductos === 'list' ? 'catalogo-list' : ''}`}>
                {productosFiltrados.length === 0 && <p className="muted">No hay productos para mostrar.</p>}
                {catalogoCards}
              </div>
            </div>
          )}

          {paso === 2 && (
            <div className="ventas-panel ventas-panel-preventa">
              <div className="preventa-head">
                <h3>Pago y preventa</h3>
              </div>
              <div className="preventa-scroll">
                <div className="form-entrega">
                  <div className="pagos-box full">
                    <span className="pagos-label">Selecciona uno o más medios de pago</span>
                    <div className="pago-grid">
                      {MEDIOS_PAGO.map((method) => {
                        const row = pagos.find((p) => p.medio_pago === method.key);
                        const activo = Boolean(row?.activo);
                        return (
                          <AppButton
                            key={method.key}
                            type="button"
                            className={`pago-card ${activo ? 'active' : ''}`}
                            onClick={() => {
                              setPagos((prev) => prev.map((p) => (
                                p.medio_pago === method.key ? { ...p, activo: !p.activo } : p
                              )));
                            }}
                          >
                            <img src={method.icon} alt="" aria-hidden="true" />
                            <span>{method.label}</span>
                          </AppButton>
                        );
                      })}
                    </div>
                    <div className="pago-inputs">
                      {pagosActivos.map((pago) => (
                        <label key={`monto-${pago.medio_pago}`}>
                          <span>{formatMedioPago(pago.medio_pago)}</span>
                          <AppInput
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Monto"
                            value={esPagoUnico ? total : pago.monto}
                            readOnly={esPagoUnico}
                            onChange={(e) => {
                              if (esPagoUnico) return;
                              const value = e.target.value;
                              setPagos((prev) => prev.map((p) => (
                                p.medio_pago === pago.medio_pago ? { ...p, monto: value } : p
                              )));
                            }}
                          />
                        </label>
                      ))}
                    </div>
                    {esPagoUnico && (
                      <small className="pago-auto-info">
                        Monto automático: se completa con el total al usar un solo medio.
                      </small>
                    )}
                    <div className={`pagos-total ${isSameMoney(totalPagos, total) ? 'ok' : 'warn'}`}>
                      Pagos: <strong>{money(totalPagos)}</strong> / Total: <strong>{money(total)}</strong>
                    </div>
                    <label className="observacion-venta">
                      <span>Observación</span>
                      <AppTextarea
                        value={observacion}
                        onChange={(e) => setObservacion(e.target.value)}
                        placeholder="Observación (opcional)"
                        rows={3}
                      />
                    </label>
                  </div>
                </div>

                <div className="ticket-resumen">
                  <div className="ticket-header">
                    <div>
                      <h4>Pre-ticket de venta</h4>
                      <span>Vista previa del comprobante</span>
                    </div>
                    <strong className="ticket-total-chip">{money(total)}</strong>
                  </div>
                  <div className="ticket-grid">
                    <p><span>Cliente:</span> {clienteSeleccionado?.nombre || 'Sin seleccionar'}</p>
                    <p><span>Horarios:</span> {formatHorarioCliente(clienteSeleccionado || {})}</p>
                    <p><span>Entrega:</span> {fechaEntrega || 'Sin definir'}</p>
                    <p><span>Pagos:</span> {pagosConMonto.length}</p>
                    <p><span>Ítems:</span> {carritoCalculado.length}</p>
                    <p><span>Unidades:</span> {carritoCalculado.reduce((acc, i) => acc + toNumber(i.unidadesSolicitadas), 0)}</p>
                  </div>
                  <ul className="ticket-pagos">
                    {pagosConMonto.map((pago) => (
                      <li key={`preview-pago-${pago.medio_pago}`}>
                        <span>{formatMedioPago(pago.medio_pago)}</span>
                        <strong>{money(pago.montoNumber)}</strong>
                      </li>
                    ))}
                  </ul>
                  <ul className="ticket-items">
                    {carritoCalculado.map((item) => (
                      <li key={item.id}>
                        <span><b>{item.nombre}</b> x {item.unidadesSolicitadas}</span>
                        <strong>{money(item.subtotalBase)}</strong>
                        <small>{formatEmpaqueSplit(item)}</small>
                      </li>
                    ))}
                  </ul>
                  <div className="ticket-totales">
                    <p>Subtotal <strong>{money(subtotal)}</strong></p>
                    <p>Descuento ítems <strong>-{money(descuentoItemsTotal)}</strong></p>
                    <p>Descuento total <strong>-{money(descuentoGlobal)}</strong></p>
                    <p className="ticket-total-final">Total <strong>{money(total)}</strong></p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </section>

        <aside className={`ventas-carrito ${carritoDrawerOpen ? 'mobile-open' : ''}`}>
          <div className="ventas-carrito-mobile-head">
            <h3>Carrito</h3>
            <AppButton
              type="button"
              className="ventas-carrito-close"
              onClick={closeCarritoDrawer}
              aria-label="Cerrar carrito"
            >
              ✕
            </AppButton>
          </div>
          <div className="cliente-cabecera">
            <AppButton
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
            </AppButton>
          </div>
          <div className="sidebar-entrega">
            <label>
              Fecha de entrega
              <AppInput
                type="date"
                min={todayISODate()}
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
              />
            </label>
          </div>

          <h3 className="ventas-carrito-title">Carrito</h3>
          {carritoCalculado.length === 0 && <p className="muted">Aún no agregaste productos.</p>}
          <div className="carrito-list">
            {carritoCalculado.map((item) => (
              <div key={item.id} className="carrito-item">
                <div>
                  <strong>{item.nombre}</strong>
                  <p className="carrito-codigo">Código: {item.ean || '-'}</p>
                  <p className={toNumber(stockRestantePorProducto[item.productoId] || 0) < 0 ? 'unidades-negativas' : ''}>
                    {item.modoVenta === 'empaque'
                      ? `${item.unidadesSolicitadas} unidad(es)`
                      : `${item.unidadesSolicitadas} unidad(es)`}
                  </p>
                  <div className="unidades-edit">
                    <label htmlFor={`units-${item.id}`}>
                      {item.modoVenta === 'empaque' ? (item.tipoEmpaque || 'Empaques') : 'Unidades'}
                    </label>
                    <AppInput
                      id={`units-${item.id}`}
                      type="number"
                      min="1"
                      step="1"
                      value={
                        item.modoVenta === 'empaque'
                          ? Math.max(1, Math.floor(toNumber(item.unidadesSolicitadas) / Math.max(1, Math.floor(toNumber(item.unidadesPorEmpaque)))))
                          : item.unidadesSolicitadas
                      }
                      onChange={(e) => updateUnits(item.id, e.target.value)}
                    />
                  </div>
                  <div className="descuentos-item">
                    {item.descuentoTipo === 'ninguno' ? (
                      <AppButton
                        type="button"
                        className="descuento-action-link"
                        onClick={() => openDiscountModal(item)}
                      >
                        Dar descuento
                      </AppButton>
                    ) : (
                      <>
                        <span className="descuento-aplicado">
                          Descuento:{' '}
                          {item.descuentoTipo === 'porcentaje'
                            ? `${toNumber(item.descuentoValor)}%`
                            : money(item.descuentoValor)}
                        </span>
                        <AppButton
                          type="button"
                          className="descuento-action-link"
                          onClick={() => removeItemDiscount(item.id)}
                        >
                          Eliminar descuento
                        </AppButton>
                      </>
                    )}
                  </div>
                </div>
                <div className="carrito-right">
                  <span>{money(item.subtotalBase)}</span>
                  <small>
                    {item.modoVenta === 'empaque'
                      ? `${Math.max(1, Math.floor(toNumber(item.unidadesSolicitadas) / Math.max(1, Math.floor(toNumber(item.unidadesPorEmpaque)))))}
                         ${item.tipoEmpaque || 'empaque'}(s)`
                      : formatEmpaqueSplit(item)}
                  </small>
                  {item.descuentoAplicado > 0 && (
                    <small className="linea-descuento">- {money(item.descuentoAplicado)}</small>
                  )}
                  <AppButton type="button" onClick={() => removeItem(item.id)}>✕</AppButton>
                </div>
              </div>
            ))}
          </div>

          <div className="carrito-footer">
            <div className="carrito-totales">
              <h4>Subtotal</h4>
              <p>{money(subtotal)}</p>
              <p className="resumen-descuento">Descuento ítems: -{money(descuentoItemsTotal)}</p>
              <div className="descuento-global">
                {descuentoTotalTipo === 'ninguno' ? (
                  <AppButton
                    type="button"
                    className="descuento-action-link"
                    onClick={openGlobalDiscountModal}
                  >
                    Dar descuento total
                  </AppButton>
                ) : (
                  <>
                    <span className="descuento-aplicado">
                      Descuento total:{' '}
                      {descuentoTotalTipo === 'porcentaje'
                        ? `${toNumber(descuentoTotalValor)}%`
                        : money(descuentoTotalValor)}
                    </span>
                    <AppButton
                      type="button"
                      className="descuento-action-link"
                      onClick={removeGlobalDiscount}
                    >
                      Eliminar descuento
                    </AppButton>
                  </>
                )}
              </div>
              <p className="total-final">Total: <strong>{money(total)}</strong></p>
            </div>
            <div className="ventas-footer">
              {paso === 1 ? (
                <AppButton type="button" onClick={goNext}>Siguiente</AppButton>
              ) : (
                <>
                  <AppButton type="button" className="secundario" onClick={goBack}>Atrás</AppButton>
                  <AppButton type="button" className="confirmar" onClick={confirmarVenta}>Confirmar venta</AppButton>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>

      {totalUnidadesCarrito > 0 && !carritoDrawerOpen && (
        <AppButton
          type="button"
          className="carrito-fab"
          onClick={toggleCarritoDrawer}
          aria-label={carritoDrawerOpen ? 'Cerrar carrito' : 'Abrir carrito'}
          aria-expanded={carritoDrawerOpen}
        >
          <img src="/cart.svg" alt="" aria-hidden="true" />
          <span className="carrito-fab-count">{totalUnidadesCarrito}</span>
        </AppButton>
      )}

      <div
        className={`cliente-overlay ${selectorClienteAbierto ? 'open' : ''}`}
        aria-hidden={!selectorClienteAbierto}
      >
        <div className="cliente-overlay-backdrop" />
        <div className="cliente-drawer" ref={clienteDropdownRef}>
          <div className="cliente-dropdown-head">
            <h4>Seleccionar cliente</h4>
            <AppButton
              type="button"
              className="cliente-cerrar"
              onClick={() => setSelectorClienteAbierto(false)}
            >
              ✕
            </AppButton>
          </div>
          <div className="cliente-busqueda-wrap">
            <AppInput
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
              <AppButton
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
              </AppButton>
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
            <AppButton
              type="button"
              className={descuentoItemModal.tipo === 'porcentaje' ? 'active' : ''}
              onClick={() => setDescuentoItemModal((prev) => ({ ...prev, tipo: 'porcentaje' }))}
            >
              Porcentual (%)
            </AppButton>
            <AppButton
              type="button"
              className={descuentoItemModal.tipo === 'fijo' ? 'active' : ''}
              onClick={() => setDescuentoItemModal((prev) => ({ ...prev, tipo: 'fijo' }))}
            >
              Fijo ($)
            </AppButton>
          </div>
          <AppInput
            type="number"
            min="0"
            step="0.01"
            value={descuentoItemModal.valor}
            onChange={(e) => setDescuentoItemModal((prev) => ({ ...prev, valor: e.target.value }))}
            placeholder={descuentoItemModal.tipo === 'porcentaje' ? 'Ej: 10' : 'Ej: 500'}
          />
          <div className="descuento-modal-actions">
            <AppButton type="button" className="secundario" onClick={closeDiscountModal}>
              Cancelar
            </AppButton>
            <AppButton type="button" onClick={applyItemDiscount}>
              Aplicar
            </AppButton>
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
            <AppButton
              type="button"
              className={descuentoGlobalModal.tipo === 'porcentaje' ? 'active' : ''}
              onClick={() => setDescuentoGlobalModal((prev) => ({ ...prev, tipo: 'porcentaje' }))}
            >
              Porcentual (%)
            </AppButton>
            <AppButton
              type="button"
              className={descuentoGlobalModal.tipo === 'fijo' ? 'active' : ''}
              onClick={() => setDescuentoGlobalModal((prev) => ({ ...prev, tipo: 'fijo' }))}
            >
              Fijo ($)
            </AppButton>
          </div>
          <AppInput
            type="number"
            min="0"
            step="0.01"
            value={descuentoGlobalModal.valor}
            onChange={(e) => setDescuentoGlobalModal((prev) => ({ ...prev, valor: e.target.value }))}
            placeholder={descuentoGlobalModal.tipo === 'porcentaje' ? 'Ej: 10' : 'Ej: 500'}
          />
          <div className="descuento-modal-actions">
            <AppButton type="button" className="secundario" onClick={closeGlobalDiscountModal}>
              Cancelar
            </AppButton>
            <AppButton type="button" onClick={applyGlobalDiscount}>
              Aplicar
            </AppButton>
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
              <p className="venta-final-cliente">
                Teléfono: <strong>{ventaFinalizada.clienteTelefono || '-'}</strong>
              </p>
              <p className="venta-final-cliente">
                Horarios: <strong>{ventaFinalizada.clienteHorarios || '-'}</strong>
              </p>
              <p className="venta-final-cliente">
                Pagos: <strong>{(ventaFinalizada.pagos || []).length}</strong>
              </p>
              <ul className="venta-final-pagos">
                {(ventaFinalizada.pagos || []).map((pago, idx) => (
                  <li key={`pay-${idx}`}>
                    <span>{formatMedioPago(pago.medio_pago)}</span>
                    <strong>{money(pago.monto)}</strong>
                  </li>
                ))}
              </ul>
              <ul className="venta-final-items">
                {ventaFinalizada.items.map((item) => (
                  <li key={item.id}>
                    <span>{item.nombre} x {item.unidadesSolicitadas}</span>
                    <div className="venta-final-item-valores">
                      <strong>{money(item.subtotalBase)}</strong>
                      <small>{formatEmpaqueSplit(item)}</small>
                      {item.descuentoAplicado > 0 && (
                        <small className="linea-descuento">- {money(item.descuentoAplicado)}</small>
                      )}
                    </div>
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
            <AppButton type="button" className="secundario" onClick={iniciarNuevaVenta}>
              <img src="/newsale.svg" alt="" aria-hidden="true" />
              Nueva venta
            </AppButton>
            <AppButton type="button" className="whatsapp" onClick={enviarTicketWhatsApp}>
              <img src="/whatsapp.svg" alt="" aria-hidden="true" />
              Enviar por WhatsApp
            </AppButton>
            <AppButton type="button" onClick={descargarTicketPdf}>
              <img src="/pdf.svg" alt="" aria-hidden="true" />
              PDF
            </AppButton>
            <AppButton type="button" onClick={imprimirTicket}>
              <img src="/print.svg" alt="" aria-hidden="true" />
              Imprimir ticket
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  );
}


