import { useCallback, useRef, useState } from 'react';
import { api } from '../../core/api';
import { useConfig } from '../../core/ConfigContext';
import { extractPaletteFromDataUrl } from '../../shared/lib/brandingPalette';
import AppButton from '../../shared/components/button/AppButton';
import AppInput from '../../shared/components/fields/AppInput';
import './SetupWizard.css';

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

// ── Constantes ────────────────────────────────────────────────────────────────

const STEPS = ['Empresa', 'Logo y colores', 'Dirección', 'Listo'];
const TOTAL = STEPS.length;

const DEFAULTS_COLORS = {
  color_primary: '#375f8c',
  color_primary_strong: '#294c74',
  color_primary_soft: '#e7effa',
  color_menu_bg: '#1f2933',
  color_menu_active: '#375f8c',
  color_text: '#1d2b3e',
  color_text_muted: '#526278',
  color_menu_text: '#e6ecf4',
  color_logout_bg: '#d32f2f',
};

// ── Componente principal ──────────────────────────────────────────────────────

export default function SetupWizard({ onComplete }) {
  const { reloadConfig } = useConfig();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    nombre: '',
    razon_social: '',
    rut: '',
    direccion: '',
    telefono: '',
    correo: '',
    logo_base64: null,
    ...DEFAULTS_COLORS,
  });

  const [paletaSugerida, setPaletaSugerida] = useState(null);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  // ── Logo upload ──────────────────────────────────────────────────────────────

  const handleLogoFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const compressed = await compressImage(e.target.result, 400, 200, 0.8);
      set('logo_base64', compressed);
      const palette = await extractPaletteFromDataUrl(compressed);
      if (palette) setPaletaSugerida(palette);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleLogoDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleLogoFile(file);
  };

  // ── Guardar ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateConfigEmpresa({
        nombre: form.nombre || 'Mi Empresa',
        razon_social: form.razon_social || '',
        rut: form.rut || '',
        direccion: form.direccion || '',
        telefono: form.telefono || '',
        correo: form.correo || '',
        website: '',
        logo_base64: form.logo_base64 || '',
        color_primary: form.color_primary,
        color_primary_strong: form.color_primary_strong,
        color_primary_soft: form.color_primary_soft,
        color_menu_bg: form.color_menu_bg,
        color_menu_active: form.color_menu_active,
        color_text: form.color_text,
        color_text_muted: form.color_text_muted,
        color_menu_text: form.color_menu_text,
        color_logout_bg: form.color_logout_bg,
        fondo_base64: '',
        configurado: true,
      });
      await reloadConfig();
      onComplete();
    } catch (err) {
      console.error('Error guardando configuración inicial:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Progreso ──────────────────────────────────────────────────────────────────

  const progress = ((step + 1) / TOTAL) * 100;
  const canNext = step === 0 ? form.nombre.trim().length > 0 : true;

  const goNext = () => {
    if (step < TOTAL - 1) setStep((s) => s + 1);
  };
  const goBack = () => setStep((s) => s - 1);

  // ── Render por paso ──────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 0:
        return <StepEmpresa form={form} set={set} />;
      case 1:
        return (
          <StepLogoColores
            form={form}
            set={set}
            fileRef={fileRef}
            paletaSugerida={paletaSugerida}
            setPaletaSugerida={setPaletaSugerida}
            onLogoDrop={handleLogoDrop}
            onLogoFile={handleLogoFile}
          />
        );
      case 2:
        return <StepDireccion form={form} set={set} />;
      case 3:
        return <StepFinal form={form} />;
      default:
        return null;
    }
  };

  return (
    <div className="setup-wizard">
      <div className="setup-card">
        {/* Barra de progreso */}
        <div className="setup-progress">
          <div className="setup-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Header */}
        <div className="setup-header">
          <span className="setup-step-label">Paso {step + 1} de {TOTAL}</span>
          <h2>{STEPS[step]}</h2>
          {step === 0 && <p>Configurá los datos básicos de tu empresa para empezar.</p>}
          {step === 1 && <p>Subí tu logo y elegí la paleta de colores del sistema.</p>}
          {step === 2 && <p>Datos de contacto y ubicación (opcionales).</p>}
          {step === 3 && <p>Todo listo. Revisá el resumen antes de confirmar.</p>}
        </div>

        {/* Cuerpo */}
        <div className="setup-body">{renderStep()}</div>

        {/* Footer */}
        <div className="setup-footer">
          <div className="setup-dots">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`setup-dot ${i === step ? 'is-active' : i < step ? 'is-done' : ''}`}
              />
            ))}
          </div>

          <div className="setup-footer-right">
            {step > 0 && (
              <AppButton tone="ghost" onClick={goBack} disabled={saving}>
                Atrás
              </AppButton>
            )}

            {step < TOTAL - 1 ? (
              <>
                <button className="setup-skip-btn" onClick={onComplete}>
                  Omitir configuración
                </button>
                <AppButton
                  tone="primary"
                  onClick={goNext}
                  disabled={!canNext}
                >
                  Siguiente
                </AppButton>
              </>
            ) : (
              <>
                <button className="setup-skip-btn" onClick={onComplete}>
                  Omitir
                </button>
                <AppButton
                  tone="primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Guardando…' : '¡Comenzar!'}
                </AppButton>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Input de archivo oculto */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleLogoFile(e.target.files?.[0])}
      />
    </div>
  );
}

// ── Paso 1: Nombre de empresa ─────────────────────────────────────────────────

function StepEmpresa({ form, set }) {
  return (
    <>
      <div className="setup-color-item">
        <label htmlFor="sw-nombre">Nombre de empresa *</label>
        <AppInput
          id="sw-nombre"
          value={form.nombre}
          onChange={(e) => set('nombre', e.target.value)}
          placeholder="Ej: Mercatus"
          autoFocus
        />
      </div>
      <div className="setup-color-item">
        <label htmlFor="sw-razon">Razón social</label>
        <AppInput
          id="sw-razon"
          value={form.razon_social}
          onChange={(e) => set('razon_social', e.target.value)}
          placeholder="Ej: RPG Software S.R.L."
        />
      </div>
      <div className="setup-color-item">
        <label htmlFor="sw-rut">RUT / CUIT</label>
        <AppInput
          id="sw-rut"
          value={form.rut}
          onChange={(e) => set('rut', e.target.value)}
          placeholder="Ej: 20-12345678-9"
        />
      </div>
    </>
  );
}

// ── Paso 2: Logo y colores ────────────────────────────────────────────────────

function StepLogoColores({ form, set, fileRef, paletaSugerida, setPaletaSugerida, onLogoDrop }) {
  const colores = [
    { key: 'color_primary', label: 'Color primario' },
    { key: 'color_primary_strong', label: 'Primario oscuro' },
    { key: 'color_primary_soft', label: 'Primario suave' },
    { key: 'color_menu_bg', label: 'Fondo de menú' },
    { key: 'color_text', label: 'Color de texto' },
    { key: 'color_menu_text', label: 'Texto del menú' },
  ];

  const aplicarPaleta = () => {
    Object.entries(paletaSugerida).forEach(([k, v]) => set(k, v));
    setPaletaSugerida(null);
  };

  return (
    <>
      {/* Logo */}
      <div className="setup-logo-upload">
        {form.logo_base64 ? (
          <img src={form.logo_base64} alt="Logo" className="setup-logo-preview" />
        ) : (
          <div
            className="setup-logo-placeholder"
            onClick={() => fileRef.current?.click()}
            onDrop={onLogoDrop}
            onDragOver={(e) => e.preventDefault()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Subir logo
          </div>
        )}
        {form.logo_base64 && (
          <AppButton tone="ghost" onClick={() => { set('logo_base64', null); setPaletaSugerida(null); if (fileRef.current) fileRef.current.value = ''; }}>
            Quitar logo
          </AppButton>
        )}
        {!form.logo_base64 && (
          <AppButton tone="ghost" onClick={() => fileRef.current?.click()}>
            Seleccionar archivo
          </AppButton>
        )}
      </div>

      {/* Sugerencia de paleta */}
      {paletaSugerida && (
        <div className="setup-palette-banner">
          <p>🎨 Detectamos colores del logo. ¿Aplicar esta paleta?</p>
          <div className="setup-palette-swatches">
            {Object.values(paletaSugerida).map((c, i) => (
              <div key={i} className="setup-palette-swatch" style={{ background: c }} title={c} />
            ))}
          </div>
          <div className="setup-palette-actions">
            <AppButton tone="primary" onClick={aplicarPaleta}>Aplicar paleta</AppButton>
            <AppButton tone="ghost" onClick={() => setPaletaSugerida(null)}>No, mantener</AppButton>
          </div>
        </div>
      )}

      {/* Colores */}
      <div className="setup-colors-grid">
        {colores.map(({ key, label }) => (
          <div key={key} className="setup-color-item">
            <label htmlFor={`setup-color-${key}`}>{label}</label>
            <div className="setup-color-picker-row">
              <input
                id={`setup-color-${key}`}
                type="color"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
              />
              <span>{form[key]}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Paso 3: Dirección ─────────────────────────────────────────────────────────

function StepDireccion({ form, set }) {
  return (
    <>
      <div className="setup-color-item">
        <label htmlFor="sw-dir">Dirección</label>
        <AppInput
          id="sw-dir"
          value={form.direccion}
          onChange={(e) => set('direccion', e.target.value)}
          placeholder="Ej: Av. Corrientes 1234, Buenos Aires"
        />
      </div>
      <div className="setup-color-item">
        <label htmlFor="sw-tel">Teléfono</label>
        <AppInput
          id="sw-tel"
          value={form.telefono}
          onChange={(e) => set('telefono', e.target.value)}
          placeholder="Ej: +54 11 1234-5678"
        />
      </div>
      <div className="setup-color-item">
        <label htmlFor="sw-mail">Correo electrónico</label>
        <AppInput
          id="sw-mail"
          value={form.correo}
          onChange={(e) => set('correo', e.target.value)}
          placeholder="Ej: contacto@miempresa.com"
          type="email"
        />
      </div>
    </>
  );
}

// ── Paso 4: Resumen final ─────────────────────────────────────────────────────

function StepFinal({ form }) {
  return (
    <div className="setup-final">
      <div className="setup-final-icon">🎉</div>
      <h3>¡Todo listo, {form.nombre || 'tu empresa'}!</h3>
      <p>Estos son los datos que se guardarán. Podés modificarlos en cualquier momento desde Configuración.</p>

      <div className="setup-empresa-summary">
        {form.nombre && <strong>{form.nombre}</strong>}
        {form.razon_social && <span>Razón social: {form.razon_social}</span>}
        {form.rut && <span>RUT/CUIT: {form.rut}</span>}
        {form.direccion && <span>📍 {form.direccion}</span>}
        {form.telefono && <span>📞 {form.telefono}</span>}
        {form.correo && <span>✉️ {form.correo}</span>}
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem' }}>
          Color:
          <span
            style={{
              display: 'inline-block',
              width: 18,
              height: 18,
              borderRadius: 4,
              background: form.color_primary,
              border: '1px solid rgba(0,0,0,0.12)',
              verticalAlign: 'middle',
            }}
          />
          {form.color_primary}
        </span>
      </div>
    </div>
  );
}
