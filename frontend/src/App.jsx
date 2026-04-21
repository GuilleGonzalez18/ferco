
import { useEffect, useState } from 'react';
import Login from './features/auth/Login';
import Dashboard from './features/dashboard/Dashboard';
import AppDialogHost from './shared/components/dialog/AppDialogHost';
import './App.css';
import { api } from './core/api';
import { fromApiProducto } from './shared/lib/productMapper';
import { ConfigProvider } from './core/ConfigContext';

function App() {
  const [user, setUser] = useState(null);
  const [pantalla, setPantalla] = useState('');
  const [productos, setProductos] = useState([]);
  const [productosError, setProductosError] = useState('');
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      const token = api.getAuthToken();
      if (!token) { setAuthReady(true); return; }
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
    const onStockRefresh = () => { loadProductos(); };
    loadProductos();
    window.addEventListener('ferco:stock-refresh', onStockRefresh);
    return () => window.removeEventListener('ferco:stock-refresh', onStockRefresh);
  }, [authReady]);

  useEffect(() => {
    const onUserUpdated = (event) => {
      const updated = event?.detail;
      if (!updated?.id) return;
      setUser((prev) => (prev && Number(prev.id) === Number(updated.id) ? { ...prev, ...updated } : prev));
    };
    window.addEventListener('ferco:user-updated', onUserUpdated);
    return () => window.removeEventListener('ferco:user-updated', onUserUpdated);
  }, []);

  return (
    <ConfigProvider>
      <AppDialogHost />
      {productosError && (
        <div className="app-global-alert app-global-alert-error" role="alert">
          {productosError}
        </div>
      )}
      {authReady && (
        !user ? (
          <Login onLogin={setUser} />
        ) : (
          <div className="app-shell">
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
          </div>
        )
      )}
    </ConfigProvider>
  );
}

export default App;
