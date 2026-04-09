const APP_DIALOG_EVENT = 'ferco:app-dialog';

let nextDialogId = 1;
const pendingResolvers = new Map();

function ensureWindow() {
  if (typeof window === 'undefined') {
    throw new Error('Dialog system is only available in the browser.');
  }
}

function openDialog(type, message, options = {}) {
  ensureWindow();
  return new Promise((resolve) => {
    const id = nextDialogId++;
    pendingResolvers.set(id, resolve);
    window.dispatchEvent(new CustomEvent(APP_DIALOG_EVENT, {
      detail: {
        id,
        type,
        title: options.title || (type === 'confirm' ? 'Confirmar acción' : 'Aviso'),
        message: String(message || ''),
        confirmText: options.confirmText || 'Aceptar',
        cancelText: options.cancelText || 'Cancelar',
      },
    }));
  });
}

export function appAlert(message, options = {}) {
  return openDialog('alert', message, options);
}

export function appConfirm(message, options = {}) {
  return openDialog('confirm', message, options);
}

export function resolveAppDialog(id, result) {
  const resolve = pendingResolvers.get(id);
  if (!resolve) return;
  pendingResolvers.delete(id);
  resolve(Boolean(result));
}

export function subscribeAppDialogs(handler) {
  ensureWindow();
  const listener = (event) => handler(event.detail);
  window.addEventListener(APP_DIALOG_EVENT, listener);
  return () => window.removeEventListener(APP_DIALOG_EVENT, listener);
}

