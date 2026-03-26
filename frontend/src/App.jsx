
import { useEffect, useState } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import './App.css';
import { api } from './api';
import { fromApiProducto } from './productMapper';

function App() {
  const [user, setUser] = useState(null);
  const [pantalla, setPantalla] = useState('');
  const [productos, setProductos] = useState([]);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      const token = api.getAuthToken();
      if (!token) {
        setAuthReady(true);
        return;
      }
      try {
        const currentUser = await api.me();
        setUser(currentUser);
      } catch {
        api.clearAuthToken();
      } finally {
        setAuthReady(true);
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const loadProductos = async () => {
      try {
        const rows = await api.getProductos();
        setProductos(rows.map(fromApiProducto));
      } catch (error) {
        console.error('Error cargando productos', error);
      }
    };
    loadProductos();
  }, [authReady]);

  if (!authReady) return null;

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <Dashboard
      user={user}
      pantalla={pantalla}
      productos={productos}
      setProductos={setProductos}
      onNavigate={setPantalla}
      onLogout={() => {
        api.clearAuthToken();
        setUser(null);
        setPantalla('');
      }}
    />
  );
}

export default App
