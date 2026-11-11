import multer from 'multer';
import { AppError } from '../utils/AppError.js';

export const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB
export const MAX_ATTACHMENTS_PER_TRADE = 5;

// Files stay in memory and are written to PostgreSQL (BYTEA): Render's disk is ephemeral,
// so the database is the only place a screenshot is guaranteed to survive restarts.
export const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
}).single('file');

/** Detect the real image type from magic bytes. Never trust the client's mimetype or extension. */
export function sniffImage(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}

export const handleUpload = (req, res, next) =>
  uploadSingle(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(new AppError(413, 'FILE_TOO_LARGE', 'Image must be 4 MB or smaller'));
    return next(new AppError(400, 'UPLOAD_FAILED', 'Upload failed'));
  });
