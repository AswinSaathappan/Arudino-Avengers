const mongoose = require("mongoose");

const HumidityLevelSchema = new mongoose.Schema({
  date: {
    type: String, // e.g., "2025-04-26"
    required: true,
  },
  hour: {
    type: Number, // Hour of the day (0-23)
    required: true,
  },
  humidity: {
    type: Number, // Humidity percentage
    required: true,
  },
});

module.exports = mongoose.model("HumidityLevel", HumidityLevelSchema);
