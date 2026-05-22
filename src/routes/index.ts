import { Router } from "express";
import { authRoute } from "../modules/auth/auth.route.js";
import { issueRoute } from "../modules/issues/issue.route.js";

const router = Router();

router.use("/auth", authRoute);
router.use("/issues", issueRoute);

export const routes = router;
