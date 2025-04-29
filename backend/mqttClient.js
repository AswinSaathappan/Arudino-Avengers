const mqtt = require("mqtt");
const axios = require("axios");
const MoistureData = require("./models/MoistureData");

const client = mqtt.connect("mqtt://test.mosquitto.org", {
  reconnectPeriod: 1000, // to attempt reconnection if connection fails
  keepalive: 60, // ensure session stays alive
  debug: (message) => {
    console.log("MQTT Debug: " + message); // this will log detailed messages
  },
});

const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Track moisture and humidity data per hour
let hourlyMoistureData = [];
let hourlyHumidityData = [];
let currentHour = new Date().getHours();

// Function to store data for a particular hour
const storeData = async (hour, date) => {
  // Calculate average moisture and humidity for the hour
  const avgMoisture =
    hourlyMoistureData.reduce((sum, value) => sum + value, 0) /
      hourlyMoistureData.length || 0;
  const avgHumidity =
    hourlyHumidityData.reduce((sum, value) => sum + value, 0) /
      hourlyHumidityData.length || 0;

  // Push the accumulated data to the database using the existing endpoints
  try {
    await axios.post(`${process.env.API_URL}/save-moisture`, {
      moisture: avgMoisture,
      hour,
      date,
    });

    await axios.post(`${process.env.API_URL}/save-humidity`, {
      humidity: avgHumidity,
      hour,
      date,
    });

    console.log(
      `[DATA SAVED] Moisture: ${avgMoisture}% | Humidity: ${avgHumidity}% | Hour: ${hour}`
    );
  } catch (error) {
    console.error("Error saving data:", error);
  }

  // Reset the data for the next hour
  hourlyMoistureData = [];
  hourlyHumidityData = [];
};

client.on("connect", () => {
  console.log("📡 Connected to MQTT broker");
  client.subscribe("iot/field/#", (err) => {
    if (err) {
      console.log("❌ Failed to subscribe: ", err);
    } else {
      console.log("✅ Subscribed to iot/field/#");
    }
  });
});

client.on("message", async (topic, message) => {
  const value = message.toString();
  const hour = new Date().getHours();
  const date = new Date().toISOString().split("T")[0]; // Format date to YYYY-MM-DD

  // Check if the hour has changed
  if (hour !== currentHour) {
    await storeData(currentHour, date);
    currentHour = hour;
  }

  // Handling moisture and humidity
  if (topic === "iot/field/moisture") {
    global.currentMoisture = parseInt(value);
    hourlyMoistureData.push(global.currentMoisture);
  }

  if (topic === "iot/field/humidity") {
    global.currentHumidity = parseFloat(value);
    hourlyHumidityData.push(global.currentHumidity);
  }

  // 🆕 Handling pump status'
  let statusNow;
  if (topic === "iot/field/pump") {
    try {
      const IrrigationStatus = require("./models/IrrigationStatus");
      statusNow = value;
      await IrrigationStatus.findOneAndUpdate(
        {}, // empty filter = update the first found document (or create one)
        { status: value.toUpperCase(), updatedAt: new Date() },
        { upsert: true, new: true } // if not found, create new
      );

      // console.log(`[PUMP STATUS UPDATED] New Status: ${value}`);
    } catch (error) {
      console.error("Error updating pump status:", error);
    }
  }

  // Automation logic for irrigation based on sensors
  if (
    global.currentMoisture !== undefined &&
    global.currentHumidity !== undefined
  ) {
    let irrigationStatus = "OFF";
    const irrigationHour = new Date().getHours();

    if (
      global.currentMoisture < 30 &&
      ((irrigationHour >= 6 && irrigationHour <= 10) ||
        (irrigationHour >= 17 && irrigationHour <= 19))
    ) {
      irrigationStatus = "ON";
    }

    const MoistureData = require("./models/MoistureData");

    const newData = new MoistureData({
      moisture: global.currentMoisture,
      humidity: global.currentHumidity,
      irrigationStatus,
    });

    await newData.save();
    console.log(
      `[IRRIGATION LOG] Moisture: ${global.currentMoisture} | Humidity: ${global.currentHumidity}% | Irrigation: ${statusNow}`
    );
  }
});

module.exports = client;
