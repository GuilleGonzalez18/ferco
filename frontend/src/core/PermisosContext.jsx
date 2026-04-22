import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';

const PermisosContext = createContext({ can: () => false, loading: true, reload: () => {} });

/**
 * Permisos por defecto cuando no hay nada cargado de la BD.
 * Propietario tiene todo, vendedor tiene acceso básico.
 */
const DEFAULTS_PROPIETARIO = { '*': true };

const DEFAULTS_VENDEDOR = {
  'nueva-venta:usar': true,
  'ventas:ver': true,
  'productos:ver': true,
  'clientes:ver': true,
  'estadisticas:ver': true,
};

function buildMap(permisos) {
  const map = {};
  for (const { recurso, accion, habilitado } of permisos) {
    map[`${recurso}:${accion}`] = !!habilitado;
  }
  return map;
}

export function PermisosProvider({ children, userTipo }) {
  const [permisos, setPermisos] = useState(null);
  const [loading, setLoading] = useState(true);

  const tipo = String(userTipo || '').toLowerCase().trim();
  const esPropietario = tipo === 'propietario' || tipo === 'admin';

  const loadPermisos = useCallback(async () => {
    if (!userTipo) { setLoading(false); return; }
    setLoading(true);
    try {
      const rows = await api.getPermisos(tipo);
      setPermisos(buildMap(rows));
    } catch {
      setPermisos(null);
    } finally {
      setLoading(false);
    }
  }, [tipo, userTipo]);

  useEffect(() => { loadPermisos(); }, [loadPermisos]);

  const can = useCallback((recurso, accion) => {
    if (esPropietario && !permisos) return true; // fallback: propietario tiene todo
    if (!permisos) {
      // fallback offline
      if (esPropietario) return true;
      return !!(DEFAULTS_VENDEDOR[`${recurso}:${accion}`]);
    }
    return !!(permisos[`${recurso}:${accion}`]);
  }, [permisos, esPropietario]);

  const value = useMemo(() => ({ can, loading, reload: loadPermisos, esPropietario }), [can, loading, loadPermisos, esPropietario]);
  return <PermisosContext.Provider value={value}>{children}</PermisosContext.Provider>;
}

export function usePermisos() {
  return useContext(PermisosContext);
}
