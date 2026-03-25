import './MenuVendedor.css';

export default function MenuVendedor({ user, onNavigate, onLogout }) {
  return (
    <div className="menu-vendedor-container">
      <h2 className="menu-vendedor-title">Bienvenido, {user?.email || 'Usuario'}!</h2>
      <div className="menu-vendedor-buttons">
        <button onClick={() => onNavigate('ventas')}>Ventas</button>
        <button onClick={() => onNavigate('productos')}>Productos</button>
        <button onClick={() => onNavigate('clientes')}>Clientes</button>
        <button onClick={() => onNavigate('compras')}>Compras</button>
        <button onClick={() => onNavigate('estadisticas')}>Estadísticas</button>
      </div>
      <button className="cerrar-sesion" onClick={onLogout}>Cerrar sesión</button>
    </div>
  );
}
