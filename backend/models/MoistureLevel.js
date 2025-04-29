const mongoose = require("mongoose");

const MoistureLevelSchema = new mongoose.Schema({
  date: {
    type: String, // e.g., "2025-04-26"
    required: true,
  },
  hour: {
    type: Number, // Hour of the day (0-23)
    required: true,
  },
  moisture: {
    type: Number, // Moisture percentage
    required: true,
  },
});

module.exports = mongoose.model("MoistureLevel", MoistureLevelSchema);
