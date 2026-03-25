import { useState } from 'react';
import './Productos.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const categorias = ['Bebidas', 'Alimentos', 'Limpieza', 'Higiene', 'Otros'];
const tiposEmpaque = ['Caja', 'Bolsa', 'Botella', 'Lata', 'Pack', 'Otro'];

export default function Productos() {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [productos, setProductos] = useState([]);
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [nuevo, setNuevo] = useState({
    nombre: '', stock: '', categoria: '', imagen: null, imagenPreview: '', ean: '', tipoEmpaque: '', cantidadEmpaque: '', costo: '', venta: '', precioEmpaque: ''
  });

  const handleChange = e => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      setNuevo(n => ({
        ...n,
        imagen: files[0],
        imagenPreview: URL.createObjectURL(files[0]),
      }));
      return;
    }
    setNuevo(n => ({ ...n, [name]: value }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (editando !== null) {
      setProductos(productos.map(p => p.id === editando ? { ...nuevo, id: editando } : p));
      setEditando(null);
    } else {
      setProductos([...productos, { ...nuevo, id: Date.now() }]);
    }
    setNuevo({ nombre: '', stock: '', categoria: '', imagen: null, imagenPreview: '', ean: '', tipoEmpaque: '', cantidadEmpaque: '', costo: '', venta: '', precioEmpaque: '' });
    setMostrarForm(false);
  };

  const handleEditar = prod => {
    setNuevo({ ...prod, imagen: null });
    setEditando(prod.id);
    setMostrarForm(true);
  };

  const handleEliminar = id => {
    if (window.confirm('¿Seguro que deseas eliminar este producto?')) {
      setProductos(productos.filter(p => p.id !== id));
    }
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString();
    // Logo
    const logo = new Image();
    logo.src = '/images/logo.png';
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

  const calcularGanancia = (costo, venta) => {
    const costoNum = Number(costo);
    const ventaNum = Number(venta);

    if (!Number.isFinite(costoNum) || !Number.isFinite(ventaNum) || costoNum <= 0) {
      return null;
    }

    return ((ventaNum - costoNum) / costoNum) * 100;
  };

  return (
    <div className="productos-main">
      <div className="productos-left">
        <button className="agregar-btn" onClick={() => { setMostrarForm(true); setEditando(null); setNuevo({ nombre: '', stock: '', categoria: '', imagen: null, imagenPreview: '', ean: '', tipoEmpaque: '', cantidadEmpaque: '', costo: '', venta: '', precioEmpaque: '' }); }}>Agregar producto</button>
        {mostrarForm && (
          <form className="form-producto" onSubmit={handleSubmit}>
            <h3>{editando !== null ? 'Editar producto' : 'Nuevo producto'}</h3>
            <input name="nombre" value={nuevo.nombre} onChange={handleChange} placeholder="Nombre" required />
            <input name="stock" value={nuevo.stock} onChange={handleChange} placeholder="Stock" type="number" min="0" step="1" required />
            <select name="categoria" value={nuevo.categoria} onChange={handleChange} required>
              <option value="">Categoría</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input name="ean" value={nuevo.ean} onChange={handleChange} placeholder="EAN/Código" />
            <select name="tipoEmpaque" value={nuevo.tipoEmpaque} onChange={handleChange} required>
              <option value="">Tipo empaque</option>
              {tiposEmpaque.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input name="cantidadEmpaque" value={nuevo.cantidadEmpaque} onChange={handleChange} placeholder="Cantidad por empaque" type="number" min="0" step="1" />
            <input name="costo" value={nuevo.costo} onChange={handleChange} placeholder="Precio de Costo" type="number" min="0" step="1" />
            <input name="venta" value={nuevo.venta} onChange={handleChange} placeholder="Precio de Venta" type="number" min="0" step="1" />
            <input name="precioEmpaque" value={nuevo.precioEmpaque} onChange={handleChange} placeholder="Precio por empaque" type="number" min="0" step="1" />
            <input name="imagen" type="file" accept="image/*" onChange={handleChange} />
            <div className="form-actions">
              <button type="submit">{editando !== null ? 'Guardar cambios' : 'Guardar'}</button>
              <button type="button" onClick={() => { setMostrarForm(false); setEditando(null); }}>Cancelar</button>
            </div>
          </form>
        )}
      </div>
      <div className="productos-right">
        <div className="productos-toolbar">
          <h3>Lista de productos</h3>
          <input
            type="text"
            className="buscar-producto"
            placeholder="Buscar por nombre, codigo, categoria..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <button className="exportar-pdf" onClick={exportarPDF}>Exportar a PDF</button>
        </div>
        <ul className="lista-productos">
          <li className="header">
            <span>Imagen</span>
            <span>Nombre</span>
            <span>Stock</span>
            <span>Costo</span>
            <span>Venta</span>
            <span>Empaque</span>
            <span>Ganancia %</span>
            <span>Acciones</span> 
          </li>
          {productosFiltrados.length === 0 && <li className="vacio">No hay productos</li>}
          {productosFiltrados.map(p => (
            <li key={p.id}>
              <span>
                {p.imagenPreview ? (
                  <img src={p.imagenPreview} alt={p.nombre} className="producto-thumb" />
                ) : (
                  <span className="sin-imagen">Sin imagen</span>
                )}
              </span>
              <span className="campo" data-label="Nombre">{p.nombre}</span>
              <span className="campo" data-label="Stock">{p.stock}</span>
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
              <span>
                <button className="edit-btn" onClick={() => handleEditar(p)} title="Editar">✏️</button>
                <button className="delete-btn" onClick={() => handleEliminar(p.id)} title="Eliminar">🗑️</button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
