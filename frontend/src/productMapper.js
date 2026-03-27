export function fromApiProducto(row) {
  return {
    id: row.id,
    nombre: row.nombre || '',
    stock: String(row.stock ?? ''),
    categoria: row.unidad || '',
    imagen: null,
    imagenPreview: row.imagen || '',
    ean: row.ean || '',
    tipoEmpaque: row.empaque || '',
    cantidadEmpaque: String(row.cantidad_empaque ?? ''),
    costo: String(row.costo ?? ''),
    venta: String(row.precio ?? ''),
    precioEmpaque: String(row.precio_empaque ?? ''),
  };
}

export function toApiProducto(producto) {
  return {
    nombre: producto.nombre,
    costo: Math.round(Number(producto.costo || 0)),
    precio: Math.round(Number(producto.venta || 0)),
    stock: Number(producto.stock || 0),
    unidad: producto.categoria || null,
    imagen: producto.imagenPreview || null,
    ean: producto.ean || '',
    cantidad_empaque: producto.cantidadEmpaque ? Number(producto.cantidadEmpaque) : null,
    empaque: producto.tipoEmpaque || null,
    precio_empaque: Math.round(Number(producto.precioEmpaque || 0)),
  };
}
