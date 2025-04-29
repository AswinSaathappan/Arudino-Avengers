// models/MoistureData.js
const mongoose = require("mongoose");

const MoistureDataSchema = new mongoose.Schema({
  moisture: Number,
  humidity: Number,
  irrigationStatus: { type: String, default: "OFF" },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("MoistureData", MoistureDataSchema);
