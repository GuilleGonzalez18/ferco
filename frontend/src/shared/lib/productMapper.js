function isSupportedImageUrl(value) {
  const v = String(value || '').trim();
  if (!v) return false;
  if (v.startsWith('/')) return true;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function fromApiProducto(row) {
  return {
    id: row.id,
    activo: row.activo !== false,
    nombre: row.nombre || '',
    stock: String(row.stock ?? ''),
    categoria: row.unidad || '',
    imagen: null,
    imagenPreview: row.imagen || '',
    ean: row.ean || '',
    tipoEmpaque: row.empaque_nombre || '',
    empaqueId: row.empaque_id != null ? String(row.empaque_id) : '',
    cantidadEmpaque: String(row.cantidad_empaque ?? ''),
    costo: String(row.costo ?? ''),
    venta: String(row.precio ?? ''),
    precioEmpaque: String(row.precio_empaque ?? ''),
  };
}

export function toApiProducto(producto) {
  const imagen = isSupportedImageUrl(producto.imagenPreview) ? String(producto.imagenPreview).trim() : null;
  return {
    nombre: producto.nombre,
    costo: Math.round(Number(producto.costo || 0) * 100) / 100,
    precio: Math.round(Number(producto.venta || 0) * 100) / 100,
    stock: Number(producto.stock || 0),
    unidad: producto.categoria || null,
    imagen,
    ean: producto.ean || '',
    cantidad_empaque: producto.cantidadEmpaque ? Number(producto.cantidadEmpaque) : null,
    empaque_id: producto.empaqueId ? Number(producto.empaqueId) : null,
    precio_empaque: Math.round(Number(producto.precioEmpaque || 0) * 100) / 100,
  };
}
