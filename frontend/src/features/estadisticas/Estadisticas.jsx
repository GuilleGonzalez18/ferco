import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../core/api';
import './Estadisticas.css';
import AppTable from '../../shared/components/table/AppTable';
import AppInput from '../../shared/components/fields/AppInput';
import AppSelect from '../../shared/components/fields/AppSelect';
import AppButton from '../../shared/components/button/AppButton';
import { FaFileExcel } from 'react-icons/fa6';
import { BsFiletypePng } from 'react-icons/bs';
import { usePermisos } from '../../core/PermisosContext';

function money(value) {
  const n = Math.round(Number(value || 0));
  return n.toLocaleString('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 });
}

function moneyFull(value) {
  const n = Math.round(Number(value || 0));
  return `$${n.toLocaleString('es-UY')}`;
}

function qty(value) {
  const n = Number(value || 0);
  return n.toLocaleString('es-UY');
}

function pct(value) {
  const n = Math.round(Number(value || 0));
  const sign = n > 0 ? '+' : '';
  return `${sign}${n}%`;
}

function dateText(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('es-UY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatUyDate(value) {
  if (!value) return '';
  const [y, m, d] = String(value).slice(0, 10).split('-');
  if (!y || !m || !d) return String(value);
  return `${d}/${m}/${y}`;
}

function rangeLabel(desde, hasta) {
  if (desde && hasta) return `Mostrando del ${formatUyDate(desde)} al ${formatUyDate(hasta)}`;
  if (desde) return `Mostrando desde ${formatUyDate(desde)}`;
  if (hasta) return `Mostrando hasta ${formatUyDate(hasta)}`;
  return 'Mostrando todo el período disponible';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function exportHtmlTableToExcel({ filename, title, headers, rows }) {
  const headHtml = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const bodyHtml = rows.map((row, idx) => {
    const zebra = idx % 2 === 0 ? '#f7faff' : '#ffffff';
    const cells = row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('');
    return `<tr style="background:${zebra}">${cells}</tr>`;
  }).join('');
  const html = `
    <html><head><meta charset="UTF-8" /></head><body>
      <h3 style="color:#375f8c;margin:0 0 10px">${escapeHtml(title)}</h3>
      <table border="1" style="border-collapse:collapse;width:100%">
        <thead>
          <tr style="background:#375f8c;color:#fff">${headHtml}</tr>
        </thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </body></html>
  `;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportSvgAsPng(svgElement, filename) {
  if (!svgElement) return;
  const clone = svgElement.cloneNode(true);
  const sourceNodes = svgElement.querySelectorAll('*');
  const cloneNodes = clone.querySelectorAll('*');
  sourceNodes.forEach((node, idx) => {
    const cloneNode = cloneNodes[idx];
    if (!cloneNode) return;
    const cs = window.getComputedStyle(node);
    const styleText = [
      `fill:${cs.fill}`,
      `stroke:${cs.stroke}`,
      `stroke-width:${cs.strokeWidth}`,
      `stroke-linecap:${cs.strokeLinecap}`,
      `stroke-linejoin:${cs.strokeLinejoin}`,
      `opacity:${cs.opacity}`,
      `font-size:${cs.fontSize}`,
      `font-weight:${cs.fontWeight}`,
      `font-family:${cs.fontFamily}`,
      `paint-order:${cs.paintOrder}`,
      `dominant-baseline:${cs.dominantBaseline}`,
    ].join(';');
    cloneNode.setAttribute('style', styleText);
  });
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  const serializer = new XMLSerializer();
  const svgText = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const viewBox = svgElement.viewBox?.baseVal;
    const width = Math.max(1, Math.round(viewBox?.width || svgElement.clientWidth || 1000));
    const height = Math.max(1, Math.round(viewBox?.height || svgElement.clientHeight || 220));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(svgUrl);
      return;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(svgUrl);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
  };
  img.src = svgUrl;
}

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getQuickRange(days) {
  const hastaDate = new Date();
  hastaDate.setHours(0, 0, 0, 0);
  const desdeDate = new Date(hastaDate);
  desdeDate.setDate(hastaDate.getDate() - (days - 1));
  return {
    desde: toIsoDate(desdeDate),
    hasta: toIsoDate(hastaDate),
  };
}

function getTodayRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const iso = toIsoDate(today);
  return { desde: iso, hasta: iso };
}

function getThisMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  return { desde: toIsoDate(start), hasta: toIsoDate(end) };
}

function getYesterdayRange() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 1);
  const iso = toIsoDate(d);
  return { desde: iso, hasta: iso };
}

function getLastWeekRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const thisWeekMonday = new Date(today);
  thisWeekMonday.setDate(today.getDate() - diffToMonday);
  const lastWeekMonday = new Date(thisWeekMonday);
  lastWeekMonday.setDate(thisWeekMonday.getDate() - 7);
  const lastWeekSunday = new Date(thisWeekMonday);
  lastWeekSunday.setDate(thisWeekMonday.getDate() - 1);
  return { desde: toIsoDate(lastWeekMonday), hasta: toIsoDate(lastWeekSunday) };
}

function getLastMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  end.setHours(0, 0, 0, 0);
  return { desde: toIsoDate(start), hasta: toIsoDate(end) };
}

function getYesterdayVsTodayRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  return { desde: toIsoDate(yesterday), hasta: toIsoDate(today) };
}

function getLastMonthVsCurrentRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  return { desde: toIsoDate(start), hasta: toIsoDate(end) };
}

function getLast12MonthsRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  return { desde: toIsoDate(start), hasta: toIsoDate(end) };
}

function daysBetween(desde, hasta) {
  if (!desde || !hasta) return 0;
  const d1 = new Date(`${desde}T00:00:00`);
  const d2 = new Date(`${hasta}T00:00:00`);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 0;
  return Math.floor((d2.getTime() - d1.getTime()) / 86400000) + 1;
}

function MiniBars({ items, valueKey = 'value', showValues = false, valueFormatter = null, className = '' }) {
  const max = Math.max(...items.map((it) => Number(it[valueKey] || 0)), 1);
  return (
    <div
      className={`mini-bars ${className}`.trim()}
      style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(46px, 64px))` }}
    >
      {items.map((item) => {
        const value = Number(item[valueKey] || 0);
        const valueRounded = Math.round(value);
        const height = value <= 0 ? '0%' : `${Math.max(8, (value / max) * 100)}%`;
        const barColor = item.barColor || '';
        const variation = Number(item.variation);
        const variationExact = Number(item.variationExact);
        return (
          <div key={item.key} className="mini-bar-col" title={`${item.label}: ${valueRounded.toLocaleString('es-UY')}`}>
            {showValues && (
              <span className="mini-bar-value">
                {valueFormatter ? valueFormatter(valueRounded) : valueRounded.toLocaleString('es-UY')}
              </span>
            )}
            {Number.isFinite(variation) && (
              <span className={`mini-bar-delta ${variation >= 0 ? 'up' : 'down'}`}>
                {variation >= 0 ? '+' : ''}{Math.round(variation)}%
                {Number.isFinite(variationExact) ? ` (${variationExact >= 0 ? '+' : ''}${variationExact.toLocaleString('es-UY')})` : ''}
              </span>
            )}
            <div className="mini-bar-track">
              <div className={`mini-bar ${barColor}`} style={{ height }} />
            </div>
            <span className="mini-bar-label">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function MiniLineChart({ items, valueKey = 'value', valueFormatter = null, className = '', showPointValues = true }) {
  const width = 1000;
  const height = 220;
  const paddingLeft = 34;
  const paddingRight = 22;
  const paddingTop = 18;
  const paddingBottom = 62;
  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;
  const max = Math.max(...items.map((it) => Number(it[valueKey] || 0)), 1);
  let usedWidth = innerWidth;
  if (items.length <= 2) usedWidth = innerWidth * 0.55;
  else if (items.length === 3) usedWidth = innerWidth * 0.72;
  const startX = paddingLeft + (innerWidth - usedWidth) / 2;
  const stepX = items.length > 1 ? usedWidth / (items.length - 1) : 0;

  const points = items.map((item, idx) => {
    const value = Number(item[valueKey] || 0);
    const ratio = max <= 0 ? 0 : value / max;
    const x = startX + stepX * idx;
    const y = paddingTop + (innerHeight - ratio * innerHeight);
    return { key: String(item?.key ?? idx), label: item.label, subLabel: item.subLabel || '', value, x, y };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const firstX = points[0]?.x ?? paddingLeft;
  const lastX = points[points.length - 1]?.x ?? (paddingLeft + innerWidth);
  const area = points.length
    ? `${firstX},${paddingTop + innerHeight} ${polyline} ${lastX},${paddingTop + innerHeight}`
    : '';
  const gridSteps = 4;

  const defaultPointKeys = useMemo(
    () => new Set(items.map((item, idx) => String(item?.key ?? idx))),
    [items],
  );

  const [disabledPointKeys, setDisabledPointKeys] = useState(() => new Set());

  const activePointKeys = useMemo(() => {
    const s = new Set(defaultPointKeys);
    for (const k of disabledPointKeys) s.delete(k);
    return s;
  }, [defaultPointKeys, disabledPointKeys]);
  const formatLabelValue = (value) => (
    valueFormatter ? valueFormatter(value) : Math.round(value).toLocaleString('es-UY')
  );

  return (
    <div className={`mini-line-chart ${className}`.trim()}>
      <svg viewBox={`0 0 ${width} ${height}`} className="mini-line-svg" preserveAspectRatio="none" role="img" aria-label="Gráfico lineal">
        <defs>
          <linearGradient id="miniLineAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(63, 123, 182, 0.30)" />
            <stop offset="100%" stopColor="rgba(63, 123, 182, 0.02)" />
          </linearGradient>
        </defs>
        {[...Array(gridSteps + 1)].map((_, i) => {
          const y = paddingTop + (innerHeight / gridSteps) * i;
          return (
            <line
              key={`grid-${i}`}
              x1={paddingLeft}
              y1={y}
              x2={width - paddingRight}
              y2={y}
              className="mini-line-grid"
            />
          );
        })}
        <line
          x1={paddingLeft}
          y1={paddingTop + innerHeight}
          x2={width - paddingRight}
          y2={paddingTop + innerHeight}
          className="mini-line-axis"
        />
        {points.length > 1 && <polygon points={area} className="mini-line-area" />}
        {points.length > 1 && <polyline points={polyline} className="mini-line-path" />}
        {points.length === 1 && (
          <line
            x1={paddingLeft}
            y1={points[0]?.y ?? paddingTop + innerHeight}
            x2={width - paddingRight}
            y2={points[0]?.y ?? paddingTop + innerHeight}
            className="mini-line-path"
          />
        )}
        {points.map((p) => (
          <g key={`dot-${p.key}`}>
            {showPointValues && activePointKeys.has(p.key) && (() => {
              const textValue = formatLabelValue(p.value);
              const labelChars = Math.max(textValue.length, 4);
              const labelWidth = Math.max(44, Math.min(170, labelChars * 6.7 + 14));
              const labelHeight = 18;
              const bubbleCenterX = Math.max(
                paddingLeft + (labelWidth / 2) + 2,
                Math.min(width - paddingRight - (labelWidth / 2) - 2, p.x),
              );
              const placeAbove = p.y - 14 >= paddingTop + 2;
              const bubbleY = placeAbove ? p.y - 24 : p.y + 8;
              const textY = bubbleY + 12.2;
              return (
                <g className={`mini-line-point-pill ${placeAbove ? 'above' : 'below'}`}>
                  <rect
                    x={bubbleCenterX - (labelWidth / 2)}
                    y={bubbleY}
                    width={labelWidth}
                    height={labelHeight}
                    rx="9"
                    ry="9"
                    className="mini-line-point-pill-bg"
                  />
                  <text
                    x={bubbleCenterX}
                    y={textY}
                    textAnchor="middle"
                    className="mini-line-point-value"
                  >
                    {textValue}
                  </text>
                </g>
              );
            })()}
            <circle
              cx={p.x}
              cy={p.y}
              r="5"
              className={`mini-line-dot ${activePointKeys.has(p.key) ? 'active' : ''}`}
              onClick={() => {
                setDisabledPointKeys((prev) => {
                  const next = new Set(prev);
                  if (next.has(p.key)) next.delete(p.key);
                  else next.add(p.key);
                  return next;
                });
              }}
              style={{ cursor: 'pointer' }}
            />
            <title>{`${p.label}: ${valueFormatter ? valueFormatter(p.value) : Math.round(p.value).toLocaleString('es-UY')}`}</title>
          </g>
        ))}
        {points.map((p) => (
          <g key={`axis-${p.key}`}>
            <text
              x={p.x}
              y={height - 30}
              textAnchor={p.x === firstX ? 'start' : p.x === lastX ? 'end' : 'middle'}
              className="mini-line-axis-label"
            >
              <tspan x={p.x}>{p.label}</tspan>
              {p.subLabel ? (
                <tspan x={p.x} dy="12" className="mini-line-axis-sublabel">
                  {p.subLabel}
                </tspan>
              ) : null}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function Estadisticas({ compact = false }) {
  const stockChartSvgRef = useRef(null);
  const ventasUsuarioChartSvgRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [quickRange, setQuickRange] = useState('');
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState('');
  const [stockDesde, setStockDesde] = useState('');
  const [stockHasta, setStockHasta] = useState('');
  const [stockQuickRange, setStockQuickRange] = useState('month-compare');
  const [stockSerie, setStockSerie] = useState([]);
  const [ventasUsuarioStockChart, setVentasUsuarioStockChart] = useState([]);
  const [stockSerieRange, setStockSerieRange] = useState({ desde: '', hasta: '' });
  const [ownerTab, setOwnerTab] = useState('empresa');
  const [ownerUsuarioId, setOwnerUsuarioId] = useState('');
  const [ownerSelfUsuarioId, setOwnerSelfUsuarioId] = useState(0);
  const { can } = usePermisos();
  const verEmpresa = can('estadisticas', 'ver_empresa');
  const verPorUsuario = can('estadisticas', 'ver_por_usuario');
  const puedeExportar = can('estadisticas', 'exportar');
  const esVendedor = stats?.scope === 'vendedor';
  const esPropietario = stats?.scope === 'propietario';
  const showEmpresa = !esVendedor && (!esPropietario || ownerTab === 'empresa');
  const showPersonal = esVendedor || (esPropietario && ownerTab === 'personal');
  const personalStats = showPersonal
    ? (esVendedor ? stats : stats?.personalStats)
    : null;

  const loadStats = async (nextDesde = desde, nextHasta = hasta, nextUsuarioId = ownerUsuarioId) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getEstadisticasResumen(nextDesde, nextHasta, nextUsuarioId);
      setStats(data);
      if (
        data?.scope === 'propietario' &&
        !nextUsuarioId &&
        !ownerSelfUsuarioId &&
        Number.isInteger(Number(data?.personalStats?.usuarioId))
      ) {
        setOwnerSelfUsuarioId(Number(data.personalStats.usuarioId));
      }
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las estadísticas.');
    } finally {
      setLoading(false);
    }
  };

  const loadStockSerie = async (nextDesde = stockDesde, nextHasta = stockHasta) => {
    setStockLoading(true);
    setStockError('');
    try {
      const [data, resumen] = await Promise.all([
        api.getStockCostoSerie(nextDesde, nextHasta),
        api.getEstadisticasResumen(nextDesde, nextHasta, ownerUsuarioId),
      ]);
      const serie = Array.isArray(data?.serie) ? data.serie : [];
      setStockSerie(serie.map((row) => ({
        fecha: String(row.fecha || '').slice(0, 10),
        total: Math.round(Number(row.total_costo || 0)),
      })));
      const ventasRows = (resumen?.ventasPorUsuario || []).slice(0, 8);
      setVentasUsuarioStockChart(ventasRows.map((u, idx) => ({
        key: `${u.usuario_id || idx}-${u.usuario_nombre}`,
        label: u.usuario_nombre || 'N/A',
        subLabel: `${qty(u.cantidad_ventas || 0)} ventas`,
        salesCount: Number(u.cantidad_ventas || 0),
        value: Math.round(Number(u.total_vendido || 0)),
      })));
      setStockSerieRange({
        desde: String(data?.desde || nextDesde || ''),
        hasta: String(data?.hasta || nextHasta || ''),
      });
    } catch {
      setStockSerie([]);
      setVentasUsuarioStockChart([]);
      setStockSerieRange({ desde: nextDesde || '', hasta: nextHasta || '' });
      setStockError('No se pudo cargar el gráfico de costo de stock.');
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const initialStockRange = getLastMonthVsCurrentRange();
    setStockDesde(initialStockRange.desde);
    setStockHasta(initialStockRange.hasta);
    loadStockSerie(initialStockRange.desde, initialStockRange.hasta);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only: loadStats y loadStockSerie usan los parámetros pasados explícitamente

  useEffect(() => {
    const onStatsRefresh = () => {
      loadStats(desde, hasta, ownerUsuarioId);
      loadStockSerie(stockDesde, stockHasta);
    };
    window.addEventListener('ferco:stats-refresh', onStatsRefresh);
    return () => window.removeEventListener('ferco:stats-refresh', onStatsRefresh);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta, ownerUsuarioId, stockDesde, stockHasta]); // loadStats/loadStockSerie no están en useCallback, se omiten intencionalmente

  useEffect(() => {
    const loadUsuarios = async () => {
      try {
        const data = await api.getUsuarios();
        setUsuarios(Array.isArray(data) ? data : []);
      } catch {
        setUsuarios([]);
      }
    };
    loadUsuarios();
  }, []);

  useEffect(() => {
    if (!esPropietario) setOwnerTab('empresa');
  }, [esPropietario]);

  const usuariosFiltro = useMemo(() => {
    const rows = Array.isArray(usuarios) ? usuarios : [];
    return rows
      .filter((u) => Number(u.id) !== Number(ownerSelfUsuarioId || 0))
      .map((u) => ({
        id: Number(u.id),
        label: [u.nombre, u.apellido].filter(Boolean).join(' ').trim() || u.username || u.correo || `Usuario ${u.id}`,
      }));
  }, [ownerSelfUsuarioId, usuarios]);

  const usuarioFiltroNombre = useMemo(() => {
    const currentId = Number(stats?.personalStats?.usuarioId || ownerUsuarioId || 0);
    if (!currentId) return '';
    return usuariosFiltro.find((u) => u.id === currentId)?.label || '';
  }, [ownerUsuarioId, stats?.personalStats?.usuarioId, usuariosFiltro]);

  const topUsuario = useMemo(() => {
    const rows = stats?.ventasPorUsuario || [];
    return rows.length ? rows[0] : null;
  }, [stats]);

  const ventasUltimos7DiasChart = useMemo(() => {
    const rows = ((esVendedor ? stats?.ventasSerie : stats?.personalStats?.ventasSerie) || []).map((r) => ({
      fecha: String(r.fecha).slice(0, 10),
      total: Number(r.total || 0),
    }));
    const map = new Map(rows.map((r) => [r.fecha, r.total]));
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    const items = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const key = toIsoDate(d);
      items.push({
        key,
        label: key.slice(5),
        value: Math.round(map.get(key) || 0),
      });
    }
    return items;
  }, [stats, esVendedor]);

  const stockGranularity = useMemo(() => (
    daysBetween(stockSerieRange.desde, stockSerieRange.hasta) > 31 ? 'month' : 'day'
  ), [stockSerieRange.desde, stockSerieRange.hasta]);

  const stockCostoChart = useMemo(() => {
    const rows = stockSerie || [];
    if (stockGranularity === 'day') {
      return rows.map((row) => ({
        key: row.fecha,
        label: formatUyDate(row.fecha).slice(0, 5),
        value: row.total,
      }));
    }
    const monthly = new Map();
    rows.forEach((row) => {
      const key = String(row.fecha || '').slice(0, 7);
      monthly.set(key, Math.round(Number(row.total || 0)));
    });
    return Array.from(monthly.entries()).map(([key, value]) => ({
      key,
      label: `${key.slice(5)}/${key.slice(0, 4)}`,
      value,
    }));
  }, [stockGranularity, stockSerie]);

  const stockChartWithVariation = useMemo(() => (
    stockCostoChart.map((item, idx) => {
      const colors = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12'];
      if (idx === 0) {
        return { ...item, variation: null, barColor: colors[idx % colors.length] };
      }
      const prev = Number(stockCostoChart[idx - 1].value || 0);
      const current = Number(item.value || 0);
      const variationExact = current - prev;
      const variation = prev === 0 ? (current === 0 ? 0 : 100) : ((variationExact / prev) * 100);
      return { ...item, variation, variationExact, barColor: colors[idx % colors.length] };
    })
  ), [stockCostoChart]);

  const exportarGraficaStockExcel = () => {
    if (!stockChartWithVariation.length) return;
    exportHtmlTableToExcel({
      filename: 'grafico-costo-stock.xls',
      title: `Costo total de stock (histórico) - ${rangeLabel(stockSerieRange.desde, stockSerieRange.hasta)}`,
      headers: ['Período', 'Costo total'],
      rows: stockChartWithVariation.map((item) => [
        item.label,
        moneyFull(item.value),
      ]),
    });
  };

  const exportarGraficaVentasUsuarioExcel = () => {
    if (!ventasUsuarioStockChart.length) return;
    exportHtmlTableToExcel({
      filename: 'grafico-ventas-por-usuario.xls',
      title: `Ventas por usuario - ${rangeLabel(stockSerieRange.desde, stockSerieRange.hasta)}`,
      headers: ['Usuario', 'Cantidad ventas', 'Total vendido'],
      rows: ventasUsuarioStockChart.map((item) => [
        item.label,
        qty(item.salesCount || 0),
        moneyFull(item.value),
      ]),
    });
  };

  const exportarGraficaStockPng = () => {
    const svg = stockChartSvgRef.current?.querySelector('svg');
    exportSvgAsPng(svg, 'grafico-costo-stock.png');
  };

  const exportarGraficaVentasUsuarioPng = () => {
    const svg = ventasUsuarioChartSvgRef.current?.querySelector('svg');
    exportSvgAsPng(svg, 'grafico-ventas-por-usuario.png');
  };

  const ventasUsuarioColumns = useMemo(() => ([
    {
      key: 'usuario',
      header: 'Usuario',
      mobileLabel: 'Usuario',
      render: (u) => u.usuario_nombre || '-',
    },
    {
      key: 'ventas',
      header: 'Ventas',
      mobileLabel: 'Ventas',
      align: 'right',
      render: (u) => qty(u.cantidad_ventas),
    },
    {
      key: 'total',
      header: 'Total vendido',
      mobileLabel: 'Total vendido',
      align: 'right',
      render: (u) => money(u.total_vendido),
    },
  ]), []);

  return (
    <div className={`stats-main ${compact ? 'compact' : ''}`}>
      <div className="stats-toolbar">
        {verEmpresa && (
          <div className="stats-tabs">
            <AppButton
              type="button"
              className={`stats-tab-btn ${ownerTab === 'empresa' ? 'active' : ''}`}
              onClick={() => setOwnerTab('empresa')}
            >
              Empresa
            </AppButton>
            <AppButton
              type="button"
              className={`stats-tab-btn ${ownerTab === 'personal' ? 'active' : ''}`}
              onClick={() => setOwnerTab('personal')}
            >
              Personal
            </AppButton>
          </div>
        )}
          <div className="stats-filters">
            {verPorUsuario && (
              <AppSelect
                className="stats-user-select"
                value={ownerUsuarioId}
                onChange={(e) => {
                  const nextUserId = e.target.value;
                  setOwnerUsuarioId(nextUserId);
                  setOwnerTab('personal');
                  loadStats(desde, hasta, nextUserId);
                }}
                disabled={loading}
              >
                <option value="">Mi usuario</option>
                {usuariosFiltro.map((u) => (
                  <option key={u.id} value={u.id}>{u.label}</option>
                ))}
              </AppSelect>
            )}
            <div className="stats-quick-ranges">
            {[
              { key: 'yesterday', label: 'Ayer', get: getYesterdayRange },
              { key: 'last-week', label: 'Semana pasada', get: getLastWeekRange },
              { key: 'last-month', label: 'Mes anterior', get: getLastMonthRange },
              { key: 'today', label: 'Hoy', get: getTodayRange },
              { key: 'month', label: 'Este mes', get: getThisMonthRange },
              { key: '7', label: '7 días', get: () => getQuickRange(7) },
              { key: '30', label: '30 días', get: () => getQuickRange(30) },
              { key: '90', label: '90 días', get: () => getQuickRange(90) },
            ].map((preset) => (
              <AppButton
                key={preset.key}
                type="button"
                className={`quick-range-btn ${quickRange === preset.key ? 'active' : ''}`}
                onClick={() => {
                  const nextRange = preset.get();
                  setQuickRange(preset.key);
                  setDesde(nextRange.desde);
                  setHasta(nextRange.hasta);
                  loadStats(nextRange.desde, nextRange.hasta, ownerUsuarioId);
                }}
                disabled={loading}
              >
                {preset.label}
              </AppButton>
            ))}
          </div>
          <AppInput
            type="date"
            value={desde}
            onChange={(e) => {
              setQuickRange('custom');
              setDesde(e.target.value);
            }}
          />
          <AppInput
            type="date"
            value={hasta}
            onChange={(e) => {
              setQuickRange('custom');
              setHasta(e.target.value);
            }}
          />
          <AppButton
            type="button"
            className="stats-refresh-btn"
            onClick={() => {
              loadStats(desde, hasta, ownerUsuarioId);
            }}
            disabled={loading}
          >
            {loading ? 'Actualizando...' : 'Filtrar'}
          </AppButton>
          <AppButton
            type="button"
            className="stats-refresh-btn secondary"
            onClick={() => {
              setQuickRange('');
              setDesde('');
              setHasta('');
              loadStats('', '', ownerUsuarioId);
            }}
            disabled={loading}
          >
            Limpiar
          </AppButton>
        </div>
      </div>
      <p className="stats-range-pill">{rangeLabel(stats?.desde || desde, stats?.hasta || hasta)}</p>
      {showPersonal && verPorUsuario && usuarioFiltroNombre && (
        <p className="stats-range-pill">Estadísticas personales de: {usuarioFiltroNombre}</p>
      )}

      {loading && <div className="stats-msg">Cargando estadísticas...</div>}
      {!loading && error && <div className="stats-msg error">{error}</div>}

      {!loading && !error && (
        <>
          <section className="stats-grid">
            <article className="stats-card">
              <span className="stats-kicker">Mejor cliente</span>
              <h4>{(showPersonal ? personalStats?.mejorCliente?.nombre : stats?.mejorCliente?.nombre) || '-'}</h4>
              <p>Total comprado: <strong>{money(showPersonal ? personalStats?.mejorCliente?.total_comprado || 0 : stats?.mejorCliente?.total_comprado || 0)}</strong></p>
              <p>Ventas: <strong>{qty(showPersonal ? personalStats?.mejorCliente?.cantidad_ventas || 0 : stats?.mejorCliente?.cantidad_ventas || 0)}</strong></p>
            </article>

            <article className="stats-card">
              <span className="stats-kicker">Mayor venta</span>
              <h4>{money(showPersonal ? personalStats?.mayorVenta?.total || 0 : stats?.mayorVenta?.total || 0)}</h4>
              <p>Cliente: <strong>{(showPersonal ? personalStats?.mayorVenta?.cliente_nombre : stats?.mayorVenta?.cliente_nombre) || '-'}</strong></p>
              <p>Fecha: <strong>{dateText(showPersonal ? personalStats?.mayorVenta?.fecha : stats?.mayorVenta?.fecha)}</strong></p>
            </article>

            <article className="stats-card">
              <span className="stats-kicker">Promedio de venta</span>
              <h4>{money(showPersonal ? personalStats?.promedioVenta?.promedio || 0 : stats?.promedioVenta?.promedio || 0)}</h4>
              <p>Sobre <strong>{qty(showPersonal ? personalStats?.promedioVenta?.cantidad_ventas || 0 : stats?.promedioVenta?.cantidad_ventas || 0)}</strong> ventas</p>
            </article>

            <article className="stats-card">
              <span className="stats-kicker">Ventas totales</span>
              <h4 className="stats-big-number">{money(showPersonal ? personalStats?.promedioVenta?.ventas_totales || 0 : stats?.promedioVenta?.ventas_totales || 0)}</h4>
            </article>

            {showEmpresa && (
              <>
                <article className="stats-card">
                  <span className="stats-kicker">Cantidad ventas empresa</span>
                  <h4 className="stats-big-number">{qty(stats?.promedioVenta?.cantidad_ventas || 0)}</h4>
                </article>

                <article className={`stats-card ${(stats?.ganancia || 0) >= 0 ? 'gain-positive' : 'gain-negative'}`}>
                  <span className="stats-kicker">Ganancia</span>
                  <h4 className="stats-big-number">{money(stats?.ganancia || 0)}</h4>
                </article>
              </>
            )}

            <article className="stats-card">
              <span className="stats-kicker">Artículo más vendido</span>
              <h4>{(showPersonal ? personalStats?.articuloMasVendido?.nombre : stats?.articuloMasVendido?.nombre) || '-'}</h4>
              <p>Unidades: <strong>{qty(showPersonal ? personalStats?.articuloMasVendido?.unidades || 0 : stats?.articuloMasVendido?.unidades || 0)}</strong></p>
              <p>Total facturado: <strong>{money(showPersonal ? personalStats?.articuloMasVendido?.total_facturado || 0 : stats?.articuloMasVendido?.total_facturado || 0)}</strong></p>
            </article>

            {showPersonal && (
              <>
                <article className="stats-card">
                  <span className="stats-kicker">Días sin vender</span>
                  <h4>{personalStats?.diasSinVender == null ? '-' : qty(personalStats?.diasSinVender)}</h4>
                  <p>Desde tu última venta registrada</p>
                </article>

                <article className="stats-card">
                  <span className="stats-kicker">Mejor día de la semana</span>
                  <h4>{personalStats?.mejorDiaSemana?.dia || '-'}</h4>
                  <p>Total vendido: <strong>{money(personalStats?.mejorDiaSemana?.total_vendido || 0)}</strong></p>
                  <p>Ventas: <strong>{qty(personalStats?.mejorDiaSemana?.cantidad_ventas || 0)}</strong></p>
                </article>

                <article className="stats-card">
                  <span className="stats-kicker">Horario donde más vendes</span>
                  <h4>{personalStats?.mejorHorario?.rango || '-'}</h4>
                  <p>Total vendido: <strong>{money(personalStats?.mejorHorario?.total_vendido || 0)}</strong></p>
                  <p>Ventas: <strong>{qty(personalStats?.mejorHorario?.cantidad_ventas || 0)}</strong></p>
                </article>

                <article className="stats-card">
                  <span className="stats-kicker">Ventas por período</span>
                  <p>Día: <strong>{money(personalStats?.ventasPeriodo?.dia || 0)}</strong></p>
                  <p>Semana: <strong>{money(personalStats?.ventasPeriodo?.semana || 0)}</strong></p>
                  <p>Mes: <strong>{money(personalStats?.ventasPeriodo?.mes || 0)}</strong></p>
                </article>

                <article className="stats-card">
                  <span className="stats-kicker">Crecimiento vs período anterior</span>
                  <p>Día: <strong>{pct(personalStats?.crecimientoPeriodo?.dia || 0)}</strong></p>
                  <p>Semana: <strong>{pct(personalStats?.crecimientoPeriodo?.semana || 0)}</strong></p>
                  <p>Mes: <strong>{pct(personalStats?.crecimientoPeriodo?.mes || 0)}</strong></p>
                </article>
              </>
            )}

            {showEmpresa && (
              <>
                <article className="stats-card">
                  <span className="stats-kicker">Ventas por usuario (top)</span>
                  <h4>{topUsuario?.usuario_nombre || '-'}</h4>
                  <p>Total vendido: <strong>{money(topUsuario?.total_vendido || 0)}</strong></p>
                  <p>Cantidad de ventas: <strong>{qty(topUsuario?.cantidad_ventas || 0)}</strong></p>
                </article>
              </>
            )}
          </section>

          {showEmpresa && (
            <>
              <section className="stats-table-card chart-card stock-cost-card stock-cost-card-wide">
                <div className="stats-table-head stock-card-head">
                  <h4>Costo total de stock (histórico)</h4>
                  <div className="stock-chart-filters">
                    <div className="stats-quick-ranges">
                      {[
                        { key: 'yesterday-compare', label: 'Ayer vs hoy', get: getYesterdayVsTodayRange },
                        { key: 'month-compare', label: 'Mes pasado vs este', get: getLastMonthVsCurrentRange },
                        { key: 'year-12', label: 'Año pasado (12 meses)', get: getLast12MonthsRange },
                      ].map((preset) => (
                        <AppButton
                          key={preset.key}
                          type="button"
                          className={`quick-range-btn ${stockQuickRange === preset.key ? 'active' : ''}`}
                          onClick={() => {
                            const nextRange = preset.get();
                            setStockQuickRange(preset.key);
                            setStockDesde(nextRange.desde);
                            setStockHasta(nextRange.hasta);
                            loadStockSerie(nextRange.desde, nextRange.hasta);
                          }}
                          disabled={stockLoading}
                        >
                          {preset.label}
                        </AppButton>
                      ))}
                    </div>
                    <AppInput
                      type="date"
                      value={stockDesde}
                      onChange={(e) => {
                        setStockQuickRange('custom');
                        setStockDesde(e.target.value);
                      }}
                    />
                    <AppInput
                      type="date"
                      value={stockHasta}
                      onChange={(e) => {
                        setStockQuickRange('custom');
                        setStockHasta(e.target.value);
                      }}
                    />
                    <AppButton
                      type="button"
                      className="stats-refresh-btn"
                      onClick={() => loadStockSerie(stockDesde, stockHasta)}
                      disabled={stockLoading}
                    >
                      {stockLoading ? 'Actualizando...' : 'Filtrar'}
                    </AppButton>
                    <AppButton
                      type="button"
                      className="stats-refresh-btn secondary"
                      onClick={() => {
                        const resetRange = getLastMonthVsCurrentRange();
                        setStockQuickRange('month-compare');
                        setStockDesde(resetRange.desde);
                        setStockHasta(resetRange.hasta);
                        loadStockSerie(resetRange.desde, resetRange.hasta);
                      }}
                      disabled={stockLoading}
                    >
                      Reiniciar
                    </AppButton>
                    <AppButton
                      type="button"
                      className="stats-refresh-btn secondary chart-export-btn"
                      onClick={exportarGraficaStockExcel}
                      disabled={!puedeExportar || stockLoading || !stockChartWithVariation.length}
                    >
                      <FaFileExcel aria-hidden="true" />
                      <span>Excel</span>
                    </AppButton>
                    <AppButton
                      type="button"
                      className="stats-refresh-btn secondary chart-export-btn"
                      onClick={exportarGraficaStockPng}
                      disabled={!puedeExportar || stockLoading || !stockChartWithVariation.length}
                    >
                      <BsFiletypePng aria-hidden="true" />
                      <span>PNG</span>
                    </AppButton>
                  </div>
                </div>
                <p className="stats-chart-range">{rangeLabel(stockSerieRange.desde, stockSerieRange.hasta)}</p>
                <p className="stats-chart-range">
                  Vista: {stockGranularity === 'day' ? 'día a día' : 'mes a mes'}
                </p>
                {stockLoading && <div className="stats-msg">Cargando gráfico...</div>}
                {!stockLoading && stockError && <div className="stats-msg error">{stockError}</div>}
                {!stockLoading && !stockError && stockChartWithVariation.length ? (
                  <div ref={stockChartSvgRef}>
                    <MiniLineChart
                      items={stockChartWithVariation}
                      valueKey="value"
                      valueFormatter={(v) => moneyFull(v)}
                      className="stock-line-chart"
                    />
                  </div>
                ) : null}
                {!stockLoading && !stockError && !stockChartWithVariation.length && (
                  <div className="stats-msg">Sin datos para mostrar.</div>
                )}
              </section>

              <section className="stats-charts-grid stats-charts-grid-single">
                <article className="stats-table-card chart-card">
                  <div className="stats-table-head stock-card-head">
                    <h4>Mini gráfico: ventas por usuario</h4>
                    <div className="chart-export-actions">
                      <AppButton
                        type="button"
                        className="stats-refresh-btn secondary chart-export-btn"
                        onClick={exportarGraficaVentasUsuarioExcel}
                        disabled={!puedeExportar || stockLoading || !ventasUsuarioStockChart.length}
                      >
                        <FaFileExcel aria-hidden="true" />
                        <span>Excel</span>
                      </AppButton>
                      <AppButton
                        type="button"
                        className="stats-refresh-btn secondary chart-export-btn"
                        onClick={exportarGraficaVentasUsuarioPng}
                        disabled={!puedeExportar || stockLoading || !ventasUsuarioStockChart.length}
                      >
                        <BsFiletypePng aria-hidden="true" />
                        <span>PNG</span>
                      </AppButton>
                    </div>
                  </div>
                  {ventasUsuarioStockChart.length ? (
                    <div ref={ventasUsuarioChartSvgRef}>
                      <MiniLineChart items={ventasUsuarioStockChart} valueKey="value" valueFormatter={(v) => moneyFull(v)} />
                    </div>
                  ) : (
                    <div className="stats-msg">Sin datos para mostrar.</div>
                  )}
                </article>

              </section>

              <section className="stats-table-card">
                <div className="stats-table-head">
                  <h4>Detalle de ventas por usuario</h4>
                </div>
                <AppTable
                  stickyHeader
                  columns={ventasUsuarioColumns}
                  rows={stats?.ventasPorUsuario || []}
                  rowKey={(u) => `${u.usuario_id || 'na'}-${u.usuario_nombre}`}
                  emptyMessage="Aún no hay ventas registradas."
                />
              </section>
            </>
          )}

          {showPersonal && (
            <section className="stats-charts-grid stats-charts-grid-single">
              <article className="stats-table-card chart-card">
                <div className="stats-table-head">
                  <h4>Ventas de los últimos 7 días</h4>
                </div>
                {ventasUltimos7DiasChart.length ? (
                  <MiniBars items={ventasUltimos7DiasChart} valueKey="value" />
                ) : (
                  <div className="stats-msg">Sin datos para mostrar.</div>
                )}
              </article>
            </section>
          )}
        </>
      )}
    </div>
  );
}


