module.exports = (sequelize, DataTypes) => {
  const Candidate = sequelize.define(
    "Candidate",
    {
      candidateId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      typology: {
        type: DataTypes.ENUM("studio", "1BR", "2BR", "3BR", "shop"),
        allowNull: true,
        // 📝 FIX: Remove the 'comment' option to prevent the invalid SQL from being generated.
        // The comment is not essential and is causing a syntax error.
        // comment: "Preferred or assigned typology for the candidate",
      },
      assignedUnitId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      // Add more fields as needed
    },
    {
      tableName: "candidates",
      timestamps: true,
    }
  );
  return Candidate;
};
