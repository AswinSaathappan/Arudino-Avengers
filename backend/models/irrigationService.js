const IrrigationStatus = require("./IrrigationStatus");
const IrrigationLog = require("./IrrigationLog");

let interval = null; // Store the interval to control it
let onTime = 0;
let offTime = 0;
let currentStatus = "OFF"; // Default status

// Function to get IST Date
function getISTDate() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC + 5.5 hours
  const istTime = new Date(now.getTime() + istOffset);
  return istTime;
}

// Function to get current IST hour (0-23) and minutes (0-59)
function getISTTime() {
  const now = new Date();
  const options = {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  };
  const istTimeString = now.toLocaleString("en-IN", options);
  console.log("IST Time String:", istTimeString); // Log the IST time string for debugging
  const [hour, minute] = istTimeString.split(":").map((e) => parseInt(e, 10)); // Extract hour and minute
  return { hour, minute }; // Return hour and minute
}

// Function to calculate the time left until the next full hour (00 minutes)
function getTimeUntilNextHour() {
  const { hour, minute } = getISTTime();
  const nextFullHour = (hour + 1) % 24; // Next hour in 24-hour format
  const timeUntilNextHourInMinutes = (60 - minute) % 60; // Minutes until the next full hour
  return timeUntilNextHourInMinutes;
}

// Function to start tracking irrigation
function startTracking(status) {
  // Pause the current interval if there's one
  if (interval) {
    clearInterval(interval);
  }

  status = status.toUpperCase(); // Ensure status is in uppercase
  console.log(`Irrigation status changed to: ${status}`);

  // Use local time for interval control
  if (status === "ON") {
    interval = setInterval(() => {
      onTime++;
      console.log(`Irrigation is ON. Total time: ${onTime} minutes (IST)`);
    }, 60000); // Increment every minute
  } else if (status === "OFF") {
    interval = setInterval(() => {
      offTime++;
      console.log(`Irrigation is OFF. Total time: ${offTime} minutes (IST)`);
    }, 60000); // Increment every minute
  }
}

// Function to log irrigation data every hour (triggered at the start of each hour)
async function logIrrigationData() {
  const istDate = getISTDate();
  const today = istDate.toISOString().split("T")[0]; // Format to YYYY-MM-DD
  var { hour } = getISTTime(); // Get current hour
  hour = hour - 1;
  if (hour == -1) hour = 23; // Adjust hour to 0-23 range
  console.log("Current hour:", hour); // Log the current hour for debugging
  let irrigationLog = await IrrigationLog.findOne({ date: today });

  // If no log exists for today, create a new log
  if (!irrigationLog) {
    irrigationLog = new IrrigationLog({
      date: today,
      irrigationStatusPerHour: [],
    });
  }

  const hourLog = irrigationLog.irrigationStatusPerHour.find(
    (log) => log.hour === hour
  );

  if (hourLog) {
    hourLog.onTime = onTime;
    hourLog.offTime = offTime;
  } else {
    irrigationLog.irrigationStatusPerHour.push({
      hour: hour,
      onTime: onTime,
      offTime: offTime,
    });
  }

  // Save the updated log
  await irrigationLog.save();
  console.log(`Logged irrigation data for ${today} at hour ${hour}`);

  // Reset the counters after logging
  onTime = 0;
  offTime = 0;
}

// Function to initialize irrigation tracking (Fetch status and start tracking)
async function initializeIrrigationTracking() {
  try {
    // Fetch the current irrigation status from the database
    let irrigationStatus = await IrrigationStatus.findOne();

    if (!irrigationStatus) {
      // If no status is found, create a default OFF status
      irrigationStatus = await IrrigationStatus.create({ status: "OFF" });
    }

    // Start tracking based on the current status in the database
    console.log(
      `Initializing irrigation system with status: ${irrigationStatus.status}`
    );
    startTracking(irrigationStatus.status);

    // Calculate time until the next full hour
    const timeUntilNextHour = getTimeUntilNextHour();
    console.log(`Time until next full hour: ${timeUntilNextHour} minutes`);

    // Wait until the next full hour and trigger log immediately
    setTimeout(async () => {
      await logIrrigationData(); // Log data immediately after reaching the next full hour
      // Now, continue logging every hour
      setInterval(logIrrigationData, 60 * 60 * 1000); // Continue logging every hour
    }, timeUntilNextHour * 60 * 1000); // Wait for the next full hour (in milliseconds)
  } catch (error) {
    console.error("Error initializing irrigation tracking:", error);
  }
}

// Initialize irrigation tracking when the application starts
initializeIrrigationTracking();

// Expose the functions to be used in API routes
module.exports = {
  startTracking,
};
