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

export function PermisosProvider({ children, userTipo, userRolId, userRolNombre }) {
  const [permisos, setPermisos] = useState(null);
  const [loading, setLoading] = useState(true);

  const tipo = String(userRolNombre || userTipo || '').toLowerCase().trim();
  const esPropietario = tipo === 'propietario' || tipo === 'admin';

  const loadPermisos = useCallback(async () => {
    if (!userRolId && !userTipo) { setLoading(false); return; }
    setLoading(true);
    try {
      // Preferir rolId (numérico) sobre el nombre para la consulta
      const rows = await api.getPermisos(userRolId ?? tipo);
      setPermisos(buildMap(rows));
    } catch (err) {
      // Si el servidor rechaza la sesión (401), no aplicar permisos por defecto
      if (err?.status === 401) {
        setPermisos({});
      } else {
        setPermisos(null);
      }
    } finally {
      setLoading(false);
    }
  }, [userRolId, tipo, userTipo]);

  useEffect(() => { loadPermisos(); }, [loadPermisos]);

  // Refrescar permisos cuando el admin los guarda desde Configuración
  useEffect(() => {
    window.addEventListener('mercatus:permisos-updated', loadPermisos);
    return () => window.removeEventListener('mercatus:permisos-updated', loadPermisos);
  }, [loadPermisos]);

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

// eslint-disable-next-line react-refresh/only-export-components
export function usePermisos() {
  return useContext(PermisosContext);
}
