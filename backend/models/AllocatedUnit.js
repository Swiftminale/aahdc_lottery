// backend/models/AllocatedUnit.js
module.exports = (sequelize, DataTypes) => {
  const AllocatedUnit = sequelize.define(
    "AllocatedUnit",
    {
      unitId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true,
      },
      candidateId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      candidateName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      candidatePhone: {
        type: DataTypes.STRING,
        allowNull: true,
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
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      owner: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      allocated: {
        // Flag to indicate if unit has been allocated
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      allocatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "allocated_units",
      timestamps: false,
    }
  );

  return AllocatedUnit;
};
