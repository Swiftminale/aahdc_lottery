// frontend/src/components/DeveloperSubmissionForm.js
import React, { useState } from "react";
import * as XLSX from "xlsx";
import { submitUnits } from "../services/unitService";

const unitTypologies = ["Studio", "1BR", "2BR", "3BR", "Shop"];

function DeveloperSubmissionForm() {
  const [units, setUnits] = useState([
    {
      unitId: "",
      typology: "",
      netArea: "",
      grossArea: "",
      floorNumber: "",
      blockName: "",
      totalBuildingGrossArea: "",
    },
  ]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");

  const handleExcelUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setSelectedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      const parsedUnits = jsonData.map((row) => ({
        unitId: row["Unit ID"] || "",
        typology: row["Typology"] || "",
        netArea: row["Net Area"] || "",
        grossArea: row["Gross Area"] || "",
        floorNumber: row["Floor Number"] || "",
        blockName: row["Block Name"] || "",
        totalBuildingGrossArea: row["Total Building Gross Area"] || "",
      }));

      setUnits(parsedUnits);
      setMessage(`Loaded ${parsedUnits.length} units from Excel file.`);
      setError("");
    };

    reader.readAsBinaryString(file);
  };

  const handleUnitChange = (index, event) => {
    const { name, value } = event.target;
    const newUnits = [...units];
    newUnits[index][name] = value;

    // Auto-fill totalBuildingGrossArea if it's the first unit in a new block
    if (
      name === "blockName" &&
      value &&
      !newUnits[index].totalBuildingGrossArea
    ) {
      const existingBlockUnits = newUnits.filter(
        (u, i) => i !== index && u.blockName === value
      );
      if (existingBlockUnits.length > 0) {
        newUnits[index].totalBuildingGrossArea =
          existingBlockUnits[0].totalBuildingGrossArea;
      }
    }
    setUnits(newUnits);
  };

  const addUnit = () => {
    const lastUnit = units[units.length - 1];
    const newUnit = {
      unitId: "",
      typology: "",
      netArea: "",
      grossArea: "",
      floorNumber: "",
      blockName: lastUnit ? lastUnit.blockName : "",
      totalBuildingGrossArea: lastUnit ? lastUnit.totalBuildingGrossArea : "",
    };
    setUnits([...units, newUnit]);
  };

  const removeUnit = (index) => {
    const newUnits = units.filter((_, i) => i !== index);
    setUnits(newUnits);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      // Basic client-side validation for empty fields
      for (const unit of units) {
        for (const key in unit) {
          if (!unit[key]) {
            setError(
              `Please fill all fields for Unit ID: ${
                unit.unitId || "New Unit"
              }.`
            );
            setLoading(false);
            return;
          }
        }
      }

      // Convert area and floor numbers to numbers, and ensure allocated: false
      const unitsToSend = units.map((unit) => ({
        ...unit,
        netArea: parseFloat(unit.netArea),
        grossArea: parseFloat(unit.grossArea),
        floorNumber: parseInt(unit.floorNumber, 10),
        totalBuildingGrossArea: parseFloat(unit.totalBuildingGrossArea),
        allocated: false,
      }));

      const response = await submitUnits(unitsToSend);
      setMessage(response.message);
      setError("");
      setUnits([
        {
          unitId: "",
          typology: "",
          netArea: "",
          grossArea: "",
          floorNumber: "",
          blockName: "",
          totalBuildingGrossArea: "",
        },
      ]); // Clear form
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-card">
      <h2>Developer Unit Submission</h2>
      {message && <p className="message-success">{message}</p>}
      {error && <p className="message-error">{error}</p>}
      {loading && <p className="tip">Submitting units...</p>}

      {/* Upload card */}
      <div className="upload-card">
        <div className="upload-info">
          <div className="upload-title">Batch Upload (Excel)</div>
          <div className="upload-subtitle">
            Use the template headers: Unit ID, Typology, Net Area, Gross Area,
            Floor Number, Block Name, Total Building Gross Area
          </div>
        </div>
        <div className="upload-actions">
          <label className="btn btn-secondary">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleExcelUpload}
              disabled={loading}
              style={{ display: "none" }}
            />
            <span className="btn-icon">📤</span> Import File
          </label>
        </div>
      </div>
      {selectedFileName && (
        <div className="tip">Selected: {selectedFileName}</div>
      )}

      <form onSubmit={handleSubmit}>
        {units.map((unit, index) => (
          <div key={index} className="unit-card">
            <h3>Unit {index + 1}</h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Unit ID</label>
                <input
                  type="text"
                  name="unitId"
                  value={unit.unitId}
                  onChange={(e) => handleUnitChange(index, e)}
                  required
                />
              </div>
              <div className="form-field">
                <label>Typology</label>
                <select
                  name="typology"
                  value={unit.typology}
                  onChange={(e) => handleUnitChange(index, e)}
                  required
                >
                  <option value="">Select Typology</option>
                  {unitTypologies.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Net Area (sqm)</label>
                <input
                  type="number"
                  step="0.01"
                  name="netArea"
                  value={unit.netArea}
                  onChange={(e) => handleUnitChange(index, e)}
                  required
                />
              </div>
              <div className="form-field">
                <label>Gross Area (sqm)</label>
                <input
                  type="number"
                  step="0.01"
                  name="grossArea"
                  value={unit.grossArea}
                  onChange={(e) => handleUnitChange(index, e)}
                  required
                />
              </div>
              <div className="form-field">
                <label>Floor Number</label>
                <input
                  type="number"
                  name="floorNumber"
                  value={unit.floorNumber}
                  onChange={(e) => handleUnitChange(index, e)}
                  required
                />
              </div>
              <div className="form-field">
                <label>Block/Building Name</label>
                <input
                  type="text"
                  name="blockName"
                  value={unit.blockName}
                  onChange={(e) => handleUnitChange(index, e)}
                  required
                />
              </div>
              <div className="form-field" style={{ gridColumn: "span 2" }}>
                <label>Total Gross Area of Building (for this block)</label>
                <input
                  type="number"
                  step="0.01"
                  name="totalBuildingGrossArea"
                  value={unit.totalBuildingGrossArea}
                  onChange={(e) => handleUnitChange(index, e)}
                  required
                />
              </div>
            </div>
            {units.length > 1 && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => removeUnit(index)}
              >
                <span className="btn-icon">🗑️</span> Remove Unit
              </button>
            )}
          </div>
        ))}

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 12,
            marginTop: 12,
          }}
        >
          <button
            type="button"
            className="btn btn-outline"
            onClick={addUnit}
            disabled={loading}
          >
            <span className="btn-icon">➕</span> Add Another Unit
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <span className="btn-icon">📩</span> Submit All Units
          </button>
        </div>
      </form>
    </div>
  );
}

export default DeveloperSubmissionForm;
