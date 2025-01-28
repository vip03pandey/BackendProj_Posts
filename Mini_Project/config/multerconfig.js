const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Disk storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Fixed path: leading dot was incorrect
    cb(null, './public/images/uploads');
  },
  filename: function (req, file, cb) {
    crypto.randomBytes(12, function (err, bytes) {
      if (err) return cb(err);
      const fn = bytes.toString("hex") + path.extname(file.originalname);
      cb(null, fn);
    });
  }
});

const upload = multer({ storage: storage });

module.exports = upload;
