import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios"; // Use your existing API utility

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await API.post("/api/register", formData); // Use your API endpoint
      console.log("Signup successful:", res.data);
      navigate("/login"); // After successful signup, navigate to login page
    } catch (err) {
      console.error("Signup error:", err.response?.data?.msg || err.message);
      setError(err.response?.data?.msg || "Signup failed");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-r from-green-700 via-green-500 to-green-300 font-helvetica">
      <div className="bg-white p-12 rounded-xl shadow-xl w-100 max-w-lg">
        <h2 className="text-3xl font-semibold text-center mb-6 text-gray-800">
          IoT Irrigation System
        </h2>
        <h3 className="text-xl text-center mb-4 text-gray-600">
          Create a New Account
        </h3>

        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="text-sm font-medium text-gray-700"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Enter your username"
              className="w-full p-3 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              className="w-full p-3 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-pink-600 text-white text-lg font-semibold rounded-md hover:bg-pink-700 focus:ring-2 focus:ring-pink-500 transition"
          >
            Sign Up
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <span
              onClick={() => navigate("/login")}
              className="text-pink-600 font-medium hover:underline cursor-pointer"
            >
              Log In here
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
