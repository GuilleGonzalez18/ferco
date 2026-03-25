import { useState } from 'react';
import './Login.css';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Completa todos los campos');
      return;
    }
    setError('');
    onLogin?.({ email });
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
