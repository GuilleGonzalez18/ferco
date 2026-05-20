import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth } from '../auth.js';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// El SDK lee CLOUDINARY_URL del entorno automáticamente.
// Formato: cloudinary://api_key:api_secret@cloud_name

// Usar memoria en lugar de disco (Render tiene filesystem efímero)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter(_req, file, cb) {
    cb(null, ALLOWED_MIME.has(file.mimetype));
  },
});

function uploadToCloudinary(buffer, mimetype) {
  return new Promise((resolve, reject) => {
    const resourceType = 'image';
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'mercatus/productos', resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

export const uploadsRouter = Router();
uploadsRouter.use(requireAuth);

uploadsRouter.post('/imagen', (req, res) => {
  upload.single('imagen')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'La imagen no puede superar 5 MB' : err.message;
      return res.status(400).json({ error: msg });
    }
    if (err) {
      return res.status(400).json({ error: 'Error al procesar la imagen' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Tipo de archivo no permitido. Use JPEG, PNG, GIF o WEBP.' });
    }
    if (!process.env.CLOUDINARY_URL) {
      return res.status(500).json({ error: 'Almacenamiento de imágenes no configurado (falta variable CLOUDINARY_URL)' });
    }
    try {
      const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
      return res.json({ url: result.secure_url });
    } catch (uploadErr) {
      return res.status(500).json({ error: 'No se pudo subir la imagen a Cloudinary' });
    }
  });
});
