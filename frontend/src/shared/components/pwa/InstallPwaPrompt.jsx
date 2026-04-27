import { useEffect, useState } from 'react';
import './InstallPwaPrompt.css';

const DISMISSED_KEY = 'pwa_install_dismissed';

export default function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="install-pwa-banner">
      <div className="install-pwa-content">
        <span className="install-pwa-icon">📲</span>
        <span className="install-pwa-text">Instalá Mercatus como app para acceso rápido</span>
      </div>
      <div className="install-pwa-actions">
        <button className="install-pwa-btn" onClick={handleInstall}>Instalar</button>
        <button className="install-pwa-dismiss" onClick={handleDismiss} aria-label="Cerrar">✕</button>
      </div>
    </div>
  );
}
