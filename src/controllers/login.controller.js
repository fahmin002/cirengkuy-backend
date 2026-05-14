import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../config/db.js";

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    // cari admin
    const admin = await prisma.admin.findFirst({
      where: {
        username,
      },
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin tidak ditemukan",
      });
    }

    // compare password
    const validPassword = await bcrypt.compare(
      password,
      admin.password
    );

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Password salah",
      });
    }

    // generate token
    const token = jwt.sign(
      {
        adminId: admin.id,
        username: admin.username,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login berhasil",

      data: {
        token,

        admin: {
          id: admin.id,
          username: admin.username,
        },
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export default {
  login,
};