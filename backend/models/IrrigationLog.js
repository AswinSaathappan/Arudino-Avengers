const mongoose = require("mongoose");

const IrrigationLogSchema = new mongoose.Schema({
  date: {
    type: String, // e.g., "2025-04-26"
    required: true,
  },
  irrigationStatusPerHour: [
    {
      hour: {
        type: Number, // Hour of the day (0-23)
        required: true,
      },
      onTime: {
        type: Number, // Total minutes irrigation was ON during that hour
        default: 0,
      },
      offTime: {
        type: Number, // Total minutes irrigation was OFF during that hour
        default: 0,
      },
    },
  ],
});

module.exports = mongoose.model("IrrigationLog", IrrigationLogSchema);
