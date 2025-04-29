import React, { useEffect, useState } from "react";
import API from "../api/axios";
import {
  LineChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Calendar from "react-calendar";
import ReactSwitch from "react-switch";
import "react-calendar/dist/Calendar.css";

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [status, setStatus] = useState("OFF"); // Initial state is OF
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState({});
  const [loadingToggle, setLoadingToggle] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingDefault, setLoadingDefault] = useState(false);

  // Function to call /set-default-mode route
  const handleSetDefaultMode = async () => {
    try {
      setLoadingDefault(true);
      await API.post("/set-default-mode"); // 🚀 call backend
      alert("Successfully set to default mode!");
    } catch (error) {
      console.error("Failed to set default mode:", error);
      alert("Failed to set default mode");
    } finally {
      setLoadingDefault(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("token");

    // Fetch Moisture and Humidity Data
    try {
      const res = await API.get("/api/data", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const reversedData = res.data.reverse();
      // console.log(reversedData);
      setData(reversedData.slice(0, 100)); // Show the last 100 data points

      // Fetch Current Irrigation Status
      const statusRes = await API.get("/api/irrigation-status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus(statusRes.data.status);

      // Fetch Irrigation Log Data for Calendar
      const irrigationRes = await API.get("/irrigation-log", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCalendarData(irrigationRes.data);
    } catch (error) {
      console.error("Error fetching data from the backend", error);
    }
  };

  const onDateClick = (date) => {
    setSelectedDate(date);
    fetchModalData(date);
  };

  const fetchModalData = async (date) => {
    const token = localStorage.getItem("token");
    const selectedDateString = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`; // Format to 'YYYY-MM-DD'

    try {
      const res = await API.get(
        `/irrigation-statistics/${selectedDateString}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Round the moisture and humidity values to 1 decimal place
      const roundedMoistureData = res.data.moistureData.map((item) => ({
        ...item,
        moisture: item.moisture.toFixed(1), // Round to 1 decimal place
      }));

      const roundedHumidityData = res.data.humidityData.map((item) => ({
        ...item,
        humidity: item.humidity.toFixed(1), // Round to 1 decimal place
      }));

      // Set the rounded data in the modal
      setModalData({
        ...res.data,
        moistureData: roundedMoistureData,
        humidityData: roundedHumidityData,
      });

      setIsModalOpen(true); // Open the modal
    } catch (error) {
      console.error("Error fetching data for selected date:", error);
    }
  };

  const tileClassName = ({ date, view }) => {
    if (view === "month") {
      const day = date.toISOString().split("T")[0];
      if (calendarData[day]) {
        return "bg-green-200"; // Highlight days with irrigation ON
      }
    }
    return null;
  };

  const handleToggleIrrigation = async () => {
    setLoadingToggle(true); // Disable button while loading
    const token = localStorage.getItem("token");

    try {
      const newStatus = status === "ON" ? "OFF" : "ON"; // Determine new status

      // Sending the requests to update the irrigation status and track it
      await API.post(
        "/toggle-irrigation",
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await API.post(
        "/toggle-irrigation-track",
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update status in state
      setStatus(newStatus);
    } catch (error) {
      console.error("Error toggling irrigation:", error);
    } finally {
      setLoadingToggle(false); // Re-enable button after request completes
    }
  };

  const closeModal = () => {
    setIsModalOpen(false); // Close modal
  };

  const calculateAverages = (data) => {
    const totalMoisture = data.reduce((acc, item) => acc + item.moisture, 0);
    const totalHumidity = data.reduce((acc, item) => acc + item.humidity, 0);

    const averageMoisture = totalMoisture / data.length;
    const averageHumidity = totalHumidity / data.length;

    return { averageMoisture, averageHumidity };
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-helvetica">
      <h1 className="text-4xl font-bold text-center mb-8">
        🌿 IoT Irrigation Dashboard
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Irrigation Status Card */}
        <div className="bg-white p-6 rounded-xl shadow-md flex flex-col items-center justify-center">
          <h2 className="text-2xl font-semibold mb-4">Irrigation Status</h2>

          {/* Display status in text */}
          <span
            className={`text-4xl font-bold mb-4 ${
              status === "ON" ? "text-green-500" : "text-red-500"
            }`}
          >
            {status}
          </span>

          {/* React switch component for toggle */}
          <ReactSwitch
            checked={status === "ON"} // Checks if the status is ON or OFF
            onChange={handleToggleIrrigation} // Toggle the status on click
            offColor="#d3d3d3" // Off state color
            onColor="#4CAF50" // On state color (green)
            uncheckedIcon={false} // Hide the off icon
            checkedIcon={false} // Hide the on icon
            disabled={loadingToggle} // Disable toggle during loading
            height={30} // Set the height of the switch
            width={60} // Set the width of the switch
          />

          {/* 🌟 New Button to activate Default Mode */}
          <button
            onClick={handleSetDefaultMode}
            disabled={loadingDefault}
            className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-full transition-all duration-300 disabled:opacity-50"
          >
            {loadingDefault ? "Setting Default..." : "Set to Default Mode"}
          </button>
        </div>

        {/* Moisture & Humidity Chart */}
        {/* Moisture & Humidity Chart */}
        <div className="bg-white p-6 rounded-xl shadow-md col-span-2 min-w-0">
          <h2 className="text-2xl font-semibold mb-4">
            Moisture & Humidity (Realtime Data from Sensors)
          </h2>

          {/* Show Date on Top (from first data point) */}
          {data.length > 0 && (
            <div className="text-gray-600 mb-2">
              Date: {data[0].timestamp.split(",")[0]} Time (IST)
            </div>
          )}

          <div className="overflow-x-scroll">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data} margin={{ right: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(timestamp) => {
                    const timePart = timestamp.split(",")[1]?.trim();
                    return timePart || timestamp;
                  }}
                  className="text-xs"
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(timestamp) => {
                    return `Date & Time: ${timestamp}`;
                  }}
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderRadius: "10px",
                    boxShadow: "0px 4px 8px rgba(0,0,0,0.2)",
                    padding: "8px",
                    zIndex: 10,
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="moisture"
                  stroke="#8884d8"
                  activeDot={{ r: 6 }}
                />
                <Line type="monotone" dataKey="humidity" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Calendar Section (full width) */}
        <div className="bg-white p-6 rounded-xl shadow-md col-span-3 flex flex-col items-center">
          <h2 className="text-2xl font-semibold mb-4">
            📅 Irrigation Calendar
          </h2>
          <Calendar
            onClickDay={onDateClick}
            // tileClassName={tileClassName}
            className="rounded-md"
          />
          {/* <p className="mt-4 text-gray-600">Green = Irrigation Active 🌱</p> */}
        </div>
      </div>
      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-xl w-full max-w-4xl overflow-auto max-h-[100vh]">
            <h2 className="text-2xl font-semibold mb-4">
              Irrigation Statistics for{" "}
              {selectedDate.getDate().toString().padStart(2, "0")}-
              {(selectedDate.getMonth() + 1).toString().padStart(2, "0")}-
              {selectedDate.getFullYear()}
            </h2>

            {modalData ? (
              <div className="space-y-6 overflow-y-auto max-h-[70vh]">
                {/* Moisture Levels Bar Chart */}
                <div className="chart-container">
                  <h3 className="text-xl font-semibold mb-3">
                    Moisture Levels Over the Day
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={modalData.moistureData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="hour"
                        label={{
                          value: "Hour of the Day",
                          position: "insideBottomRight",
                          offset: 0,
                        }}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="moisture" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Humidity Levels Bar Chart */}
                <div className="chart-container">
                  <h3 className="text-xl font-semibold mb-3">
                    Humidity Levels Over the Day
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={modalData.humidityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="hour"
                        label={{
                          value: "Hour of the Day",
                          position: "insideBottomRight",
                          offset: 0,
                        }}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="humidity" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Irrigation Status Bar Chart */}
                <div className="chart-container">
                  <h3 className="text-xl font-semibold mb-3">
                    Irrigation Status Over the Day
                  </h3>
                  {modalData.irrigationStatusData ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={modalData.irrigationStatusData.irrigationStatusPerHour?.map(
                          (item) => ({
                            hour: item.hour,
                            status: item.onTime, // Use onTime for the number of minutes ON
                          })
                        )}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="hour"
                          label={{
                            value: "Hour of the Day",
                            position: "insideBottomRight",
                            offset: 0,
                          }}
                        />
                        <YAxis
                          type="number"
                          domain={[0, "dataMax"]} // Dynamically adjust the Y-axis based on the data
                          tickFormatter={(value) => `${value} min`} // Format ticks as minutes
                        />
                        <Tooltip
                          formatter={(value) => `${value} min`} // Show minutes in tooltip
                        />
                        <Legend />
                        <Bar
                          dataKey="status"
                          barSize={30}
                          radius={[10, 10, 10, 10]} // Rounded corners
                          shape={(props) => {
                            const { x, y, width, height, fill, payload } =
                              props;
                            const barColor =
                              payload.status > 0 ? "#4CAF50" : "#d3d3d3"; // Green for ON, Gray for OFF
                            return (
                              <rect
                                x={x}
                                y={y}
                                width={width}
                                height={height}
                                fill={barColor}
                                rx={10} // rounded x-axis corners
                                ry={10} // rounded y-axis corners
                              />
                            );
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <h3 className="text-xl font-semibold mb-3 py-4 text-red-500">
                      No Irrigation Data Available
                    </h3>
                  )}
                </div>

                {/* Small Charts for Moisture and Humidity (Left and Right of Irrigation Status) */}
                {/* <div className="flex space-x-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-3">
                      Average Moisture (Small)
                    </h3>
                    <ResponsiveContainer width="100%" height={150}>
                      <BarChart data={modalData.moistureData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="moisture" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-3">
                      Average Humidity (Small)
                    </h3>
                    <ResponsiveContainer width="100%" height={150}>
                      <BarChart data={modalData.humidityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="humidity" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div> */}

                {/* Average Values */}
                <div className="flex justify-center items-center mt-6">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold mb-3">
                      Average Moisture & Humidity
                    </h3>
                    <div>
                      <p>
                        Average Moisture:{" "}
                        {Math.round(modalData.averageMoisture * 1000) / 1000}
                      </p>
                      <p>
                        Average Humidity:{" "}
                        {Math.round(modalData.averageHumidity * 1000) / 1000}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-600">Loading data...</div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                onClick={closeModal}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full transition-all duration-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
