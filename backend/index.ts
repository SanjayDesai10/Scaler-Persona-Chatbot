import express, { type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatRouter from "./routes/chat.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api/v1/health", (_, res: Response) => {
  res.json({
    status: "OK",
  });
});

app.use("/api/v1/chat", chatRouter);

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT);

server.on("listening", () => {
  console.log(`Server up at port ${PORT}`);
});

server.on("error", (err) => {
  console.error(`Server failed to start on port ${PORT}:`, err);
});