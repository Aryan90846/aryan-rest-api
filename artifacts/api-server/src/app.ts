import express, { type Express } from "express";
import cors from "cors";
import router from "./routes/index.js";
import { errorHandler } from "./lib/errors.js";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use(errorHandler);

export default app;
