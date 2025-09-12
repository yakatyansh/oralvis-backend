const express = require('express');
const Submission = require('../models/submission');
const { auth, adminAuth } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const PDFGenerator = require('../services/pdfGen');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.use(auth, adminAuth);

router.get('/submissions', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = status ? { status } : {};
    
    const submissions = await Submission.find(query)
      .populate('patient', 'name email')
      .populate('processedBy', 'name')
      .select('-annotationData')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Submission.countDocuments(query);

    res.json({
      submissions,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Admin fetch submissions error:', error);
    res.status(500).json({ message: 'Error fetching submissions' });
  }
});

router.get('/submissions/:id', async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('patient', 'name email')
      .populate('processedBy', 'name');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.json({ submission });
  } catch (error) {
    console.error('Admin fetch submission error:', error);
    res.status(500).json({ message: 'Error fetching submission' });
  }
});

router.post('/submissions/:id/annotate', async (req, res) => {
  try {
    // Expect an array of base64 image strings
    const { annotationData, annotatedImageDatas, adminNotes } = req.body;
    
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    let annotatedImageUrls = [];
    if (annotatedImageDatas && Array.isArray(annotatedImageDatas)) {
      for (const imageData of annotatedImageDatas) {
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        const processedBuffer = await sharp(imageBuffer)
          .jpeg({ quality: 85 })
          .toBuffer();

        const timestamp = Date.now();
        const filename = `annotated-${submission.patientId}-${timestamp}-${Math.round(Math.random() * 1E3)}.jpg`;
        const filePath = path.join('uploads', filename);
        fs.writeFileSync(filePath, processedBuffer);
        annotatedImageUrls.push(`/uploads/${filename}`);
      }
    }

    submission.annotationData = annotationData;
    submission.annotatedImageUrls = annotatedImageUrls; // Save the array
    submission.adminNotes = adminNotes || '';
    submission.status = 'annotated';
    submission.processedBy = req.user._id;

    await submission.save();

    res.json({
      message: 'Annotation saved successfully',
      submission: {
        id: submission._id,
        status: submission.status,
        annotatedImageUrls: submission.annotatedImageUrls
      }
    });
  } catch (error) {
    console.error('Save annotation error:', error);
    res.status(500).json({ message: 'Error saving annotation' });
  }
});


module.exports = router;