import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import './Auditoria.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('es-UY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatQty(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString('es-UY') : String(value ?? '-');
}

export default function Auditoria() {
  const [eventos, setEventos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const loadAuditoria = async (nextDesde = desde, nextHasta = hasta) => {
    setLoading(true);
    setError('');
    try {
      const [evRows, movRows] = await Promise.all([
        api.getAuditoriaEventos(nextDesde, nextHasta),
        api.getMovimientosStock(nextDesde, nextHasta),
      ]);
      setEventos(evRows);
      setMovimientos(movRows);
    } catch (err) {
      setError(err.message || 'No se pudo cargar auditoría.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditoria('', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const movimientosFiltrados = useMemo(() => {
    const q = filtroTexto.trim().toLowerCase();
    return movimientos.filter((m) => {
      if (filtroTipo !== 'todos' && m.tipo !== filtroTipo) return false;
      if (!q) return true;
      return [
        m.producto_nombre,
        m.origen,
        m.detalle,
        m.usuario_nombre,
        m.referencia_tipo,
        m.referencia_id,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [movimientos, filtroTipo, filtroTexto]);

  const eventosClientes = useMemo(
    () => eventos.filter((e) => e.entidad === 'cliente'),
    [eventos]
  );
  const eventosProductos = useMemo(
    () => eventos.filter((e) => e.entidad === 'producto'),
    [eventos]
  );

  const getRangoLabel = () => {
    if (!desde && !hasta) return 'Todo el período disponible';
    if (desde && hasta) return `${desde} a ${hasta}`;
    if (desde) return `Desde ${desde}`;
    return `Hasta ${hasta}`;
  };

  const withHeaderLogo = (doc, titulo) =>
    new Promise((resolve) => {
      const fecha = new Date().toLocaleDateString();
      const finish = () => {
        doc.setFontSize(16);
        doc.text(titulo, 55, 22);
        doc.setFontSize(10);
        doc.text(`Emitido: ${fecha}`, 55, 28);
        doc.text(`Rango: ${getRangoLabel()}`, 55, 33);
        resolve(40);
      };
      const logo = new Image();
      logo.src = '/images/logo2.png';
      logo.onload = () => {
        doc.addImage(logo, 'PNG', 10, 10, 40, 20);
        finish();
      };
      logo.onerror = finish;
    });

  const exportarStockPDF = async () => {
    const doc = new jsPDF();
    const startY = await withHeaderLogo(doc, 'Auditoría de stock');
    autoTable(doc, {
      startY,
      head: [['Fecha', 'Producto', 'Tipo', 'Origen', 'Cantidad', 'Stock', 'Usuario']],
      body: movimientosFiltrados.map((m) => [
        formatDateTime(m.created_at),
        m.producto_nombre || `#${m.producto_id}`,
        m.tipo === 'entrada' ? 'Entrada' : 'Salida',
        m.origen,
        formatQty(m.cantidad),
        `${formatQty(m.stock_anterior)} -> ${formatQty(m.stock_nuevo)}`,
        m.usuario_nombre || '-',
      ]),
      styles: { fontSize: 8.8 },
      headStyles: { fillColor: [55, 95, 140] },
    });
    doc.save('auditoria-stock.pdf');
  };

  const exportarClientesPDF = async () => {
    const doc = new jsPDF();
    const startY = await withHeaderLogo(doc, 'Auditoría de clientes');
    autoTable(doc, {
      startY,
      head: [['Fecha', 'Acción', 'Detalle', 'Usuario']],
      body: eventosClientes.map((e) => [
        formatDateTime(e.created_at),
        e.accion,
        e.detalle || '-',
        e.usuario_nombre || '-',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [55, 95, 140] },
    });
    doc.save('auditoria-clientes.pdf');
  };

  const exportarProductosPDF = async () => {
    const doc = new jsPDF();
    const startY = await withHeaderLogo(doc, 'Auditoría de productos');
    autoTable(doc, {
      startY,
      head: [['Fecha', 'Acción', 'Detalle', 'Usuario']],
      body: eventosProductos.map((e) => [
        formatDateTime(e.created_at),
        e.accion,
        e.detalle || '-',
        e.usuario_nombre || '-',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [55, 95, 140] },
    });
    doc.save('auditoria-productos.pdf');
  };

  return (
    <div className="auditoria-main">
      <div className="auditoria-toolbar">
        <h3>Auditoría y movimientos de stock</h3>
        <div className="auditoria-filtros">
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          <button type="button" className="audit-btn" onClick={() => loadAuditoria(desde, hasta)}>
            Filtrar
          </button>
          <button
            type="button"
            className="audit-btn secondary"
            onClick={() => {
              setDesde('');
              setHasta('');
              loadAuditoria('', '');
            }}
          >
            Limpiar
          </button>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="salida">Salidas</option>
          </select>
          <input
            type="text"
            placeholder="Buscar por producto, usuario, origen..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
          />
        </div>
      </div>

      {loading && <div className="auditoria-msg">Cargando auditoría...</div>}
      {!loading && error && <div className="auditoria-msg error">{error}</div>}

      {!loading && !error && (
        <>
          <section className="auditoria-card">
            <div className="auditoria-card-head">
              <h4>Movimientos de stock</h4>
              <button type="button" className="audit-btn" onClick={exportarStockPDF}>PDF stock</button>
            </div>
            <ul className="auditoria-list stock">
              <li className="header">
                <span>Fecha</span>
                <span>Producto</span>
                <span>Tipo</span>
                <span>Origen</span>
                <span>Cantidad</span>
                <span>Stock</span>
                <span>Usuario</span>
              </li>
              {movimientosFiltrados.length === 0 && (
                <li className="vacio">No hay movimientos para los filtros seleccionados.</li>
              )}
              {movimientosFiltrados.map((m) => (
                <li key={m.id}>
                  <span>{formatDateTime(m.created_at)}</span>
                  <span>{m.producto_nombre || `#${m.producto_id}`}</span>
                  <span className={m.tipo === 'entrada' ? 'tag in' : 'tag out'}>
                    {m.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                  </span>
                  <span>{m.origen}</span>
                  <span>{formatQty(m.cantidad)}</span>
                  <span>
                    {formatQty(m.stock_anterior)} → {formatQty(m.stock_nuevo)}
                  </span>
                  <span>{m.usuario_nombre || '-'}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="auditoria-card">
            <div className="auditoria-card-head">
              <h4>Eventos de auditoría (altas, ediciones y eliminaciones)</h4>
              <div className="auditoria-card-actions">
                <button type="button" className="audit-btn" onClick={exportarClientesPDF}>PDF clientes</button>
                <button type="button" className="audit-btn" onClick={exportarProductosPDF}>PDF productos</button>
              </div>
            </div>
            <ul className="auditoria-list eventos">
              <li className="header">
                <span>Fecha</span>
                <span>Entidad</span>
                <span>Acción</span>
                <span>Detalle</span>
                <span>Usuario</span>
              </li>
              {eventos.length === 0 && <li className="vacio">Aún no hay eventos de auditoría.</li>}
              {eventos.map((e) => (
                <li key={e.id}>
                  <span>{formatDateTime(e.created_at)}</span>
                  <span>{e.entidad} #{e.entidad_id ?? '-'}</span>
                  <span>{e.accion}</span>
                  <span>{e.detalle || '-'}</span>
                  <span>{e.usuario_nombre || '-'}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
