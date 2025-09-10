import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/upload", protect, requireRole("patient"), (req, res) => {
  res.json({ message: "Patient upload works", user: req.user });
});

router.get("/all", protect, requireRole("admin"), (req, res) => {
  res.json({ message: "Admin view works", user: req.user });
});

export default router;
