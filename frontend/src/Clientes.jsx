import { Fragment, useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from './api';
import './Clientes.css';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [clienteExpandidoId, setClienteExpandidoId] = useState(null);
  const [nuevo, setNuevo] = useState({
    nombre: '',
    rut: '',
    direccion: '',
    telefono: '',
    correo: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await api.getClientes();
        setClientes(rows);
      } catch (error) {
        console.error('Error cargando clientes', error);
      }
    };
    load();
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) =>
      `${c.nombre || ''} ${c.rut || ''}`.toLowerCase().includes(q)
    );
  }, [clientes, busqueda]);

  const clientesOrdenados = useMemo(() => {
    const list = [...filtrados];
    const dir = sortDir === 'asc' ? 1 : -1;
    const asText = (v) => String(v ?? '').toLowerCase();

    list.sort((a, b) => {
      switch (sortBy) {
        case 'rut':
          return asText(a.rut).localeCompare(asText(b.rut)) * dir;
        case 'direccion':
          return asText(a.direccion).localeCompare(asText(b.direccion)) * dir;
        case 'telefono':
          return asText(a.telefono).localeCompare(asText(b.telefono)) * dir;
        case 'correo':
          return asText(a.correo).localeCompare(asText(b.correo)) * dir;
        case 'nombre':
        default:
          return asText(a.nombre).localeCompare(asText(b.nombre)) * dir;
      }
    });

    return list;
  }, [filtrados, sortBy, sortDir]);

  const toggleSort = (column) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDir('asc');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevo((prev) => ({ ...prev, [name]: value }));
  };

  const guardarCliente = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nombre: nuevo.nombre,
        rut: nuevo.rut,
        direccion: nuevo.direccion || null,
        telefono: nuevo.telefono || null,
        correo: nuevo.correo || null,
      };

      if (editandoId) {
        const actualizado = await api.updateCliente(editandoId, payload);
        setClientes((prev) => prev.map((c) => (c.id === editandoId ? actualizado : c)));
      } else {
        const creado = await api.createCliente(payload);
        setClientes((prev) => [creado, ...prev]);
      }

      setNuevo({ nombre: '', rut: '', direccion: '', telefono: '', correo: '' });
      setMostrarForm(false);
      setEditandoId(null);
    } catch (error) {
      window.alert(`No se pudo guardar el cliente: ${error.message}`);
    }
  };

  const editarCliente = (cliente) => {
    setEditandoId(cliente.id);
    setClienteExpandidoId(null);
    setNuevo({
      nombre: cliente.nombre || '',
      rut: cliente.rut || '',
      direccion: cliente.direccion || '',
      telefono: cliente.telefono || '',
      correo: cliente.correo || '',
    });
    setMostrarForm(true);
  };

  const eliminarCliente = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este cliente?')) return;
    try {
      await api.deleteCliente(id);
      setClientes((prev) => prev.filter((c) => c.id !== id));
      setClienteExpandidoId((prev) => (prev === id ? null : prev));
      if (editandoId === id) {
        setEditandoId(null);
        setMostrarForm(false);
        setNuevo({ nombre: '', rut: '', direccion: '', telefono: '', correo: '' });
      }
    } catch (error) {
      window.alert(`No se pudo eliminar: ${error.message}`);
    }
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString();
    const renderPdf = (logoImage = null) => {
      let startY = 30;
      if (logoImage) {
        doc.addImage(logoImage, 'PNG', 10, 10, 40, 20);
        doc.setFontSize(16);
        doc.text('Lista de Clientes', 55, 22);
        doc.setFontSize(10);
        doc.text(`Emitido: ${fecha}`, 55, 28);
        startY = 35;
      } else {
        doc.setFontSize(16);
        doc.text('Lista de Clientes', 14, 18);
        doc.setFontSize(10);
        doc.text(`Emitido: ${fecha}`, 14, 24);
      }

      autoTable(doc, {
        startY,
        head: [['Nombre', 'Rut/C.I.', 'Dirección', 'Teléfono', 'Mail']],
        body: filtrados.map((c) => [
          c.nombre || '',
          c.rut || '',
          c.direccion || '',
          c.telefono || '',
          c.correo || '',
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [55, 95, 140] },
      });

      doc.save('clientes.pdf');
    };

    const logo = new Image();
    logo.src = '/images/logo2.png';
    logo.onload = () => renderPdf(logo);
    logo.onerror = () => renderPdf();
  };

  const abrirAlta = () => {
    setEditandoId(null);
    setNuevo({ nombre: '', rut: '', direccion: '', telefono: '', correo: '' });
    setMostrarForm(true);
  };

  const cerrarPanel = () => {
    setMostrarForm(false);
    setEditandoId(null);
    setNuevo({ nombre: '', rut: '', direccion: '', telefono: '', correo: '' });
  };

  return (
    <div className="clientes-main">
      <div className="clientes-toolbar">
        <input
          type="text"
          className="buscar-cliente"
          placeholder="Buscar por nombre o RUT/C.I."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <button
          type="button"
          className="icon-btn"
          title="Agregar cliente"
          onClick={abrirAlta}
        >
          <img src="/add.svg" alt="" aria-hidden="true" />
          <span>CLIENTE</span>
        </button>
        <button type="button" className="icon-btn" title="Imprimir PDF" onClick={exportarPDF}>
          <img src="/print.svg" alt="" aria-hidden="true" />
        </button>
      </div>

      <ul className="lista-clientes">
        <li className="header">
          <button type="button" className="sort-header-btn" onClick={() => toggleSort('nombre')}>Nombre {sortBy === 'nombre' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
          <button type="button" className="sort-header-btn" onClick={() => toggleSort('rut')}>Rut/C.I. {sortBy === 'rut' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
          <button type="button" className="sort-header-btn" onClick={() => toggleSort('direccion')}>Dirección {sortBy === 'direccion' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
          <button type="button" className="sort-header-btn" onClick={() => toggleSort('telefono')}>Teléfono {sortBy === 'telefono' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
          <button type="button" className="sort-header-btn" onClick={() => toggleSort('correo')}>Mail {sortBy === 'correo' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</button>
        </li>
        {clientesOrdenados.length === 0 && <li className="vacio">No hay clientes</li>}
        {clientesOrdenados.map((c) => {
          const expanded = clienteExpandidoId === c.id;
          return (
            <Fragment key={c.id}>
              <li
                className={`cliente-row ${expanded ? 'expanded' : ''}`}
                onClick={() => setClienteExpandidoId(expanded ? null : c.id)}
              >
                <span>{c.nombre}</span>
                <span>{c.rut}</span>
                <span>{c.direccion || '-'}</span>
                <span>{c.telefono || '-'}</span>
                <span>{c.correo || '-'}</span>
              </li>
              <li className={`cliente-actions-row ${expanded ? 'expanded' : ''}`}>
                <div className="acciones-cliente-panel">
                  <button
                    type="button"
                    className="edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      editarCliente(c);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      eliminarCliente(c.id);
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            </Fragment>
          );
        })}
      </ul>

      <div className={`side-panel-overlay ${mostrarForm ? 'open' : ''}`} aria-hidden={!mostrarForm}>
        <div className="side-panel-backdrop" onClick={cerrarPanel} />
        <aside className="side-panel">
          <div className="side-panel-header">
            <h3>{editandoId ? 'Editar cliente' : 'Nuevo cliente'}</h3>
            <button type="button" className="side-panel-close" onClick={cerrarPanel}>✕</button>
          </div>
          <form className="cliente-form" onSubmit={guardarCliente}>
            <label className="field-label">Nombre
              <input name="nombre" value={nuevo.nombre} onChange={handleChange} placeholder="Nombre" required />
            </label>
            <label className="field-label">RUT / C.I.
              <input name="rut" value={nuevo.rut} onChange={handleChange} placeholder="Rut/C.I." required />
            </label>
            <label className="field-label">Dirección
              <input name="direccion" value={nuevo.direccion} onChange={handleChange} placeholder="Dirección" />
            </label>
            <label className="field-label">Teléfono
              <input name="telefono" value={nuevo.telefono} onChange={handleChange} placeholder="Teléfono" />
            </label>
            <label className="field-label">Mail
              <input name="correo" value={nuevo.correo} onChange={handleChange} placeholder="Mail" type="email" />
            </label>
            <div className="cliente-form-actions">
              <button type="submit">{editandoId ? 'Guardar cambios' : 'Guardar'}</button>
              <button type="button" onClick={cerrarPanel}>Cancelar</button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
