import { useEffect, useMemo, useRef, useState } from 'react';
import { CgArrowsExchange } from 'react-icons/cg';
import { api } from '../../core/api';
import { appAlert } from '../../shared/lib/appDialog';
import './ControlStock.css';

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function ControlStock({ productos = [], setProductos }) {
  const [busqueda, setBusqueda] = useState('');
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');
  const [productoIdActivo, setProductoIdActivo] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [cargando, setCargando] = useState(false);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [historialClosing, setHistorialClosing] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const closeTimerRef = useRef(null);

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtered = !q
      ? [...productos]
      : productos.filter((p) => `${p.nombre || ''} ${p.ean || ''}`.toLowerCase().includes(q));

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'stock') {
        const aStock = Math.floor(toNumber(a.stock));
        const bStock = Math.floor(toNumber(b.stock));
        return sortDir === 'asc' ? aStock - bStock : bStock - aStock;
      }
      const aNombre = String(a.nombre || '').toLowerCase();
      const bNombre = String(b.nombre || '').toLowerCase();
      if (aNombre < bNombre) return sortDir === 'asc' ? -1 : 1;
      if (aNombre > bNombre) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [productos, busqueda, sortBy, sortDir]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(field);
    setSortDir('asc');
  };

  const productoActivo = useMemo(
    () => productos.find((p) => Number(p.id) === Number(productoIdActivo)) || null,
    [productos, productoIdActivo]
  );

  const ajustarStock = async (modo) => {
    if (!productoActivo || !setProductos) return;
    const n = Math.max(0, Math.floor(toNumber(cantidad)));
    const stockActual = Math.floor(toNumber(productoActivo.stock));
    let stockNuevo = stockActual;
    if (modo === 'sumar') stockNuevo = stockActual + n;
    if (modo === 'quitar') stockNuevo = stockActual - n;
    if (modo === 'fijar') stockNuevo = n;
    setCargando(true);
    try {
      const actualizado = await api.ajustarStockProducto(productoActivo.id, stockNuevo);
      setProductos((prev) =>
        prev.map((p) => (Number(p.id) === Number(actualizado.id) ? { ...p, stock: String(actualizado.stock) } : p))
      );
      setCantidad('');
    } catch (error) {
      await appAlert(error.message || 'No se pudo ajustar el stock.');
    } finally {
      setCargando(false);
    }
  };

  const abrirHistorial = async () => {
    if (!productoActivo) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setHistorialClosing(false);
    setHistorialOpen(true);
    setHistorialLoading(true);
    try {
      const rows = await api.getMovimientosProducto(productoActivo.id, 10);
      setHistorial(rows);
    } catch (error) {
      setHistorial([]);
      await appAlert(error.message || 'No se pudo cargar el historial de stock.');
    } finally {
      setHistorialLoading(false);
    }
  };

  const cerrarHistorial = () => {
    if (!historialOpen || historialClosing) return;
    setHistorialClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setHistorialOpen(false);
      setHistorialClosing(false);
      closeTimerRef.current = null;
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="control-stock-main">
      <div className="control-stock-head">
        <h3><CgArrowsExchange /> Control de stock</h3>
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="control-stock-layout">
        <section className="control-stock-list">
          <div className="stock-table-head">
            <button type="button" className="sort-header-btn" onClick={() => toggleSort('nombre')}>
              Producto {sortBy === 'nombre' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </button>
            <button type="button" className="sort-header-btn stock-col-right" onClick={() => toggleSort('stock')}>
              Stock {sortBy === 'stock' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </button>
          </div>
          {productosFiltrados.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`stock-table-row ${Number(productoIdActivo) === Number(p.id) ? 'active' : ''}`}
              onClick={() => setProductoIdActivo(p.id)}
            >
              <span className="stock-item-left">
                {p.imagenPreview ? (
                  <img src={p.imagenPreview} alt={p.nombre} className="stock-item-image" />
                ) : (
                  <span className="stock-item-image stock-item-image-placeholder">Sin imagen</span>
                )}
                <span className="stock-item-info">
                  <strong>{p.nombre}</strong>
                  <small>Código: {p.ean || '-'}</small>
                </span>
              </span>
              <strong className="stock-item-qty">{Math.floor(toNumber(p.stock))}</strong>
            </button>
          ))}
          {productosFiltrados.length === 0 && <p className="stock-empty">Sin productos para mostrar.</p>}
        </section>

        <aside key={productoActivo?.id || 'none'} className={`control-stock-panel ${productoActivo ? 'is-active' : ''}`}>
          {!productoActivo && <p className="stock-empty">Selecciona un producto para gestionar su stock.</p>}
          {productoActivo && (
            <>
              <p className="stock-producto">{productoActivo.nombre}</p>
              <div className="stock-grande">{Math.floor(toNumber(productoActivo.stock))}</div>
              <label className="stock-cantidad">
                Cantidad
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                />
              </label>
              <div className="stock-actions">
                <button type="button" onClick={() => ajustarStock('sumar')} disabled={cargando}>Agregar stock</button>
                <button type="button" onClick={() => ajustarStock('quitar')} disabled={cargando}>Quitar stock</button>
                <button type="button" onClick={() => ajustarStock('fijar')} disabled={cargando}>Fijar stock</button>
              </div>
              <div className="stock-history-row">
                <button type="button" className="stock-history-btn" onClick={abrirHistorial} disabled={cargando}>
                  Historial de stock
                </button>
              </div>
            </>
          )}
        </aside>
      </div>

      {historialOpen && (
        <div className={`stock-modal-overlay ${historialClosing ? 'is-closing' : ''}`} role="dialog" aria-modal="true">
          <div className="stock-modal-backdrop" onClick={cerrarHistorial} />
          <div className={`stock-modal stock-modal-animated ${historialClosing ? 'is-closing' : ''}`}>
            <h4>Historial de stock ({productoActivo?.nombre || '-'})</h4>
            {historialLoading && <p>Cargando...</p>}
            {!historialLoading && (
              <ul>
                {historial.length === 0 && <li>Sin movimientos.</li>}
                {historial.map((m) => (
                  <li key={m.id}>
                    <span>{new Date(m.created_at).toLocaleString('es-UY')}</span>
                    <strong>{m.tipo === 'entrada' ? '+' : '-'}{Math.floor(toNumber(m.cantidad))}</strong>
                    <small>{m.origen} · {Math.floor(toNumber(m.stock_anterior))} → {Math.floor(toNumber(m.stock_nuevo))}</small>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={cerrarHistorial}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

