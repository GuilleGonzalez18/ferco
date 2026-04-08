import { useState } from 'react';
import './Login.css';
import { api } from './api';
import { APP_VERSION } from './version';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Completa todos los campos');
      return;
    }
    try {
      setError('');
      setMessage('');
      const { user, token } = await api.login(email, password);
      api.setAuthToken(token);
      onLogin?.({
        ...user,
        email: user.correo || user.username || email,
        tipo: user.tipo || 'vendedor',
      });
    } catch {
      setError('Credenciales inválidas');
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      setForgotError('Ingresa tu correo para recuperar contraseña');
      return;
    }
    try {
      setForgotError('');
      setForgotMessage('');
      await api.forgotPassword(forgotEmail);
      setMessage('Código enviado correctamente. Revisa tu correo e ingrésalo para restablecer la contraseña.');
      setEmail(forgotEmail);
      setPassword('');
      setMode('reset');
      setForgotModalOpen(false);
    } catch (e) {
      setForgotError(e.message || 'No se pudo iniciar recuperación');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      setError('Completa código y nueva contraseña');
      return;
    }
    try {
      setError('');
      setMessage('');
      await api.resetPassword(resetToken, newPassword);
      setMessage('Contraseña actualizada. Ahora puedes iniciar sesión.');
      setMode('login');
      setResetToken('');
      setNewPassword('');
      setPassword('');
    } catch (e) {
      setError(e.message || 'No se pudo restablecer la contraseña');
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
        {mode === 'login' && (
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        )}
        {mode === 'reset' && (
          <>
            <input
              type="text"
                placeholder="Código de 6 dígitos"
                value={resetToken}
                onChange={e => setResetToken(e.target.value)}
              />
            <input
              type="password"
              placeholder="Nueva contraseña (mínimo 8)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </>
        )}
        {error && <div className="error">{error}</div>}
        {message && <div className="ok-message">{message}</div>}
        {mode === 'login' ? (
          <>
            <button type="submit">Entrar</button>
            <button
              type="button"
              className="login-link-btn"
              onClick={() => {
                setForgotEmail(email || '');
                setForgotError('');
                setForgotMessage('');
                setForgotModalOpen(true);
                setError('');
                setMessage('');
              }}
            >
              Olvidé mi contraseña
            </button>
            <small className="app-version-label">v. {APP_VERSION}</small>
          </>
        ) : (
          <>
            <button type="button" onClick={handleResetPassword}>Restablecer contraseña</button>
            <button
              type="button"
              className="login-link-btn"
              onClick={() => {
                setMode('login');
                setPassword('');
              }}
            >
              Volver a iniciar sesión
            </button>
          </>
        )}
      </form>

      {forgotModalOpen && (
        <div className="login-forgot-overlay" role="dialog" aria-modal="true">
          <div className="login-forgot-backdrop" onClick={() => setForgotModalOpen(false)} />
          <div className="login-forgot-modal">
            <h4>Recuperar contraseña</h4>
            <p>Ingrese su correo electronico para enviar</p>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />
            {forgotError && <div className="error">{forgotError}</div>}
            {forgotMessage && <div className="ok-message">{forgotMessage}</div>}
            <div className="login-forgot-actions">
              <button
                type="button"
                className="login-link-btn"
                onClick={() => {
                  setForgotModalOpen(false);
                  setForgotError('');
                  setForgotMessage('');
                }}
              >
                Cancelar
              </button>
              <button type="button" onClick={handleForgotPassword}>
                Enviar código
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
