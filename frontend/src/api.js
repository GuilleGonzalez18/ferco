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
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
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
  me: () => request('/usuarios/me'),
  getUsuarios: () => request('/usuarios'),
  createUsuario: (payload) =>
    request('/usuarios', { method: 'POST', body: JSON.stringify(payload) }),
  updateUsuario: (id, payload) =>
    request(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteUsuario: (id) =>
    request(`/usuarios/${id}`, { method: 'DELETE' }),

  getProductos: () => request('/productos'),
  createProducto: (payload) =>
    request('/productos', { method: 'POST', body: JSON.stringify(payload) }),
  updateProducto: (id, payload) =>
    request(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProducto: (id) =>
    request(`/productos/${id}`, { method: 'DELETE' }),

  getClientes: () => request('/clientes'),
  createCliente: (payload) =>
    request('/clientes', { method: 'POST', body: JSON.stringify(payload) }),
  updateCliente: (id, payload) =>
    request(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCliente: (id) =>
    request(`/clientes/${id}`, { method: 'DELETE' }),
  getVentas: (fecha) =>
    request(fecha ? `/ventas?fecha=${encodeURIComponent(fecha)}` : '/ventas'),
  getVentaById: (id) => request(`/ventas/${id}`),
  updateVentaEntregado: (id, entregado) =>
    request(`/ventas/${id}/entregado`, {
      method: 'PUT',
      body: JSON.stringify({ entregado }),
    }),
  updateVentaEstadoEntrega: (id, estado_entrega) =>
    request(`/ventas/${id}/estado-entrega`, {
      method: 'PUT',
      body: JSON.stringify({ estado_entrega }),
    }),
  createVenta: (payload) =>
    request('/ventas', { method: 'POST', body: JSON.stringify(payload) }),
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
};
