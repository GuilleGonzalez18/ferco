import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../core/api';
import { useConfig } from '../../core/ConfigContext';
import AppButton from '../../shared/components/button/AppButton';
import AppInput from '../../shared/components/fields/AppInput';
import AppTextarea from '../../shared/components/fields/AppTextarea';
import AppSelect from '../../shared/components/fields/AppSelect';
import './Configuracion.css';

const TABS = [
  { key: 'empresa', label: 'Empresa' },
  { key: 'modulos', label: 'Módulos' },
  { key: 'ganancias', label: 'Ganancias' },
];

// ── TAB EMPRESA ───────────────────────────────────────────────────────────────

function TabEmpresa({ empresa: initialEmpresa, onSaved }) {
  const [form, setForm] = useState({
    nombre: '',
    razon_social: '',
    rut: '',
    direccion: '',
    telefono: '',
    correo: '',
    website: '',
    logo_base64: null,
    color_primary: '#375f8c',
    color_primary_strong: '#294c74',
    color_primary_soft: '#e7effa',
    color_menu_bg: '#1f2933',
    color_menu_active: '#375f8c',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (initialEmpresa) {
      setForm({
        nombre: initialEmpresa.nombre || '',
        razon_social: initialEmpresa.razon_social || '',
        rut: initialEmpresa.rut || '',
        direccion: initialEmpresa.direccion || '',
        telefono: initialEmpresa.telefono || '',
        correo: initialEmpresa.correo || '',
        website: initialEmpresa.website || '',
        logo_base64: initialEmpresa.logo_base64 || null,
        color_primary: initialEmpresa.color_primary || '#375f8c',
        color_primary_strong: initialEmpresa.color_primary_strong || '#294c74',
        color_primary_soft: initialEmpresa.color_primary_soft || '#e7effa',
        color_menu_bg: initialEmpresa.color_menu_bg || '#1f2933',
        color_menu_active: initialEmpresa.color_menu_active || '#375f8c',
      });
    }
  }, [initialEmpresa]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      setErr('El logo no puede superar 1.5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((prev) => ({ ...prev, logo_base64: ev.target.result }));
      setErr('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setForm((prev) => ({ ...prev, logo_base64: null }));
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      await api.updateConfigEmpresa(form);
      setMsg('Configuración guardada correctamente.');
      onSaved?.();
    } catch (error) {
      setErr(error.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="config-tab-form" onSubmit={handleSave}>
      <div className="config-section">
        <h3 className="config-section-title">Datos de la empresa</h3>
        <div className="config-field-row">
          <label className="config-field-label">Nombre *</label>
          <AppInput value={form.nombre} onChange={set('nombre')} placeholder="Nombre de la empresa" required />
        </div>
        <div className="config-field-row">
          <label className="config-field-label">Razón social</label>
          <AppInput value={form.razon_social} onChange={set('razon_social')} placeholder="Razón social" />
        </div>
        <div className="config-field-row">
          <label className="config-field-label">RUT</label>
          <AppInput value={form.rut} onChange={set('rut')} placeholder="RUT" />
        </div>
        <div className="config-field-row">
          <label className="config-field-label">Dirección</label>
          <AppTextarea value={form.direccion} onChange={set('direccion')} placeholder="Dirección" rows={2} />
        </div>
        <div className="config-field-row">
          <label className="config-field-label">Teléfono</label>
          <AppInput value={form.telefono} onChange={set('telefono')} placeholder="Teléfono" />
        </div>
        <div className="config-field-row">
          <label className="config-field-label">Correo</label>
          <AppInput type="email" value={form.correo} onChange={set('correo')} placeholder="correo@empresa.com" />
        </div>
        <div className="config-field-row">
          <label className="config-field-label">Sitio web</label>
          <AppInput value={form.website} onChange={set('website')} placeholder="https://..." />
        </div>
      </div>

      <div className="config-section">
        <h3 className="config-section-title">Logo</h3>
        <div className="config-logo-area">
          {form.logo_base64 ? (
            <div className="config-logo-preview-wrap">
              <img src={form.logo_base64} alt="Logo preview" className="config-logo-preview" />
              <AppButton type="button" tone="danger" size="sm" onClick={handleRemoveLogo}>
                Quitar logo
              </AppButton>
            </div>
          ) : (
            <div className="config-logo-placeholder">Sin logo</div>
          )}
          <AppButton type="button" size="sm" onClick={() => fileRef.current?.click()}>
            {form.logo_base64 ? 'Cambiar logo' : 'Subir logo'}
          </AppButton>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleLogoChange}
          />
          <p className="config-hint">Formatos: PNG, JPG, SVG. Máximo 1.5 MB.</p>
        </div>
      </div>

      <div className="config-section">
        <h3 className="config-section-title">Colores</h3>
        <div className="config-colors-grid">
          <div className="config-color-row">
            <label className="config-field-label">Color principal</label>
            <div className="config-color-input-wrap">
              <input type="color" value={form.color_primary} onChange={set('color_primary')} className="config-color-picker" />
              <AppInput value={form.color_primary} onChange={set('color_primary')} placeholder="#375f8c" className="config-color-text" />
            </div>
          </div>
          <div className="config-color-row">
            <label className="config-field-label">Color principal fuerte</label>
            <div className="config-color-input-wrap">
              <input type="color" value={form.color_primary_strong} onChange={set('color_primary_strong')} className="config-color-picker" />
              <AppInput value={form.color_primary_strong} onChange={set('color_primary_strong')} placeholder="#294c74" className="config-color-text" />
            </div>
          </div>
          <div className="config-color-row">
            <label className="config-field-label">Color principal suave</label>
            <div className="config-color-input-wrap">
              <input type="color" value={form.color_primary_soft} onChange={set('color_primary_soft')} className="config-color-picker" />
              <AppInput value={form.color_primary_soft} onChange={set('color_primary_soft')} placeholder="#e7effa" className="config-color-text" />
            </div>
          </div>
          <div className="config-color-row">
            <label className="config-field-label">Fondo del menú</label>
            <div className="config-color-input-wrap">
              <input type="color" value={form.color_menu_bg} onChange={set('color_menu_bg')} className="config-color-picker" />
              <AppInput value={form.color_menu_bg} onChange={set('color_menu_bg')} placeholder="#1f2933" className="config-color-text" />
            </div>
          </div>
          <div className="config-color-row">
            <label className="config-field-label">Color activo del menú</label>
            <div className="config-color-input-wrap">
              <input type="color" value={form.color_menu_active} onChange={set('color_menu_active')} className="config-color-picker" />
              <AppInput value={form.color_menu_active} onChange={set('color_menu_active')} placeholder="#375f8c" className="config-color-text" />
            </div>
          </div>
        </div>
        <div className="config-colors-preview">
          <span style={{ background: form.color_primary, color: '#fff', padding: '6px 16px', borderRadius: 6, fontSize: 13 }}>Principal</span>
          <span style={{ background: form.color_primary_strong, color: '#fff', padding: '6px 16px', borderRadius: 6, fontSize: 13 }}>Fuerte</span>
          <span style={{ background: form.color_primary_soft, color: form.color_primary, padding: '6px 16px', borderRadius: 6, fontSize: 13 }}>Suave</span>
          <span style={{ background: form.color_menu_bg, color: '#e6ecf4', padding: '6px 16px', borderRadius: 6, fontSize: 13 }}>Menú</span>
          <span style={{ background: form.color_menu_active, color: '#fff', padding: '6px 16px', borderRadius: 6, fontSize: 13 }}>Activo</span>
        </div>
      </div>

      {err && <p className="config-error">{err}</p>}
      {msg && <p className="config-ok">{msg}</p>}
      <div className="config-actions">
        <AppButton type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</AppButton>
      </div>
    </form>
  );
}

// ── TAB MÓDULOS ───────────────────────────────────────────────────────────────

function TabModulos({ onSaved }) {
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [err, setErr] = useState('');

  const cargarModulos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getConfigModulos();
      setModulos(data);
    } catch (e) {
      setErr(e.message || 'Error al cargar módulos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarModulos(); }, [cargarModulos]);

  const toggleModulo = async (codigo, habilitado) => {
    setSaving(codigo);
    setErr('');
    try {
      await api.updateConfigModulo(codigo, habilitado);
      setModulos((prev) => prev.map((m) => m.codigo === codigo ? { ...m, habilitado } : m));
      onSaved?.();
    } catch (e) {
      setErr(e.message || 'Error al actualizar módulo');
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="config-loading">Cargando módulos...</div>;

  return (
    <div className="config-tab-form">
      <div className="config-section">
        <h3 className="config-section-title">Módulos del sistema</h3>
        <p className="config-hint">Habilitá o deshabilitá secciones del menú. Los módulos deshabilitados no aparecen en la navegación.</p>
        <div className="config-modulos-list">
          {modulos.map((mod) => (
            <div key={mod.codigo} className="config-modulo-row">
              <div className="config-modulo-info">
                <span className="config-modulo-label">{mod.label}</span>
                {mod.solo_propietario && <span className="config-modulo-badge">Solo propietario</span>}
              </div>
              <label className="config-toggle" title={mod.habilitado ? 'Deshabilitar' : 'Habilitar'}>
                <input
                  type="checkbox"
                  checked={mod.habilitado}
                  disabled={saving === mod.codigo}
                  onChange={(e) => toggleModulo(mod.codigo, e.target.checked)}
                  className="config-toggle-input"
                />
                <span className="config-toggle-track" />
              </label>
            </div>
          ))}
        </div>
        {err && <p className="config-error">{err}</p>}
      </div>
    </div>
  );
}

// ── TAB GANANCIAS ─────────────────────────────────────────────────────────────

function TabGanancias() {
  const [metodos, setMetodos] = useState([]);
  const [metodoId, setMetodoId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.getConfigGanancias().then((data) => {
      setMetodos(data.metodos || []);
      if (data.config?.metodo_id) setMetodoId(String(data.config.metodo_id));
    }).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!metodoId) return;
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      await api.updateConfigGanancias({ metodo_id: Number(metodoId) });
      setMsg('Método de cálculo actualizado.');
    } catch (error) {
      setErr(error.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="config-loading">Cargando configuración...</div>;

  const metodoSeleccionado = metodos.find((m) => String(m.id) === metodoId);

  return (
    <form className="config-tab-form" onSubmit={handleSave}>
      <div className="config-section">
        <h3 className="config-section-title">Método de cálculo de ganancias</h3>
        <p className="config-hint">Define cómo se calcula la ganancia en el dashboard y en los reportes de estadísticas.</p>
        <div className="config-field-row">
          <label className="config-field-label">Método activo</label>
          <AppSelect value={metodoId} onChange={(e) => setMetodoId(e.target.value)}>
            <option value="">Seleccioná un método...</option>
            {metodos.map((m) => (
              <option key={m.id} value={String(m.id)}>{m.label}</option>
            ))}
          </AppSelect>
        </div>
        {metodoSeleccionado && (
          <div className="config-metodo-desc">
            <p>{metodoSeleccionado.descripcion}</p>
          </div>
        )}
      </div>
      {err && <p className="config-error">{err}</p>}
      {msg && <p className="config-ok">{msg}</p>}
      <div className="config-actions">
        <AppButton type="submit" disabled={saving || !metodoId}>
          {saving ? 'Guardando...' : 'Guardar método'}
        </AppButton>
      </div>
    </form>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function Configuracion() {
  const [tab, setTab] = useState('empresa');
  const { empresa, reloadConfig } = useConfig();

  return (
    <div className="config-root">
      <div className="config-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`config-tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="config-panel">
        {tab === 'empresa' && <TabEmpresa empresa={empresa} onSaved={reloadConfig} />}
        {tab === 'modulos' && <TabModulos onSaved={reloadConfig} />}
        {tab === 'ganancias' && <TabGanancias />}
      </div>
    </div>
  );
}
