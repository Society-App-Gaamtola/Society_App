import fs from "fs";
import path from "path";
import multer from "multer";

const UPLOAD_DIR = "uploads";
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"];

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
});

// Local disk upload for profile images (event media will go to Cloudinary)
const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB (JPG / PNG, as shown on the profile screen)
    fileFilter: (req, file, cb) => {
        if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            return cb(null, true);
        }
        return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    },
});

export { UPLOAD_DIR };
export default upload;
