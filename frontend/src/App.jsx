
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
  const [pantalla, setPantalla] = useState(() => localStorage.getItem(PANTALLA_KEY) || '');

  useEffect(() => {
    localStorage.setItem(PANTALLA_KEY, pantalla);
  }, [pantalla]);
  const [productos, setProductos] = useState([]);
  const [productosError, setProductosError] = useState('');

  const esPropietario =
    user?.rol_nombre === 'propietario' || user?.tipo === 'propietario' || user?.tipo === 'admin';

  // Empresa sin configurar: flag configurado falsy (null o false) en la BD
  const empresaSinConfigurar =
    !loading &&
    esPropietario &&
    !wizardCompleto &&
    !empresa.configurado;

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
    window.addEventListener('mercatus:stock-refresh', onStockRefresh);
    return () => window.removeEventListener('mercatus:stock-refresh', onStockRefresh);
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

const USER_KEY = 'mercatus_user';
const PANTALLA_KEY = 'mercatus_pantalla';

function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const onSessionExpired = () => {
      localStorage.removeItem(USER_KEY);
      setUser(null);
    };
    window.addEventListener('mercatus:session-expired', onSessionExpired);
    return () => window.removeEventListener('mercatus:session-expired', onSessionExpired);
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      const token = api.getAuthToken();
      if (!token) { setAuthReady(true); return; }

      // Restauración instantánea desde localStorage para evitar pantalla en blanco
      const savedUser = localStorage.getItem(USER_KEY);
      if (savedUser) {
        try { setUser(JSON.parse(savedUser)); } catch { /* ignorar */ }
      }

      try {
        const currentUser = await api.me();
        setUser(currentUser);
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      } catch {
        api.clearAuthToken();
        localStorage.removeItem(USER_KEY);
        setUser(null);
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
      setUser((prev) => {
        if (!prev || Number(prev.id) !== Number(updated.id)) return prev;
        const next = { ...prev, ...updated };
        localStorage.setItem(USER_KEY, JSON.stringify(next));
        return next;
      });
    };
    window.addEventListener('mercatus:user-updated', onUserUpdated);
    return () => window.removeEventListener('mercatus:user-updated', onUserUpdated);
  }, []);

  // Keepalive: evita que Render duerma el backend por inactividad.
  // Se ejecuta cada 10 minutos mientras haya una sesión activa.
  useEffect(() => {
    if (!user) return;
    const INTERVAL_MS = 10 * 60 * 1000;
    const ping = () => fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/health`, { method: 'GET' }).catch(() => {});
    const id = setInterval(ping, INTERVAL_MS);
    return () => clearInterval(id);
  }, [user]);

  const handleLogout = () => {
    api.clearAuthToken();
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PANTALLA_KEY);
    setUser(null);
  };

  const handleLogin = (userData) => {
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  const handlePasswordChanged = () => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, debe_cambiar_password: false };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <ConfigProvider>
      <AppDialogHost />
      {authReady && (
        !user ? (
          <Login onLogin={handleLogin} />
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
