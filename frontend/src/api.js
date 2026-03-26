const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
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
  login: (correo, password) =>
    request('/usuarios/login', {
      method: 'POST',
      body: JSON.stringify({ correo, password }),
    }),

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
  createVenta: (payload) =>
    request('/ventas', { method: 'POST', body: JSON.stringify(payload) }),
};
