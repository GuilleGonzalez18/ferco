import { useCallback, useEffect, useMemo, useState } from 'react';
import Productos from '../productos/Productos';
import Ventas from '../ventas/Ventas';
import VentasHistorial from '../ventas/VentasHistorial';
import Clientes from '../clientes/Clientes';
import Auditoria from '../auditoria/Auditoria';
import Usuarios from '../usuarios/Usuarios';
import Estadisticas from '../estadisticas/Estadisticas';
import ControlStock from '../stock/ControlStock';
import './Dashboard.css';
import { api } from '../../core/api';
import { CgArrowsExchange } from 'react-icons/cg';
import { FiShoppingCart } from 'react-icons/fi';
import { APP_VERSION } from '../../core/version';
import AppButton from '../../shared/components/button/AppButton';

const OPCIONES = [
  { key: 'nueva-venta', label: 'Nueva venta', topbarTitle: 'Nueva venta', icon: '/newsale.svg' },
  { key: 'ventas', label: 'Ventas', topbarTitle: 'Ventas realizadas', icon: '/cart.svg' },
  { key: 'productos', label: 'Productos', topbarTitle: 'Lista de productos', icon: '/product.svg' },
  { key: 'clientes', label: 'Clientes', topbarTitle: 'Lista de clientes', icon: '/client.svg' },
  { key: 'usuarios', label: 'Usuarios', topbarTitle: 'Usuarios del sistema', icon: '/user.svg' },
  { key: 'mi-usuario', label: 'Mi usuario', topbarTitle: 'Mi usuario', icon: '/user.svg' },
  { key: 'auditoria', label: 'Auditoría', topbarTitle: 'Auditoría y movimientos de stock', icon: '/auditory.svg' },
  { key: 'control-stock', label: 'Control de stock', topbarTitle: 'Control de stock', icon: 'stock-control' },
  { key: 'estadisticas', label: 'Estadísticas', topbarTitle: 'Estadísticas comerciales', icon: '/stats.svg' },
];

function Placeholder({ titulo, icon }) {
  return (
    <div className="dashboard-placeholder">
      <span className="placeholder-icon">{icon}</span>
      <h2>{titulo}</h2>
      <p>Sección en construcción.</p>
    </div>
  );
}

function MiUsuarioView({ user }) {
  return (
    <div className="mi-usuario-split">
      <section className="mi-usuario-col mi-usuario-col-stats">
        <Estadisticas compact />
      </section>
      <section className="mi-usuario-col mi-usuario-col-form">
        <Usuarios currentUser={user} onlySelf />
      </section>
    </div>
  );
}

export default function Dashboard({ user, pantalla, productos, setProductos, onNavigate, onLogout }) {
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [ventasCarritoAbierto, setVentasCarritoAbierto] = useState(false);
  const [resumen, setResumen] = useState(null);
  const esPropietario = String(user?.tipo || '').toLowerCase() === 'propietario';
  const opcionesMenu = OPCIONES.filter((op) => {
    if (op.key === 'usuarios' || op.key === 'control-stock') return esPropietario;
    if (op.key === 'mi-usuario') return !esPropietario;
    if (op.key === 'estadisticas') return esPropietario;
    return true;
  });

  const handleNavigate = (seccion) => {
    onNavigate(seccion);
    setMenuMovilAbierto(false);
    setVentasCarritoAbierto(false);
  };

  const closeVentasCarritoDrawer = useCallback(() => {
    setVentasCarritoAbierto(false);
  }, []);

  const handleLogout = () => {
    setMenuMovilAbierto(false);
    setVentasCarritoAbierto(false);
    onLogout();
  };

  useEffect(() => {
    document.body.classList.add('dashboard-scroll-lock');
    return () => document.body.classList.remove('dashboard-scroll-lock');
  }, []);

  useEffect(() => {
    const onNavigateEvent = (event) => {
      const target = event?.detail;
      if (typeof target !== 'string') return;
      onNavigate(target);
      setMenuMovilAbierto(false);
      setVentasCarritoAbierto(false);
    };
    window.addEventListener('ferco:navigate', onNavigateEvent);
    return () => window.removeEventListener('ferco:navigate', onNavigateEvent);
  }, [onNavigate]);

  useEffect(() => {
    const loadResumen = async () => {
      try {
        const data = await api.getDashboardResumen();
        setResumen(data);
      } catch {
        setResumen(null);
      }
    };
    const onStatsRefresh = () => {
      loadResumen();
    };

    loadResumen();
    window.addEventListener('ferco:stats-refresh', onStatsRefresh);
    return () => window.removeEventListener('ferco:stats-refresh', onStatsRefresh);
  }, [user?.id, user?.tipo]);

  const money = (value) => {
    const rounded = Math.round(Number(value || 0));
    return `$${rounded.toLocaleString('es-UY', { maximumFractionDigits: 0 })}`;
  };
  const count = (value) => Number(value || 0).toLocaleString('es-UY');
  const avgCount = (value) => Math.round(Number(value || 0)).toLocaleString('es-UY');

  const cardsResumen = esPropietario
    ? [
        { key: 'ventasHoy', label: 'Ventas hoy', value: money(resumen?.ventasHoy), tone: 'sales-green', icon: '/dollar.svg' },
        { key: 'ventasMes', label: 'Ventas mes', value: money(resumen?.ventasMes), tone: 'sales-green', icon: '/dollar.svg' },
        { key: 'cantidadVentasHoy', label: 'Cantidad ventas hoy', value: count(resumen?.cantidadVentasHoy), icon: '/cart.svg' },
        { key: 'cantidadVentasMes', label: 'Cantidad ventas este mes', value: count(resumen?.cantidadVentasMes), icon: '/cart.svg' },
        { key: 'promedioVentasMensual', label: 'Promedio ventas al mes', value: avgCount(resumen?.promedioVentasMensual), icon: '/average.svg' },
        { key: 'gananciaHoy', label: 'Ganancia hoy', value: money(resumen?.gananciaHoy), icon: '/dollar.svg' },
        { key: 'gananciaTotalEmpresa', label: 'Ganancia total empresa', value: money(resumen?.gananciaTotalEmpresa), icon: '/dollar.svg' },
      ]
    : [
        { key: 'ventasHoy', label: 'Tus ventas hoy', value: money(resumen?.ventasHoy), tone: 'sales-green', icon: '/dollar.svg' },
        { key: 'ventasMes', label: 'Tus ventas este mes', value: money(resumen?.ventasMes), tone: 'sales-green', icon: '/dollar.svg' },
        { key: 'cantidadVentasHoy', label: 'Cantidad ventas hoy', value: count(resumen?.cantidadVentasHoy), icon: '/cart.svg' },
        { key: 'cantidadVentasMes', label: 'Cantidad ventas este mes', value: count(resumen?.cantidadVentasMes), icon: '/cart.svg' },
        { key: 'promedioVentasMensual', label: 'Promedio ventas al mes', value: avgCount(resumen?.promedioVentasMensual), icon: '/average.svg' },
      ];

  const tituloActual = OPCIONES.find((o) => o.key === pantalla)?.topbarTitle ?? 'Dashboard';
  const esPantallaDashboard = !pantalla;
  const contenidoPantalla = useMemo(
    () => {
      switch (pantalla) {
        case 'nueva-venta':
          return (
            <Ventas
              user={user}
              productos={productos}
              setProductos={setProductos}
              carritoDrawerOpen={ventasCarritoAbierto}
              onToggleCarritoDrawer={() => setVentasCarritoAbierto((prev) => !prev)}
              onCloseCarritoDrawer={closeVentasCarritoDrawer}
            />
          );
        case 'ventas':       return <VentasHistorial />;
        case 'productos':    return <Productos user={user} productos={productos} setProductos={setProductos} />;
        case 'clientes':     return <Clientes />;
        case 'usuarios':     return <Usuarios currentUser={user} />;
        case 'mi-usuario':   return <MiUsuarioView user={user} />;
        case 'auditoria':    return <Auditoria />;
        case 'control-stock':
          return esPropietario
            ? <ControlStock productos={productos} setProductos={setProductos} />
            : <Placeholder titulo="Acceso restringido" icon="X" />;
        case 'estadisticas': return <Estadisticas />;
        default:             return null;
      }
    },
    [
      pantalla,
      user,
      productos,
      setProductos,
      esPropietario,
      ventasCarritoAbierto,
      closeVentasCarritoDrawer,
    ]
  );

  return (
    <div className="dashboard-layout">
      <button
        type="button"
        className={`dashboard-mobile-fab ${menuMovilAbierto ? 'is-open' : ''}`}
        onClick={() => setMenuMovilAbierto((prev) => !prev)}
        aria-label={menuMovilAbierto ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={menuMovilAbierto}
      >
        {menuMovilAbierto ? '✕' : '☰'}
      </button>
      <div
        className={`dashboard-mobile-backdrop ${menuMovilAbierto ? 'visible' : ''}`}
        onClick={() => setMenuMovilAbierto(false)}
        aria-hidden="true"
      />
      <aside className={`dashboard-sidebar ${menuMovilAbierto ? 'mobile-open' : ''}`}>
        <div className="dashboard-logo-wrap">
          <button
            type="button"
            className="dashboard-logo-btn"
            onClick={() => handleNavigate('')}
            title="Ir al dashboard"
            aria-label="Ir al dashboard"
          >
            <img src="/images/logo2.png" alt="Logo" className="dashboard-logo" />
          </button>
        </div>
        <nav className="dashboard-nav">
          {opcionesMenu.map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              className={pantalla === key ? 'active' : ''}
              onClick={() => handleNavigate(key)}
            >
              {icon === 'stock-control'
                ? <CgArrowsExchange className="nav-icon-svg" aria-hidden="true" />
                : <img src={icon} alt="" className="nav-icon-img" aria-hidden="true" />}
              {label}
            </button>
          ))}
        </nav>
        <AppButton type="button" tone="danger" className="dashboard-logout" onClick={handleLogout}>
          <img src="/logout.svg" alt="" className="logout-icon-img" aria-hidden="true" />
          Cerrar sesión
        </AppButton>
        <small className="dashboard-version-label">v. {APP_VERSION}</small>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-topbar">
          <div className="dashboard-topbar-content">
            <span className="dashboard-topbar-title">{tituloActual}</span>
            <div className="dashboard-topbar-actions">
              {pantalla === 'nueva-venta' && (
                <button
                  type="button"
                  className={`dashboard-topbar-action ventas-carrito-btn ${ventasCarritoAbierto ? 'active' : ''}`}
                  onClick={() => setVentasCarritoAbierto((prev) => !prev)}
                  aria-label={ventasCarritoAbierto ? 'Cerrar carrito' : 'Abrir carrito'}
                  aria-expanded={ventasCarritoAbierto}
                >
                  <FiShoppingCart aria-hidden="true" />
                  <span>Carrito</span>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className={`dashboard-body ${resumen && esPantallaDashboard ? 'with-kpis' : ''}`}>
          {resumen && esPantallaDashboard && (
            <section className="dashboard-kpis-strip">
              {cardsResumen.map((card, idx) => (
                <article
                  key={card.key}
                  className={`dashboard-kpi-card ${card.tone || ''}`}
                  style={{
                    animationDelay: `${idx * 140}ms`,
                    '--icon-delay': `${idx * 140 + 120}ms`,
                  }}
                >
                  <div className="dashboard-kpi-icon-wrap" aria-hidden="true">
                    <img src={card.icon} alt="" className="dashboard-kpi-icon" />
                  </div>
                  <div className="dashboard-kpi-content">
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                  </div>
                </article>
              ))}
            </section>
          )}
          {contenidoPantalla}
        </div>
      </main>
    </div>
  );
}
