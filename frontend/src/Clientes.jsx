import { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from './api';
import './Clientes.css';
import { appAlert, appConfirm } from './appDialog';
import { RiFileExcel2Line } from 'react-icons/ri';
import { PiFilePdfBold } from 'react-icons/pi';
import { AiFillPrinter } from 'react-icons/ai';
import AppTable from './AppTable';

export default function Clientes() {
  const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const MINUTOS = ['00', '15', '30', '45'];

  const splitHora = (value) => {
    const raw = String(value || '').trim();
    if (!raw.includes(':')) return { h: '', m: '' };
    const [h, m] = raw.split(':');
    const hh = /^\d{1,2}$/.test(h) ? String(Number(h)).padStart(2, '0') : '';
    const mm = /^\d{1,2}$/.test(m) ? String(Number(m)).padStart(2, '0') : '';
    return { h: hh, m: mm };
  };

  const normalizeHoraForSave = (value) => {
    const { h, m } = splitHora(value);
    if (!h || !m) return null;
    return `${h}:${m}`;
  };

  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [clienteExpandidoId, setClienteExpandidoId] = useState(null);
  const [nuevo, setNuevo] = useState({
    nombre: '',
    rut: '',
    direccion: '',
    telefono: '',
    correo: '',
    horario_apertura: '',
    horario_cierre: '',
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
        case 'horario_apertura':
          return asText(a.horario_apertura).localeCompare(asText(b.horario_apertura)) * dir;
        case 'horario_cierre':
          return asText(a.horario_cierre).localeCompare(asText(b.horario_cierre)) * dir;
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

  const setHorarioPart = (field, part, value) => {
    setNuevo((prev) => {
      const current = splitHora(prev[field]);
      const next = part === 'h' ? { ...current, h: value } : { ...current, m: value };
      return {
        ...prev,
        [field]: `${next.h}:${next.m}`,
      };
    });
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
        horario_apertura: normalizeHoraForSave(nuevo.horario_apertura),
        horario_cierre: normalizeHoraForSave(nuevo.horario_cierre),
      };

      if (editandoId) {
        const actualizado = await api.updateCliente(editandoId, payload);
        setClientes((prev) => prev.map((c) => (c.id === editandoId ? actualizado : c)));
      } else {
        const creado = await api.createCliente(payload);
        setClientes((prev) => [creado, ...prev]);
      }

      setNuevo({ nombre: '', rut: '', direccion: '', telefono: '', correo: '', horario_apertura: '', horario_cierre: '' });
      setMostrarForm(false);
      setEditandoId(null);
    } catch (error) {
      await appAlert(`No se pudo guardar el cliente: ${error.message}`);
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
      horario_apertura: cliente.horario_apertura || '',
      horario_cierre: cliente.horario_cierre || '',
    });
    setMostrarForm(true);
  };

  const eliminarCliente = async (id) => {
    const ok = await appConfirm('¿Seguro que deseas eliminar este cliente?', {
      title: 'Eliminar cliente',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });
    if (!ok) return;
    try {
      await api.deleteCliente(id);
      setClientes((prev) => prev.filter((c) => c.id !== id));
      setClienteExpandidoId((prev) => (prev === id ? null : prev));
      if (editandoId === id) {
        setEditandoId(null);
        setMostrarForm(false);
        setNuevo({ nombre: '', rut: '', direccion: '', telefono: '', correo: '', horario_apertura: '', horario_cierre: '' });
      }
    } catch (error) {
      await appAlert(`No se pudo eliminar: ${error.message}`);
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
        head: [['Nombre', 'Rut/C.I.', 'Dirección', 'Teléfono', 'Mail', 'Apertura', 'Cierre']],
        body: filtrados.map((c) => [
          c.nombre || '',
          c.rut || '',
          c.direccion || '',
          c.telefono || '',
          c.correo || '',
          c.horario_apertura || '',
          c.horario_cierre || '',
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

  const exportarExcel = () => {
    const rowsHtml = filtrados.map((c, idx) => {
      const zebra = idx % 2 === 0 ? '#f7faff' : '#ffffff';
      return `
        <tr style="background:${zebra}">
          <td>${c.nombre || ''}</td>
          <td>${c.rut || ''}</td>
          <td>${c.direccion || ''}</td>
          <td>${c.telefono || ''}</td>
          <td>${c.correo || ''}</td>
          <td>${c.horario_apertura || ''}</td>
          <td>${c.horario_cierre || ''}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <html><head><meta charset="UTF-8" /></head><body>
        <table border="1" style="border-collapse:collapse;width:100%">
          <thead>
            <tr style="background:#375f8c;color:#fff">
              <th>Nombre</th><th>Rut/C.I.</th><th>Dirección</th><th>Teléfono</th><th>Mail</th><th>Apertura</th><th>Cierre</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body></html>
    `;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clientes.xls';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const imprimirClientes = () => {
    const rows = filtrados.map((c) => `
      <tr>
        <td>${c.nombre || ''}</td>
        <td>${c.rut || ''}</td>
        <td>${c.direccion || ''}</td>
        <td>${c.telefono || ''}</td>
        <td>${c.correo || ''}</td>
        <td>${c.horario_apertura || ''}</td>
        <td>${c.horario_cierre || ''}</td>
      </tr>
    `).join('');
    const w = window.open('', '_blank', 'noopener,noreferrer,width=980,height=700');
    if (!w) return;
    w.document.write(`
      <html><head><title>Clientes</title>
      <style>
        body{font-family:Arial,sans-serif;padding:16px}
        h2{color:#375f8c}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #c8d3e5;padding:6px 8px;font-size:12px}
        th{background:#375f8c;color:#fff}
      </style></head>
      <body>
        <h2>Lista de clientes</h2>
        <table>
          <thead><tr>
            <th>Nombre</th><th>Rut/C.I.</th><th>Dirección</th><th>Teléfono</th><th>Mail</th><th>Apertura</th><th>Cierre</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  const abrirAlta = () => {
    setEditandoId(null);
    setNuevo({ nombre: '', rut: '', direccion: '', telefono: '', correo: '', horario_apertura: '', horario_cierre: '' });
    setMostrarForm(true);
  };

  const cerrarPanel = () => {
    setMostrarForm(false);
    setEditandoId(null);
    setNuevo({ nombre: '', rut: '', direccion: '', telefono: '', correo: '', horario_apertura: '', horario_cierre: '' });
  };

  const aperturaPartes = splitHora(nuevo.horario_apertura);
  const cierrePartes = splitHora(nuevo.horario_cierre);

  const sortMark = (column) => (sortBy === column ? (sortDir === 'asc' ? '▲' : '▼') : '');

  const clientesColumns = [
    {
      key: 'nombre',
      header: (
        <button type="button" className="sort-header-btn" onClick={() => toggleSort('nombre')}>
          Nombre {sortMark('nombre')}
        </button>
      ),
      mobileLabel: 'Nombre',
      render: (c) => c.nombre || '-',
    },
    {
      key: 'rut',
      header: (
        <button type="button" className="sort-header-btn" onClick={() => toggleSort('rut')}>
          Rut/C.I. {sortMark('rut')}
        </button>
      ),
      mobileLabel: 'Rut/C.I.',
      render: (c) => c.rut || '-',
    },
    {
      key: 'direccion',
      header: (
        <button type="button" className="sort-header-btn" onClick={() => toggleSort('direccion')}>
          Dirección {sortMark('direccion')}
        </button>
      ),
      mobileLabel: 'Dirección',
      render: (c) => c.direccion || '-',
    },
    {
      key: 'telefono',
      header: (
        <button type="button" className="sort-header-btn" onClick={() => toggleSort('telefono')}>
          Teléfono {sortMark('telefono')}
        </button>
      ),
      mobileLabel: 'Teléfono',
      render: (c) => c.telefono || '-',
    },
    {
      key: 'correo',
      header: (
        <button type="button" className="sort-header-btn" onClick={() => toggleSort('correo')}>
          Mail {sortMark('correo')}
        </button>
      ),
      mobileLabel: 'Mail',
      render: (c) => c.correo || '-',
    },
    {
      key: 'horario_apertura',
      header: (
        <button type="button" className="sort-header-btn" onClick={() => toggleSort('horario_apertura')}>
          Apertura {sortMark('horario_apertura')}
        </button>
      ),
      mobileLabel: 'Apertura',
      render: (c) => c.horario_apertura || '-',
    },
    {
      key: 'horario_cierre',
      header: (
        <button type="button" className="sort-header-btn" onClick={() => toggleSort('horario_cierre')}>
          Cierre {sortMark('horario_cierre')}
        </button>
      ),
      mobileLabel: 'Cierre',
      render: (c) => c.horario_cierre || '-',
    },
  ];

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
        <button type="button" className="icon-btn" title="Exportar" onClick={() => setExportModalOpen(true)}>
          <img src="/print.svg" alt="" aria-hidden="true" />
        </button>
      </div>

      {exportModalOpen && (
        <div className="export-modal-overlay" role="dialog" aria-modal="true">
          <div className="export-modal-backdrop" onClick={() => setExportModalOpen(false)} />
          <div className="export-modal">
            <h4>Exportar clientes</h4>
            <p>Elige un formato:</p>
            <div className="export-modal-actions">
              <button type="button" onClick={() => { exportarPDF(); setExportModalOpen(false); }}>
                <PiFilePdfBold />
                <span>PDF</span>
              </button>
              <button type="button" onClick={() => { exportarExcel(); setExportModalOpen(false); }}>
                <RiFileExcel2Line />
                <span>EXCEL</span>
              </button>
              <button type="button" onClick={() => { imprimirClientes(); setExportModalOpen(false); }}>
                <AiFillPrinter />
                <span>Impresora</span>
              </button>
            </div>
            <button type="button" className="export-modal-close" onClick={() => setExportModalOpen(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      <AppTable
        className="clientes-table"
        tableClassName="clientes-table-grid"
        columns={clientesColumns}
        rows={clientesOrdenados}
        rowKey="id"
        emptyMessage="No hay clientes"
        onRowClick={(c) => setClienteExpandidoId((prev) => (prev === c.id ? null : c.id))}
        rowClassName={(c) => `cliente-row ${clienteExpandidoId === c.id ? 'expanded' : ''}`}
        expandedRowId={clienteExpandidoId}
        renderExpandedRow={(c) => (
          <div className="acciones-cliente-panel">
            <button type="button" className="edit-btn" onClick={() => editarCliente(c)}>
              Editar
            </button>
            <button type="button" className="delete-btn" onClick={() => eliminarCliente(c.id)}>
              Eliminar
            </button>
          </div>
        )}
      />

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
            <label className="field-label">Horario apertura
              <div className="time-selects">
                <select
                  value={aperturaPartes.h}
                  onChange={(e) => setHorarioPart('horario_apertura', 'h', e.target.value)}
                >
                  <option value="">Hora</option>
                  {HORAS.map((h) => <option key={`ap-h-${h}`} value={h}>{h}</option>)}
                </select>
                <span>:</span>
                <select
                  value={aperturaPartes.m}
                  onChange={(e) => setHorarioPart('horario_apertura', 'm', e.target.value)}
                >
                  <option value="">Min</option>
                  {MINUTOS.map((m) => <option key={`ap-m-${m}`} value={m}>{m}</option>)}
                </select>
              </div>
            </label>
            <label className="field-label">Horario cierre
              <div className="time-selects">
                <select
                  value={cierrePartes.h}
                  onChange={(e) => setHorarioPart('horario_cierre', 'h', e.target.value)}
                >
                  <option value="">Hora</option>
                  {HORAS.map((h) => <option key={`ci-h-${h}`} value={h}>{h}</option>)}
                </select>
                <span>:</span>
                <select
                  value={cierrePartes.m}
                  onChange={(e) => setHorarioPart('horario_cierre', 'm', e.target.value)}
                >
                  <option value="">Min</option>
                  {MINUTOS.map((m) => <option key={`ci-m-${m}`} value={m}>{m}</option>)}
                </select>
              </div>
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
