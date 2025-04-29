const express = require("express");
const router = express.Router();
const IrrigationStatus = require("../models/IrrigationStatus");
const IrrigationLog = require("../models/IrrigationLog");
const MoistureLevel = require("../models/MoistureLevel");
const HumidityLevel = require("../models/HumidityLevel");
const irrigationService = require("../models/irrigationService");
const mqtt = require("mqtt");

// Connect to MQTT broker
const mqttClient = mqtt.connect("mqtt://test.mosquitto.org");

mqttClient.on("connect", () => {
  console.log("Connected to MQTT broker!");
});

let onTime = 0; // Total minutes irrigation has been ON
let offTime = 0; // Total minutes irrigation has been OFF
let currentStatus = "OFF"; // Initial status is OFF
let interval; // To store the interval ID for tracking time

// Helper function to get current time in IST (UTC +5:30)
function getISTDate() {
  const date = new Date();
  const istOffset = 5.5 * 60; // IST is UTC +5:30 (5 hours and 30 minutes)
  const istTime = new Date(
    date.getTime() + (istOffset - date.getTimezoneOffset()) * 60000
  );
  return istTime;
}

// POST Toggle Status and Start Tracking
router.post("/toggle-irrigation-track", async (req, res) => {
  try {
    // console.log("Incoming request body:", req.body); // Log the incoming request body for debugging
    const { status } = req.body;
    const istDate = getISTDate();
    const today = istDate.toDateString().split("T")[0]; // Current date in YYYY-MM-DD format (IST)

    // // Fetch the current irrigation status from the database
    // let irrigationStatus = await IrrigationStatus.findOne();
    // if (!irrigationStatus) {
    //   irrigationStatus = await IrrigationStatus.create({ status: "OFF" });
    // }
    // console.log("Current irrigation status:", irrigationStatus.status);
    // // If the irrigation status changes
    // // if (irrigationStatus.status !== status) {
    // // // Update the irrigation status in the database
    // // irrigationStatus.status = status;
    // // await irrigationStatus.save();

    console.log(`Irrigation status changed to: ${status}`);

    // Start tracking the time in the irrigation service
    irrigationService.startTracking(status);

    // Send response with the updated status
    res.status(200).json({
      message: "Irrigation status toggled",
      newStatus: status,
    });
    // } else {
    // If status remains the same, send the current status back
    //   res.json({
    //     message: "Status remains the same",
    //     currentStatus: irrigationStatus.status,
    //   });
    // }
  } catch (error) {
    console.error("Error toggling irrigation status:", error);
    res.status(500).json({ message: "Error toggling irrigation status" });
  }
});

// GET Current Status
// GET Moisture, Humidity, and Irrigation Status for a particular date
router.get("/irrigation-statistics/:date", async (req, res) => {
  try {
    const { date } = req.params;

    const moistureData = await MoistureLevel.find({ date: date });
    const humidityData = await HumidityLevel.find({ date: date });
    const irrigationStatusData = await IrrigationLog.findOne({ date: date });
    // console.log("Irrigation status data for date", date, irrigationStatusData);
    const totalMoisture = moistureData.reduce(
      (sum, item) => sum + item.moisture,
      0
    );
    const totalHumidity = humidityData.reduce(
      (sum, item) => sum + item.humidity,
      0
    );

    const averageMoisture =
      moistureData.length > 0 ? totalMoisture / moistureData.length : 0;
    const averageHumidity =
      humidityData.length > 0 ? totalHumidity / humidityData.length : 0;
    console.log(irrigationStatusData);
    res.json({
      moistureData,
      humidityData,
      irrigationStatusData: irrigationStatusData,
      averageMoisture,
      averageHumidity,
    });
  } catch (error) {
    console.error("Error fetching irrigation statistics:", error);
    res.status(500).json({ message: "Error fetching irrigation statistics" });
  }
});

// POST Toggle Status
router.post("/toggle-irrigation", async (req, res) => {
  try {
    console.log("Incoming request body:", req.body);
    const { status } = req.body;

    let current = await IrrigationStatus.findOne();
    if (!current) {
      console.log("No current irrigation status found, creating new one...");
      current = await IrrigationStatus.create({ status: "OFF" });
    }

    console.log("Current irrigation status:", current.status);

    current.status = status;
    current.updatedAt = new Date();
    await current.save();

    console.log("Irrigation status updated to:", current.status);

    const today = new Date().toISOString().split("T")[0];
    console.log("Today's date:", today);

    await IrrigationLog.findOneAndUpdate(
      { date: today },
      { isOn: status === "ON" },
      { upsert: true }
    );
    console.log(
      "Irrigation log updated for today:",
      status === "ON" ? "ON" : "OFF"
    );

    // 🚀 Publish status to MQTT
    const pumpControlTopic = "iot/field/pump/control";
    const mqttMessage = status === "ON" ? "ON" : "OFF";

    mqttClient.publish(pumpControlTopic, mqttMessage, (err) => {
      if (err) {
        console.error("Failed to publish MQTT message:", err);
      } else {
        console.log(
          `Published MQTT message: ${mqttMessage} to topic: ${pumpControlTopic}`
        );
      }
    });

    res.json({
      message: "Status updated and MQTT message sent",
      newStatus: current.status,
    });
  } catch (error) {
    console.error("Error toggling irrigation status:", error);
    res.status(500).json({ message: "Error toggling irrigation status" });
  }
});

router.post("/set-default-mode", async (req, res) => {
  try {
    console.log("Request received to set irrigation to DEFAULT mode");

    const pumpControlTopic = "iot/field/pump/control";
    const mqttMessage = "DEFAULT"; // Default mode for ESP32

    if (mqttClient.connected) {
      mqttClient.publish(pumpControlTopic, mqttMessage, (err) => {
        if (err) {
          console.error("Failed to publish DEFAULT mode MQTT message:", err);
          return res
            .status(500)
            .json({ message: "Failed to send default mode command" });
        } else {
          console.log(
            `Published MQTT message: ${mqttMessage} to topic: ${pumpControlTopic}`
          );
          return res.json({
            message: "Default mode activated and MQTT message sent",
          });
        }
      });
    } else {
      console.error("MQTT client not connected!");
      return res.status(500).json({ message: "MQTT client not connected" });
    }
  } catch (error) {
    console.error("Error setting default mode:", error);
    res.status(500).json({ message: "Error setting default mode" });
  }
});

// GET Irrigation Logs for Calendar
router.get("/irrigation-log", async (req, res) => {
  try {
    const logs = await IrrigationLog.find({});
    const formatted = {};
    logs.forEach((log) => {
      formatted[log.date] = log.isOn;
    });
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: "Error fetching irrigation logs" });
  }
});

// POST Save Moisture Level
router.post("/save-moisture", async (req, res) => {
  try {
    const { moisture, hour, date } = req.body;
    const moistureRecord = new MoistureLevel({ moisture, hour, date });
    await moistureRecord.save();
    res.json({ message: "Moisture level saved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error saving moisture level" });
  }
});

// POST Save Humidity Level
router.post("/save-humidity", async (req, res) => {
  try {
    const { humidity, hour, date } = req.body;
    const humidityRecord = new HumidityLevel({ humidity, hour, date });
    await humidityRecord.save();
    res.json({ message: "Humidity level saved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error saving humidity level" });
  }
});

// GET Moisture Levels for a Day
router.get("/moisture-levels/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const moistureData = await MoistureLevel.find({ date }).sort({ hour: 1 });
    res.json(moistureData);
  } catch (error) {
    res.status(500).json({ message: "Error fetching moisture data" });
  }
});

// GET Humidity Levels for a Day
router.get("/humidity-levels/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const humidityData = await HumidityLevel.find({ date }).sort({ hour: 1 });
    res.json(humidityData);
  } catch (error) {
    res.status(500).json({ message: "Error fetching humidity data" });
  }
});

module.exports = router;
