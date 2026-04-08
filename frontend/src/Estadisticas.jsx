import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import './Estadisticas.css';
import AppTable from './AppTable';

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

export default function Estadisticas({ compact = false }) {
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
  const [stockSerieRange, setStockSerieRange] = useState({ desde: '', hasta: '' });
  const [ownerTab, setOwnerTab] = useState('empresa');
  const [ownerUsuarioId, setOwnerUsuarioId] = useState('');
  const [ownerSelfUsuarioId, setOwnerSelfUsuarioId] = useState(0);
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
      const data = await api.getStockCostoSerie(nextDesde, nextHasta);
      const serie = Array.isArray(data?.serie) ? data.serie : [];
      setStockSerie(serie.map((row) => ({
        fecha: String(row.fecha || '').slice(0, 10),
        total: Math.round(Number(row.total_costo || 0)),
      })));
      setStockSerieRange({
        desde: String(data?.desde || nextDesde || ''),
        hasta: String(data?.hasta || nextHasta || ''),
      });
    } catch {
      setStockSerie([]);
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
  }, []);

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

  const ventasUsuarioChart = useMemo(() => {
    const rows = (stats?.ventasPorUsuario || []).slice(0, 8);
    return rows.map((u, idx) => ({
      key: `${u.usuario_id || idx}-${u.usuario_nombre}`,
      label: u.usuario_nombre || 'N/A',
      value: Math.round(Number(u.total_vendido || 0)),
    }));
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
  }, [stats]);

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
        <h3>Estadísticas comerciales</h3>
        {esPropietario && (
          <div className="stats-tabs">
            <button
              type="button"
              className={`stats-tab-btn ${ownerTab === 'empresa' ? 'active' : ''}`}
              onClick={() => setOwnerTab('empresa')}
            >
              Empresa
            </button>
            <button
              type="button"
              className={`stats-tab-btn ${ownerTab === 'personal' ? 'active' : ''}`}
              onClick={() => setOwnerTab('personal')}
            >
              Personal
            </button>
          </div>
        )}
          <div className="stats-filters">
            {esPropietario && (
              <select
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
              </select>
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
              <button
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
              </button>
            ))}
          </div>
          <input
            type="date"
            value={desde}
            onChange={(e) => {
              setQuickRange('custom');
              setDesde(e.target.value);
            }}
          />
          <input
            type="date"
            value={hasta}
            onChange={(e) => {
              setQuickRange('custom');
              setHasta(e.target.value);
            }}
          />
          <button
            type="button"
            className="stats-refresh-btn"
            onClick={() => {
              loadStats(desde, hasta, ownerUsuarioId);
            }}
            disabled={loading}
          >
            {loading ? 'Actualizando...' : 'Filtrar'}
          </button>
          <button
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
          </button>
        </div>
      </div>
      <p className="stats-range-pill">{rangeLabel(stats?.desde || desde, stats?.hasta || hasta)}</p>
      {showPersonal && esPropietario && usuarioFiltroNombre && (
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
                        <button
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
                        </button>
                      ))}
                    </div>
                    <input
                      type="date"
                      value={stockDesde}
                      onChange={(e) => {
                        setStockQuickRange('custom');
                        setStockDesde(e.target.value);
                      }}
                    />
                    <input
                      type="date"
                      value={stockHasta}
                      onChange={(e) => {
                        setStockQuickRange('custom');
                        setStockHasta(e.target.value);
                      }}
                    />
                    <button
                      type="button"
                      className="stats-refresh-btn"
                      onClick={() => loadStockSerie(stockDesde, stockHasta)}
                      disabled={stockLoading}
                    >
                      {stockLoading ? 'Actualizando...' : 'Filtrar'}
                    </button>
                    <button
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
                    </button>
                  </div>
                </div>
                <p className="stats-chart-range">{rangeLabel(stockSerieRange.desde, stockSerieRange.hasta)}</p>
                <p className="stats-chart-range">
                  Vista: {stockGranularity === 'day' ? 'día a día' : 'mes a mes'}
                </p>
                {stockLoading && <div className="stats-msg">Cargando gráfico...</div>}
                {!stockLoading && stockError && <div className="stats-msg error">{stockError}</div>}
                {!stockLoading && !stockError && stockChartWithVariation.length ? (
                  <MiniBars
                    items={stockChartWithVariation}
                    valueKey="value"
                    showValues
                    valueFormatter={(v) => moneyFull(v)}
                    className="stock-bars stock-bars-variant"
                  />
                ) : null}
                {!stockLoading && !stockError && !stockChartWithVariation.length && (
                  <div className="stats-msg">Sin datos para mostrar.</div>
                )}
              </section>

              <section className="stats-charts-grid">
                <article className="stats-table-card chart-card">
                  <div className="stats-table-head">
                    <h4>Mini gráfico: ventas por usuario</h4>
                  </div>
                  {ventasUsuarioChart.length ? (
                    <MiniBars items={ventasUsuarioChart} valueKey="value" />
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
                  className="stats-table-unified"
                  tableClassName="stats-table-grid"
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
