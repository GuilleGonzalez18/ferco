import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';

const DEFAULTS = {
  nombre: 'Mi Empresa',
  logo_base64: null,
  color_primary: '#375f8c',
  color_primary_strong: '#294c74',
  color_primary_soft: '#e7effa',
  color_menu_bg: '#1f2933',
  color_menu_active: '#375f8c',
  color_text: '#1d2b3e',
  color_text_muted: '#526278',
  color_menu_text: '#e6ecf4',
  fondo_base64: null,
};

const ConfigContext = createContext({
  empresa: DEFAULTS,
  modulos: [],
  loading: true,
  reloadConfig: () => {},
});

function applyColors(empresa) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', empresa.color_primary || DEFAULTS.color_primary);
  root.style.setProperty('--color-primary-strong', empresa.color_primary_strong || DEFAULTS.color_primary_strong);
  root.style.setProperty('--color-primary-soft', empresa.color_primary_soft || DEFAULTS.color_primary_soft);
  root.style.setProperty('--menu-bg', empresa.color_menu_bg || DEFAULTS.color_menu_bg);
  root.style.setProperty('--menu-hover', empresa.color_menu_bg || DEFAULTS.color_menu_bg);
  root.style.setProperty('--menu-active', empresa.color_menu_active || DEFAULTS.color_menu_active);
  root.style.setProperty('--field-focus-border', empresa.color_primary || DEFAULTS.color_primary);
  root.style.setProperty('--color-text', empresa.color_text || DEFAULTS.color_text);
  root.style.setProperty('--color-text-muted', empresa.color_text_muted || DEFAULTS.color_text_muted);
  root.style.setProperty('--menu-text', empresa.color_menu_text || DEFAULTS.color_menu_text);
  root.style.setProperty(
    '--dashboard-bg-image',
    empresa.fondo_base64 ? `url(${empresa.fondo_base64})` : "url('/images/background.jpg')"
  );
  document.title = empresa.nombre ? `${empresa.nombre} | StockUp` : 'StockUp';
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

  const value = useMemo(
    () => ({ empresa, modulos, loading, reloadConfig: loadConfig }),
    [empresa, modulos, loading, loadConfig]
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  return useContext(ConfigContext);
}
