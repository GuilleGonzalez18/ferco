import { useState } from 'react';
import './Login.css';
import { api } from './api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Completa todos los campos');
      return;
    }
    try {
      setError('');
      const { user, token } = await api.login(email, password);
      api.setAuthToken(token);
      onLogin?.({
        ...user,
        email: user.correo || user.username || email,
        tipo: 'vendedor',
      });
    } catch {
      setError('Credenciales inválidas');
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
          <img
            src="/images/logo2.png"
            alt="Logo de la empresa"
            className="login-logo"
          />
          <h2>Iniciar sesión</h2>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {error && <div className="error">{error}</div>}
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}
