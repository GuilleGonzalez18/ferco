import { useState } from 'react';
import { api } from '../../../core/api';
import AppInput from '../fields/AppInput';
import AppButton from '../button/AppButton';
import './CambiarPasswordModal.css';

export default function CambiarPasswordModal({ onSuccess }) {
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (passwordNueva.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (passwordNueva !== passwordConfirm) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await api.cambiarPassword({passwordNueva });
      onSuccess?.();
    } catch (err) {
      setError(err?.message || 'No se pudo cambiar la contraseña. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cambiar-pwd-overlay">
      <div className="cambiar-pwd-modal">
        <div className="cambiar-pwd-header">
          <span className="cambiar-pwd-icon">🔐</span>
          <h2 className="cambiar-pwd-title">Cambio de contraseña obligatorio</h2>
          <p className="cambiar-pwd-subtitle">
            Por seguridad, debés establecer una nueva contraseña antes de continuar.
          </p>
        </div>

        <form className="cambiar-pwd-form" onSubmit={handleSubmit}>
          <AppInput
            label="Nueva contraseña"
            type="password"
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
            placeholder="Contraseña nueva"
            required
          />
          <AppInput
            label="Confirmar nueva contraseña"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="Repetí la contraseña nueva"
            required
          />

          {error && <p className="cambiar-pwd-error">{error}</p>}

          <AppButton type="submit" disabled={loading} className="cambiar-pwd-submit">
            {loading ? 'Guardando...' : 'Cambiar contraseña'}
          </AppButton>
        </form>
      </div>
    </div>
  );
}
