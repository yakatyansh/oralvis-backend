const express = require('express');
const Submission = require('../models/Submission');
const { auth, adminAuth } = require('../middleware/auth');
const { upload, useS3 } = require('../middleware/upload');
const PDFGenerator = require('../services/pdfGenerator');
const S3Service = require('../services/s3Service');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Apply admin authentication to all routes
router.use(auth, adminAuth);

// Get all submissions
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

// Get single submission for annotation
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

// Save annotation
router.post('/submissions/:id/annotate', async (req, res) => {
  try {
    const { annotationData, annotatedImageData, adminNotes } = req.body;
    
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Save annotated image
    let annotatedImageUrl;
    let annotatedImageKey;

    if (annotatedImageData) {
      // Convert base64 to buffer
      const base64Data = annotatedImageData.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Process with Sharp for optimization
      const processedBuffer = await sharp(imageBuffer)
        .jpeg({ quality: 85 })
        .toBuffer();

      if (useS3) {
        const timestamp = Date.now();
        annotatedImageKey = `annotated/annotated-${submission.patientId}-${timestamp}.jpg`;
        annotatedImageUrl = await S3Service.uploadFile(
          processedBuffer, 
          annotatedImageKey, 
          'image/jpeg'
        );
      } else {
        const timestamp = Date.now();
        const filename = `annotated-${submission.patientId}-${timestamp}.jpg`;
        const filePath = path.join('uploads', filename);
        fs.writeFileSync(filePath, processedBuffer);
        annotatedImageUrl = `/uploads/${filename}`;
      }
    }

    // Update submission
    submission.annotationData = annotationData;
    submission.annotatedImageUrl = annotatedImageUrl;
    submission.annotatedImageKey = annotatedImageKey;
    submission.adminNotes = adminNotes || '';
    submission.status = 'annotated';
    submission.processedBy = req.user._id;

    await submission.save();

    res.json({
      message: 'Annotation saved successfully',
      submission: {
        id: submission._id,
        status: submission.status,
        annotatedImageUrl: submission.annotatedImageUrl
      }
    });
  } catch (error) {
    console.error('Save annotation error:', error);
    res.status(500).json({ message: 'Error saving annotation' });
  }
});

// Generate PDF report
router.post('/submissions/:id/generate-pdf', async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('patient', 'name email')
      .populate('processedBy', 'name');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    if (submission.status !== 'annotated') {
      return res.status(400).json({ message: 'Submission must be annotated first' });
    }

    // Generate PDF
    const pdfResult = await PDFGenerator.generateReport(submission);

    // Update submission with PDF info
    submission.reportUrl = pdfResult.reportUrl;
    submission.reportKey = pdfResult.reportKey;
    submission.status = 'reported';

    await submission.save();

     res.json({
      message: 'PDF report generated successfully',
      reportUrl: pdfResult.reportUrl,
      submission: {
        id: submission._id,
        status: submission.status,
        reportUrl: submission.reportUrl
      }
    });
  } catch (error) {
    console.error('Generate PDF report error:', error);
    res.status(500).json({ message: 'Error generating PDF report' });
  }
});

module.exports = router