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
  { key: 'permisos', label: 'Permisos' },
];

function compressImage(dataUrl, maxW, maxH, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/webp', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function toHex(r, g, b) {
  const clamp = (v) => Math.min(255, Math.max(0, Math.round(v)));
  return '#' + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('');
}

function scaleColor(hex, factor) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return toHex(r * factor, g * factor, b * factor);
}

function mixWithWhite(hex, amount) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

function extractPaletteFromDataUrl(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 96;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;

      const buckets = {};
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 100) continue; // skip transparent

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Skip near-white and near-black
        const brightness = (r + g + b) / 3;
        if (brightness > 230 || brightness < 25) continue;

        // Skip desaturated colors (grays)
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        if (saturation < 0.2) continue;

        // Bucket with 24-step quantization
        const br = Math.round(r / 24) * 24;
        const bg = Math.round(g / 24) * 24;
        const bb = Math.round(b / 24) * 24;
        const key = `${br},${bg},${bb}`;
        buckets[key] = (buckets[key] || 0) + 1;
      }

      const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
      if (!sorted.length) { resolve(null); return; }

      const [rv, gv, bv] = sorted[0][0].split(',').map(Number);
      const primary = toHex(rv, gv, bv);
      resolve({
        color_primary: primary,
        color_primary_strong: scaleColor(primary, 0.75),
        color_primary_soft: mixWithWhite(primary, 0.85),
        color_menu_bg: scaleColor(primary, 0.35),
        color_menu_active: primary,
      });
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

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
    color_text: '#1d2b3e',
    color_text_muted: '#526278',
    color_menu_text: '#e6ecf4',
    fondo_base64: null,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [paletaSugerida, setPaletaSugerida] = useState(null);
  const fileRef = useRef(null);
  const fondoRef = useRef(null);

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
        color_text: initialEmpresa.color_text || '#1d2b3e',
        color_text_muted: initialEmpresa.color_text_muted || '#526278',
        color_menu_text: initialEmpresa.color_menu_text || '#e6ecf4',
        fondo_base64: initialEmpresa.fondo_base64 === '__none__' ? '' : (initialEmpresa.fondo_base64 || null),
      });
    }
  }, [initialEmpresa]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setErr('El logo no puede superar 10 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result, 400, 200, 0.8);
      setForm((prev) => ({ ...prev, logo_base64: compressed }));
      setErr('');
      const paleta = await extractPaletteFromDataUrl(compressed);
      if (paleta) setPaletaSugerida(paleta);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setForm((prev) => ({ ...prev, logo_base64: '' }));
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFondoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setErr('La imagen de fondo no puede superar 15 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result, 1920, 1080, 0.7);
      setForm((prev) => ({ ...prev, fondo_base64: compressed }));
      setErr('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFondo = () => {
    setForm((prev) => ({ ...prev, fondo_base64: '' }));
    if (fondoRef.current) fondoRef.current.value = '';
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
          {form.logo_base64 && form.logo_base64 !== '' ? (
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
            {form.logo_base64 && form.logo_base64 !== '' ? 'Cambiar logo' : 'Subir logo'}
          </AppButton>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleLogoChange}
          />
          <p className="config-hint">Formatos: PNG, JPG, WebP. Se comprime automáticamente.</p>
        </div>
        {paletaSugerida && (
          <div className="config-paleta-sugerida">
            <p className="config-paleta-label">
              🎨 Se detectaron colores del logo. ¿Querés aplicar una paleta basada en ellos?
            </p>
            <div className="config-paleta-preview">
              {Object.entries(paletaSugerida).map(([key, color]) => (
                <span key={key} title={key} style={{ background: color, width: 28, height: 28, borderRadius: 6, display: 'inline-block', border: '1px solid rgba(0,0,0,0.15)' }} />
              ))}
            </div>
            <div className="config-paleta-actions">
              <AppButton
                type="button"
                size="sm"
                onClick={() => {
                  setForm((prev) => ({ ...prev, ...paletaSugerida }));
                  setPaletaSugerida(null);
                }}
              >
                Aplicar paleta
              </AppButton>
              <AppButton type="button" size="sm" tone="ghost" onClick={() => setPaletaSugerida(null)}>
                No, mantener colores
              </AppButton>
            </div>
          </div>
        )}
      </div>

      <div className="config-section">
        <h3 className="config-section-title">Imagen de fondo</h3>
        <p className="config-hint">Se muestra detrás del contenido principal del sistema.</p>
        <div className="config-logo-area">
          {form.fondo_base64 && form.fondo_base64 !== '' ? (
            <div className="config-logo-preview-wrap">
              <img src={form.fondo_base64} alt="Fondo preview" className="config-fondo-preview" />
              <AppButton type="button" tone="danger" size="sm" onClick={handleRemoveFondo}>
                Sin fondo
              </AppButton>
            </div>
          ) : form.fondo_base64 === '' ? (
            <div className="config-logo-placeholder">Sin fondo (fondo blanco)</div>
          ) : (
            <div className="config-logo-preview-wrap">
              <img src="/mercatus-logo.png" alt="Fondo por defecto" className="config-fondo-preview" style={{ objectFit: 'contain', opacity: 0.5 }} />
              <AppButton type="button" tone="danger" size="sm" onClick={handleRemoveFondo}>
                Sin fondo
              </AppButton>
            </div>
          )}
          <AppButton type="button" size="sm" onClick={() => fondoRef.current?.click()}>
            {form.fondo_base64 && form.fondo_base64 !== '' ? 'Cambiar fondo' : 'Subir imagen personalizada'}
          </AppButton>
          <input
            ref={fondoRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFondoChange}
          />
          <p className="config-hint">Formatos: JPG, PNG, WebP. Se comprime automáticamente.</p>
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
          <div className="config-color-row">
            <label className="config-field-label">Texto del menú</label>
            <div className="config-color-input-wrap">
              <input type="color" value={form.color_menu_text} onChange={set('color_menu_text')} className="config-color-picker" />
              <AppInput value={form.color_menu_text} onChange={set('color_menu_text')} placeholder="#e6ecf4" className="config-color-text" />
            </div>
          </div>
          <div className="config-color-row">
            <label className="config-field-label">Color de texto</label>
            <div className="config-color-input-wrap">
              <input type="color" value={form.color_text} onChange={set('color_text')} className="config-color-picker" />
              <AppInput value={form.color_text} onChange={set('color_text')} placeholder="#1d2b3e" className="config-color-text" />
            </div>
          </div>
          <div className="config-color-row">
            <label className="config-field-label">Texto secundario</label>
            <div className="config-color-input-wrap">
              <input type="color" value={form.color_text_muted} onChange={set('color_text_muted')} className="config-color-picker" />
              <AppInput value={form.color_text_muted} onChange={set('color_text_muted')} placeholder="#526278" className="config-color-text" />
            </div>
          </div>
        </div>
        <div className="config-colors-preview">
          <span style={{ background: form.color_primary, color: '#fff', padding: '6px 16px', borderRadius: 6, fontSize: 13 }}>Principal</span>
          <span style={{ background: form.color_primary_strong, color: '#fff', padding: '6px 16px', borderRadius: 6, fontSize: 13 }}>Fuerte</span>
          <span style={{ background: form.color_primary_soft, color: form.color_primary, padding: '6px 16px', borderRadius: 6, fontSize: 13 }}>Suave</span>
          <span style={{ background: form.color_menu_bg, color: form.color_menu_text, padding: '6px 16px', borderRadius: 6, fontSize: 13 }}>Menú</span>
          <span style={{ background: form.color_menu_active, color: '#fff', padding: '6px 16px', borderRadius: 6, fontSize: 13 }}>Activo</span>
          <span style={{ color: form.color_text, background: '#f4f7fb', padding: '6px 16px', borderRadius: 6, fontSize: 13, border: '1px solid #ddd' }}>Texto</span>
          <span style={{ color: form.color_text_muted, background: '#f4f7fb', padding: '6px 16px', borderRadius: 6, fontSize: 13, border: '1px solid #ddd' }}>Secundario</span>
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
          {modulos.filter((mod) => mod.codigo !== 'configuracion').map((mod) => (
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

// ── TAB PERMISOS ──────────────────────────────────────────────────────────────

const RECURSOS = [
  { key: 'nueva-venta', label: 'Nueva venta',  acciones: ['usar'] },
  { key: 'ventas',      label: 'Ventas',        acciones: ['ver', 'eliminar', 'exportar'] },
  { key: 'productos',   label: 'Productos',     acciones: ['ver', 'agregar', 'editar', 'eliminar', 'ver_archivados', 'gestionar_empaques', 'ver_costo', 'ver_ganancia', 'exportar'] },
  { key: 'clientes',    label: 'Clientes',      acciones: ['ver', 'agregar', 'editar', 'eliminar', 'exportar'] },
  { key: 'usuarios',    label: 'Usuarios',      acciones: ['ver', 'agregar', 'editar', 'eliminar'] },
  { key: 'estadisticas',label: 'Estadísticas',  acciones: ['ver', 'ver_empresa', 'ver_por_usuario', 'exportar'] },
  { key: 'stock',       label: 'Stock',         acciones: ['ver', 'editar'] },
  { key: 'auditoria',   label: 'Auditoría',     acciones: ['ver', 'exportar'] },
  { key: 'configuracion',label:'Configuración', acciones: ['ver'] },
];

const ACCION_LABELS = {
  usar: 'Usar', ver: 'Ver', agregar: 'Agregar', editar: 'Editar',
  eliminar: 'Eliminar', exportar: 'Exportar', ver_costo: 'Ver costo',
  ver_ganancia: 'Ver ganancia', ver_archivados: 'Ver archivados',
  gestionar_empaques: 'Gestionar empaques',
  ver_empresa: 'Ver empresa', ver_por_usuario: 'Ver por usuario',
};

function ResumenPermisos({ recurso, acciones, permisos }) {
  const activos = acciones.filter((a) => permisos[`${recurso}:${a}`]);
  return (
    <span className="config-acordeon-resumen">
      {activos.length === 0
        ? <span className="resumen-ninguno">Sin acceso</span>
        : activos.length === acciones.length
          ? <span className="resumen-todos">Acceso total</span>
          : <span className="resumen-parcial">{activos.length} de {acciones.length}</span>
      }
    </span>
  );
}

function TabPermisos() {
  const [roles, setRoles] = useState([]);
  const [rolSeleccionado, setRolSeleccionado] = useState('');
  const [permisos, setPermisos] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [nuevoRol, setNuevoRol] = useState('');
  const [creandoRol, setCreandoRol] = useState(false);
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({});

  const loadRoles = useCallback(async () => {
    try {
      const rows = await api.getRoles();
      setRoles(rows);
      if (!rolSeleccionado && rows.length > 0) setRolSeleccionado(rows[0].nombre);
    } catch { /* ignore */ }
  }, [rolSeleccionado]);

  const loadPermisos = useCallback(async (rol) => {
    if (!rol) return;
    try {
      const rows = await api.getPermisos(rol);
      const map = {};
      for (const { recurso, accion, habilitado } of rows) {
        map[`${recurso}:${accion}`] = !!habilitado;
      }
      setPermisos(map);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadRoles(); }, [loadRoles]);
  useEffect(() => { if (rolSeleccionado) loadPermisos(rolSeleccionado); }, [rolSeleccionado, loadPermisos]);

  const toggle = (recurso, accion) => {
    const key = `${recurso}:${accion}`;
    setPermisos((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSeccion = (key) => {
    setSeccionesAbiertas((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleTodosSeccion = (recurso, acciones) => {
    const todosActivos = acciones.every((a) => permisos[`${recurso}:${a}`]);
    setPermisos((prev) => {
      const next = { ...prev };
      for (const a of acciones) next[`${recurso}:${a}`] = !todosActivos;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true); setMsg(''); setErr('');
    try {
      const payload = RECURSOS.flatMap(({ key: recurso, acciones }) =>
        acciones.map((accion) => ({ recurso, accion, habilitado: !!(permisos[`${recurso}:${accion}`]) }))
      );
      await api.updatePermisos(rolSeleccionado, payload);
      setMsg('Permisos guardados correctamente.');
      window.dispatchEvent(new CustomEvent('mercatus:permisos-updated'));
    } catch (e) {
      setErr(e.message || 'Error al guardar permisos');
    } finally {
      setSaving(false);
    }
  };

  const handleCrearRol = async () => {
    if (!nuevoRol.trim()) return;
    setCreandoRol(true); setErr('');
    try {
      await api.crearRol(nuevoRol.trim());
      setNuevoRol('');
      await loadRoles();
      setRolSeleccionado(nuevoRol.trim().toLowerCase());
    } catch (e) {
      setErr(e.message || 'Error al crear rol');
    } finally {
      setCreandoRol(false);
    }
  };

  const handleEliminarRol = async (nombre) => {
    if (!window.confirm(`¿Eliminar el rol "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.eliminarRol(nombre);
      await loadRoles();
      setRolSeleccionado('propietario');
    } catch (e) {
      setErr(e.message || 'Error al eliminar rol');
    }
  };

  return (
    <div className="config-permisos-root">
      {/* ── Selector de rol ── */}
      <div className="config-section">
        <h3 className="config-section-title">Roles del sistema</h3>
        <p className="config-hint">Seleccioná un rol para ver y editar sus permisos. Los roles del sistema no se pueden eliminar.</p>
        <div className="config-roles-list">
          {roles.map((r) => (
            <div key={r.nombre} className={`config-rol-chip ${r.nombre === rolSeleccionado ? 'active' : ''}`}>
              <button type="button" className="config-rol-chip-btn" onClick={() => setRolSeleccionado(r.nombre)}>
                {r.nombre}
                {r.es_sistema && <span className="config-rol-badge">sistema</span>}
              </button>
              {!r.es_sistema && (
                <button type="button" className="config-rol-delete" title="Eliminar rol" onClick={() => handleEliminarRol(r.nombre)}>×</button>
              )}
            </div>
          ))}
        </div>
        <div className="config-nuevo-rol">
          <AppInput
            placeholder="Nombre del nuevo rol..."
            value={nuevoRol}
            onChange={(e) => setNuevoRol(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCrearRol()}
          />
          <AppButton type="button" size="sm" onClick={handleCrearRol} disabled={creandoRol || !nuevoRol.trim()}>
            {creandoRol ? '...' : '+ Crear rol'}
          </AppButton>
        </div>
      </div>

      {/* ── Acordeón de permisos ── */}
      {rolSeleccionado && (
        <div className="config-section">
          <h3 className="config-section-title">
            Permisos del rol: <span className="config-rol-nombre">{rolSeleccionado}</span>
          </h3>
          <p className="config-hint">Tocá cada sección para expandir y configurar sus permisos.</p>
          <div className="config-acordeon">
            {RECURSOS.map(({ key: recurso, label, acciones }) => {
              const abierto = !!seccionesAbiertas[recurso];
              const todosActivos = acciones.every((a) => permisos[`${recurso}:${a}`]);
              return (
                <div key={recurso} className={`config-acordeon-item ${abierto ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="config-acordeon-header"
                    onClick={() => toggleSeccion(recurso)}
                    aria-expanded={abierto}
                  >
                    <span className="config-acordeon-label">{label}</span>
                    <ResumenPermisos recurso={recurso} acciones={acciones} permisos={permisos} />
                    <span className="config-acordeon-chevron" aria-hidden="true">{abierto ? '▲' : '▼'}</span>
                  </button>
                  {abierto && (
                    <div className="config-acordeon-body">
                      <button
                        type="button"
                        className="config-toggle-todos"
                        onClick={() => toggleTodosSeccion(recurso, acciones)}
                      >
                        {todosActivos ? 'Quitar todo' : 'Activar todo'}
                      </button>
                      <div className="config-permisos-acciones">
                        {acciones.map((accion) => {
                          const key = `${recurso}:${accion}`;
                          const habilitado = !!(permisos[key]);
                          return (
                            <label key={accion} className={`config-permiso-chip ${habilitado ? 'on' : 'off'}`}>
                              <input
                                type="checkbox"
                                checked={habilitado}
                                onChange={() => toggle(recurso, accion)}
                                className="config-permiso-checkbox"
                              />
                              <span className="config-permiso-icon" aria-hidden="true">{habilitado ? '✓' : '○'}</span>
                              {ACCION_LABELS[accion] || accion}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {err && <p className="config-error">{err}</p>}
          {msg && <p className="config-success">{msg}</p>}
          <div className="config-actions">
            <AppButton type="button" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar permisos'}
            </AppButton>
          </div>
        </div>
      )}
    </div>
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
        {tab === 'permisos' && <TabPermisos />}
      </div>
    </div>
  );
}
