import Submission from "../models/submission.js";

// Patient creates new submission with multiple images
export const createSubmission = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "At least one image is required" });
    }

    const { patientName, patientId, email, note } = req.body;

    if (!patientName || !patientId || !email) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Map the array of files to an array of URLs
    const imageUrls = req.files.map(file => `/uploads/${file.filename}`);

    const submission = await Submission.create({
      patient: req.user.id,
      patientName,
      patientId,
      email,
      note: note || '',
      originalImageUrls: imageUrls, // Use the plural field
      status: 'uploaded'
    });

    res.status(201).json({ message: "Submission created", submission });
  } catch (err) {
    console.error("Create submission error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Patient: view their own submissions
export const getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ patient: req.user.id });
    res.json(submissions);
  } catch (err) {
    console.error("Get my submissions error:", err);
    res.status(500).json({ message: "Server error" });
  }
};