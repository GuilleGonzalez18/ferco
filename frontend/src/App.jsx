
import { useEffect, useState } from 'react';
import Login from './features/auth/Login';
import Dashboard from './features/dashboard/Dashboard';
import SetupWizard from './features/setup/SetupWizard';
import AppDialogHost from './shared/components/dialog/AppDialogHost';
import CambiarPasswordModal from './shared/components/auth/CambiarPasswordModal';
import './App.css';
import { api } from './core/api';
import { fromApiProducto } from './shared/lib/productMapper';
import { ConfigProvider, useConfig } from './core/ConfigContext';
import { PermisosProvider } from './core/PermisosContext';

// Componente interno con acceso al ConfigContext
function AppShell({ user, onLogout }) {
  const { empresa, loading } = useConfig();
  const [wizardCompleto, setWizardCompleto] = useState(false);
  const [pantalla, setPantalla] = useState('');
  const [productos, setProductos] = useState([]);
  const [productosError, setProductosError] = useState('');

  const esPropietario =
    user?.rol_nombre === 'propietario' || user?.tipo === 'propietario' || user?.tipo === 'admin';

  // Empresa sin configurar: flag configurado === false en la BD
  const empresaSinConfigurar =
    !loading &&
    esPropietario &&
    !wizardCompleto &&
    empresa.configurado === false;

  useEffect(() => {
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
    const onStockRefresh = () => loadProductos();
    loadProductos();
    window.addEventListener('ferco:stock-refresh', onStockRefresh);
    return () => window.removeEventListener('ferco:stock-refresh', onStockRefresh);
  }, []);

  if (loading) return null;

  if (empresaSinConfigurar) {
    return <SetupWizard onComplete={() => setWizardCompleto(true)} />;
  }

  return (
    <PermisosProvider userTipo={user?.tipo} userRolId={user?.rol_id} userRolNombre={user?.rol_nombre}>
      {productosError && (
        <div className="app-global-alert app-global-alert-error" role="alert">
          {productosError}
        </div>
      )}
      <div className="app-shell">
        <Dashboard
          user={user}
          pantalla={pantalla}
          productos={productos}
          setProductos={setProductos}
          onNavigate={setPantalla}
          onLogout={onLogout}
        />
      </div>
    </PermisosProvider>
  );
}

function App() {
  const [user, setUser] = useState(null);
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
    const onUserUpdated = (event) => {
      const updated = event?.detail;
      if (!updated?.id) return;
      setUser((prev) => (prev && Number(prev.id) === Number(updated.id) ? { ...prev, ...updated } : prev));
    };
    window.addEventListener('ferco:user-updated', onUserUpdated);
    return () => window.removeEventListener('ferco:user-updated', onUserUpdated);
  }, []);

  const handleLogout = () => {
    api.clearAuthToken();
    setUser(null);
  };

  const handlePasswordChanged = () => {
    setUser((prev) => prev ? { ...prev, debe_cambiar_password: false } : prev);
  };

  return (
    <ConfigProvider>
      <AppDialogHost />
      {authReady && (
        !user ? (
          <Login onLogin={setUser} />
        ) : (
          <>
            {user.debe_cambiar_password && (
              <CambiarPasswordModal onSuccess={handlePasswordChanged} />
            )}
            {!user.debe_cambiar_password && (
              <AppShell user={user} onLogout={handleLogout} />
            )}
          </>
        )
      )}
    </ConfigProvider>
  );
}

export default App;
