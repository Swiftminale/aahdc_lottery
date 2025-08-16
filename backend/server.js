require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./src/database");
const unitRoutes = require("./src/routes/unitRoutes");
const allocationRoutes = require("./src/routes/allocationRoutes");
const reportRoutes = require("./src/routes/reportRoutes");
const candidateRoutes = require("./src/routes/candidateRoutes");
const candidateTemplateRoutes = require("./src/routes/candidateTemplateRoutes");
const authRoutes = require("./src/routes/authRoutes");
const auth = require("./src/middleware/auth");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS settings
const vercelOrigin = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3002",
  "https://aahdc-lottery-frontend.vercel.app/",
  vercelOrigin,
  process.env.FRONTEND_ORIGIN,
  process.env.FRONTEND_ORIGIN_2,
  process.env.FRONTEND_ORIGIN_3,
].filter(Boolean);

const corsOptions = {
  origin: true, // Allow all origins
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use("/api/auth", authRoutes);
// Routes
app.use("/api/units", /*auth("developer"),*/ unitRoutes);
app.use("/api/allocation", /*auth("admin"),*/ allocationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/candidates", candidateTemplateRoutes);

app.get("/", (req, res) => {
  res.send("AAHDC Lottery Platform Backend API is running!");
});

// DB Sync
db.sequelize
  .authenticate()
  .then(async () => {
    console.log("Database connected.");
    if (process.env.NODE_ENV !== "production") {
      await db.sequelize.sync({ alter: true });
      console.log("Database synced.");
    }
  })
  .catch((err) => {
    console.error("Database connection/sync error:", err);
  });

// Local dev server
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;
