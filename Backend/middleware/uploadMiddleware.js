const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Local disk storage fallback
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${name}-${Date.now()}${ext}`);
  }
});

// Configure Cloudinary Storage with optimization
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'appzeto',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
    transformation: [
      { quality: 'auto:good', fetch_format: 'auto' }
    ],
    public_id: (req, file) => {
      const name = file.originalname.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
      return `${name}-${Date.now()}`;
    }
  }
});

const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

// Use Cloudinary if keys exist, otherwise fallback to local disk
const activeStorage = isCloudinaryConfigured ? cloudinaryStorage : diskStorage;

// File filter - only images
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// File filter - images and documents
const documentFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images and PDF/DOC files are allowed!'), false);
  }
};

// Generic Image Upload
const uploadImage = multer({
  storage: activeStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}).single('file');

// Profile photo upload
const uploadProfilePhoto = multer({
  storage: activeStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
}).single('photo');

// Document upload (multiple files)
const uploadDocuments = multer({
  storage: diskStorage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
}).fields([
  { name: 'aadhar', maxCount: 1 },
  { name: 'pan', maxCount: 1 },
  { name: 'otherDocuments', maxCount: 5 }
]);

// Error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded.'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

module.exports = {
  uploadImage,
  uploadProfilePhoto,
  uploadDocuments,
  handleMulterError
};
