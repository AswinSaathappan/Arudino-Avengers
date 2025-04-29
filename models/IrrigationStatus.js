const mongoose = require("mongoose");

const IrrigationStatusSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["ON", "OFF"],
    default: "OFF",
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("IrrigationStatus", IrrigationStatusSchema);
