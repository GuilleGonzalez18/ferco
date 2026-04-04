import { useEffect, useState } from 'react';
import { resolveAppDialog, subscribeAppDialogs } from './appDialog';
import './AppDialogHost.css';

export default function AppDialogHost() {
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    return subscribeAppDialogs((detail) => {
      setDialog(detail);
    });
  }, []);

  if (!dialog) return null;

  const close = (result) => {
    resolveAppDialog(dialog.id, result);
    setDialog(null);
  };

  return (
    <div className="app-dialog-overlay" role="dialog" aria-modal="true" aria-label={dialog.title}>
      <div className="app-dialog-backdrop" onClick={() => close(false)} />
      <div className="app-dialog-card">
        <h4>{dialog.title}</h4>
        <p>{dialog.message}</p>
        <div className="app-dialog-actions">
          {dialog.type === 'confirm' && (
            <button type="button" className="secundario" onClick={() => close(false)}>
              {dialog.cancelText}
            </button>
          )}
          <button type="button" onClick={() => close(true)}>
            {dialog.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

