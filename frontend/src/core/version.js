const EMBEDDED_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';

export const APP_VERSION = EMBEDDED_VERSION || import.meta.env.VITE_APP_VERSION || '0.0.0';

