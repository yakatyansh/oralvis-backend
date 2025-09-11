import Submission from "../models/submission.js";

// Patient creates new submission
export const createSubmission = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Image required" });

    const submission = await Submission.create({
      patient: req.user.id,
      imageUrl: `/uploads/${req.file.filename}`,
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

// Admin: view all submissions
export const getAllSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find().populate("patient", "name email");
    res.json(submissions);
  } catch (err) {
    console.error("Get all submissions error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: upload annotated image
export const uploadAnnotatedImage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: "Annotated image required" });

    const submission = await Submission.findById(id);
    if (!submission) return res.status(404).json({ message: "Not found" });

    submission.annotatedImageUrl = `/uploads/${req.file.filename}`;
    submission.status = "reviewed";
    await submission.save();

    res.json({ message: "Annotated image saved", submission });
  } catch (err) {
    console.error("Upload annotated error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

