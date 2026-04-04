import { useEffect, useState } from 'react';
import Productos from './Productos';
import Ventas from './Ventas';
import VentasHistorial from './VentasHistorial';
import Clientes from './Clientes';
import Auditoria from './Auditoria';
import Usuarios from './Usuarios';
import Estadisticas from './Estadisticas';
import ControlStock from './ControlStock';
import './Dashboard.css';
import { api } from './api';
import { CgArrowsExchange } from 'react-icons/cg';

const OPCIONES = [
  { key: 'nueva-venta', label: 'Nueva venta', icon: '/newsale.svg' },
  { key: 'ventas', label: 'Ventas', icon: '/cart.svg' },
  { key: 'productos', label: 'Productos', icon: '/product.svg' },
  { key: 'clientes', label: 'Clientes', icon: '/client.svg' },
  { key: 'usuarios', label: 'Usuarios', icon: '/user.svg' },
  { key: 'mi-usuario', label: 'Mi usuario', icon: '/user.svg' },
  { key: 'auditoria', label: 'Auditoría', icon: '/auditory.svg' },
  { key: 'control-stock', label: 'Control de stock', icon: 'stock-control' },
  { key: 'estadisticas', label: 'Estadísticas', icon: '/stats.svg' },
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

function DashboardLanding({ nombreUsuario }) {
  return (
    <div className="dashboard-landing">
      <div className="landing-card">
        <h2>Bienvenido, {nombreUsuario}</h2>
        <p>Selecciona una opción del menú izquierdo para comenzar.</p>
      </div>
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
  const [resumen, setResumen] = useState(null);
  const nombreUsuario = user?.nombre || user?.username || user?.email || 'Usuario';
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
  };

  const handleLogout = () => {
    setMenuMovilAbierto(false);
    onLogout();
  };

  useEffect(() => {
    const onNavigateEvent = (event) => {
      const target = event?.detail;
      if (typeof target !== 'string') return;
      onNavigate(target);
      setMenuMovilAbierto(false);
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

  const renderContent = () => {
    switch (pantalla) {
      case 'nueva-venta':  return <Ventas user={user} productos={productos} setProductos={setProductos} />;
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
      default:             return <DashboardLanding nombreUsuario={nombreUsuario} />;
    }
  };

  const tituloActual = OPCIONES.find(o => o.key === pantalla)?.label ?? '';
  const esPantallaDashboard = !pantalla;

  return (
    <div className="dashboard-layout">
      <aside className={`dashboard-sidebar ${menuMovilAbierto ? 'mobile-open' : ''}`}>
        <div className="dashboard-logo-wrap">
          <button
            type="button"
            className="dashboard-mobile-toggle"
            onClick={() => setMenuMovilAbierto((prev) => !prev)}
          >
            {menuMovilAbierto ? '✕' : '☰'}
          </button>
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
        <div className="dashboard-welcome">
          <span className="welcome-label">Bienvenido, {nombreUsuario}!</span>
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
        <button type="button" className="dashboard-logout" onClick={handleLogout}>
          <img src="/logout.svg" alt="" className="logout-icon-img" aria-hidden="true" />
          Cerrar sesión
        </button>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-topbar">{tituloActual}</div>
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
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
