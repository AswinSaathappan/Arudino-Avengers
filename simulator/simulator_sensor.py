import paho.mqtt.client as mqtt
import random
import time
import threading
import tkinter as tk
from tkinter import ttk  # Modern themed widgets

# MQTT Setup
BROKER = "test.mosquitto.org"
PORT = 1883
TOPIC_MOISTURE = "iot/field/moisture"
TOPIC_HUMIDITY = "iot/field/humidity"

client = mqtt.Client(protocol=mqtt.MQTTv311)  # Fix deprecation warning
client.connect(BROKER, PORT, 60)
client.loop_start()  # Background thread for MQTT

# Global flags
use_manual_control = False
moisture_value = 50
humidity_value = 60

def publish_data():
    global moisture_value, humidity_value, use_manual_control

    virtual_hour = 6  # Starting from 6 AM

    while True:
        if not use_manual_control:
            # Smart randomness based on time of day
            if 6 <= virtual_hour <= 10:
                moisture_value = max(20, moisture_value - random.randint(0, 2))
                humidity_value = min(90, humidity_value + random.randint(0, 2))
            elif 11 <= virtual_hour <= 16:
                moisture_value = max(10, moisture_value - random.randint(1, 4))
                humidity_value = max(30, humidity_value - random.randint(1, 3))
            elif 17 <= virtual_hour <= 19:
                moisture_value = min(80, moisture_value + random.randint(2, 5))
                humidity_value = min(90, humidity_value + random.randint(1, 3))
            else:
                moisture_value = min(70, moisture_value + random.randint(0, 2))
                humidity_value = min(90, humidity_value + random.randint(0, 2))

            # Publish
            client.publish(TOPIC_MOISTURE, int(moisture_value))
            client.publish(TOPIC_HUMIDITY, int(humidity_value))

            print(f"[RANDOM MODE] Moisture: {int(moisture_value)}% | Humidity: {int(humidity_value)}% (Hour: {virtual_hour}:00)")

            # Update virtual clock
            virtual_hour = (virtual_hour + 1) % 24
        
        else:
            # In manual mode — simulate noise around set values
            simulated_moisture = moisture_value + random.randint(-2, 2)
            simulated_humidity = humidity_value + random.randint(-3, 3)

            simulated_moisture = max(0, min(100, simulated_moisture))
            simulated_humidity = max(0, min(100, simulated_humidity))

            client.publish(TOPIC_MOISTURE, int(simulated_moisture))
            client.publish(TOPIC_HUMIDITY, int(simulated_humidity))

            print(f"[MANUAL MODE] Set Moisture: {moisture_value}% -> Sent: {simulated_moisture}% | Set Humidity: {humidity_value}% -> Sent: {simulated_humidity}%")

        time.sleep(5)

def start_manual_mode(root):
    global use_manual_control
    use_manual_control = True
    root.destroy()

    control_window = tk.Tk()
    control_window.title("Manual Control - Sensor Adjustment")
    control_window.geometry("500x400")
    control_window.configure(bg="#f0f0f0")

    title_label = tk.Label(control_window, text="Manual Sensor Control", font=("Helvetica", 20, "bold"), bg="#f0f0f0")
    title_label.pack(pady=20)

    # Modern slider using ttk
    style = ttk.Style()
    style.configure("TScale", sliderlength=20, background="#f0f0f0")

    moisture_frame = tk.Frame(control_window, bg="#f0f0f0")
    moisture_frame.pack(pady=15)
    tk.Label(moisture_frame, text="Set Moisture (%)", font=("Helvetica", 14), bg="#f0f0f0").pack()
    moisture_slider = ttk.Scale(moisture_frame, from_=0, to=100, orient=tk.HORIZONTAL, length=300)
    moisture_slider.set(50)
    moisture_slider.pack(pady=5)

    humidity_frame = tk.Frame(control_window, bg="#f0f0f0")
    humidity_frame.pack(pady=15)
    tk.Label(humidity_frame, text="Set Humidity (%)", font=("Helvetica", 14), bg="#f0f0f0").pack()
    humidity_slider = ttk.Scale(humidity_frame, from_=0, to=100, orient=tk.HORIZONTAL, length=300)
    humidity_slider.set(60)
    humidity_slider.pack(pady=5)

    def update_values():
        global moisture_value, humidity_value
        moisture_value = moisture_slider.get()
        humidity_value = humidity_slider.get()
        control_window.after(1000, update_values)

    update_values()

    threading.Thread(target=publish_data, daemon=True).start()

    control_window.mainloop()

def start_random_mode(root):
    global use_manual_control
    use_manual_control = False
    root.destroy()

    threading.Thread(target=publish_data, daemon=True).start()

    sim_window = tk.Tk()
    sim_window.title("Simulation Running - Random Mode")
    sim_window.geometry("500x300")
    sim_window.configure(bg="#e6f2ff")

    title_label = tk.Label(sim_window, text="🌱 Random Simulation Running...", font=("Helvetica", 20, "bold"), bg="#e6f2ff")
    title_label.pack(pady=30)

    info_label = tk.Label(sim_window, text="Data is being sent every 5 seconds.\nClose this window to stop the simulation.", font=("Helvetica", 14), bg="#e6f2ff")
    info_label.pack(pady=20)

    sim_window.mainloop()

def main():
    root = tk.Tk()
    root.title("Sensor Simulator")
    root.geometry("500x400")
    root.configure(bg="#dff0d8")

    title_label = tk.Label(root, text="IoT Sensor Simulator", font=("Helvetica", 24, "bold"), bg="#dff0d8")
    title_label.pack(pady=30)

    mode_label = tk.Label(root, text="Select Simulation Mode", font=("Helvetica", 18), bg="#dff0d8")
    mode_label.pack(pady=20)

    random_btn = tk.Button(root, text="🌟 Random Mode", command=lambda: start_random_mode(root), width=25, height=2, font=("Helvetica", 14), bg="#5bc0de", fg="white", bd=0)
    random_btn.pack(pady=10)

    manual_btn = tk.Button(root, text="🛠️ Manual Mode", command=lambda: start_manual_mode(root), width=25, height=2, font=("Helvetica", 14), bg="#5cb85c", fg="white", bd=0)
    manual_btn.pack(pady=10)

    root.mainloop()

if __name__ == "__main__":
    main()
