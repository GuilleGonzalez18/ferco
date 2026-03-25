
import { useState } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [pantalla, setPantalla] = useState('ventas');

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <Dashboard
      user={user}
      pantalla={pantalla}
      onNavigate={setPantalla}
      onLogout={() => {
        setUser(null);
        setPantalla('ventas');
      }}
    />
  );
}

export default App
