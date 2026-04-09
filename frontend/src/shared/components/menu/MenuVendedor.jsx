import './MenuVendedor.css';
import AppButton from '../button/AppButton';

export default function MenuVendedor({ user, onNavigate, onLogout }) {
  return (
    <div className="menu-vendedor-container">
      <h2 className="menu-vendedor-title">Bienvenido, {user?.email || 'Usuario'}!</h2>
      <div className="menu-vendedor-buttons">
        <button type="button" onClick={() => onNavigate('ventas')}>Ventas</button>
        <button type="button" onClick={() => onNavigate('productos')}>Productos</button>
        <button type="button" onClick={() => onNavigate('clientes')}>Clientes</button>
        <button type="button" onClick={() => onNavigate('control-stock')}>Control de stock</button>
        <button type="button" onClick={() => onNavigate('estadisticas')}>Estadísticas</button>
      </div>
      <AppButton type="button" tone="danger" className="cerrar-sesion" onClick={onLogout}>Cerrar sesión</AppButton>
    </div>
  );
}
