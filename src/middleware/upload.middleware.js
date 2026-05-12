import multer from "multer";
import path from "path";
import fs from "fs";

// directory for uploaded files

const uploadDir = "uploads";

// Create upload directory if it doesn't exist

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// diskStorage for file storage

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, filename);
  },
});

// Filter for allowed file types

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

// export

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});
