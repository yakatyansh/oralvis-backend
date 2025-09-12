const express = require('express');
const Submission = require('../models/Submission');
const { auth } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/upload', auth, upload.array('images', 3), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files uploaded' });
    }

    const { patientName, patientId, email, note } = req.body;

    if (!patientName || !patientId || !email) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Map over the files array to get an array of their paths
    const imageUrls = req.files.map(file => `/uploads/${file.filename}`);

    const submission = new Submission({
      patient: req.user._id,
      patientName,
      patientId,
      email,
      note: note || '',
      originalImageUrls: imageUrls, 
      status: 'uploaded'
    });

    await submission.save();

    res.status(201).json({
      message: 'Submission uploaded successfully',
      submission: {
        id: submission._id,
        patientName: submission.patientName,
        status: submission.status,
        originalImageUrls: submission.originalImageUrls
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading submission' });
  }
});

// ... (the rest of the routes remain the same)
router.get('/my-submissions', auth, async (req, res) => {
  try {
    const submissions = await Submission.find({ patient: req.user._id })
      .select('-annotationData')
      .sort({ createdAt: -1 });

    res.json({ submissions });
  } catch (error) {
    console.error('Fetch submissions error:', error);
    res.status(500).json({ message: 'Error fetching submissions' });
  }
});

router.get('/:id/report', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    if (submission.patient.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!submission.reportUrl) {
      return res.status(404).json({ message: 'Report not yet generated' });
    }

    res.json({ reportUrl: submission.reportUrl });
  } catch (error) {
    console.error('Report download error:', error);
    res.status(500).json({ message: 'Error downloading report' });
  }
});


module.exports = router;