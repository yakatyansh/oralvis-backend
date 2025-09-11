import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();



router.post(
  "/",
  protect,
  requireRole("patient"),
  upload.single("image"),   // <-- patient uploads raw image
  createSubmission
);

router.put(
  "/:id/annotated",
  protect,
  requireRole("admin"),
  upload.single("annotatedImage"), // <-- admin uploads annotated version
  uploadAnnotatedImage
);
