import { useState } from 'react';
import Productos from './Productos';
import Ventas from './Ventas';
import './Dashboard.css';

const OPCIONES = [
  { key: 'ventas', label: 'Ventas', icon: '/cart.svg' },
  { key: 'productos', label: 'Productos', icon: '/product.svg' },
  { key: 'clientes', label: 'Clientes', icon: '/client.svg' },
  { key: 'usuarios', label: 'Usuarios', icon: '/user.svg' },
  { key: 'compras', label: 'Compras', icon: '/cart.svg' },
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

export default function Dashboard({ user, pantalla, productos, setProductos, onNavigate, onLogout }) {
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

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
      case 'productos':    return <Productos productos={productos} setProductos={setProductos} />;
      case 'ventas':       return <Ventas user={user} productos={productos} setProductos={setProductos} />;
      case 'clientes':     return <Placeholder titulo="Clientes" icon="◎" />;
      case 'usuarios':     return <Placeholder titulo="Usuarios" icon="◉" />;
      case 'compras':      return <Placeholder titulo="Compras" icon="◌" />;
      case 'estadisticas': return <Placeholder titulo="Estadísticas" icon="▦" />;
      default:             return <Placeholder titulo="Bienvenido" icon="◈" />;
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
          <span className="welcome-label">Bienvenido</span>
          <span className="welcome-email">{user?.email || 'Usuario'}</span>
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
