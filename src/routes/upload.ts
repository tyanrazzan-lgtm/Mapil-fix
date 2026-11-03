import { Router } from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("File harus berupa gambar"));
    }
  },
});

router.post(
  "/",
  authMiddleware,
  upload.single("gambar"),
  async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ message: "Pilih gambar terlebih dahulu" });
        return;
      }

      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "wearify" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        stream.end(req.file!.buffer);
      });

      res.json({
        message: "Gambar berhasil diupload",
        gambar: result.secure_url,
      });
    } catch (error) {
      console.error("Upload gambar error:", error);
      res.status(500).json({ message: "Gagal upload gambar" });
    }
  }
);

export default router;