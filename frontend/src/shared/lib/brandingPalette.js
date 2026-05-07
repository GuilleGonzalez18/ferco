function toHex(r, g, b) {
  const clamp = (v) => Math.min(255, Math.max(0, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;
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

function relativeLuminance(hex) {
  const toChannel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  const r = toChannel(parseInt(hex.slice(1, 3), 16));
  const g = toChannel(parseInt(hex.slice(3, 5), 16));
  const b = toChannel(parseInt(hex.slice(5, 7), 16));

  return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

function contrastRatio(hexA, hexB) {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

function ensureContrastWithWhite(hex, minimumRatio = 4.5) {
  let current = hex;
  let attempts = 0;

  while (contrastRatio(current, '#ffffff') < minimumRatio && attempts < 8) {
    current = scaleColor(current, 0.88);
    attempts += 1;
  }

  return current;
}

export function buildBrandingPalette(primary) {
  return {
    color_primary: primary,
    color_primary_strong: scaleColor(primary, 0.75),
    color_primary_soft: mixWithWhite(primary, 0.85),
    color_menu_bg: scaleColor(primary, 0.35),
    color_menu_active: primary,
    color_logout_bg: ensureContrastWithWhite(scaleColor(primary, 0.82)),
  };
}

export function extractPaletteFromDataUrl(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      const buckets = {};

      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha < 100) continue;

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;
        if (brightness > 235 || brightness < 20) continue;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max === 0) continue;

        const saturation = (max - min) / max;
        if (saturation < 0.25) continue;

        const step = 16;
        const bucketR = Math.round(r / step) * step;
        const bucketG = Math.round(g / step) * step;
        const bucketB = Math.round(b / step) * step;
        const key = `${bucketR},${bucketG},${bucketB}`;

        if (!buckets[key]) {
          buckets[key] = { count: 0, saturation, r: bucketR, g: bucketG, b: bucketB };
        }

        buckets[key].count += 1;
        buckets[key].saturation = Math.max(buckets[key].saturation, saturation);
      }

      if (!Object.keys(buckets).length) {
        resolve(null);
        return;
      }

      const scored = Object.values(buckets)
        .map((bucket) => ({ ...bucket, score: bucket.count * bucket.saturation * bucket.saturation }))
        .sort((a, b) => b.score - a.score);

      const minimumDistance = 80;
      const picks = [];

      for (const candidate of scored) {
        const tooClose = picks.some((picked) => {
          const dr = candidate.r - picked.r;
          const dg = candidate.g - picked.g;
          const db = candidate.b - picked.b;
          return Math.sqrt((dr * dr) + (dg * dg) + (db * db)) < minimumDistance;
        });

        if (!tooClose) {
          picks.push(candidate);
        }

        if (picks.length >= 5) break;
      }

      const primary = toHex(picks[0].r, picks[0].g, picks[0].b);
      resolve(buildBrandingPalette(primary));
    };

    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
