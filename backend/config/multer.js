import fs from "fs";
import path from "path";
import multer from "multer";
import constant from "./constant.js";

const { UPLOAD_DIR, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } = constant;

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
    limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            return cb(null, true);
        }
        return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    },
});

export default upload;
