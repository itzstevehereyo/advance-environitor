import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Settings = () => {
    const navigate = useNavigate();
    const [maxTemp, setMaxTemp] = useState("");
    const [minTemp, setMinTemp] = useState("");
    const [maxHumidity, setMaxHumidity] = useState("");
    const [minHumidity, setMinHumidity] = useState("");

    useEffect(() => {
        // Load saved alert settings from localStorage
        const savedSettings = JSON.parse(localStorage.getItem("alertSettings"));
        if (savedSettings) {
            setMaxTemp(savedSettings.maxTemp);
            setMinTemp(savedSettings.minTemp);
            setMaxHumidity(savedSettings.maxHumidity);
            setMinHumidity(savedSettings.minHumidity);
        }
    }, []);

    const handleSave = (e) => {
        e.preventDefault();
        const alertSettings = {
            maxTemp,
            minTemp,
            maxHumidity,
            minHumidity,
        };
        localStorage.setItem("alertSettings", JSON.stringify(alertSettings));
        alert("Alert settings updated!");
    };

    return (
        <div className="container">
            <nav className="navbar">
                <h1>Alert Settings</h1>
            </nav>

            <div className="card">
                <h2>Set Abnormal Levels</h2>
                <form onSubmit={handleSave}>
                    <label>Max Temperature (°C):</label>
                    <input type="number" value={maxTemp} onChange={(e) => setMaxTemp(e.target.value)} required />

                    <label>Min Temperature (°C):</label>
                    <input type="number" value={minTemp} onChange={(e) => setMinTemp(e.target.value)} required />

                    <label>Max Humidity (%RH):</label>
                    <input type="number" value={maxHumidity} onChange={(e) => setMaxHumidity(e.target.value)} required />

                    <label>Min Humidity (%RH):</label>
                    <input type="number" value={minHumidity} onChange={(e) => setMinHumidity(e.target.value)} required />

                    <button type="submit" className="btn-primary">Save</button>
                </form>
            </div>

            <button className="btn-secondary" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
        </div>
    );
};

export default Settings;
