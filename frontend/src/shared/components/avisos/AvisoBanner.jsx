import { useEffect, useState } from 'react';
import './AvisoBanner.css';

const AVISOS_URL = import.meta.env.VITE_AVISOS_URL;
const POLL_INTERVAL = 60_000;

function getDismissed() {
  const dismissed = new Set();
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith('aviso_dismissed_')) {
      dismissed.add(key.replace('aviso_dismissed_', ''));
    }
  }
  return dismissed;
}

function useAvisos(appName) {
  const [avisos, setAvisos] = useState([]);

  useEffect(() => {
    if (!AVISOS_URL) return;

    let cancelled = false;

    const fetchAvisos = async () => {
      try {
        const res = await fetch(`${AVISOS_URL}/api/avisos/activos?app=${appName}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setAvisos(data);
      } catch {
        // fallo silencioso — microservicio caído no afecta la app
      }
    };

    fetchAvisos();
    const interval = setInterval(fetchAvisos, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [appName]);

  return avisos;
}

export default function AvisoBanner({ app }) {
  const avisos = useAvisos(app);
  const [dismissed, setDismissed] = useState(getDismissed);

  if (!avisos.length) return null;

  const visibles = avisos.filter((a) => !dismissed.has(String(a.id)));
  if (!visibles.length) return null;

  const dismiss = (id) => {
    sessionStorage.setItem(`aviso_dismissed_${id}`, '1');
    setDismissed((prev) => new Set([...prev, String(id)]));
  };

  return (
    <div className="avisos-container">
      {visibles.map((aviso) => (
        <div key={aviso.id} className={`aviso-banner aviso-${aviso.tipo ?? 'info'}`}>
          <span className="aviso-mensaje">{aviso.mensaje}</span>
          <button
            type="button"
            className="aviso-close"
            onClick={() => dismiss(aviso.id)}
            aria-label="Cerrar aviso"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
