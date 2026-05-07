const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const TOKEN_KEY = 'ferco_auth_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

function setToken(token) {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

async function request(path, options = {}) {
  const token = getToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('No se pudo conectar con el backend. Valide con RPG Software.');
    }
    throw error;
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {
      // keep default message
    }

    // Token expirado o revocado: limpiar sesión y notificar
    if (response.status === 401 && token) {
      setToken('');
      window.dispatchEvent(new CustomEvent('ferco:session-expired'));
    }

    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  if (response.status === 204) return null;
  return response.json();
}

async function requestText(path, options = {}) {
  const token = getToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        ...authHeaders,
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('No se pudo conectar con el backend. Valide con RPG Software.');
    }
    throw error;
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        message = data.error || message;
      } else {
        const text = await response.text();
        if (text.trim()) message = text.trim();
      }
    } catch {
      // keep default message
    }

    if (response.status === 401 && token) {
      setToken('');
      window.dispatchEvent(new CustomEvent('ferco:session-expired'));
    }

    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  return response.text();
}

export const api = {
  setAuthToken: (token) => setToken(token),
  clearAuthToken: () => setToken(''),
  getAuthToken: () => getToken(),

  login: (correo, password) =>
    request('/usuarios/login', {
      method: 'POST',
      body: JSON.stringify({ correo, password }),
    }),
  forgotPassword: (correo) =>
    request('/usuarios/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ correo }),
    }),
  resetPassword: (token, newPassword) =>
    request('/usuarios/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
  me: () => request('/usuarios/me'),
  getUsuarios: () => request('/usuarios'),
  createUsuario: (payload) =>
    request('/usuarios', { method: 'POST', body: JSON.stringify(payload) }),
  updateUsuario: (id, payload) =>
    request(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteUsuario: (id) =>
    request(`/usuarios/${id}`, { method: 'DELETE' }),
  cambiarPassword: ({ passwordNueva }) =>
    request('/usuarios/cambiar-password', {
      method: 'POST',
      body: JSON.stringify({ passwordNueva }),
    }),
  forzarCambioPassword: (id) =>
    request(`/usuarios/${id}/forzar-cambio-password`, { method: 'POST' }),

  getProductos: (options = {}) => {
    const q = new URLSearchParams();
    if (options?.includeArchived) q.set('includeArchived', 'true');
    const suffix = q.toString();
    return request(`/productos${suffix ? `?${suffix}` : ''}`);
  },
  createProducto: (payload) =>
    request('/productos', { method: 'POST', body: JSON.stringify(payload) }),
  updateProducto: (id, payload) =>
    request(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProducto: (id) =>
    request(`/productos/${id}`, { method: 'DELETE' }),
  restoreProducto: (id) =>
    request(`/productos/${id}/restaurar`, { method: 'PATCH' }),
  ajustarStockProducto: (id, stock) =>
    request(`/productos/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock }),
    }),
  getMovimientosProducto: (id, limit = 10) =>
    request(`/productos/${id}/movimientos?limit=${encodeURIComponent(limit)}`),
  getEmpaques: () => request('/empaques'),
  createEmpaque: (payload) =>
    request('/empaques', { method: 'POST', body: JSON.stringify(payload) }),
  updateEmpaque: (id, payload) =>
    request(`/empaques/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteEmpaque: (id) =>
    request(`/empaques/${id}`, { method: 'DELETE' }),

  // Tipos IVA
  getTiposIva: () => request('/tipos-iva'),
  createTipoIva: (data) => request('/tipos-iva', { method: 'POST', body: JSON.stringify(data) }),
  updateTipoIva: (id, data) => request(`/tipos-iva/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTipoIva: (id) => request(`/tipos-iva/${id}`, { method: 'DELETE' }),

  getClientes: () => request('/clientes'),
  createCliente: (payload) =>
    request('/clientes', { method: 'POST', body: JSON.stringify(payload) }),
  updateCliente: (id, payload) =>
    request(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCliente: (id) =>
    request(`/clientes/${id}`, { method: 'DELETE' }),

  getDepartamentos: () => request('/ubicaciones/departamentos'),
  createDepartamento: (payload) =>
    request('/ubicaciones/departamentos', { method: 'POST', body: JSON.stringify(payload) }),
  updateDepartamento: (id, payload) =>
    request(`/ubicaciones/departamentos/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteDepartamento: (id) =>
    request(`/ubicaciones/departamentos/${id}`, { method: 'DELETE' }),

  getBarrios: (departamentoId) => {
    const url = departamentoId
      ? `/ubicaciones/barrios?departamento_id=${departamentoId}`
      : '/ubicaciones/barrios';
    return request(url);
  },
  createBarrio: (payload) =>
    request('/ubicaciones/barrios', { method: 'POST', body: JSON.stringify(payload) }),
  updateBarrio: (id, payload) =>
    request(`/ubicaciones/barrios/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteBarrio: (id) =>
    request(`/ubicaciones/barrios/${id}`, { method: 'DELETE' }),
  getVentas: (filtro) => {
    if (typeof filtro === 'string') {
      return request(filtro ? `/ventas?fecha=${encodeURIComponent(filtro)}` : '/ventas');
    }
    const q = new URLSearchParams();
    if (filtro?.fecha) q.set('fecha', String(filtro.fecha));
    if (filtro?.desde) q.set('desde', String(filtro.desde));
    if (filtro?.hasta) q.set('hasta', String(filtro.hasta));
    const suffix = q.toString();
    return request(`/ventas${suffix ? `?${suffix}` : ''}`);
  },
  getEntregasResumen: (filtro, fechaBaseLegacy) => {
    const q = new URLSearchParams();
    if (filtro && typeof filtro === 'object') {
      if (filtro.periodo) q.set('periodo', String(filtro.periodo));
      if (filtro.fechaBase) q.set('fechaBase', String(filtro.fechaBase));
      if (filtro.desde) q.set('desde', String(filtro.desde));
      if (filtro.hasta) q.set('hasta', String(filtro.hasta));
    } else {
      if (filtro) q.set('periodo', String(filtro));
      if (fechaBaseLegacy) q.set('fechaBase', String(fechaBaseLegacy));
    }
    const suffix = q.toString();
    return request(`/ventas/entregas/resumen${suffix ? `?${suffix}` : ''}`);
  },
  getVentaById: (id) => request(`/ventas/${id}`),
  getVentaCFE: (id) => request(`/ventas/${id}/cfe`),
  getVentaCFEAnnotated: (id) => requestText(`/ventas/${id}/cfe?annotated=1`),
  sendVentaCFE: (id) => request(`/ventas/${id}/cfe/enviar`, { method: 'POST' }),
  updateVentaEntregado: (id, entregado) =>
    request(`/ventas/${id}/entregado`, {
      method: 'PUT',
      body: JSON.stringify({ entregado }),
    }),
  cancelarVenta: (id) =>
    request(`/ventas/${id}/cancelar`, {
      method: 'PUT',
    }),
  deleteVenta: (id) =>
    request(`/ventas/${id}`, {
      method: 'DELETE',
    }),
  createVenta: (payload) =>
    request('/ventas', { method: 'POST', body: JSON.stringify(payload) }),
  getDashboardResumen: () => request('/ventas/dashboard/resumen'),
  getDashboardWidget: ({ category, type, metric, range, comparison_period }) => {
    const q = new URLSearchParams({ category, type, metric });
    if (range) q.set('range', range);
    if (comparison_period) q.set('comparison_period', comparison_period);
    return request(`/ventas/dashboard/widget?${q}`);
  },
  getWidgets: () => request('/ventas/dashboard/widgets'),
  saveWidgets: (widgets) => request('/ventas/dashboard/widgets', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(widgets),
  }),
  getEstadisticasResumen: (desde, hasta, usuarioId) => {
    const q = new URLSearchParams();
    if (desde) q.set('desde', desde);
    if (hasta) q.set('hasta', hasta);
    if (usuarioId) q.set('usuarioId', String(usuarioId));
    const suffix = q.toString();
    return request(`/ventas/estadisticas/resumen${suffix ? `?${suffix}` : ''}`);
  },
  getAuditoriaEventos: (desde, hasta) => {
    const q = new URLSearchParams();
    if (desde) q.set('desde', desde);
    if (hasta) q.set('hasta', hasta);
    const suffix = q.toString();
    return request(`/auditoria/eventos${suffix ? `?${suffix}` : ''}`);
  },
  getMovimientosStock: (desde, hasta) => {
    const q = new URLSearchParams();
    if (desde) q.set('desde', desde);
    if (hasta) q.set('hasta', hasta);
    const suffix = q.toString();
    return request(`/auditoria/movimientos-stock${suffix ? `?${suffix}` : ''}`);
  },
  getStockCostoSerie: (desde, hasta) => {
    const q = new URLSearchParams();
    if (desde) q.set('desde', desde);
    if (hasta) q.set('hasta', hasta);
    const suffix = q.toString();
    return request(`/auditoria/stock-costo-serie${suffix ? `?${suffix}` : ''}`);
  },

  // ── CONFIGURACIÓN ──────────────────────────────────────────────────────────
  getConfigEmpresa: () => request('/configuracion/empresa'),
  updateConfigEmpresa: (payload) =>
    request('/configuracion/empresa', { method: 'PUT', body: JSON.stringify(payload) }),
  getConfigModulos: () => request('/configuracion/modulos'),
  updateConfigModulo: (codigo, habilitado) =>
    request(`/configuracion/modulos/${codigo}`, {
      method: 'PUT',
      body: JSON.stringify({ habilitado }),
    }),
  getConfigGanancias: () => request('/configuracion/ganancias'),
  updateConfigGanancias: (payload) =>
    request('/configuracion/ganancias', { method: 'PUT', body: JSON.stringify(payload) }),

  // ── PERMISOS ────────────────────────────────────────────────────────────────
  getRoles: () => request('/permisos/roles'),
  crearRol: (nombre) => request('/permisos/roles', { method: 'POST', body: JSON.stringify({ nombre }) }),
  eliminarRol: (id) => request(`/permisos/roles/${id}`, { method: 'DELETE' }),
  getPermisos: (rolId) => request(`/permisos/${rolId}`),
  updatePermisos: (rolId, permisos) =>
    request(`/permisos/${rolId}`, { method: 'PUT', body: JSON.stringify(permisos) }),
};
