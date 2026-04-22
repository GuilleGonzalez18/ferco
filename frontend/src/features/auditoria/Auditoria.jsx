import { useEffect, useMemo, useState } from 'react';
import { api } from '../../core/api';
import { useConfig } from '../../core/ConfigContext';
import { getPrimaryRgb } from '../../shared/lib/pdfColors';
import './Auditoria.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AppTable from '../../shared/components/table/AppTable';
import AppInput from '../../shared/components/fields/AppInput';
import AppSelect from '../../shared/components/fields/AppSelect';
import AppButton from '../../shared/components/button/AppButton';

const PAGE_SIZE = 10;

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
  const { empresa } = useConfig();
  const [eventos, setEventos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroOrigenMov, setFiltroOrigenMov] = useState('todos');
  const [filtroUsuarioMov, setFiltroUsuarioMov] = useState('todos');
  const [filtroTextoMov, setFiltroTextoMov] = useState('');
  const [filtroAccionEvento, setFiltroAccionEvento] = useState('todos');
  const [filtroUsuarioEvento, setFiltroUsuarioEvento] = useState('todos');
  const [filtroTextoEvento, setFiltroTextoEvento] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [movimientosPage, setMovimientosPage] = useState(1);
  const [eventosPage, setEventosPage] = useState(1);

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
      setMovimientosPage(1);
      setEventosPage(1);
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
    const q = filtroTextoMov.trim().toLowerCase();
    return movimientos.filter((m) => {
      if (filtroTipo !== 'todos' && m.tipo !== filtroTipo) return false;
      if (filtroOrigenMov !== 'todos' && String(m.origen || '') !== filtroOrigenMov) return false;
      if (filtroUsuarioMov !== 'todos' && String(m.usuario_nombre || '-') !== filtroUsuarioMov) return false;
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
  }, [movimientos, filtroTipo, filtroOrigenMov, filtroUsuarioMov, filtroTextoMov]);

  const eventosFiltrados = useMemo(() => {
    const q = filtroTextoEvento.trim().toLowerCase();
    return eventos.filter((e) => {
      if (filtroAccionEvento !== 'todos' && String(e.accion || '') !== filtroAccionEvento) return false;
      if (filtroUsuarioEvento !== 'todos' && String(e.usuario_nombre || '-') !== filtroUsuarioEvento) return false;
      if (!q) return true;
      return [
        e.entidad,
        e.entidad_id,
        e.accion,
        e.detalle,
        e.usuario_nombre,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [eventos, filtroAccionEvento, filtroUsuarioEvento, filtroTextoEvento]);


  const opcionesOrigenMov = useMemo(
    () => [...new Set(movimientos.map((m) => String(m.origen || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [movimientos]
  );
  const opcionesUsuarioMov = useMemo(
    () => [...new Set(movimientos.map((m) => String(m.usuario_nombre || '-').trim() || '-'))].sort((a, b) => a.localeCompare(b)),
    [movimientos]
  );
  const opcionesAccionEvento = useMemo(
    () => [...new Set(eventos.map((e) => String(e.accion || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [eventos]
  );
  const opcionesUsuarioEvento = useMemo(
    () => [...new Set(eventos.map((e) => String(e.usuario_nombre || '-').trim() || '-'))].sort((a, b) => a.localeCompare(b)),
    [eventos]
  );

  const totalMovimientosPages = Math.max(1, Math.ceil(movimientosFiltrados.length / PAGE_SIZE));
  const totalEventosPages = Math.max(1, Math.ceil(eventosFiltrados.length / PAGE_SIZE));

  const movimientosColumns = useMemo(() => ([
    {
      key: 'fecha',
      header: 'Fecha',
      mobileLabel: 'Fecha',
      render: (m) => formatDateTime(m.created_at),
    },
    {
      key: 'producto',
      header: 'Producto',
      mobileLabel: 'Producto',
      render: (m) => m.producto_nombre || `#${m.producto_id}`,
    },
    {
      key: 'tipo',
      header: 'Tipo',
      mobileLabel: 'Tipo',
      render: (m) => (
        <span className={m.tipo === 'entrada' ? 'tag in' : 'tag out'}>
          {m.tipo === 'entrada' ? 'Entrada' : 'Salida'}
        </span>
      ),
    },
    {
      key: 'origen',
      header: 'Origen',
      mobileLabel: 'Origen',
      accessor: 'origen',
    },
    {
      key: 'cantidad',
      header: 'Cantidad',
      mobileLabel: 'Cantidad',
      align: 'right',
      render: (m) => formatQty(m.cantidad),
    },
    {
      key: 'stock',
      header: 'Stock',
      mobileLabel: 'Stock',
      render: (m) => `${formatQty(m.stock_anterior)} -> ${formatQty(m.stock_nuevo)}`,
    },
    {
      key: 'usuario',
      header: 'Usuario',
      mobileLabel: 'Usuario',
      render: (m) => m.usuario_nombre || '-',
    },
  ]), []);

  const eventosColumns = useMemo(() => ([
    {
      key: 'fecha',
      header: 'Fecha',
      mobileLabel: 'Fecha',
      render: (e) => formatDateTime(e.created_at),
    },
    {
      key: 'entidad',
      header: 'Entidad',
      mobileLabel: 'Entidad',
      render: (e) => `${e.entidad} #${e.entidad_id ?? '-'}`,
    },
    {
      key: 'accion',
      header: 'Acción',
      mobileLabel: 'Acción',
      accessor: 'accion',
    },
    {
      key: 'detalle',
      header: 'Detalle',
      mobileLabel: 'Detalle',
      render: (e) => e.detalle || '-',
    },
    {
      key: 'usuario',
      header: 'Usuario',
      mobileLabel: 'Usuario',
      render: (e) => e.usuario_nombre || '-',
    },
  ]), []);

  const movimientosPaginados = useMemo(() => {
    const start = (movimientosPage - 1) * PAGE_SIZE;
    return movimientosFiltrados.slice(start, start + PAGE_SIZE);
  }, [movimientosFiltrados, movimientosPage]);

  const eventosPaginados = useMemo(() => {
    const start = (eventosPage - 1) * PAGE_SIZE;
    return eventosFiltrados.slice(start, start + PAGE_SIZE);
  }, [eventosFiltrados, eventosPage]);

  const movimientosRange = useMemo(() => {
    if (movimientosFiltrados.length === 0) return 'Mostrando 0 de 0';
    const start = (movimientosPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(movimientosPage * PAGE_SIZE, movimientosFiltrados.length);
    return `Mostrando ${start}-${end} de ${movimientosFiltrados.length}`;
  }, [movimientosFiltrados.length, movimientosPage]);

  const eventosRange = useMemo(() => {
    if (eventosFiltrados.length === 0) return 'Mostrando 0 de 0';
    const start = (eventosPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(eventosPage * PAGE_SIZE, eventosFiltrados.length);
    return `Mostrando ${start}-${end} de ${eventosFiltrados.length}`;
  }, [eventosFiltrados.length, eventosPage]);

  useEffect(() => {
    if (movimientosPage > totalMovimientosPages) {
      setMovimientosPage(totalMovimientosPages);
    }
  }, [movimientosPage, totalMovimientosPages]);

  useEffect(() => {
    if (eventosPage > totalEventosPages) {
      setEventosPage(totalEventosPages);
    }
  }, [eventosPage, totalEventosPages]);

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
      const logoSrc = empresa.logo_base64 || '/mercatus-logo.png';
      const logo = new Image();
      logo.src = logoSrc;
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
      headStyles: { fillColor: getPrimaryRgb() },
    });
    doc.save('auditoria-stock.pdf');
  };

  return (
    <div className="auditoria-main">
      <div className="auditoria-toolbar">
        <div className="auditoria-filtros">
          <AppInput type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <AppInput type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          <AppButton type="button" className="audit-btn" onClick={() => loadAuditoria(desde, hasta)}>
            Filtrar
          </AppButton>
          <AppButton
            type="button"
            className="audit-btn secondary"
            onClick={() => {
              setDesde('');
              setHasta('');
              loadAuditoria('', '');
            }}
          >
            Limpiar
          </AppButton>
        </div>
      </div>

      {loading && <div className="auditoria-msg">Cargando auditoría...</div>}
      {!loading && error && <div className="auditoria-msg error">{error}</div>}

      {!loading && !error && (
        <>
          <section className="auditoria-card">
            <div className="auditoria-card-head">
              <h4>Movimientos de stock</h4>
              <AppButton type="button" className="audit-btn" onClick={exportarStockPDF}>PDF stock</AppButton>
            </div>
            <div className="auditoria-card-filtros">
              <AppSelect value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                <option value="todos">Tipo: todos</option>
                <option value="entrada">Tipo: entrada</option>
                <option value="salida">Tipo: salida</option>
              </AppSelect>
              <AppSelect value={filtroOrigenMov} onChange={(e) => setFiltroOrigenMov(e.target.value)}>
                <option value="todos">Origen: todos</option>
                {opcionesOrigenMov.map((origen) => (
                  <option key={origen} value={origen}>{origen}</option>
                ))}
              </AppSelect>
              <AppSelect value={filtroUsuarioMov} onChange={(e) => setFiltroUsuarioMov(e.target.value)}>
                <option value="todos">Usuario: todos</option>
                {opcionesUsuarioMov.map((usuario) => (
                  <option key={usuario} value={usuario}>{usuario}</option>
                ))}
              </AppSelect>
              <AppInput
                type="text"
                placeholder="Buscar por producto o detalle..."
                value={filtroTextoMov}
                onChange={(e) => setFiltroTextoMov(e.target.value)}
              />
              <AppButton
                type="button"
                className="audit-btn secondary"
                onClick={() => {
                  setFiltroTipo('todos');
                  setFiltroOrigenMov('todos');
                  setFiltroUsuarioMov('todos');
                  setFiltroTextoMov('');
                  setMovimientosPage(1);
                }}
              >
                Limpiar filtros
              </AppButton>
            </div>
            <AppTable
              stickyHeader
              columns={movimientosColumns}
              rows={movimientosPaginados}
              rowKey="id"
              emptyMessage="No hay movimientos para los filtros seleccionados."
            />
            <div className="auditoria-pager">
              <span className="auditoria-range">{movimientosRange}</span>
              <AppButton
                type="button"
                className="audit-btn secondary"
                onClick={() => setMovimientosPage(1)}
                disabled={movimientosPage <= 1}
                title="Primera página"
                aria-label="Primera página"
              >
                ⏮
              </AppButton>
              <AppButton
                type="button"
                className="audit-btn secondary"
                onClick={() => setMovimientosPage((p) => Math.max(1, p - 1))}
                disabled={movimientosPage <= 1}
                title="Página anterior"
                aria-label="Página anterior"
              >
                ◀
              </AppButton>
              <span>Página {movimientosPage} de {totalMovimientosPages}</span>
              <AppButton
                type="button"
                className="audit-btn secondary"
                onClick={() => setMovimientosPage((p) => Math.min(totalMovimientosPages, p + 1))}
                disabled={movimientosPage >= totalMovimientosPages}
                title="Página siguiente"
                aria-label="Página siguiente"
              >
                ▶
              </AppButton>
              <AppButton
                type="button"
                className="audit-btn secondary"
                onClick={() => setMovimientosPage(totalMovimientosPages)}
                disabled={movimientosPage >= totalMovimientosPages}
                title="Última página"
                aria-label="Última página"
              >
                ⏭
              </AppButton>
            </div>
          </section>

          <section className="auditoria-card">
            <div className="auditoria-card-head">
              <h4>Eventos de auditoría (altas, ediciones y eliminaciones)</h4>
            </div>
            <div className="auditoria-card-filtros">
              <AppSelect value={filtroAccionEvento} onChange={(e) => setFiltroAccionEvento(e.target.value)}>
                <option value="todos">Acción: todas</option>
                {opcionesAccionEvento.map((accion) => (
                  <option key={accion} value={accion}>{accion}</option>
                ))}
              </AppSelect>
              <AppSelect value={filtroUsuarioEvento} onChange={(e) => setFiltroUsuarioEvento(e.target.value)}>
                <option value="todos">Usuario: todos</option>
                {opcionesUsuarioEvento.map((usuario) => (
                  <option key={usuario} value={usuario}>{usuario}</option>
                ))}
              </AppSelect>
              <AppInput
                type="text"
                placeholder="Buscar por entidad, acción o detalle..."
                value={filtroTextoEvento}
                onChange={(e) => setFiltroTextoEvento(e.target.value)}
              />
              <AppButton
                type="button"
                className="audit-btn secondary"
                onClick={() => {
                  setFiltroAccionEvento('todos');
                  setFiltroUsuarioEvento('todos');
                  setFiltroTextoEvento('');
                  setEventosPage(1);
                }}
              >
                Limpiar filtros
              </AppButton>
            </div>
            <AppTable
              stickyHeader
              columns={eventosColumns}
              rows={eventosPaginados}
              rowKey="id"
              emptyMessage="No hay eventos para los filtros seleccionados."
            />
            <div className="auditoria-pager">
              <span className="auditoria-range">{eventosRange}</span>
              <AppButton
                type="button"
                className="audit-btn secondary"
                onClick={() => setEventosPage(1)}
                disabled={eventosPage <= 1}
                title="Primera página"
                aria-label="Primera página"
              >
                ⏮
              </AppButton>
              <AppButton
                type="button"
                className="audit-btn secondary"
                onClick={() => setEventosPage((p) => Math.max(1, p - 1))}
                disabled={eventosPage <= 1}
                title="Página anterior"
                aria-label="Página anterior"
              >
                ◀
              </AppButton>
              <span>Página {eventosPage} de {totalEventosPages}</span>
              <AppButton
                type="button"
                className="audit-btn secondary"
                onClick={() => setEventosPage((p) => Math.min(totalEventosPages, p + 1))}
                disabled={eventosPage >= totalEventosPages}
                title="Página siguiente"
                aria-label="Página siguiente"
              >
                ▶
              </AppButton>
              <AppButton
                type="button"
                className="audit-btn secondary"
                onClick={() => setEventosPage(totalEventosPages)}
                disabled={eventosPage >= totalEventosPages}
                title="Última página"
                aria-label="Última página"
              >
                ⏭
              </AppButton>
            </div>
          </section>
        </>
      )}
    </div>
  );
}


