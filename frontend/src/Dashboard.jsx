import { useState } from 'react';
import Productos from './Productos';
import './Dashboard.css';

const OPCIONES = [
  { key: 'ventas',       label: 'Ventas',        icon: '🛒' },
  { key: 'productos',    label: 'Productos',     icon: '📦' },
  { key: 'clientes',     label: 'Clientes',      icon: '👥' },
  { key: 'compras',      label: 'Compras',       icon: '🏪' },
  { key: 'estadisticas', label: 'Estadísticas',  icon: '📊' },
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

export default function Dashboard({ user, pantalla, onNavigate, onLogout }) {
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
      case 'productos':    return <Productos />;
      case 'ventas':       return <Placeholder titulo="Ventas" icon="🛒" />;
      case 'clientes':     return <Placeholder titulo="Clientes" icon="👥" />;
      case 'compras':      return <Placeholder titulo="Compras" icon="🏪" />;
      case 'estadisticas': return <Placeholder titulo="Estadísticas" icon="📊" />;
      default:             return <Placeholder titulo="Bienvenido" icon="👋" />;
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
              <span className="nav-icon">{icon}</span>
              {label}
            </button>
          ))}
        </nav>
        <button type="button" className="dashboard-logout" onClick={handleLogout}>
          🔒 Cerrar sesión
        </button>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-topbar">{tituloActual}</div>
        <div className="dashboard-body">{renderContent()}</div>
      </main>
    </div>
  );
}
