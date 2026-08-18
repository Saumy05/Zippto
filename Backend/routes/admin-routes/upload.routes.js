const express = require('express');
const router = express.Router();
const { uploadImage } = require('../../middleware/uploadMiddleware');
const { getSignature } = require('../../controllers/cloudinaryController');

// Get signature for direct signed upload
router.get('/upload/sign-signature', getSignature);

// Upload single file (Cloudinary or local disk fallback)
router.post('/upload', uploadImage, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    let imageUrl = req.file.path || '';
    if (!imageUrl.startsWith('http')) {
      const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
      imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
    }

    res.status(200).json({
      success: true,
      imageUrl: imageUrl,
      url: imageUrl,
      secure_url: imageUrl,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message
    });
  }
});

module.exports = router;
