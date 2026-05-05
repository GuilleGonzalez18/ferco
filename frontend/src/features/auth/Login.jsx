import { useEffect, useState } from 'react';
import './Login.css';
import { api } from '../../core/api';
import { APP_VERSION } from '../../core/version';
import AppInput from '../../shared/components/fields/AppInput';
import AppButton from '../../shared/components/button/AppButton';
import { useConfig } from '../../core/ConfigContext';

function useIsInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function InstallSection() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const installed = useIsInstalled();

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (installed) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div className="login-install-section">
      <span className="login-install-icon">📲</span>
      {deferredPrompt ? (
        <>
          <span className="login-install-text">Instalá la app para acceso rápido</span>
          <button className="login-install-btn" type="button" onClick={handleInstall}>
            Instalar
          </button>
        </>
      ) : isIos() ? (
        <span className="login-install-text">
          Tocá <strong>Compartir</strong> → <strong>Agregar a inicio</strong> para instalar la app
        </span>
      ) : (
        <span className="login-install-text">
          Para instalar la app, usá el menú del navegador → <strong>Instalar aplicación</strong>
        </span>
      )}
    </div>
  );
}

export default function Login({ onLogin }) {
  const { empresa } = useConfig();
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
          {empresa.logo_base64 ? (
            <img src={empresa.logo_base64} alt={empresa.nombre || 'Logo'} className="login-logo" />
          ) : (
            <img src="/mercatus-logo.png" alt="Mercatus" className="login-logo" />
          )}
          <h2>Iniciar sesión</h2>
        <AppInput
          id="login-email"
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        {mode === 'login' && (
          <AppInput
            id="login-password"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        )}
        {mode === 'reset' && (
          <>
            <AppInput
              id="reset-token"
              type="text"
              placeholder="Código de 6 dígitos"
              value={resetToken}
              onChange={e => setResetToken(e.target.value)}
            />
            <AppInput
              id="reset-password"
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
            <AppButton type="submit">Entrar</AppButton>
            <AppButton
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
            </AppButton>
            <small className="app-version-label">{APP_VERSION}</small>
            <InstallSection />
            <div className="login-brand-watermark">
              <span className="login-brand-name">
                <img src="/favicon.png" alt="" className="login-brand-icon" aria-hidden="true" />
                Mercatus
              </span>
              <span className="login-brand-copy">© 2025 RPG Software. Todos los derechos reservados.</span>
            </div>
          </>
        ) : (
          <>
            <AppButton type="button" onClick={handleResetPassword}>Restablecer contraseña</AppButton>
            <AppButton
              type="button"
              className="login-link-btn"
              onClick={() => {
                setMode('login');
                setPassword('');
              }}
            >
              Volver a iniciar sesión
            </AppButton>
          </>
        )}
      </form>

      {forgotModalOpen && (
        <div className="login-forgot-overlay" role="dialog" aria-modal="true">
          <div className="login-forgot-backdrop" onClick={() => setForgotModalOpen(false)} />
          <div className="login-forgot-modal">
            <h4>Recuperar contraseña</h4>
            <p>Ingrese su correo electronico para enviar</p>
            <AppInput
              type="email"
              placeholder="Correo electrónico"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />
            {forgotError && <div className="error">{forgotError}</div>}
            {forgotMessage && <div className="ok-message">{forgotMessage}</div>}
            <div className="login-forgot-actions">
              <AppButton
                type="button"
                className="login-link-btn"
                onClick={() => {
                  setForgotModalOpen(false);
                  setForgotError('');
                  setForgotMessage('');
                }}
              >
                Cancelar
              </AppButton>
              <AppButton type="button" onClick={handleForgotPassword}>
                Enviar código
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


