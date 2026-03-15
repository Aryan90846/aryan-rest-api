import express, { type Express } from "express";
import cors from "cors";
import router from "./routes/index.js";
import { errorHandler } from "./lib/errors.js";
import { connectDB } from "@workspace/db";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use(errorHandler);

connectDB().catch((err: unknown) => {
  console.warn(
    "MongoDB connection failed — set MONGODB_URI to enable database features.",
    (err as Error).message
  );
});

export default app;
