const express = require('express');
const Submission = require('../models/submission');
const { auth, adminAuth } = require('../middleware/authMiddleware');
const PDFGenerator = require('../services/pdfGen');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.use(auth, adminAuth);

// GET routes remain the same...
router.get('/submissions', async (req, res) => {
  try {
    const submissions = await Submission.find(req.query).populate('patient', 'name email').populate('processedBy', 'name').select('-annotationData').sort({ createdAt: -1 });
    res.json({ submissions });
  } catch (error) {
    console.error('Admin fetch submissions error:', error);
    res.status(500).json({ message: 'Error fetching submissions' });
  }
});

router.get('/submissions/:id', async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id).populate('patient', 'name email').populate('processedBy', 'name');
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    res.json({ submission });
  } catch (error) {
    console.error('Admin fetch submission error:', error);
    res.status(500).json({ message: 'Error fetching submission' });
  }
});

// *** FIX: This route is now corrected to properly save annotated images ***
router.post('/submissions/:id/annotate', async (req, res) => {
  try {
    const { annotationData, annotatedImageDatas, adminNotes } = req.body;
    
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const annotatedImageUrls = [];

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
    submission.annotatedImageUrls = annotatedImageUrls;
    submission.adminNotes = adminNotes || '';
    submission.status = 'annotated';
    submission.processedBy = req.user._id;
    
    const updatedSubmission = await submission.save();

    res.json({
      message: 'Annotation saved successfully and images created.',
      submission: updatedSubmission
    });
  } catch (error) {
    console.error('Save annotation error:', error);
    res.status(500).json({ message: 'Error saving annotation' });
  }
});

// PDF generation route
router.post('/submissions/:id/generate-pdf', async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    if (submission.status !== 'annotated') {
      return res.status(400).json({ message: 'Submission must be annotated first' });
    }

    const pdfResult = await PDFGenerator.generateReport(submission);

    submission.reportUrl = pdfResult.reportUrl;
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

module.exports = router;