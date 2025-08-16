// backend/models/unit.js
module.exports = (sequelize, DataTypes) => {
  const Unit = sequelize.define(
    "Unit",
    {
      unitId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true, // Assuming unitId is unique and can serve as PK
      },
      typology: {
        type: DataTypes.ENUM("Studio", "1BR", "2BR", "3BR", "Shop"),
        allowNull: false,
      },
      netArea: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      grossArea: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      floorNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      blockName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      totalBuildingGrossArea: {
        // For validation purposes per building
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      owner: {
        // To store 'AAHDC' or 'Developer' after allocation
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Developer",
      },
      allocated: {
        // Flag to indicate if unit has been allocated
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "units", // Explicitly set table name
      timestamps: true, // Adds createdAt and updatedAt columns
    }
  );

  return Unit;
};
