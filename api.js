// routes/api.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const MoistureData = require("../models/MoistureData");
const IrrigationStatus = require("../models/IrrigationStatus");

const router = express.Router();

// Register User (Only Once)
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("[REGISTER] Request received:", username);

    const user = await User.findOne({ username });
    if (user) {
      console.log("[REGISTER] User already exists:", username);
      return res.status(400).json({ msg: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    console.log("[REGISTER] User registered successfully:", username);
    res.json({ msg: "User registered" });
  } catch (err) {
    console.error("[REGISTER] Error:", err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("[LOGIN] Login attempt for user:", username);

    const user = await User.findOne({ username });
    if (!user) {
      console.log("[LOGIN] User not found:", username);
      return res.status(400).json({ msg: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("[LOGIN] Invalid credentials for user:", username);
      return res.status(400).json({ msg: "Invalid Credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    console.log(
      "[LOGIN] Login successful, token generated for user:",
      username
    );
    res.json({ token });
  } catch (err) {
    console.error("[LOGIN] Error:", err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

// Get Recent Moisture and Humidity
router.get("/data", async (req, res) => {
  try {
    const data = await MoistureData.find().sort({ timestamp: -1 }).limit(20);

    // Convert timestamps to Indian Time (IST)
    const formattedData = data.map((item) => ({
      ...item.toObject(),
      timestamp: new Date(item.timestamp).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
    }));

    res.json(formattedData);
  } catch (err) {
    console.error("[DATA] Error:", err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

// Get Current Irrigation Status
router.get("/irrigation-status", async (req, res) => {
  try {
    // console.log("[IRRIGATION STATUS] Checking latest irrigation status...");
    const latest = await IrrigationStatus.findOne().sort({ timestamp: -1 });
    if (latest) {
      //   console.log(
      //     "[IRRIGATION STATUS] Latest status found:",
      //     latest.irrigationStatus
      //   );
    } else {
      //   console.log("[IRRIGATION STATUS] No moisture data found.");
    }
    res.json({
      status: latest.status ? latest.status : "Unknown",
    });
  } catch (err) {
    console.error("[IRRIGATION STATUS] Error:", err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

// Manual control ON/OFF (for future expansion)

module.exports = router;
