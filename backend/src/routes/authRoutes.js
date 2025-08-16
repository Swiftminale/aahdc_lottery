const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();

const db = require("../database");
const auth = require("../middleware/auth");

const User = db.User;

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, role } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "username and password required" });
    }
    const existing = await User.findOne({ where: { username } });
    if (existing) return res.status(409).json({ message: "User exists" });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      passwordHash,
      role: role || "viewer",
    });
    return res
      .status(201)
      .json({ id: user.id, username: user.username, role: user.role });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "username and password required" });
    }
    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "8h" }
    );
    return res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

// GET /api/auth/profile
router.get("/profile", auth(), async (req, res) => {
  try {
    const user = await User.findByPk(req.user.sub, {
      attributes: ["id", "username", "role", "email"],
    });
    if (!user) return res.status(404).json({ message: "Not found" });
    return res.json(user);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

module.exports = router;
