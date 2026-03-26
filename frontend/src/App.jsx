
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

  useEffect(() => {
    const loadProductos = async () => {
      try {
        const rows = await api.getProductos();
        setProductos(rows.map(fromApiProducto));
      } catch (error) {
        console.error('Error cargando productos', error);
      }
    };
    loadProductos();
  }, []);

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
        setUser(null);
        setPantalla('');
      }}
    />
  );
}

export default App
