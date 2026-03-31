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
  const num = Math.round(Number(value || 0));
  return `$${num.toLocaleString('es-UY', { maximumFractionDigits: 0 })}`;
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

function formatMedioPago(value) {
  const v = String(value || 'efectivo').toLowerCase();
  if (v === 'credito') return 'Crédito';
  if (v === 'debito') return 'Débito';
  if (v === 'transferencia') return 'Transferencia';
  return 'Efectivo';
}

function formatPagosResumen(pagos = []) {
  if (!Array.isArray(pagos) || pagos.length === 0) return '-';
  const labels = [...new Set(pagos.map((p) => formatMedioPago(p.medio_pago)))];
  return labels.join(' + ');
}

function normalizeWhatsappPhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('598')) return digits;
  if (digits.startsWith('0')) return `598${digits.slice(1)}`;
  if (digits.length <= 9) return `598${digits}`;
  return digits;
}

function isAndroidDevice() {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(String(navigator.userAgent || ''));
}

export default function VentasHistorial() {
  const [fecha, setFecha] = useState(todayISO());
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [ventas, setVentas] = useState([]);
  const [sortBy, setSortBy] = useState('id');
  const [sortDir, setSortDir] = useState('desc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [printingId, setPrintingId] = useState(null);
  const [updatingEntregaId, setUpdatingEntregaId] = useState(null);
  const [cancelandoVentaId, setCancelandoVentaId] = useState(null);
  const [expandedVentaId, setExpandedVentaId] = useState(null);
  const [detalleByVentaId, setDetalleByVentaId] = useState({});
  const [loadingDetalleId, setLoadingDetalleId] = useState(null);
  const [exportPeriodo, setExportPeriodo] = useState('dia');
  const [exportingEntregas, setExportingEntregas] = useState(false);

  const normalizarEstadoEntrega = (venta) => {
    if (String(venta?.estado_entrega || '').toLowerCase() === 'entregado') return 'entregado';
    return venta?.entregado ? 'entregado' : 'pendiente';
  };

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
    () => ventas.filter((v) => {
      if (v.cancelada) return false;
      if (estadoFiltro === 'canceladas') return false;
      if (estadoFiltro === 'todos') return true;
      const estado = normalizarEstadoEntrega(v);
      return estado === estadoFiltro;
    }).reduce((acc, v) => acc + Number(v.total || 0), 0),
    [ventas, estadoFiltro]
  );

  const ventasFiltradas = useMemo(() => {
    if (estadoFiltro === 'canceladas') return ventas.filter((v) => Boolean(v.cancelada));
    if (estadoFiltro === 'todos') return ventas;
    const activas = ventas.filter((v) => !v.cancelada);
    return activas.filter((v) => normalizarEstadoEntrega(v) === estadoFiltro);
  }, [ventas, estadoFiltro]);

  const ventasOrdenadas = useMemo(() => {
    const list = [...ventasFiltradas];
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
  }, [ventasFiltradas, sortBy, sortDir]);

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

  const buildVentaPdf = async (venta) => {
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
    doc.text(`Medio de pago: ${formatMedioPago(venta.medio_pago)}`, 14, cursorY);
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

    return doc;
  };

  const imprimirVenta = async (ventaId) => {
    setPrintingId(ventaId);
    try {
      const venta = await api.getVentaById(ventaId);
      const doc = await buildVentaPdf(venta);
      doc.save(`ticket-venta-${venta.id}.pdf`);
    } catch (err) {
      window.alert(err.message || 'No se pudo generar el ticket.');
    } finally {
      setPrintingId(null);
    }
  };

  const reenviarFactura = async (ventaId) => {
    setPrintingId(ventaId);
    try {
      const venta = await api.getVentaById(ventaId);
      const telefono = normalizeWhatsappPhone(venta.cliente_telefono);
      if (!telefono) {
        window.alert('Este cliente no tiene teléfono válido para WhatsApp.');
        return;
      }

      const doc = await buildVentaPdf(venta);
      const fileName = `ticket-venta-${venta.id}.pdf`;
      const message = `Hola ${venta.cliente_nombre || 'cliente'}, te compartimos tu factura de la venta #${venta.id}. Total: ${formatCurrency(venta.total)}.`;
      const waUrl = `https://wa.me/${telefono}?text=${encodeURIComponent(message)}`;

      if (isAndroidDevice() && typeof File === 'function' && typeof navigator !== 'undefined' && navigator.share && typeof navigator.canShare === 'function') {
        const pdfBlob = doc.output('blob');
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ title: `Factura ${venta.id}`, text: message, files: [file] });
            return;
          } catch {
            // fallback below
          }
        }
      }

      doc.save(fileName);
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      window.alert('Abrimos WhatsApp directo al cliente y descargamos la factura. Adjunta el archivo desde Descargas y envía.');
    } catch (err) {
      window.alert(err.message || 'No se pudo reenviar la factura.');
    } finally {
      setPrintingId(null);
    }
  };

  const enviarFacturaEmail = async (ventaId) => {
    setPrintingId(ventaId);
    try {
      const venta = await api.getVentaById(ventaId);
      const email = String(venta?.cliente_correo || '').trim();
      if (!email) {
        window.alert('Este cliente no tiene email registrado.');
        return;
      }
      const doc = await buildVentaPdf(venta);
      const fileName = `ticket-venta-${venta.id}.pdf`;
      const pdfBase64 = doc.output('datauristring').split(',')[1] || '';
      await api.enviarFacturaEmail(venta.id, pdfBase64, fileName);
      window.alert(`Factura enviada por email a ${email}.`);
    } catch (err) {
      window.alert(err.message || 'No se pudo enviar la factura por email.');
    } finally {
      setPrintingId(null);
    }
  };

  const getEntregaEstadoClass = (venta) => {
    const estado = normalizarEstadoEntrega(venta);
    if (estado === 'entregado') return 'is-entregado';
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

  const cancelarVenta = async (ventaId) => {
    const ok = window.confirm('¿Seguro que deseas cancelar esta venta? La acción no elimina el registro.');
    if (!ok) return;
    setCancelandoVentaId(ventaId);
    try {
      await api.cancelarVenta(ventaId);
      setVentas((prev) =>
        prev.map((v) => (v.id === ventaId ? { ...v, cancelada: true } : v))
      );
      if (expandedVentaId === ventaId) {
        setExpandedVentaId(null);
      }
    } catch (err) {
      window.alert(err.message || 'No se pudo cancelar la venta.');
    } finally {
      setCancelandoVentaId(null);
    }
  };

  const exportarEntregasPDF = async () => {
    setExportingEntregas(true);
    try {
      const resumen = await api.getEntregasResumen(exportPeriodo, fecha);
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let cursorY = 12;
      const periodoLabel = exportPeriodo === 'dia' ? 'Día' : exportPeriodo === 'semana' ? 'Semana' : 'Mes';
      const periodoSlug = exportPeriodo === 'dia' ? 'dia' : exportPeriodo === 'semana' ? 'semana' : 'mes';

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
      doc.text('Planilla de entregas', pageWidth / 2, cursorY, { align: 'center' });
      cursorY += 6;
      doc.setFontSize(10);
      doc.text(`Período: ${periodoLabel} (${resumen.desde} al ${resumen.hasta})`, 14, cursorY);
      cursorY += 5;
      doc.text(`Ventas pendientes: ${Number(resumen.totalVentas || 0).toLocaleString('es-UY')}`, 14, cursorY);
      doc.text(`Monto total: ${formatCurrency(resumen.totalMonto || 0)}`, 120, cursorY);
      cursorY += 7;

      autoTable(doc, {
        startY: cursorY,
        head: [['# Venta', 'Fecha entrega', 'Cliente / contacto', 'Dirección', 'Vendedor', 'Total', 'Productos']],
        body: (resumen.ventas || []).map((v) => [
          v.id,
          formatDateOnly(v.fecha_entrega),
          `${v.cliente_nombre || 'Consumidor final'}\nTel: ${v.cliente_telefono || '-'}`,
          v.cliente_direccion || '-',
          v.usuario_nombre || '-',
          formatCurrency(v.total || 0),
          (v.productos ? String(v.productos).split('\n').map((line) => `• ${line}`).join('\n') : '-'),
        ]),
        styles: { fontSize: 8, valign: 'top', cellPadding: 2 },
        headStyles: { fillColor: [55, 95, 140] },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 30 },
          2: { cellWidth: 52 },
          3: { cellWidth: 65 },
          4: { cellWidth: 42 },
          5: { cellWidth: 24, halign: 'right' },
          6: { cellWidth: 'auto' },
        },
      });

      const suffix = `${resumen.desde || 'desde'}_${resumen.hasta || 'hasta'}`;
      doc.save(`entregas-${periodoSlug}-${suffix}.pdf`);
    } catch (err) {
      window.alert(err.message || 'No se pudo exportar el PDF de entregas.');
    } finally {
      setExportingEntregas(false);
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
        <label className="ventas-fecha-filter">
          <span>Estado</span>
          <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="entregado">Entregadas</option>
            <option value="canceladas">Canceladas</option>
          </select>
        </label>
        <div className="ventas-export-group">
          <label className="ventas-fecha-filter">
            <span>PDF entregas</span>
            <select value={exportPeriodo} onChange={(e) => setExportPeriodo(e.target.value)} disabled={exportingEntregas}>
              <option value="dia">Para hoy</option>
              <option value="semana">Para esta semana</option>
              <option value="mes">Para este mes</option>
            </select>
          </label>
          <button
            type="button"
            className="ventas-export-btn"
            onClick={exportarEntregasPDF}
            disabled={exportingEntregas}
          >
            {exportingEntregas ? 'Generando PDF...' : 'Imprimir entregas'}
          </button>
        </div>
      </div>

      <div className="ventas-resumen">
        <span>{ventasFiltradas.length} ventas</span>
        <strong>Total: {formatCurrency(totalDelDia)}</strong>
      </div>

      {loading && <div className="ventas-msg">Cargando ventas...</div>}
      {!loading && error && <div className="ventas-msg error">{error}</div>}

      {!loading && !error && (
        <ul className="lista-ventas">
          <li className="header">
            <span aria-hidden="true" />
            <button type="button" className="sort-header-btn" onClick={() => toggleSort('id')}># {sortBy === 'id' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
            <button type="button" className="sort-header-btn" onClick={() => toggleSort('fecha')}>Fecha {sortBy === 'fecha' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
            <button type="button" className="sort-header-btn" onClick={() => toggleSort('cliente')}>Cliente {sortBy === 'cliente' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
            <button type="button" className="sort-header-btn" onClick={() => toggleSort('vendedor')}>Vendedor {sortBy === 'vendedor' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
            <button type="button" className="sort-header-btn" onClick={() => toggleSort('total')}>Total {sortBy === 'total' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
            <span>Pago</span>
            <span className="estado-col-head">Estado</span>
            <span className="entregado-col-head">Entregado</span>
          </li>
          {ventasFiltradas.length === 0 && <li className="vacio">No hay ventas para los filtros seleccionados.</li>}
          {ventasOrdenadas.map((v) => {
            const expanded = expandedVentaId === v.id;
            const estadoEntrega = normalizarEstadoEntrega(v);
            const detalleVenta = detalleByVentaId[v.id] || [];
            return (
              <div key={v.id} className="venta-row-wrap">
                <li className={v.cancelada ? 'venta-row-cancelada' : (v.entregado ? 'venta-row-entregada' : '')}>
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
                      {v.cancelada
                        ? '✕ Cancelada'
                        : (estadoEntrega === 'entregado' ? '✓ Entregada' : `Entrega: ${formatDateOnly(v.fecha_entrega)}`)}
                    </small>
                  </span>
                  <span>{v.cliente_nombre || 'Consumidor final'}</span>
                  <span>{v.usuario_nombre || '-'}</span>
                  <span>{formatCurrency(v.total)}</span>
                  <span className="pago-resumen-cell">{formatPagosResumen(v.pagos)}</span>
                  <span className={`estado-entrega-text estado-col ${estadoEntrega === 'entregado' ? 'is-entregado' : 'is-pendiente'}`}>
                    {estadoEntrega === 'entregado' ? 'Entregado' : 'Pendiente'}
                  </span>
                  <label className="entregado-check entregado-col">
                    <input
                      type="checkbox"
                      checked={estadoEntrega === 'entregado'}
                      disabled={updatingEntregaId === v.id || Boolean(v.cancelada)}
                      onChange={(e) => toggleEntregado(v.id, e.target.checked)}
                    />
                    <span className={`entregado-pill ${estadoEntrega === 'entregado' ? 'is-on' : 'is-off'}`}>
                      {estadoEntrega === 'entregado' ? 'Sí' : 'No'}
                    </span>
                  </label>
                </li>
                {expanded && (
                  <div className="venta-detalle-panel">
                    <div className="venta-detalle-actions">
                      <button
                        type="button"
                        className="cancel-btn"
                        onClick={() => cancelarVenta(v.id)}
                        disabled={cancelandoVentaId === v.id || Boolean(v.cancelada)}
                        title="Cancelar venta"
                        aria-label="Cancelar venta"
                      >
                        <span>{v.cancelada ? '✕' : (cancelandoVentaId === v.id ? '…' : '✕')}</span>
                        <small>Cancelar</small>
                      </button>
                      <button
                        type="button"
                        className="reprint-btn"
                        onClick={() => reenviarFactura(v.id)}
                        disabled={printingId === v.id}
                        title="Reenviar factura"
                        aria-label="Reenviar factura"
                      >
                        <img src="/send.svg" alt="" aria-hidden="true" />
                        <small>Reenviar</small>
                      </button>
                      <button
                        type="button"
                        className="reprint-btn"
                        onClick={() => enviarFacturaEmail(v.id)}
                        disabled={printingId === v.id}
                        title="Enviar factura por email"
                        aria-label="Enviar factura por email"
                      >
                        <span aria-hidden="true">✉</span>
                        <small>Email</small>
                      </button>
                      <button
                        type="button"
                        className="reprint-btn"
                        onClick={() => imprimirVenta(v.id)}
                        disabled={printingId === v.id}
                        title="Reimprimir ticket"
                        aria-label="Reimprimir ticket"
                      >
                        <img src="/print.svg" alt="" aria-hidden="true" />
                        <small>Imprimir</small>
                      </button>
                    </div>
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
