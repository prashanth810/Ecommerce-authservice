import multer from 'multer';
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import Envs from '../utils/Envs.js';

// ─── Cloudinary Config ────────────────────────────────────────────────────────
cloudinary.config({
    cloud_name: Envs.CLOUDINARY_CLOUD_NAME,
    api_key: Envs.CLOUDINARY_API_KEY,
    api_secret: Envs.CLOUDINARY_API_SECRET,
});

// ─── Multer (memory storage — no disk, no cloudinary plugin needed) ───────────
const upload = multer({ storage: multer.memoryStorage() });

// ─── Upload buffer → Cloudinary ───────────────────────────────────────────────
const uploadToCloudinary = (fileBuffer, folder = "users") => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder },
            (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
            }
        );
        streamifier.createReadStream(fileBuffer).pipe(stream);
    });
};

export { upload, uploadToCloudinary, cloudinary };