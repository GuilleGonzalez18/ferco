import { useEffect, useState } from 'react';
import Productos from './Productos';
import Ventas from './Ventas';
import VentasHistorial from './VentasHistorial';
import Clientes from './Clientes';
import Auditoria from './Auditoria';
import Usuarios from './Usuarios';
import Estadisticas from './Estadisticas';
import './Dashboard.css';
import { api } from './api';

const OPCIONES = [
  { key: 'nueva-venta', label: 'Nueva venta', icon: '/newsale.svg' },
  { key: 'ventas', label: 'Ventas', icon: '/cart.svg' },
  { key: 'productos', label: 'Productos', icon: '/product.svg' },
  { key: 'clientes', label: 'Clientes', icon: '/client.svg' },
  { key: 'usuarios', label: 'Usuarios', icon: '/user.svg' },
  { key: 'auditoria', label: 'Auditoría', icon: '/auditory.svg' },
  { key: 'compras', label: 'Compras', icon: '/buy.svg' },
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

export default function Dashboard({ user, pantalla, productos, setProductos, onNavigate, onLogout }) {
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [resumen, setResumen] = useState(null);
  const nombreUsuario = user?.nombre || user?.username || user?.email || 'Usuario';
  const esPropietario = String(user?.tipo || '').toLowerCase() === 'propietario';
  const opcionesMenu = OPCIONES.filter((op) => (op.key === 'usuarios' ? esPropietario : true));

  const handleNavigate = (seccion) => {
    onNavigate(seccion);
    setMenuMovilAbierto(false);
  };

  const handleLogout = () => {
    setMenuMovilAbierto(false);
    onLogout();
  };

  useEffect(() => {
    const loadResumen = async () => {
      try {
        const data = await api.getDashboardResumen();
        setResumen(data);
      } catch {
        setResumen(null);
      }
    };
    loadResumen();
  }, [user?.id, user?.tipo]);

  const money = (value) =>
    `$${Number(value || 0).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const count = (value) => Number(value || 0).toLocaleString('es-UY');
  const avgCount = (value) => Number(value || 0).toFixed(1);

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
      case 'productos':    return <Productos productos={productos} setProductos={setProductos} />;
      case 'clientes':     return <Clientes />;
      case 'usuarios':     return <Usuarios currentUser={user} />;
      case 'auditoria':    return <Auditoria />;
      case 'compras':      return <Placeholder titulo="Compras" icon="◌" />;
      case 'estadisticas': return <Estadisticas />;
      default:             return <DashboardLanding nombreUsuario={nombreUsuario} />;
    }
  };

  const tituloActual = OPCIONES.find(o => o.key === pantalla)?.label ?? 'Dashboard';

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
              <img src={icon} alt="" className="nav-icon-img" aria-hidden="true" />
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
        <div className={`dashboard-body ${resumen ? 'with-kpis' : ''}`}>
          {resumen && (
            <section
              className="dashboard-kpis-strip"
              style={{ gridTemplateColumns: `repeat(${cardsResumen.length}, minmax(0, 1fr))` }}
            >
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
