// backend/src/database/index.js
const { Sequelize, DataTypes } = require("sequelize");
const config = require("../../config/config");

const env = process.env.NODE_ENV || "development";
const dbConfig = config[env];

// Resolve connection string: prefer env var name in config, fallback to literal
let connectionUri = null;
if (dbConfig.use_env_variable) {
  // If use_env_variable is a name like "DATABASE_URL", read from process.env.
  // If it's already a full URI, use it directly.
  connectionUri =
    process.env[dbConfig.use_env_variable] || dbConfig.use_env_variable;
}
if (!connectionUri && dbConfig.url) {
  connectionUri = dbConfig.url;
}
if (!connectionUri) {
  throw new Error(
    "Database connection string is not configured. Set DATABASE_URL."
  );
}

// Initialize Sequelize
const sequelize = new Sequelize(connectionUri, {
  dialect: dbConfig.dialect,
  dialectOptions: dbConfig.dialectOptions,
  logging: dbConfig.logging,
  pool: {
    // Smaller pools are often better for serverless
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.Unit = require("../../models/Unit")(sequelize, DataTypes);
db.AllocatedUnit = require("../../models/AllocatedUnit")(sequelize, DataTypes);
db.Candidate = require("../../models/Candidate")(sequelize, DataTypes);
db.User = require("../../models/User")(sequelize, DataTypes);
// Add other models here as your application grows (e.g., User, Project)

module.exports = db;
