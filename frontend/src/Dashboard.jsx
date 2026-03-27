import { useState } from 'react';
import Productos from './Productos';
import Ventas from './Ventas';
import VentasHistorial from './VentasHistorial';
import Clientes from './Clientes';
import Auditoria from './Auditoria';
import Usuarios from './Usuarios';
import Estadisticas from './Estadisticas';
import './Dashboard.css';

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
        <div className="landing-hint-grid">
          <div className="landing-hint-item">
            <img src="/newsale.svg" alt="" aria-hidden="true" />
            <span>Nueva venta</span>
          </div>
          <div className="landing-hint-item">
            <img src="/cart.svg" alt="" aria-hidden="true" />
            <span>Ventas</span>
          </div>
          <div className="landing-hint-item">
            <img src="/product.svg" alt="" aria-hidden="true" />
            <span>Productos</span>
          </div>
          <div className="landing-hint-item">
            <img src="/client.svg" alt="" aria-hidden="true" />
            <span>Clientes</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ user, pantalla, productos, setProductos, onNavigate, onLogout }) {
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const nombreUsuario = user?.nombre || user?.username || user?.email || 'Usuario';

  const handleNavigate = (seccion) => {
    onNavigate(seccion);
    setMenuMovilAbierto(false);
  };

  const handleLogout = () => {
    setMenuMovilAbierto(false);
    onLogout();
  };

  const renderContent = () => {
    switch (pantalla) {
      case 'nueva-venta':  return <Ventas user={user} productos={productos} setProductos={setProductos} />;
      case 'ventas':       return <VentasHistorial />;
      case 'productos':    return <Productos productos={productos} setProductos={setProductos} />;
      case 'clientes':     return <Clientes />;
      case 'usuarios':     return <Usuarios />;
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
          <img src="/images/logo2.png" alt="Logo" className="dashboard-logo" />
        </div>
        <div className="dashboard-welcome">
          <span className="welcome-label">Bienvenido, {nombreUsuario}!</span>
        </div>
        <nav className="dashboard-nav">
          {OPCIONES.map(({ key, label, icon }) => (
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
        <div className="dashboard-body">{renderContent()}</div>
      </main>
    </div>
  );
}
