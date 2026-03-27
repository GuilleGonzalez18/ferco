
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
  const [productosError, setProductosError] = useState('');
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
        setProductosError('');
      } catch (error) {
        console.error('Error cargando productos', error);
        setProductosError(error.message || 'No se pudieron cargar productos.');
      }
    };
    loadProductos();
  }, [authReady]);

  if (!authReady) return null;

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <>
      {productosError ? (
        <div style={{ margin: '0.7rem 1rem', padding: '0.55rem 0.7rem', border: '1px solid #f4c7c3', background: '#fff5f4', color: '#b42318', borderRadius: '8px', fontSize: '0.82rem' }}>
          {productosError}
        </div>
      ) : null}
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
    </>
  );
}

export default App
