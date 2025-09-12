const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  patientId: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  note: {
    type: String,
    default: ''
  },
  originalImageUrl: {
    type: String,
    required: true
  },
  annotatedImageUrl: String,
  annotationData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  reportUrl: String,
  status: {
    type: String,
    enum: ['uploaded', 'annotated', 'reported'],
    default: 'uploaded'
  },
  adminNotes: {
    type: String,
    default: ''
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Submission', submissionSchema);