import { Fragment, useMemo, useState } from 'react';
import './Productos.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from './api';
import { fromApiProducto, toApiProducto } from './productMapper';

const tiposEmpaque = ['Caja', 'Bolsa', 'Botella', 'Lata', 'Pack', 'Otro'];

function stockState(stockValue) {
  const s = Number(stockValue || 0);
  if (!Number.isFinite(s)) return 'normal';
  if (s <= 0) return 'stock-zero';
  if (s < 30) return 'stock-low';
  return 'normal';
}

export default function Productos({ productos = [], setProductos }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [productoExpandidoId, setProductoExpandidoId] = useState(null);
  const [imagenUrlError, setImagenUrlError] = useState('');
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');
  const [nuevo, setNuevo] = useState({
    nombre: '', stock: '', categoria: '', imagen: null, imagenPreview: '', ean: '', tipoEmpaque: '', cantidadEmpaque: '', costo: '', venta: '', precioEmpaque: ''
  });

  const isHttpUrl = (value) => {
    try {
      const u = new URL(value);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleChange = e => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      setImagenUrlError('');
      setNuevo(n => ({
        ...n,
        imagen: files[0],
        imagenPreview: URL.createObjectURL(files[0]),
      }));
      return;
    }
    if (name === 'imagenUrl') {
      const trimmed = value.trim();
      if (!trimmed) {
        setImagenUrlError('');
        setNuevo(n => ({ ...n, imagen: null, imagenPreview: '' }));
        return;
      }
      if (!isHttpUrl(trimmed)) {
        setImagenUrlError('La URL debe comenzar con http:// o https://');
        setNuevo(n => ({ ...n, imagen: null, imagenPreview: trimmed }));
        return;
      }
      setImagenUrlError('');
      setNuevo(n => ({
        ...n,
        imagen: null,
        imagenPreview: trimmed,
      }));
      return;
    }
    setNuevo(n => ({ ...n, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!setProductos) return;
    if (imagenUrlError) {
      window.alert('Corrige la URL de imagen antes de guardar.');
      return;
    }

    try {
      if (editando !== null) {
        const updated = await api.updateProducto(editando, toApiProducto(nuevo));
        setProductos(productos.map(p => p.id === editando ? fromApiProducto(updated) : p));
        setEditando(null);
      } else {
        const created = await api.createProducto(toApiProducto(nuevo));
        setProductos([fromApiProducto(created), ...productos]);
      }
      setNuevo({ nombre: '', stock: '', categoria: '', imagen: null, imagenPreview: '', ean: '', tipoEmpaque: '', cantidadEmpaque: '', costo: '', venta: '', precioEmpaque: '' });
      setMostrarForm(false);
      setImagenUrlError('');
    } catch (error) {
      window.alert(`Error guardando producto: ${error.message}`);
    }
  };

  const handleEditar = prod => {
    setProductoExpandidoId(null);
    setNuevo({ ...prod, imagen: null });
    setImagenUrlError('');
    setEditando(prod.id);
    setMostrarForm(true);
  };

  const handleEliminar = async id => {
    if (window.confirm('¿Seguro que deseas eliminar este producto?')) {
      try {
        await api.deleteProducto(id);
        setProductos(productos.filter(p => p.id !== id));
        setProductoExpandidoId((prev) => (prev === id ? null : prev));
      } catch (error) {
        window.alert(`No se pudo eliminar: ${error.message}`);
      }
    }
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString();
    // Logo
    const logo = new Image();
    logo.src = '/images/logo2.png';
    logo.onload = () => {
      doc.addImage(logo, 'PNG', 10, 10, 40, 20);
      doc.setFontSize(16);
      doc.text('Lista de Productos', 55, 22);
      doc.setFontSize(10);
      doc.text('Emitido: ' + fecha, 55, 28);
      autoTable(doc, {
        startY: 35,
        head: [[
          'Nombre', 'Stock', 'Costo', 'Venta', 'Empaque'
        ]],
        body: productos.map(p => [
          p.nombre,
          p.stock,
          `$${p.costo}`,
          `$${p.venta}`,
          `${p.tipoEmpaque} x ${p.cantidadEmpaque}`
        ]),
        didParseCell: function (data) {
          if (data.section !== 'body') return;
          const producto = productos[data.row.index];
          const state = stockState(producto?.stock);
          if (state === 'stock-zero') {
            data.cell.styles.fillColor = [246, 196, 196];
            data.cell.styles.textColor = [127, 29, 29];
          } else if (state === 'stock-low') {
            data.cell.styles.fillColor = [255, 236, 173];
            data.cell.styles.textColor = [120, 53, 15];
          }
        },
        styles: { fontSize: 10 },
        headStyles: { fillColor: [55, 95, 140] },
      });
      doc.save('productos.pdf');
    };
  };

  const productosFiltrados = productos.filter((p) => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return true;
    return [
      p.nombre,
      p.categoria,
      p.ean,
      p.tipoEmpaque,
      p.stock,
      p.costo,
      p.venta,
    ]
      .join(' ')
      .toLowerCase()
      .includes(texto);
  });

  const sortedProductos = useMemo(() => {
    const list = [...productosFiltrados];
    const dir = sortDir === 'asc' ? 1 : -1;
    const asNumber = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const asText = (v) => String(v ?? '').toLowerCase();

    list.sort((a, b) => {
      switch (sortBy) {
        case 'stock':
          return (asNumber(a.stock) - asNumber(b.stock)) * dir;
        case 'costo':
          return (asNumber(a.costo) - asNumber(b.costo)) * dir;
        case 'venta':
          return (asNumber(a.venta) - asNumber(b.venta)) * dir;
        case 'empaque':
          return asText(a.tipoEmpaque).localeCompare(asText(b.tipoEmpaque)) * dir;
        case 'ganancia': {
          const ag = calcularGanancia(a.costo, a.venta);
          const bg = calcularGanancia(b.costo, b.venta);
          return ((ag ?? -Infinity) - (bg ?? -Infinity)) * dir;
        }
        case 'nombre':
        default:
          return asText(a.nombre).localeCompare(asText(b.nombre)) * dir;
      }
    });

    return list;
  }, [productosFiltrados, sortBy, sortDir]);

  const toggleSort = (column) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDir('asc');
  };

  const calcularGanancia = (costo, venta) => {
    const costoNum = Number(costo);
    const ventaNum = Number(venta);

    if (!Number.isFinite(costoNum) || !Number.isFinite(ventaNum) || costoNum <= 0) {
      return null;
    }

    return ((ventaNum - costoNum) / costoNum) * 100;
  };

  const abrirAlta = () => {
    setMostrarForm(true);
    setEditando(null);
    setNuevo({ nombre: '', stock: '', categoria: '', imagen: null, imagenPreview: '', ean: '', tipoEmpaque: '', cantidadEmpaque: '', costo: '', venta: '', precioEmpaque: '' });
    setImagenUrlError('');
  };

  const cerrarPanel = () => {
    setMostrarForm(false);
    setEditando(null);
    setNuevo({ nombre: '', stock: '', categoria: '', imagen: null, imagenPreview: '', ean: '', tipoEmpaque: '', cantidadEmpaque: '', costo: '', venta: '', precioEmpaque: '' });
    setImagenUrlError('');
  };

  const imagenPreviewValida = useMemo(
    () => typeof nuevo.imagenPreview === 'string' && !!nuevo.imagenPreview.trim() && isHttpUrl(nuevo.imagenPreview),
    [nuevo.imagenPreview]
  );

  return (
    <div className="productos-main">
      <div className="productos-right full-width">
        <div className="productos-toolbar">
          <h3>Lista de productos</h3>
          <input
            type="text"
            className="buscar-producto"
            placeholder="Buscar por nombre, codigo, categoria..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <button className="agregar-btn toolbar-add" title="Agregar producto" onClick={abrirAlta}>
            <img src="/add.svg" alt="" aria-hidden="true" />
            <span>PRODUCTO</span>
          </button>
          <button className="exportar-pdf" title="Exportar a PDF" onClick={exportarPDF}>
            <img src="/print.svg" alt="" aria-hidden="true" />
          </button>
        </div>

        <ul className="lista-productos">
          <li className="header">
            <span>Imagen</span>
            <button type="button" className="sort-header-btn" onClick={() => toggleSort('nombre')}>Nombre {sortBy === 'nombre' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
            <button type="button" className="sort-header-btn" onClick={() => toggleSort('stock')}>Stock {sortBy === 'stock' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
            <button type="button" className="sort-header-btn" onClick={() => toggleSort('costo')}>Costo {sortBy === 'costo' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
            <button type="button" className="sort-header-btn" onClick={() => toggleSort('venta')}>Venta {sortBy === 'venta' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
            <button type="button" className="sort-header-btn" onClick={() => toggleSort('empaque')}>Empaque {sortBy === 'empaque' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
            <button type="button" className="sort-header-btn" onClick={() => toggleSort('ganancia')}>Ganancia % {sortBy === 'ganancia' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
          </li>
          {sortedProductos.length === 0 && <li className="vacio">No hay productos</li>}
          {sortedProductos.map(p => {
            const expanded = productoExpandidoId === p.id;
            return (
              <Fragment key={p.id}>
                <li
                  className={`producto-row ${stockState(p.stock)} ${expanded ? 'expanded' : ''}`}
                  onClick={() => setProductoExpandidoId(expanded ? null : p.id)}
                >
                  <span>
                    {p.imagenPreview ? (
                      <img src={p.imagenPreview} alt={p.nombre} className="producto-thumb" />
                    ) : (
                      <span className="sin-imagen">Sin imagen</span>
                    )}
                  </span>
                  <span className="campo" data-label="Nombre">{p.nombre}</span>
                  <span className={`campo stock-value ${stockState(p.stock)}`} data-label="Stock">{p.stock}</span>
                  <span className="campo" data-label="Costo">${p.costo}</span>
                  <span className="campo" data-label="Venta">${p.venta}</span>
                  <span className="campo" data-label="Empaque">{p.tipoEmpaque} x {p.cantidadEmpaque}</span>
                  <span className="campo" data-label="Ganancia">
                    {(() => {
                      const ganancia = calcularGanancia(p.costo, p.venta);
                      if (ganancia === null) return '-';
                      return `${ganancia.toFixed(0)}%`;
                    })()}
                  </span>
                </li>
                <li className={`producto-actions-row ${expanded ? 'expanded' : ''}`}>
                  <div className="acciones-producto-panel">
                    <button
                      className="edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditar(p);
                      }}
                      title="Editar"
                    >
                      Editar
                    </button>
                    <button
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEliminar(p.id);
                      }}
                      title="Eliminar"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              </Fragment>
            );
          })}
        </ul>
      </div>

      <div className={`side-panel-overlay ${mostrarForm ? 'open' : ''}`} aria-hidden={!mostrarForm}>
        <div className="side-panel-backdrop" onClick={cerrarPanel} />
        <aside className="side-panel">
          <div className="side-panel-header">
            <h3>{editando !== null ? 'Editar producto' : 'Nuevo producto'}</h3>
            <button type="button" className="side-panel-close" onClick={cerrarPanel}>✕</button>
          </div>
          <form className="form-producto" onSubmit={handleSubmit}>
            <label className="field-label">Nombre del producto
              <input name="nombre" value={nuevo.nombre} onChange={handleChange} placeholder="Nombre" required />
            </label>
            <label className="field-label">Stock
              <input name="stock" value={nuevo.stock} onChange={handleChange} placeholder="Stock" type="number" min="0" step="1" required />
            </label>
            <label className="field-label">EAN / Código
              <input name="ean" value={nuevo.ean} onChange={handleChange} placeholder="EAN/Código" />
            </label>
            <label className="field-label">Tipo de empaque
              <select name="tipoEmpaque" value={nuevo.tipoEmpaque} onChange={handleChange} required>
                <option value="">Tipo empaque</option>
                {tiposEmpaque.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="field-label">Cantidad por empaque
              <input name="cantidadEmpaque" value={nuevo.cantidadEmpaque} onChange={handleChange} placeholder="Cantidad por empaque" type="number" min="0" step="1" />
            </label>
            <label className="field-label">Precio de costo
              <input name="costo" value={nuevo.costo} onChange={handleChange} placeholder="Precio de Costo" type="number" min="0" step="1" />
            </label>
            <label className="field-label">Precio de venta
              <input name="venta" value={nuevo.venta} onChange={handleChange} placeholder="Precio de Venta" type="number" min="0" step="1" />
            </label>
            <label className="field-label">Precio por empaque
              <input name="precioEmpaque" value={nuevo.precioEmpaque} onChange={handleChange} placeholder="Precio por empaque" type="number" min="0" step="1" />
            </label>
            <label className="field-label">URL de imagen
              <input
                name="imagenUrl"
                value={nuevo.imagenPreview || ''}
                onChange={handleChange}
                placeholder="URL de imagen (https://...)"
                type="url"
              />
            </label>
            {imagenUrlError && <p className="input-error">{imagenUrlError}</p>}
            {imagenPreviewValida && (
              <div className="panel-image-preview">
                <img src={nuevo.imagenPreview} alt="Vista previa" />
              </div>
            )}
            <label className="field-label">Archivo de imagen
              <input name="imagen" type="file" accept="image/*" onChange={handleChange} />
            </label>
            <div className="form-actions">
              <button type="submit">{editando !== null ? 'Guardar cambios' : 'Guardar'}</button>
              <button type="button" onClick={cerrarPanel}>Cancelar</button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
