import { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../../core/api';
import './Clientes.css';
import { appAlert, appConfirm } from '../../shared/lib/appDialog';
import { RiFileExcel2Line } from 'react-icons/ri';
import { PiFilePdfBold } from 'react-icons/pi';
import { AiFillPrinter } from 'react-icons/ai';
import AppTable from '../../shared/components/table/AppTable';
import AppInput from '../../shared/components/fields/AppInput';
import AppSelect from '../../shared/components/fields/AppSelect';
import { formatHorarioCliente, isValidHorarioRange, normalizeHoraForSave, splitHora } from '../../shared/lib/horarios';
import AppButton from '../../shared/components/button/AppButton';

export default function Clientes() {
  const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const MINUTOS = ['00', '15', '30', '45'];

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
    tiene_reapertura: false,
    horario_reapertura: '',
    horario_cierre_reapertura: '',
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

  const handleReaperturaChange = (checked) => {
    setNuevo((prev) => ({
      ...prev,
      tiene_reapertura: checked,
      horario_reapertura: checked ? prev.horario_reapertura : '',
      horario_cierre_reapertura: checked ? prev.horario_cierre_reapertura : '',
    }));
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
        tiene_reapertura: Boolean(nuevo.tiene_reapertura),
        horario_reapertura: nuevo.tiene_reapertura ? normalizeHoraForSave(nuevo.horario_reapertura) : null,
        horario_cierre_reapertura: nuevo.tiene_reapertura ? normalizeHoraForSave(nuevo.horario_cierre_reapertura) : null,
      };

      if (!isValidHorarioRange(payload.horario_apertura, payload.horario_cierre)) {
        await appAlert('El horario de apertura debe ser menor al horario de cierre.');
        return;
      }
      if (payload.tiene_reapertura && (!payload.horario_apertura || !payload.horario_cierre)) {
        await appAlert('Si el cliente tiene reapertura, completa también apertura y cierre principal.');
        return;
      }
      if (payload.tiene_reapertura && !payload.horario_reapertura && !payload.horario_cierre_reapertura) {
        await appAlert('Debes completar el horario de reapertura.');
        return;
      }
      if (payload.tiene_reapertura && (!payload.horario_reapertura || !payload.horario_cierre_reapertura)) {
        await appAlert('Debes completar ambos horarios de reapertura.');
        return;
      }
      if (payload.tiene_reapertura && !isValidHorarioRange(payload.horario_reapertura, payload.horario_cierre_reapertura)) {
        await appAlert('El horario de reapertura debe ser menor al cierre de reapertura.');
        return;
      }

      if (editandoId) {
        const actualizado = await api.updateCliente(editandoId, payload);
        setClientes((prev) => prev.map((c) => (c.id === editandoId ? actualizado : c)));
      } else {
        const creado = await api.createCliente(payload);
        setClientes((prev) => [creado, ...prev]);
      }

      setNuevo({
        nombre: '',
        rut: '',
        direccion: '',
        telefono: '',
        correo: '',
        horario_apertura: '',
        horario_cierre: '',
        tiene_reapertura: false,
        horario_reapertura: '',
        horario_cierre_reapertura: '',
      });
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
      tiene_reapertura: Boolean(cliente.tiene_reapertura),
      horario_reapertura: cliente.horario_reapertura || '',
      horario_cierre_reapertura: cliente.horario_cierre_reapertura || '',
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
        setNuevo({
          nombre: '',
          rut: '',
          direccion: '',
          telefono: '',
          correo: '',
          horario_apertura: '',
          horario_cierre: '',
          tiene_reapertura: false,
          horario_reapertura: '',
          horario_cierre_reapertura: '',
        });
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
        head: [['Nombre', 'Rut/C.I.', 'Dirección', 'Teléfono', 'Mail', 'Horarios']],
        body: filtrados.map((c) => [
          c.nombre || '',
          c.rut || '',
          c.direccion || '',
          c.telefono || '',
          c.correo || '',
          formatHorarioCliente(c).replace(' y ', '\n'),
        ]),
        styles: { fontSize: 8.2, valign: 'middle', cellPadding: 2.2 },
        headStyles: { fillColor: [55, 95, 140] },
        tableWidth: 'wrap',
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 18 },
          2: { cellWidth: 44 },
          3: { cellWidth: 20 },
          4: { cellWidth: 32 },
          5: { cellWidth: 36 },
        },
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
          <td>${formatHorarioCliente(c)}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <html><head><meta charset="UTF-8" /></head><body>
        <table border="1" style="border-collapse:collapse;width:100%">
          <thead>
            <tr style="background:#375f8c;color:#fff">
              <th>Nombre</th><th>Rut/C.I.</th><th>Dirección</th><th>Teléfono</th><th>Mail</th><th>Horarios</th>
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
        <td>${formatHorarioCliente(c)}</td>
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
            <th>Nombre</th><th>Rut/C.I.</th><th>Dirección</th><th>Teléfono</th><th>Mail</th><th>Horarios</th>
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
    setNuevo({
      nombre: '',
      rut: '',
      direccion: '',
      telefono: '',
      correo: '',
      horario_apertura: '',
      horario_cierre: '',
      tiene_reapertura: false,
      horario_reapertura: '',
      horario_cierre_reapertura: '',
    });
    setMostrarForm(true);
  };

  const cerrarPanel = () => {
    setMostrarForm(false);
    setEditandoId(null);
    setNuevo({
      nombre: '',
      rut: '',
      direccion: '',
      telefono: '',
      correo: '',
      horario_apertura: '',
      horario_cierre: '',
      tiene_reapertura: false,
      horario_reapertura: '',
      horario_cierre_reapertura: '',
    });
  };

  const aperturaPartes = splitHora(nuevo.horario_apertura);
  const cierrePartes = splitHora(nuevo.horario_cierre);
  const reaperturaPartes = splitHora(nuevo.horario_reapertura);
  const cierreReaperturaPartes = splitHora(nuevo.horario_cierre_reapertura);

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
          Horarios {sortMark('horario_apertura')}
        </button>
      ),
      mobileLabel: 'Horarios',
      render: (c) => formatHorarioCliente(c),
    },
  ];

  return (
    <div className="clientes-main">
      <div className="clientes-toolbar">
        <AppInput
          type="text"
          className="buscar-cliente"
          placeholder="Buscar por nombre o RUT/C.I."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <AppButton
          type="button"
          className="icon-btn"
          title="Agregar cliente"
          onClick={abrirAlta}
        >
          <img src="/add.svg" alt="" aria-hidden="true" />
          <span>CLIENTE</span>
        </AppButton>
        <AppButton type="button" className="icon-btn" title="Exportar" onClick={() => setExportModalOpen(true)}>
          <img src="/print.svg" alt="" aria-hidden="true" />
        </AppButton>
      </div>

      {exportModalOpen && (
        <div className="export-modal-overlay" role="dialog" aria-modal="true">
          <div className="export-modal-backdrop" onClick={() => setExportModalOpen(false)} />
          <div className="export-modal">
            <h4>Exportar clientes</h4>
            <p>Elige un formato:</p>
            <div className="export-modal-actions">
              <AppButton type="button" onClick={() => { exportarPDF(); setExportModalOpen(false); }}>
                <PiFilePdfBold />
                <span>PDF</span>
              </AppButton>
              <AppButton type="button" onClick={() => { exportarExcel(); setExportModalOpen(false); }}>
                <RiFileExcel2Line />
                <span>EXCEL</span>
              </AppButton>
              <AppButton type="button" onClick={() => { imprimirClientes(); setExportModalOpen(false); }}>
                <AiFillPrinter />
                <span>Impresora</span>
              </AppButton>
            </div>
            <AppButton type="button" className="export-modal-close" onClick={() => setExportModalOpen(false)}>
              Cerrar
            </AppButton>
          </div>
        </div>
      )}

      <AppTable
        stickyHeader
        columns={clientesColumns}
        rows={clientesOrdenados}
        rowKey="id"
        emptyMessage="No hay clientes"
        onRowClick={(c) => setClienteExpandidoId((prev) => (prev === c.id ? null : c.id))}
        rowClassName="cliente-row"
        expandedRowId={clienteExpandidoId}
        renderExpandedRow={(c) => (
          <div className="acciones-cliente-panel">
            <AppButton
              type="button"
              className="edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                editarCliente(c);
              }}
            >
              Editar
            </AppButton>
            <AppButton
              type="button"
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                eliminarCliente(c.id);
              }}
            >
              Eliminar
            </AppButton>
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
              <AppInput name="nombre" value={nuevo.nombre} onChange={handleChange} placeholder="Nombre" required />
            </label>
            <label className="field-label">RUT / C.I.
              <AppInput name="rut" value={nuevo.rut} onChange={handleChange} placeholder="Rut/C.I." required />
            </label>
            <label className="field-label">Dirección
              <AppInput name="direccion" value={nuevo.direccion} onChange={handleChange} placeholder="Dirección" />
            </label>
            <label className="field-label">Teléfono
              <AppInput name="telefono" value={nuevo.telefono} onChange={handleChange} placeholder="Teléfono" />
            </label>
            <label className="field-label">Mail
              <AppInput name="correo" value={nuevo.correo} onChange={handleChange} placeholder="Mail" type="email" />
            </label>
            <label className="field-label">Horario apertura
              <div className="time-selects">
                <AppSelect
                  value={aperturaPartes.h}
                  onChange={(e) => setHorarioPart('horario_apertura', 'h', e.target.value)}
                >
                  <option value="">Hora</option>
                  {HORAS.map((h) => <option key={`ap-h-${h}`} value={h}>{h}</option>)}
                </AppSelect>
                <span>:</span>
                <AppSelect
                  value={aperturaPartes.m}
                  onChange={(e) => setHorarioPart('horario_apertura', 'm', e.target.value)}
                >
                  <option value="">Min</option>
                  {MINUTOS.map((m) => <option key={`ap-m-${m}`} value={m}>{m}</option>)}
                </AppSelect>
              </div>
            </label>
            <label className="field-label">Horario cierre
              <div className="time-selects">
                <AppSelect
                  value={cierrePartes.h}
                  onChange={(e) => setHorarioPart('horario_cierre', 'h', e.target.value)}
                >
                  <option value="">Hora</option>
                  {HORAS.map((h) => <option key={`ci-h-${h}`} value={h}>{h}</option>)}
                </AppSelect>
                <span>:</span>
                <AppSelect
                  value={cierrePartes.m}
                  onChange={(e) => setHorarioPart('horario_cierre', 'm', e.target.value)}
                >
                  <option value="">Min</option>
                  {MINUTOS.map((m) => <option key={`ci-m-${m}`} value={m}>{m}</option>)}
                </AppSelect>
              </div>
            </label>
            <label className="field-label field-checkbox-inline">
              <AppInput
                type="checkbox"
                checked={Boolean(nuevo.tiene_reapertura)}
                onChange={(e) => handleReaperturaChange(e.target.checked)}
              />
              <span>Tiene reapertura</span>
            </label>
            {nuevo.tiene_reapertura && (
              <>
                <label className="field-label">Horario reapertura
                  <div className="time-selects">
                    <AppSelect
                      value={reaperturaPartes.h}
                      onChange={(e) => setHorarioPart('horario_reapertura', 'h', e.target.value)}
                    >
                      <option value="">Hora</option>
                      {HORAS.map((h) => <option key={`ra-h-${h}`} value={h}>{h}</option>)}
                    </AppSelect>
                    <span>:</span>
                    <AppSelect
                      value={reaperturaPartes.m}
                      onChange={(e) => setHorarioPart('horario_reapertura', 'm', e.target.value)}
                    >
                      <option value="">Min</option>
                      {MINUTOS.map((m) => <option key={`ra-m-${m}`} value={m}>{m}</option>)}
                    </AppSelect>
                  </div>
                </label>
                <label className="field-label">Cierre reapertura
                  <div className="time-selects">
                    <AppSelect
                      value={cierreReaperturaPartes.h}
                      onChange={(e) => setHorarioPart('horario_cierre_reapertura', 'h', e.target.value)}
                    >
                      <option value="">Hora</option>
                      {HORAS.map((h) => <option key={`rc-h-${h}`} value={h}>{h}</option>)}
                    </AppSelect>
                    <span>:</span>
                    <AppSelect
                      value={cierreReaperturaPartes.m}
                      onChange={(e) => setHorarioPart('horario_cierre_reapertura', 'm', e.target.value)}
                    >
                      <option value="">Min</option>
                      {MINUTOS.map((m) => <option key={`rc-m-${m}`} value={m}>{m}</option>)}
                    </AppSelect>
                  </div>
                </label>
              </>
            )}
            <div className="cliente-form-actions">
              <AppButton type="submit">{editandoId ? 'Guardar cambios' : 'Guardar'}</AppButton>
              <AppButton type="button" onClick={cerrarPanel}>Cancelar</AppButton>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}


