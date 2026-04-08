import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import './Usuarios.css';
import { appAlert, appConfirm } from './appDialog';
import AppTable from './AppTable';

export default function Usuarios({ currentUser, onlySelf = false }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [usuarioExpandidoId, setUsuarioExpandidoId] = useState(null);
  const [nuevo, setNuevo] = useState({
    nombre: '',
    apellido: '',
    username: '',
    correo: '',
    password: '',
    tipo: 'vendedor',
    telefono: '',
    direccion: '',
  });
  const esPropietario = String(currentUser?.tipo || '').toLowerCase() === 'propietario';
  const currentUserId = Number(currentUser?.id || 0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await api.getUsuarios();
        setUsuarios(rows);
      } catch (err) {
        setError(err.message || 'No se pudieron cargar los usuarios.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleSort = (column) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDir('asc');
  };

  const usuariosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter((u) =>
      [
        u.nombre,
        u.apellido,
        u.username,
        u.correo,
        u.tipo,
        u.telefono,
        u.direccion,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [usuarios, busqueda]);

  const usuariosOrdenados = useMemo(() => {
    const list = [...usuariosFiltrados];
    const dir = sortDir === 'asc' ? 1 : -1;
    const asText = (v) => String(v ?? '').toLowerCase();
    list.sort((a, b) => {
      switch (sortBy) {
        case 'username':
          return asText(a.username).localeCompare(asText(b.username)) * dir;
        case 'correo':
          return asText(a.correo).localeCompare(asText(b.correo)) * dir;
        case 'tipo':
          return asText(a.tipo).localeCompare(asText(b.tipo)) * dir;
        case 'telefono':
          return asText(a.telefono).localeCompare(asText(b.telefono)) * dir;
        case 'direccion':
          return asText(a.direccion).localeCompare(asText(b.direccion)) * dir;
        case 'nombre':
        default:
          return asText(`${a.nombre || ''} ${a.apellido || ''}`).localeCompare(asText(`${b.nombre || ''} ${b.apellido || ''}`)) * dir;
      }
    });
    return list;
  }, [usuariosFiltrados, sortBy, sortDir]);

  const usuarioPropio = useMemo(
    () => usuarios.find((u) => Number(u.id) === currentUserId) || null,
    [usuarios, currentUserId]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevo((prev) => ({ ...prev, [name]: value }));
  };

  const guardarUsuario = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...nuevo,
        nombre: nuevo.nombre || null,
        apellido: nuevo.apellido || null,
        telefono: nuevo.telefono || null,
        direccion: nuevo.direccion || null,
      };
      if (editandoId && !String(payload.password || '').trim()) {
        delete payload.password;
      }

      if (editandoId) {
        const actualizado = await api.updateUsuario(editandoId, payload);
        setUsuarios((prev) => prev.map((u) => (u.id === editandoId ? actualizado : u)));
        if (Number(actualizado.id) === currentUserId && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ferco:user-updated', { detail: actualizado }));
        }
      } else {
        const creado = await api.createUsuario(payload);
        setUsuarios((prev) => [creado, ...prev]);
      }

      setNuevo({
        nombre: '',
        apellido: '',
        username: '',
        correo: '',
        password: '',
        tipo: 'vendedor',
        telefono: '',
        direccion: '',
      });
      setEditandoId(null);
      setMostrarForm(false);
    } catch (err) {
      await appAlert(err.message || (editandoId ? 'No se pudo actualizar el usuario.' : 'No se pudo crear el usuario.'));
    }
  };

  const editarUsuario = (usuario) => {
    setEditandoId(usuario.id);
    setUsuarioExpandidoId(null);
    setNuevo({
      nombre: usuario.nombre || '',
      apellido: usuario.apellido || '',
      username: usuario.username || '',
      correo: usuario.correo || '',
      password: '',
      tipo: usuario.tipo || 'vendedor',
      telefono: usuario.telefono || '',
      direccion: usuario.direccion || '',
    });
    setMostrarForm(true);
  };

  const eliminarUsuario = async (id) => {
    const ok = await appConfirm('¿Seguro que deseas eliminar este usuario?', {
      title: 'Eliminar usuario',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });
    if (!ok) return;
    try {
      await api.deleteUsuario(id);
      setUsuarios((prev) => prev.filter((u) => u.id !== id));
      setUsuarioExpandidoId((prev) => (prev === id ? null : prev));
      if (editandoId === id) {
        setEditandoId(null);
        setMostrarForm(false);
      }
    } catch (err) {
      await appAlert(err.message || 'No se pudo eliminar el usuario.');
    }
  };

  useEffect(() => {
    if (onlySelf && !esPropietario && usuarioPropio) {
      setEditandoId(usuarioPropio.id);
      setUsuarioExpandidoId(null);
      setNuevo({
        nombre: usuarioPropio.nombre || '',
        apellido: usuarioPropio.apellido || '',
        username: usuarioPropio.username || '',
        correo: usuarioPropio.correo || '',
        password: '',
        tipo: usuarioPropio.tipo || 'vendedor',
        telefono: usuarioPropio.telefono || '',
        direccion: usuarioPropio.direccion || '',
      });
      setMostrarForm(true);
    }
  }, [onlySelf, esPropietario, usuarioPropio]);

  const sortMark = (column) => (sortBy === column ? (sortDir === 'asc' ? '▲' : '▼') : '');

  const usuariosColumns = [
    {
      key: 'nombre',
      header: (
        <button type="button" className="sort-header-btn" onClick={() => toggleSort('nombre')}>
          Nombre {sortMark('nombre')}
        </button>
      ),
      mobileLabel: 'Nombre',
      render: (u) => `${u.nombre || ''} ${u.apellido || ''}`.trim() || '-',
    },
    {
      key: 'username',
      header: (
        <button type="button" className="sort-header-btn" onClick={() => toggleSort('username')}>
          Usuario {sortMark('username')}
        </button>
      ),
      mobileLabel: 'Usuario',
      render: (u) => u.username || '-',
    },
    {
      key: 'correo',
      header: (
        <button type="button" className="sort-header-btn" onClick={() => toggleSort('correo')}>
          Correo {sortMark('correo')}
        </button>
      ),
      mobileLabel: 'Correo',
      render: (u) => u.correo || '-',
    },
    {
      key: 'tipo',
      header: (
        <button type="button" className="sort-header-btn" onClick={() => toggleSort('tipo')}>
          Tipo {sortMark('tipo')}
        </button>
      ),
      mobileLabel: 'Tipo',
      render: (u) => u.tipo || '-',
    },
    {
      key: 'telefono',
      header: (
        <button type="button" className="sort-header-btn" onClick={() => toggleSort('telefono')}>
          Teléfono {sortMark('telefono')}
        </button>
      ),
      mobileLabel: 'Teléfono',
      render: (u) => u.telefono || '-',
    },
    {
      key: 'direccion',
      header: (
        <button type="button" className="sort-header-btn" onClick={() => toggleSort('direccion')}>
          Dirección {sortMark('direccion')}
        </button>
      ),
      mobileLabel: 'Dirección',
      render: (u) => u.direccion || '-',
    },
  ];

  return (
    <div className="usuarios-main">
      {!onlySelf && (
      <div className="usuarios-toolbar">
        <h3>Usuarios del sistema</h3>
        <input
          type="text"
          className="buscar-usuario"
          placeholder="Buscar usuario..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {esPropietario && (
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              setEditandoId(null);
              setNuevo({
                nombre: '',
                apellido: '',
                username: '',
                correo: '',
                password: '',
                tipo: 'vendedor',
                telefono: '',
                direccion: '',
              });
              setMostrarForm(true);
            }}
          >
            <img src="/add.svg" alt="" aria-hidden="true" />
            <span>USUARIO</span>
          </button>
        )}
      </div>
      )}

      {loading && <div className="usuarios-msg">Cargando usuarios...</div>}
      {!loading && error && <div className="usuarios-msg error">{error}</div>}

      {!onlySelf && !loading && !error && (
        <AppTable
          className="usuarios-table"
          tableClassName="usuarios-table-grid"
          columns={usuariosColumns}
          rows={usuariosOrdenados}
          rowKey="id"
          emptyMessage="No hay usuarios registrados."
          onRowClick={(u) => setUsuarioExpandidoId((prev) => (prev === u.id ? null : u.id))}
          rowClassName={(u) => `usuario-row ${usuarioExpandidoId === u.id ? 'expanded' : ''}`}
          expandedRowId={usuarioExpandidoId}
          renderExpandedRow={(u) => (
            <div className="usuario-actions show">
              {(esPropietario || Number(u.id) === currentUserId) && (
                <button type="button" className="edit-btn" onClick={() => editarUsuario(u)}>Editar</button>
              )}
              {esPropietario && Number(u.id) !== currentUserId && (
                <button type="button" className="delete-btn" onClick={() => eliminarUsuario(u.id)}>Eliminar</button>
              )}
            </div>
          )}
        />
      )}

      <div className={`side-panel-overlay ${mostrarForm ? 'open' : ''} ${onlySelf ? 'only-self' : ''}`} aria-hidden={!mostrarForm}>
        {!onlySelf && <div className="side-panel-backdrop" onClick={() => setMostrarForm(false)} />}
        <aside className="side-panel">
          <div className="side-panel-header">
            <h3>{onlySelf ? 'Mi usuario' : (editandoId ? 'Editar usuario' : 'Nuevo usuario')}</h3>
            {!onlySelf && <button type="button" className="side-panel-close" onClick={() => setMostrarForm(false)}>✕</button>}
          </div>
          <form className="usuario-form" onSubmit={guardarUsuario}>
            <label className="field-label">Nombre
              <input name="nombre" value={nuevo.nombre} onChange={handleChange} />
            </label>
            <label className="field-label">Apellido
              <input name="apellido" value={nuevo.apellido} onChange={handleChange} />
            </label>
            <label className="field-label">Usuario
              <input name="username" value={nuevo.username} onChange={handleChange} required />
            </label>
            <label className="field-label">Correo
              <input name="correo" type="email" value={nuevo.correo} onChange={handleChange} required />
            </label>
            <label className="field-label">Contraseña
              <input
                name="password"
                type="password"
                value={nuevo.password}
                onChange={handleChange}
                required={!editandoId}
                placeholder={editandoId ? 'Dejar en blanco para mantener' : ''}
              />
            </label>
            <label className="field-label">Tipo
              <select name="tipo" value={nuevo.tipo} onChange={handleChange} disabled={!esPropietario}>
                <option value="vendedor">Vendedor</option>
                <option value="propietario">Propietario</option>
              </select>
            </label>
            <label className="field-label">Teléfono
              <input name="telefono" value={nuevo.telefono} onChange={handleChange} />
            </label>
            <label className="field-label">Dirección
              <input name="direccion" value={nuevo.direccion} onChange={handleChange} />
            </label>
            <div className="usuario-form-actions">
              <button type="submit">{editandoId ? 'Guardar cambios' : 'Guardar'}</button>
              <button type="button" onClick={() => setMostrarForm(false)}>Cancelar</button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
