import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import './VentasHistorial.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RiFileExcel2Line } from 'react-icons/ri';
import { PiFilePdfBold } from 'react-icons/pi';
import { AiFillPrinter } from 'react-icons/ai';
import { FaReplyAll } from 'react-icons/fa6';
import { appAlert, appConfirm } from './appDialog';
import { formatHorarioCliente } from './horarios';

function todayISO() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

function weekRangeISO() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const toISO = (d) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
  };
  return { desde: toISO(start), hasta: toISO(end) };
}

function monthRangeISO() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toISO = (d) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
  };
  return { desde: toISO(start), hasta: toISO(end) };
}

function tomorrowISO() {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + 1);
  const tzOffset = base.getTimezoneOffset() * 60000;
  return new Date(base.getTime() - tzOffset).toISOString().slice(0, 10);
}

function formatCurrency(value) {
  const num = Math.round(Number(value || 0) * 100) / 100;
  return `$${num.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function formatHorarioClienteEntrega(venta) {
  return formatHorarioCliente({
    horario_apertura: venta?.cliente_horario_apertura,
    horario_cierre: venta?.cliente_horario_cierre,
    tiene_reapertura: venta?.cliente_tiene_reapertura,
    horario_reapertura: venta?.cliente_horario_reapertura,
    horario_cierre_reapertura: venta?.cliente_horario_cierre_reapertura,
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  const [exportingEntregas, setExportingEntregas] = useState(false);
  const [modalExportOpen, setModalExportOpen] = useState(false);
  const [modalTicketsOpen, setModalTicketsOpen] = useState(false);
  const [printingBatch, setPrintingBatch] = useState(false);
  const [ticketsDesde, setTicketsDesde] = useState(todayISO());
  const [ticketsHasta, setTicketsHasta] = useState(todayISO());
  const [entregasDesde, setEntregasDesde] = useState(todayISO());
  const [entregasHasta, setEntregasHasta] = useState(todayISO());

  const replicarVenta = async (ventaId) => {
    setPrintingId(ventaId);
    try {
      const venta = await api.getVentaById(ventaId);
      sessionStorage.setItem('ferco_replicar_venta', JSON.stringify(venta));
      window.dispatchEvent(new CustomEvent('ferco:navigate', { detail: 'nueva-venta' }));
    } catch (err) {
      await appAlert(err.message || 'No se pudo preparar la replicación de la venta.');
    } finally {
      setPrintingId(null);
    }
  };

  const normalizarEstadoEntrega = (venta) => {
    if (venta?.cancelada) return 'cancelado';
    if (String(venta?.estado_entrega || '').toLowerCase() === 'cancelado') return 'cancelado';
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
    doc.text(`Horarios: ${formatHorarioClienteEntrega(venta)}`, 14, cursorY);
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
      await appAlert(err.message || 'No se pudo generar el ticket.');
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
        await appAlert('Este cliente no tiene teléfono válido para WhatsApp.');
        return;
      }

      const doc = await buildVentaPdf(venta);
      const fileName = `ticket-venta-${venta.id}.pdf`;
      const message = `Hola ${venta.cliente_nombre || 'cliente'}, te compartimos tu factura de la venta #${venta.id}. Total: ${formatCurrency(venta.total)}.`;
      const waUrl = `https://wa.me/${telefono}?text=${encodeURIComponent(message)}`;

      if (typeof File === 'function' && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        const pdfBlob = doc.output('blob');
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        const canShareFiles = typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] });
        if (canShareFiles) {
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
      await appAlert('Abrimos WhatsApp directo al cliente y descargamos la factura. Adjunta el archivo desde Descargas y envía.');
    } catch (err) {
      await appAlert(err.message || 'No se pudo reenviar la factura.');
    } finally {
      setPrintingId(null);
    }
  };

  const getEntregaEstadoClass = (venta) => {
    const estado = normalizarEstadoEntrega(venta);
    if (estado === 'cancelado') return 'is-cancelado';
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
      await appAlert(err.message || 'No se pudo actualizar el estado de entrega.');
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
      await appAlert(err.message || 'No se pudo cargar el detalle de la venta.');
    } finally {
      setLoadingDetalleId(null);
    }
  };

  const cancelarVenta = async (ventaId) => {
    const ok = await appConfirm('¿Seguro que deseas cancelar esta venta? Se repondrá stock y se ajustarán totales/ganancias.', {
      title: 'Cancelar venta',
      confirmText: 'Sí, cancelar',
      cancelText: 'Volver',
    });
    if (!ok) return;
    setCancelandoVentaId(ventaId);
    try {
      await api.cancelarVenta(ventaId);
      window.dispatchEvent(
        new CustomEvent('ferco:stats-refresh', {
          detail: { source: 'venta-cancelada', ventaId },
        })
      );
      window.dispatchEvent(
        new CustomEvent('ferco:stock-refresh', {
          detail: { source: 'venta-cancelada', ventaId },
        })
      );
      setVentas((prev) =>
        prev.map((v) => (
          v.id === ventaId
            ? { ...v, cancelada: true, entregado: false, estado_entrega: 'cancelado' }
            : v
        ))
      );
      if (expandedVentaId === ventaId) {
        setExpandedVentaId(null);
      }
    } catch (err) {
      await appAlert(err.message || 'No se pudo cancelar la venta.');
    } finally {
      setCancelandoVentaId(null);
    }
  };

  const exportarEntregasPDF = async () => {
    setExportingEntregas(true);
    try {
      if (!entregasDesde || !entregasHasta) {
        await appAlert('Debes seleccionar "Desde" y "Hasta" para generar entregas.');
        return;
      }
      if (entregasDesde > entregasHasta) {
        await appAlert('La fecha "Desde" no puede ser mayor que "Hasta".');
        return;
      }
      const resumen = await api.getEntregasResumen({ desde: entregasDesde, hasta: entregasHasta });
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let cursorY = 12;
      const periodoLabel = resumen.desde === resumen.hasta ? `Día ${resumen.desde}` : `${resumen.desde} al ${resumen.hasta}`;

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
      doc.text(`Período: ${periodoLabel}`, 14, cursorY);
      cursorY += 5;
      doc.text(`Ventas pendientes: ${Number(resumen.totalVentas || 0).toLocaleString('es-UY')}`, 14, cursorY);
      doc.text(`Monto total: ${formatCurrency(resumen.totalMonto || 0)}`, 120, cursorY);
      cursorY += 7;

      const entregaHead = [['VENTA', 'CLIENTE', 'TELEFONO', 'DIRECCION', 'FECHA ENTREGA', 'TOTAL', 'HORARIOS', 'DETALLE']];
      const entregaBody = (resumen.ventas || []).map((v) => [
        v.id,
        v.cliente_nombre || 'Consumidor final',
        v.cliente_telefono || '-',
        v.cliente_direccion || '-',
        formatDateOnly(v.fecha_entrega),
        formatCurrency(v.total || 0),
        formatHorarioClienteEntrega(v),
        '',
      ]);

      autoTable(doc, {
        startY: cursorY,
        head: entregaHead,
        body: entregaBody,
        styles: { fontSize: 8, valign: 'middle', cellPadding: 2 },
        headStyles: { fillColor: [55, 95, 140] },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 36 },
          2: { cellWidth: 24 },
          3: { cellWidth: 56 },
          4: { cellWidth: 24 },
          5: { cellWidth: 22, halign: 'right' },
          6: { cellWidth: 30 },
          7: { cellWidth: 'auto' },
        },
      });

      const suffix = `${resumen.desde || 'desde'}_${resumen.hasta || 'hasta'}`;
      doc.save(`entregas-${suffix}.pdf`);
    } catch (err) {
      await appAlert(err.message || 'No se pudo exportar el PDF de entregas.');
    } finally {
      setExportingEntregas(false);
    }
  };

  const construirResumenEntregas = async () => {
    if (!entregasDesde || !entregasHasta) {
      throw new Error('Debes seleccionar "Desde" y "Hasta" para generar entregas.');
    }
    if (entregasDesde > entregasHasta) {
      throw new Error('La fecha "Desde" no puede ser mayor que "Hasta".');
    }
    return api.getEntregasResumen({ desde: entregasDesde, hasta: entregasHasta });
  };

  const exportarEntregasExcel = async () => {
    setExportingEntregas(true);
    try {
      const resumen = await construirResumenEntregas();

      const periodoLabel = resumen.desde === resumen.hasta ? `Día ${resumen.desde}` : `${resumen.desde} al ${resumen.hasta}`;
      const rowsHtml = (resumen.ventas || [])
        .map((v, idx) => {
          const horarios = formatHorarioClienteEntrega(v);
          const zebra = idx % 2 === 0 ? '#f7faff' : '#ffffff';
          return `
            <tr style="background:${zebra}">
              <td class="td center">${escapeHtml(v.id)}</td>
              <td class="td">${escapeHtml(v.cliente_nombre || 'Consumidor final')}</td>
              <td class="td center">${escapeHtml(v.cliente_telefono || '-')}</td>
              <td class="td">${escapeHtml(v.cliente_direccion || '-')}</td>
              <td class="td center">${escapeHtml(formatDateOnly(v.fecha_entrega))}</td>
              <td class="td right">${escapeHtml(formatCurrency(v.total || 0))}</td>
              <td class="td center">${escapeHtml(horarios)}</td>
              <td class="td"></td>
            </tr>
          `;
        })
        .join('');

      const html = `
        <html>
          <head>
            <meta charset="UTF-8" />
            <style>
              body { font-family: Arial, sans-serif; }
              .title { font-size: 18px; font-weight: 700; color: #375f8c; margin-bottom: 8px; }
              .meta { font-size: 13px; margin-bottom: 4px; color: #1f2933; }
              table { border-collapse: collapse; width: 100%; table-layout: fixed; margin-top: 10px; }
              .th, .td { border: 1px solid #c8d3e5; padding: 7px 8px; font-size: 12px; color: #1f2933; vertical-align: middle; }
              .th { background: #375f8c; color: #ffffff; font-weight: 700; text-align: center; }
              .center { text-align: center; }
              .right { text-align: right; }
              .detail-col { width: 32%; }
              .client-col { width: 24%; }
              .addr-col { width: 22%; }
              .total-row td { border: 1px solid #375f8c; font-weight: 700; color: #375f8c; background: #eef4fb; }
            </style>
          </head>
          <body>
            <div class="title">Planilla de entregas</div>
            <div class="meta">Período: ${escapeHtml(periodoLabel)}</div>
            <div class="meta">Ventas pendientes: ${escapeHtml(Number(resumen.totalVentas || 0))} &nbsp;&nbsp;|&nbsp;&nbsp; Monto total: ${escapeHtml(formatCurrency(resumen.totalMonto || 0))}</div>
            <table>
              <colgroup>
                <col style="width:7%">
                <col class="client-col">
                <col style="width:12%">
                <col class="addr-col">
                <col style="width:11%">
                <col style="width:10%">
                <col style="width:12%">
                <col class="detail-col">
              </colgroup>
              <thead>
                <tr>
                  <th class="th">VENTA</th>
                  <th class="th">CLIENTE</th>
                  <th class="th">TELEFONO</th>
                  <th class="th">DIRECCION</th>
                  <th class="th">FECHA ENTREGA</th>
                  <th class="th">TOTAL</th>
                  <th class="th">HORARIOS</th>
                  <th class="th">DETALLE</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr><td colspan="8" style="border:none;height:8px"></td></tr>
                <tr class="total-row">
                  <td colspan="5">TOTAL A RECAUDAR</td>
                  <td class="right">${escapeHtml(formatCurrency(resumen.totalMonto || 0))}</td>
                  <td colspan="2"></td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const suffix = `${resumen.desde || 'desde'}_${resumen.hasta || 'hasta'}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = `entregas-${suffix}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setModalExportOpen(false);
    } catch (err) {
      await appAlert(err.message || 'No se pudo exportar Excel de entregas.');
    } finally {
      setExportingEntregas(false);
    }
  };

  const imprimirEntregas = async () => {
    setExportingEntregas(true);
    try {
      const resumen = await construirResumenEntregas();
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const periodoLabel = resumen.desde === resumen.hasta ? `Día ${resumen.desde}` : `${resumen.desde} al ${resumen.hasta}`;
      doc.setFontSize(14);
      doc.text('Planilla de entregas', pageWidth / 2, 14, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Período: ${periodoLabel}`, 14, 22);
      const entregaHead = [['VENTA', 'CLIENTE', 'TELEFONO', 'DIRECCION', 'FECHA ENTREGA', 'TOTAL', 'HORARIOS', 'DETALLE']];
      const entregaBody = (resumen.ventas || []).map((v) => [
        v.id,
        v.cliente_nombre || 'Consumidor final',
        v.cliente_telefono || '-',
        v.cliente_direccion || '-',
        formatDateOnly(v.fecha_entrega),
        formatCurrency(v.total || 0),
        formatHorarioClienteEntrega(v),
        '',
      ]);
      autoTable(doc, {
        startY: 28,
        head: entregaHead,
        body: entregaBody,
        styles: { fontSize: 8, valign: 'middle' },
        headStyles: { fillColor: [55, 95, 140] },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 36 },
          2: { cellWidth: 24 },
          3: { cellWidth: 56 },
          4: { cellWidth: 24 },
          5: { cellWidth: 22, halign: 'right' },
          6: { cellWidth: 30 },
          7: { cellWidth: 'auto' },
        },
      });
      const y = (doc.lastAutoTable?.finalY || 28) + 8;
      doc.setFontSize(11);
      doc.text(`TOTAL A RECAUDAR: ${formatCurrency(resumen.totalMonto || 0)}`, 14, y);
      const blob = doc.output('blob');
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
      setModalExportOpen(false);
    } catch (err) {
      await appAlert(err.message || 'No se pudo preparar impresión de entregas.');
    } finally {
      setExportingEntregas(false);
    }
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const processTicketsQueue = async (mode) => {
    if (!ticketsDesde || !ticketsHasta) {
      await appAlert('Debes seleccionar "Desde" y "Hasta" para generar los tickets por lote.');
      return;
    }
    if (ticketsDesde > ticketsHasta) {
      await appAlert('La fecha "Desde" no puede ser mayor que "Hasta".');
      return;
    }

    setPrintingBatch(true);
    try {
      const rows = await api.getVentas({ desde: ticketsDesde, hasta: ticketsHasta });
      const ventasActivas = rows.filter((v) => !v.cancelada);
      if (ventasActivas.length === 0) {
        await appAlert('No hay ventas activas para ese rango.');
        return;
      }
      for (const v of ventasActivas) {
        const venta = await api.getVentaById(v.id);
        const doc = await buildVentaPdf(venta);
        if (mode === 'pdf') {
          doc.save(`ticket-venta-${venta.id}.pdf`);
        } else {
          const pdfBlob = doc.output('blob');
          const blobUrl = URL.createObjectURL(pdfBlob);
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
        }
        await delay(350);
      }
      setModalTicketsOpen(false);
    } catch (err) {
      await appAlert(err.message || 'No se pudieron procesar los tickets en cola.');
    } finally {
      setPrintingBatch(false);
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
          <button
            type="button"
            className="ventas-export-btn"
            onClick={() => setModalTicketsOpen(true)}
            disabled={printingBatch || loading}
          >
            <AiFillPrinter />
            {printingBatch ? 'Procesando tickets...' : 'Tickets para entrega'}
          </button>
          <button
            type="button"
            className="ventas-export-btn"
            onClick={() => {
              const t = todayISO();
              setEntregasDesde(t);
              setEntregasHasta(t);
              setModalExportOpen(true);
            }}
            disabled={exportingEntregas}
          >
            {exportingEntregas ? 'Procesando...' : 'Imprimir entregas'}
          </button>
        </div>
      </div>

      {modalTicketsOpen && (
        <div className="export-modal-overlay" role="dialog" aria-modal="true">
          <div className="export-modal-backdrop" onClick={() => !printingBatch && setModalTicketsOpen(false)} />
          <div className="export-modal">
            <h4>Tickets para entrega</h4>
            <p>
              Se imprimirán o descargarán los tickets activos del rango seleccionado, uno por uno.
              Para cada día de entrega, se respeta el orden en que se creó la venta (más antigua primero).
            </p>
            <div className="tickets-presets-row">
              <button
                type="button"
                className="ticket-preset-btn"
                onClick={() => {
                  const t = todayISO();
                  setTicketsDesde(t);
                  setTicketsHasta(t);
                }}
                disabled={printingBatch}
              >
                Hoy
              </button>
              <button
                type="button"
                className="ticket-preset-btn"
                onClick={() => {
                  const t = tomorrowISO();
                  setTicketsDesde(t);
                  setTicketsHasta(t);
                }}
                disabled={printingBatch}
              >
                Mañana
              </button>
              <button
                type="button"
                className="ticket-preset-btn"
                onClick={() => {
                  const r = weekRangeISO();
                  setTicketsDesde(r.desde);
                  setTicketsHasta(r.hasta);
                }}
                disabled={printingBatch}
              >
                Esta semana
              </button>
              <button
                type="button"
                className="ticket-preset-btn"
                onClick={() => {
                  const r = monthRangeISO();
                  setTicketsDesde(r.desde);
                  setTicketsHasta(r.hasta);
                }}
                disabled={printingBatch}
              >
                Este mes
              </button>
            </div>
            <div className="tickets-range-row">
              <label className="ventas-fecha-filter">
                <span>Desde</span>
                <input type="date" value={ticketsDesde} onChange={(e) => setTicketsDesde(e.target.value)} />
              </label>
              <label className="ventas-fecha-filter">
                <span>Hasta</span>
                <input type="date" value={ticketsHasta} onChange={(e) => setTicketsHasta(e.target.value)} />
              </label>
            </div>
            <div className="export-modal-actions">
              <button type="button" onClick={() => processTicketsQueue('pdf')} disabled={printingBatch}>
                <PiFilePdfBold />
                <span>Descargar PDF (uno por uno)</span>
              </button>
              <button type="button" onClick={() => processTicketsQueue('printer')} disabled={printingBatch}>
                <AiFillPrinter />
                <span>Enviar a impresora (uno por uno)</span>
              </button>
            </div>
            <button
              type="button"
              className="export-modal-close"
              onClick={() => setModalTicketsOpen(false)}
              disabled={printingBatch}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {modalExportOpen && (
        <div className="export-modal-overlay" role="dialog" aria-modal="true">
          <div className="export-modal-backdrop" onClick={() => !exportingEntregas && setModalExportOpen(false)} />
          <div className="export-modal">
            <h4>Planilla de entregas</h4>
            <p>Elige rango y formato.</p>
            <div className="tickets-presets-row">
              <button
                type="button"
                className="ticket-preset-btn"
                onClick={() => {
                  const t = todayISO();
                  setEntregasDesde(t);
                  setEntregasHasta(t);
                }}
                disabled={exportingEntregas}
              >
                Hoy
              </button>
              <button
                type="button"
                className="ticket-preset-btn"
                onClick={() => {
                  const t = tomorrowISO();
                  setEntregasDesde(t);
                  setEntregasHasta(t);
                }}
                disabled={exportingEntregas}
              >
                Mañana
              </button>
              <button
                type="button"
                className="ticket-preset-btn"
                onClick={() => {
                  const r = weekRangeISO();
                  setEntregasDesde(r.desde);
                  setEntregasHasta(r.hasta);
                }}
                disabled={exportingEntregas}
              >
                Esta semana
              </button>
              <button
                type="button"
                className="ticket-preset-btn"
                onClick={() => {
                  const r = monthRangeISO();
                  setEntregasDesde(r.desde);
                  setEntregasHasta(r.hasta);
                }}
                disabled={exportingEntregas}
              >
                Este mes
              </button>
            </div>
            <div className="tickets-range-row">
              <label className="ventas-fecha-filter">
                <span>Desde</span>
                <input type="date" value={entregasDesde} onChange={(e) => setEntregasDesde(e.target.value)} />
              </label>
              <label className="ventas-fecha-filter">
                <span>Hasta</span>
                <input type="date" value={entregasHasta} onChange={(e) => setEntregasHasta(e.target.value)} />
              </label>
            </div>
            <div className="export-modal-actions">
              <button type="button" onClick={exportarEntregasPDF} disabled={exportingEntregas}>
                <PiFilePdfBold />
                <span>PDF</span>
              </button>
              <button type="button" onClick={exportarEntregasExcel} disabled={exportingEntregas}>
                <RiFileExcel2Line />
                <span>EXCEL</span>
              </button>
              <button type="button" onClick={imprimirEntregas} disabled={exportingEntregas}>
                <AiFillPrinter />
                <span>Impresora</span>
              </button>
            </div>
            <button
              type="button"
              className="export-modal-close"
              onClick={() => setModalExportOpen(false)}
              disabled={exportingEntregas}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

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
                  <span className={`estado-entrega-text estado-col ${
                    estadoEntrega === 'cancelado'
                      ? 'is-cancelado'
                      : (estadoEntrega === 'entregado' ? 'is-entregado' : 'is-pendiente')
                  }`}>
                    {estadoEntrega === 'cancelado'
                      ? 'Cancelado'
                      : (estadoEntrega === 'entregado' ? 'Entregado' : 'Pendiente')}
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
                        onClick={() => replicarVenta(v.id)}
                        disabled={printingId === v.id}
                        title="Replicar venta"
                        aria-label="Replicar venta"
                      >
                        <FaReplyAll aria-hidden="true" />
                        <small>Replicar</small>
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
