import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import './Estadisticas.css';

function money(value) {
  const n = Number(value || 0);
  return n.toLocaleString('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 2 });
}

function qty(value) {
  const n = Number(value || 0);
  return n.toLocaleString('es-UY');
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

function rangeLabel(desde, hasta) {
  if (desde && hasta) return `Mostrando del ${desde} al ${hasta}`;
  if (desde) return `Mostrando desde ${desde}`;
  if (hasta) return `Mostrando hasta ${hasta}`;
  return 'Mostrando todo el período disponible';
}

function formatMedioPago(value) {
  const v = String(value || 'efectivo').toLowerCase();
  if (v === 'credito') return 'Crédito';
  if (v === 'debito') return 'Débito';
  if (v === 'transferencia') return 'Transferencia';
  return 'Efectivo';
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

function MiniBars({ items, valueKey = 'value' }) {
  const max = Math.max(...items.map((it) => Number(it[valueKey] || 0)), 1);
  return (
    <div
      className="mini-bars"
      style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(46px, 64px))` }}
    >
      {items.map((item) => {
        const value = Number(item[valueKey] || 0);
        const height = value <= 0 ? '0%' : `${Math.max(8, (value / max) * 100)}%`;
        return (
          <div key={item.key} className="mini-bar-col" title={`${item.label}: ${value.toLocaleString('es-UY')}`}>
            <div className="mini-bar-track">
              <div className="mini-bar" style={{ height }} />
            </div>
            <span className="mini-bar-label">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Estadisticas() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [quickRange, setQuickRange] = useState('');

  const loadStats = async (nextDesde = desde, nextHasta = hasta) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getEstadisticasResumen(nextDesde, nextHasta);
      setStats(data);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las estadísticas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const topUsuario = useMemo(() => {
    const rows = stats?.ventasPorUsuario || [];
    return rows.length ? rows[0] : null;
  }, [stats]);

  const ventasUsuarioChart = useMemo(() => {
    const rows = (stats?.ventasPorUsuario || []).slice(0, 8);
    return rows.map((u, idx) => ({
      key: `${u.usuario_id || idx}-${u.usuario_nombre}`,
      label: u.usuario_nombre || 'N/A',
      value: Number(u.total_vendido || 0),
    }));
  }, [stats]);

  const ventasComprasChart = useMemo(() => {
    const ventasMap = new Map((stats?.ventasSerie || []).map((r) => [String(r.fecha).slice(0, 10), Number(r.total || 0)]));
    const comprasMap = new Map((stats?.comprasSerie || []).map((r) => [String(r.fecha).slice(0, 10), Number(r.total || 0)]));
    const allFechas = [...new Set([...ventasMap.keys(), ...comprasMap.keys()])].sort();
    const last = allFechas.slice(-7);
    return last.map((f) => ({
      key: f,
      label: f.slice(5),
      ventas: ventasMap.get(f) || 0,
      compras: comprasMap.get(f) || 0,
    }));
  }, [stats]);

  const maxVentasComprasChart = useMemo(
    () => Math.max(...ventasComprasChart.flatMap((r) => [r.ventas, r.compras]), 1),
    [ventasComprasChart]
  );

  return (
    <div className="stats-main">
      <div className="stats-toolbar">
        <h3>Estadísticas comerciales</h3>
        <div className="stats-filters">
          <div className="stats-quick-ranges">
            {[
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
                  loadStats(nextRange.desde, nextRange.hasta);
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
          <button type="button" className="stats-refresh-btn" onClick={() => loadStats(desde, hasta)} disabled={loading}>
            {loading ? 'Actualizando...' : 'Filtrar'}
          </button>
          <button
            type="button"
            className="stats-refresh-btn secondary"
            onClick={() => {
              setQuickRange('');
              setDesde('');
              setHasta('');
              loadStats('', '');
            }}
            disabled={loading}
          >
            Limpiar
          </button>
        </div>
      </div>
      <p className="stats-range-pill">{rangeLabel(stats?.desde || desde, stats?.hasta || hasta)}</p>

      {loading && <div className="stats-msg">Cargando estadísticas...</div>}
      {!loading && error && <div className="stats-msg error">{error}</div>}

      {!loading && !error && (
        <>
          <section className="stats-grid">
            <article className="stats-card">
              <span className="stats-kicker">Mejor cliente</span>
              <h4>{stats?.mejorCliente?.nombre || '-'}</h4>
              <p>Total comprado: <strong>{money(stats?.mejorCliente?.total_comprado || 0)}</strong></p>
              <p>Ventas: <strong>{qty(stats?.mejorCliente?.cantidad_ventas || 0)}</strong></p>
            </article>

            <article className="stats-card">
              <span className="stats-kicker">Mayor venta</span>
              <h4>{money(stats?.mayorVenta?.total || 0)}</h4>
              <p>Cliente: <strong>{stats?.mayorVenta?.cliente_nombre || '-'}</strong></p>
              <p>Fecha: <strong>{dateText(stats?.mayorVenta?.fecha)}</strong></p>
            </article>

            <article className="stats-card">
              <span className="stats-kicker">Promedio de venta</span>
              <h4>{money(stats?.promedioVenta?.promedio || 0)}</h4>
              <p>Sobre <strong>{qty(stats?.promedioVenta?.cantidad_ventas || 0)}</strong> ventas</p>
            </article>

            <article className="stats-card">
              <span className="stats-kicker">Ventas totales</span>
              <h4 className="stats-big-number">{money(stats?.promedioVenta?.ventas_totales || 0)}</h4>
            </article>

            <article className="stats-card">
              <span className="stats-kicker">Compras totales</span>
              <h4 className="stats-big-number">{money(stats?.comprasTotales || 0)}</h4>
            </article>

            <article className={`stats-card ${(stats?.ganancia || 0) >= 0 ? 'gain-positive' : 'gain-negative'}`}>
              <span className="stats-kicker">Ganancia</span>
              <h4 className="stats-big-number">{money(stats?.ganancia || 0)}</h4>
            </article>

            <article className="stats-card">
              <span className="stats-kicker">Artículo más vendido</span>
              <h4>{stats?.articuloMasVendido?.nombre || '-'}</h4>
              <p>Unidades: <strong>{qty(stats?.articuloMasVendido?.unidades || 0)}</strong></p>
              <p>Total facturado: <strong>{money(stats?.articuloMasVendido?.total_facturado || 0)}</strong></p>
            </article>

            <article className="stats-card">
              <span className="stats-kicker">Ventas por usuario (top)</span>
              <h4>{topUsuario?.usuario_nombre || '-'}</h4>
              <p>Total vendido: <strong>{money(topUsuario?.total_vendido || 0)}</strong></p>
              <p>Cantidad de ventas: <strong>{qty(topUsuario?.cantidad_ventas || 0)}</strong></p>
            </article>

            <article className="stats-card">
              <span className="stats-kicker">Medio de pago más usado</span>
              <h4>{formatMedioPago(stats?.medioPagoMasUsado?.medio_pago)}</h4>
              <p>Usos: <strong>{qty(stats?.medioPagoMasUsado?.cantidad || 0)}</strong></p>
              <p>Monto: <strong>{money(stats?.medioPagoMasUsado?.total || 0)}</strong></p>
            </article>
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

            <article className="stats-table-card chart-card">
              <div className="stats-table-head">
                <h4>Mini gráfico: ventas vs compras (por fecha)</h4>
              </div>
              <div className="mini-legend">
                <span><i className="dot ventas" />Ventas</span>
                <span><i className="dot compras" />Compras</span>
              </div>
              <div className="mini-double-bars">
                {ventasComprasChart.length === 0 && <div className="stats-msg">Sin datos para mostrar.</div>}
                {ventasComprasChart.map((row) => {
                  const hVentas = row.ventas <= 0 ? '0%' : `${Math.max(8, (row.ventas / maxVentasComprasChart) * 100)}%`;
                  const hCompras = row.compras <= 0 ? '0%' : `${Math.max(8, (row.compras / maxVentasComprasChart) * 100)}%`;
                  return (
                    <div key={row.key} className="mini-double-col" title={`${row.label} | Ventas ${row.ventas.toLocaleString('es-UY')} - Compras ${row.compras.toLocaleString('es-UY')}`}>
                      <div className="mini-double-track">
                        <div className="mini-double-pair">
                          <span className="mini-double-bar ventas" style={{ height: hVentas }} />
                          <span className="mini-double-bar compras" style={{ height: hCompras }} />
                        </div>
                      </div>
                      <span className="mini-bar-label">{row.label}</span>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>

          <section className="stats-table-card">
            <div className="stats-table-head">
              <h4>Detalle de ventas por usuario</h4>
            </div>
            <ul className="stats-table">
              <li className="header">
                <span>Usuario</span>
                <span>Ventas</span>
                <span>Total vendido</span>
              </li>
              {(stats?.ventasPorUsuario || []).length === 0 && (
                <li className="empty">Aún no hay ventas registradas.</li>
              )}
              {(stats?.ventasPorUsuario || []).map((u) => (
                <li key={`${u.usuario_id || 'na'}-${u.usuario_nombre}`}>
                  <span>{u.usuario_nombre || '-'}</span>
                  <span>{qty(u.cantidad_ventas)}</span>
                  <span>{money(u.total_vendido)}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
