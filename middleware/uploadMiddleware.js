const multer = require('multer');
const path = require('path');

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure the 'uploads' directory exists
    const fs = require('fs');
    const dir = 'uploads/';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Accept an array of files (up to 3) with the field name 'images'
const upload = multer({
  storage: localStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

module.exports = { upload };