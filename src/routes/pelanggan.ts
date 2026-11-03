
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db/index.js";

const router = Router();

interface Pelanggan extends RowDataPacket {
  id_pelanggan: number;
  nama_pelanggan: string;
  username: string;
  email: string;
  password: string;
}

interface ProfilPelanggan extends RowDataPacket {
  id_pelanggan: number;
  nama_pelanggan: string;
  username: string;
  email: string;
}

interface AuthRequest extends Request {
  pelangganId?: number;
}

// MIDDLEWARE AUTENTIKASI PELANGGAN
function authPelanggan(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ")
      ? header.slice(7)
      : "";

    const secret = process.env.JWT_SECRET;

    if (!token || !secret) {
      return res.status(401).json({
        message: "Token pelanggan tidak tersedia",
      });
    }

    const decoded = jwt.verify(token, secret) as {
      id_pelanggan?: number;
    };

    if (!decoded.id_pelanggan) {
      return res.status(401).json({
        message: "Token bukan milik pelanggan",
      });
    }

    req.pelangganId = decoded.id_pelanggan;
    next();
  } catch {
    return res.status(401).json({
      message: "Token tidak valid atau sudah kedaluwarsa",
    });
  }
}

// REGISTER PELANGGAN
router.post("/register", async (req, res) => {
  try {
    const { nama_pelanggan, username, email, password } = req.body;

    if (
      typeof nama_pelanggan !== "string" ||
      typeof username !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !nama_pelanggan.trim() ||
      !username.trim() ||
      !email.trim() ||
      password.length < 6
    ) {
      return res.status(400).json({
        message:
          "Semua data wajib diisi dan password minimal 6 karakter",
      });
    }

    const nama = nama_pelanggan.trim();
    const user = username.trim();
    const mail = email.trim().toLowerCase();

    if (
      nama.length > 100 ||
      user.length > 50 ||
      mail.length > 150
    ) {
      return res.status(400).json({
        message: "Nama, username, atau email terlalu panjang",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      return res.status(400).json({
        message: "Format email tidak valid",
      });
    }

    const [existing] = await db.execute<RowDataPacket[]>(
      `SELECT id_pelanggan
       FROM tb_pelanggan
       WHERE username = ? OR email = ?
       LIMIT 1`,
      [user, mail]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "Username atau email sudah digunakan",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO tb_pelanggan
       (nama_pelanggan, username, email, password)
       VALUES (?, ?, ?, ?)`,
      [nama, user, mail, hashedPassword]
    );

    return res.status(201).json({
      message: "Register pelanggan berhasil",
      data: {
        id_pelanggan: result.insertId,
        nama_pelanggan: nama,
        username: user,
        email: mail,
      },
    });
  } catch (error) {
    console.error("Register pelanggan error:", error);

    return res.status(500).json({
      message: "Register gagal",
    });
  }
});

// LOGIN PELANGGAN
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Username dan password wajib diisi",
      });
    }

    const [rows] = await db.execute<Pelanggan[]>(
      `SELECT id_pelanggan, nama_pelanggan, username, email, password
       FROM tb_pelanggan
       WHERE username = ?
       LIMIT 1`,
      [username.trim()]
    );

    const pelanggan = rows[0];

    if (
      !pelanggan ||
      !(await bcrypt.compare(password, pelanggan.password))
    ) {
      return res.status(401).json({
        message: "Username atau password salah",
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        message: "JWT_SECRET belum diatur",
      });
    }

    const token = jwt.sign(
      { id_pelanggan: pelanggan.id_pelanggan },
      secret,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Login pelanggan berhasil",
      token,
      data: {
        id_pelanggan: pelanggan.id_pelanggan,
        nama_pelanggan: pelanggan.nama_pelanggan,
        username: pelanggan.username,
        email: pelanggan.email,
      },
    });
  } catch (error) {
    console.error("Login pelanggan error:", error);

    return res.status(500).json({
      message: "Login gagal",
    });
  }
});

// PROFIL PELANGGAN
router.get(
  "/profile",
  authPelanggan,
  async (req: AuthRequest, res: Response) => {
    try {
      const pelangganId = req.pelangganId;

if (!pelangganId) {
  return res.status(401).json({
    message: "ID pelanggan tidak ditemukan",
  });
}

const [rows] = await db.execute<ProfilPelanggan[]>(
  `SELECT id_pelanggan, nama_pelanggan, username, email
   FROM tb_pelanggan
   WHERE id_pelanggan = ?
   LIMIT 1`,
  [pelangganId]
);

      if (!rows[0]) {
        return res.status(404).json({
          message: "Pelanggan tidak ditemukan",
        });
      }

      return res.status(200).json({
        message: "Profil pelanggan berhasil diambil",
        data: rows[0],
      });
    } catch (error) {
      console.error("Profile pelanggan error:", error);

      return res.status(500).json({
        message: "Gagal mengambil profil pelanggan",
      });
    }
  }
);

export default router;
