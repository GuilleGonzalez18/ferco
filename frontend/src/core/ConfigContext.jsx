import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { getPdfConfig } from '../shared/lib/pdfConfigDefaults';

const DEFAULTS = {
  nombre: '',
  logo_base64: null,
  color_primary: '#cc2222',
  color_primary_strong: '#8f0e0e',
  color_primary_soft: '#fce8e8',
  color_menu_bg: '#3d1a08',
  color_menu_active: '#cc2222',
  color_text: '#1d2b3e',
  color_text_muted: '#526278',
  color_menu_text: '#f5e6e6',
  color_logout_bg: '#d32f2f',
  fondo_base64: null,
  fondo_opacidad: 0.06,
  logo_tamano: 200,
  logo_bg_color: '#ffffff',
  configurado: false,
};

const ConfigContext = createContext({
  empresa: DEFAULTS,
  modulos: [],
  loading: true,
  reloadConfig: () => {},
  applyPreview: () => {},
  cancelPreview: () => {},
  pdfFacturaConfig: null,
  pdfRemitoConfig: null,
});

// eslint-disable-next-line react-refresh/only-export-components
export function applyColors(empresa) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', empresa.color_primary || DEFAULTS.color_primary);
  root.style.setProperty('--color-primary-strong', empresa.color_primary_strong || DEFAULTS.color_primary_strong);
  root.style.setProperty('--color-primary-soft', empresa.color_primary_soft || DEFAULTS.color_primary_soft);
  root.style.setProperty('--menu-bg', empresa.color_menu_bg || DEFAULTS.color_menu_bg);
  root.style.setProperty('--menu-hover', empresa.color_menu_bg || DEFAULTS.color_menu_bg);
  root.style.setProperty('--menu-active', empresa.color_menu_active || DEFAULTS.color_menu_active);
  root.style.setProperty('--field-focus-border', empresa.color_primary || DEFAULTS.color_primary);
  // Focus ring: color primario con 18% de opacidad
  const primaryHex = (empresa.color_primary || DEFAULTS.color_primary).replace('#', '');
  const pr = parseInt(primaryHex.substring(0, 2), 16);
  const pg = parseInt(primaryHex.substring(2, 4), 16);
  const pb = parseInt(primaryHex.substring(4, 6), 16);
  root.style.setProperty('--field-focus-ring', `rgba(${pr}, ${pg}, ${pb}, 0.22)`);
  root.style.setProperty('--color-text', empresa.color_text || DEFAULTS.color_text);
  root.style.setProperty('--color-text-muted', empresa.color_text_muted || DEFAULTS.color_text_muted);
  root.style.setProperty('--menu-text', empresa.color_menu_text || DEFAULTS.color_menu_text);
  root.style.setProperty('--logout-bg', empresa.color_logout_bg || DEFAULTS.color_logout_bg);
  root.style.setProperty('--dashboard-bg-opacity', String(empresa.fondo_opacidad ?? DEFAULTS.fondo_opacidad));
  root.style.setProperty('--logo-max-width', `${empresa.logo_tamano ?? DEFAULTS.logo_tamano}px`);
  root.style.setProperty('--logo-bg', empresa.logo_bg_color || DEFAULTS.logo_bg_color);
  // '__none__' = usuario eligió sin fondo; null = nunca configurado = logo Mercatus por defecto
  const fondoVal = empresa.fondo_base64;
  const bgImage = (fondoVal === '__none__' || fondoVal === '')
    ? 'none'
    : fondoVal
      ? `url(${fondoVal})`
      : "url('/mercatus-logo.png')";
  root.style.setProperty('--dashboard-bg-image', bgImage);
  root.style.setProperty(
    '--dashboard-bg-size',
    (fondoVal && fondoVal !== '__none__' && fondoVal !== '') ? 'cover' : 'contain'
  );
  document.title = empresa.nombre ? `${empresa.nombre} | Mercatus` : 'Mercatus';
  // Actualizar meta application-name para reflejar la empresa sin tocar el manifest
  // (modificar el link[rel=manifest] rompe la instalabilidad PWA en Chromium)
  let metaAppName = document.querySelector('meta[name="application-name"]');
  if (!metaAppName) {
    metaAppName = document.createElement('meta');
    metaAppName.name = 'application-name';
    document.head.appendChild(metaAppName);
  }
  metaAppName.content = empresa.nombre || 'Mercatus';
}

export function ConfigProvider({ children }) {
  const [empresa, setEmpresa] = useState(DEFAULTS);
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    try {
      const [emp, mods] = await Promise.all([
        api.getConfigEmpresa(),
        api.getConfigModulos(),
      ]);
      const merged = { ...DEFAULTS, ...emp };
      setEmpresa(merged);
      setModulos(mods || []);
      applyColors(merged);
    } catch {
      // use defaults silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Apply a preview of visual settings without saving
  const applyPreview = useCallback((partialConfig) => {
    applyColors({ ...empresa, ...partialConfig });
  }, [empresa]);

  // Restore saved settings (discard preview)
  const cancelPreview = useCallback(() => {
    applyColors(empresa);
  }, [empresa]);

  const value = useMemo(
    () => ({
      empresa,
      modulos,
      loading,
      reloadConfig: loadConfig,
      applyPreview,
      cancelPreview,
      pdfFacturaConfig: getPdfConfig('factura', empresa.pdf_factura),
      pdfRemitoConfig: getPdfConfig('remito', empresa.pdf_remito),
    }),
    [empresa, modulos, loading, loadConfig, applyPreview, cancelPreview]
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfig() {
  return useContext(ConfigContext);
}

