import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { issueController } from "./issue.controller.js";

const router = Router();

router.post("/", requireAuth, issueController.createIssue);
router.get("/", issueController.getAllIssues);
router.get("/:id", issueController.getSingleIssue);
router.patch("/:id", requireAuth, issueController.updateIssue);
router.delete("/:id", requireAuth, requireRole("maintainer"), issueController.deleteIssue);

export const issueRoute = router;
