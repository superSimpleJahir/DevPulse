import cors from "cors";
import express, { type Application } from "express";
import { StatusCodes } from "http-status-codes";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { routes } from "./routes/index.js";

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.status(StatusCodes.OK).json({
    success: true,
    message: "DevPulse API is running",
  });
});

app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

export default app;
