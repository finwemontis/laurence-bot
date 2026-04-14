import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import chatRouter from "./routes/chat.js";
import { config } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    message: "the Bishop is working..."
  });
});

app.use(chatRouter);

app.listen(config.port, "0.0.0.0", () => {
  console.log("Server running at http://localhost:" + config.port);
});
