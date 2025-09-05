import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Open SQLite database
const dbPromise = open({
  filename: "./sakaclient.db",
  driver: sqlite3.Database
});

// Simple health check
app.get("/ping", (req, res) => {
  res.json({ message: "Backend is running ✅" });
});

// Example: create users table if not exists
(async () => {
  const db = await dbPromise;
  await db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
})();

// Example: register user
app.post("/register", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone required" });

  try {
    const db = await dbPromise;
    await db.run("INSERT INTO users (phone) VALUES (?)", [phone]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
