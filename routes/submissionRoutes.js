const express = require('express');
const Submission = require('../models/submission');
const { auth } = require('../middleware/auth');
const { upload, useS3 } = require('../middleware/upload');

const router = express.Router();


router.post('/upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    const { patientName, patientId, email, note } = req.body;

    // Validate required fields
    if (!patientName || !patientId || !email) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const imageUrl = useS3 ? req.file.location : `/uploads/${req.file.filename}`;
    const imageKey = useS3 ? req.file.key : undefined;

    const submission = new Submission({
      patient: req.user._id,
      patientName,
      patientId,
      email,
      note: note || '',
      originalImageUrl: imageUrl,
      originalImageKey: imageKey,
      status: 'uploaded'
    });

    await submission.save();

    res.status(201).json({
      message: 'Submission uploaded successfully',
      submission: {
        id: submission._id,
        patientName: submission.patientName,
        patientId: submission.patientId,
        status: submission.status,
        createdAt: submission.createdAt,
        originalImageUrl: submission.originalImageUrl
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading submission' });
  }
});

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