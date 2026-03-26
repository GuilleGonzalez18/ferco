import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import './VentasHistorial.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function todayISO() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

function formatCurrency(value) {
  const num = Number(value || 0);
  return `$${num.toLocaleString('es-UY')}`;
}

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

function formatDateOnly(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('es-UY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function toISODateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

export default function VentasHistorial() {
  const [fecha, setFecha] = useState(todayISO());
  const [ventas, setVentas] = useState([]);
  const [sortBy, setSortBy] = useState('id');
  const [sortDir, setSortDir] = useState('desc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [printingId, setPrintingId] = useState(null);
  const [updatingEntregaId, setUpdatingEntregaId] = useState(null);
  const [expandedVentaId, setExpandedVentaId] = useState(null);
  const [detalleByVentaId, setDetalleByVentaId] = useState({});
  const [loadingDetalleId, setLoadingDetalleId] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await api.getVentas(fecha);
        setVentas(rows);
      } catch (err) {
        setError(err.message || 'No se pudieron cargar las ventas.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [fecha]);

  const totalDelDia = useMemo(
    () => ventas.reduce((acc, v) => acc + Number(v.total || 0), 0),
    [ventas]
  );

  const ventasOrdenadas = useMemo(() => {
    const list = [...ventas];
    const dir = sortDir === 'asc' ? 1 : -1;
    const asText = (v) => String(v ?? '').toLowerCase();
    const asNumber = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const asDate = (v) => {
      const t = new Date(v).getTime();
      return Number.isFinite(t) ? t : 0;
    };

    list.sort((a, b) => {
      switch (sortBy) {
        case 'fecha':
          return (asDate(a.fecha) - asDate(b.fecha)) * dir;
        case 'cliente':
          return asText(a.cliente_nombre).localeCompare(asText(b.cliente_nombre)) * dir;
        case 'vendedor':
          return asText(a.usuario_nombre).localeCompare(asText(b.usuario_nombre)) * dir;
        case 'total':
          return (asNumber(a.total) - asNumber(b.total)) * dir;
        case 'id':
        default:
          return (asNumber(a.id) - asNumber(b.id)) * dir;
      }
    });

    return list;
  }, [ventas, sortBy, sortDir]);

  const toggleSort = (column) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDir('asc');
  };

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const imprimirVenta = async (ventaId) => {
    setPrintingId(ventaId);
    try {
      const venta = await api.getVentaById(ventaId);
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
      doc.text(`Venta: #${venta.id}`, 14, cursorY);
      doc.text(`Fecha: ${formatDateTime(venta.fecha)}`, 120, cursorY);
      cursorY += 5;
      doc.text(`Cliente: ${venta.cliente_nombre || 'Consumidor final'}`, 14, cursorY);
      cursorY += 5;
      doc.text(`Vendedor: ${venta.usuario_nombre || '-'}`, 14, cursorY);
      cursorY += 5;
      doc.text(`Entrega: ${formatDateOnly(venta.fecha_entrega)}`, 14, cursorY);
      cursorY += 6;

      autoTable(doc, {
        startY: cursorY,
        head: [['Producto', 'Cant.', 'P. Unit.', 'Subtotal']],
        body: (venta.detalle || []).map((item) => [
          item.producto_nombre || `Producto #${item.producto_id}`,
          item.cantidad,
          formatCurrency(item.precio_unitario),
          formatCurrency(Number(item.cantidad || 0) * Number(item.precio_unitario || 0)),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [55, 95, 140] },
      });

      const finalY = doc.lastAutoTable?.finalY ?? cursorY + 8;
      doc.setFontSize(10);
      doc.text(`Subtotal: ${formatCurrency(venta.subtotal)}`, 14, finalY + 8);
      doc.text(
        `Descuento total: -${formatCurrency(venta.descuento_total_valor)}`,
        14,
        finalY + 14
      );
      doc.setFontSize(12);
      doc.text(`TOTAL: ${formatCurrency(venta.total)}`, 14, finalY + 22);

      if (venta.observacion) {
        doc.setFontSize(9);
        doc.text(`Observación: ${venta.observacion}`, 14, finalY + 30);
      }

      doc.save(`ticket-venta-${venta.id}.pdf`);
    } catch (err) {
      window.alert(err.message || 'No se pudo generar el ticket.');
    } finally {
      setPrintingId(null);
    }
  };

  const normalizarEstadoEntrega = (venta) => {
    if (venta?.estado_entrega) return String(venta.estado_entrega);
    return venta?.entregado ? 'entregado' : 'pendiente';
  };

  const getEntregaEstadoClass = (venta) => {
    const estado = normalizarEstadoEntrega(venta);
    if (estado === 'entregado') return 'is-entregado';
    if (estado === 'en_camino') return 'is-camino';
    const entregaIso = toISODateOnly(venta.fecha_entrega);
    if (!entregaIso) return '';
    const todayIso = todayISO();
    if (entregaIso < todayIso) return 'is-vencida';
    if (entregaIso === todayIso) return 'is-hoy';
    return '';
  };

  const toggleEntregado = async (ventaId, nextValue) => {
    setUpdatingEntregaId(ventaId);
    try {
      await api.updateVentaEntregado(ventaId, nextValue);
      setVentas((prev) =>
        prev.map((v) => (
          v.id === ventaId
            ? { ...v, entregado: nextValue, estado_entrega: nextValue ? 'entregado' : 'pendiente' }
            : v
        ))
      );
    } catch (err) {
      window.alert(err.message || 'No se pudo actualizar el estado de entrega.');
    } finally {
      setUpdatingEntregaId(null);
    }
  };

  const updateEstadoEntrega = async (ventaId, estado) => {
    setUpdatingEntregaId(ventaId);
    try {
      const updated = await api.updateVentaEstadoEntrega(ventaId, estado);
      setVentas((prev) =>
        prev.map((v) => (
          v.id === ventaId
            ? { ...v, estado_entrega: updated.estado_entrega, entregado: Boolean(updated.entregado) }
            : v
        ))
      );
    } catch (err) {
      window.alert(err.message || 'No se pudo actualizar el estado de entrega.');
    } finally {
      setUpdatingEntregaId(null);
    }
  };

  const toggleDetalleVenta = async (ventaId) => {
    if (expandedVentaId === ventaId) {
      setExpandedVentaId(null);
      return;
    }
    setExpandedVentaId(ventaId);
    if (detalleByVentaId[ventaId]) return;
    setLoadingDetalleId(ventaId);
    try {
      const venta = await api.getVentaById(ventaId);
      setDetalleByVentaId((prev) => ({ ...prev, [ventaId]: venta.detalle || [] }));
    } catch (err) {
      window.alert(err.message || 'No se pudo cargar el detalle de la venta.');
    } finally {
      setLoadingDetalleId(null);
    }
  };

  return (
    <div className="ventas-historial-main">
      <div className="ventas-historial-toolbar">
        <div className="ventas-historial-title">
          <h3>Ventas realizadas</h3>
          <p>Listado por fecha</p>
        </div>
        <label className="ventas-fecha-filter">
          <span>Fecha</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
      </div>

      <div className="ventas-resumen">
        <span>{ventas.length} ventas</span>
        <strong>Total: {formatCurrency(totalDelDia)}</strong>
      </div>

      {loading && <div className="ventas-msg">Cargando ventas...</div>}
      {!loading && error && <div className="ventas-msg error">{error}</div>}

      {!loading && !error && (
        <ul className="lista-ventas">
          <li className="header">
            <button type="button" className="sort-header-btn" onClick={() => toggleSort('id')}># {sortBy === 'id' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
            <button type="button" className="sort-header-btn" onClick={() => toggleSort('fecha')}>Fecha {sortBy === 'fecha' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
            <button type="button" className="sort-header-btn" onClick={() => toggleSort('cliente')}>Cliente {sortBy === 'cliente' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
            <button type="button" className="sort-header-btn" onClick={() => toggleSort('vendedor')}>Vendedor {sortBy === 'vendedor' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
            <button type="button" className="sort-header-btn" onClick={() => toggleSort('total')}>Total {sortBy === 'total' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
            <span>Estado entrega</span>
            <span>Entregado</span>
            <span aria-hidden="true" />
          </li>
          {ventas.length === 0 && <li className="vacio">No hay ventas para la fecha seleccionada.</li>}
          {ventasOrdenadas.map((v) => {
            const expanded = expandedVentaId === v.id;
            const estadoEntrega = normalizarEstadoEntrega(v);
            const detalleVenta = detalleByVentaId[v.id] || [];
            return (
              <div key={v.id} className="venta-row-wrap">
                <li className={v.entregado ? 'venta-row-entregada' : ''}>
                  <button
                    type="button"
                    className="venta-expand-btn"
                    onClick={() => toggleDetalleVenta(v.id)}
                    title={expanded ? 'Ocultar detalle' : 'Ver detalle'}
                    aria-label={expanded ? 'Ocultar detalle' : 'Ver detalle'}
                  >
                    {expanded ? '▼' : '▶'}
                  </button>
                  <span>{v.id}</span>
                  <span className="venta-fecha-cell">
                    <span>{formatDateTime(v.fecha)}</span>
                    <small className={`entrega-badge ${getEntregaEstadoClass(v)}`}>
                      {estadoEntrega === 'entregado' ? '✓ Entregada' : `Entrega: ${formatDateOnly(v.fecha_entrega)}`}
                    </small>
                  </span>
                  <span>{v.cliente_nombre || 'Consumidor final'}</span>
                  <span>{v.usuario_nombre || '-'}</span>
                  <span>{formatCurrency(v.total)}</span>
                  <label className="estado-entrega-field">
                    <select
                      value={estadoEntrega}
                      disabled={updatingEntregaId === v.id}
                      onChange={(e) => updateEstadoEntrega(v.id, e.target.value)}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_camino">En camino</option>
                      <option value="entregado">Entregado</option>
                    </select>
                  </label>
                  <label className="entregado-check">
                    <input
                      type="checkbox"
                      checked={Boolean(v.entregado)}
                      disabled={updatingEntregaId === v.id}
                      onChange={(e) => toggleEntregado(v.id, e.target.checked)}
                    />
                    <span>{v.entregado ? 'Sí' : 'No'}</span>
                  </label>
                  <button
                    type="button"
                    className="reprint-btn"
                    onClick={() => imprimirVenta(v.id)}
                    disabled={printingId === v.id}
                    title="Reimprimir ticket"
                    aria-label="Reimprimir ticket"
                  >
                    <img src="/print.svg" alt="" aria-hidden="true" />
                  </button>
                </li>
                {expanded && (
                  <div className="venta-detalle-panel">
                    {loadingDetalleId === v.id ? (
                      <p>Cargando detalle...</p>
                    ) : detalleVenta.length === 0 ? (
                      <p>Sin detalle para esta venta.</p>
                    ) : (
                      <ul className="venta-detalle-list">
                        {detalleVenta.map((item) => (
                          <li key={item.id}>
                            <span>{item.producto_nombre || `Producto #${item.producto_id}`}</span>
                            <span>{item.cantidad} u.</span>
                            <span>{formatCurrency(item.precio_unitario)}</span>
                            <strong>{formatCurrency(Number(item.cantidad || 0) * Number(item.precio_unitario || 0))}</strong>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </ul>
      )}
    </div>
  );
}
