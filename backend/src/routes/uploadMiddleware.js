const multer = require("multer");
const path = require("path");

// Configure multer for Excel/CSV uploads
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".xlsx" || ext === ".xls" || ext === ".csv") {
    cb(null, true);
  } else {
    cb(new Error("Only Excel or CSV files are allowed!"));
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
