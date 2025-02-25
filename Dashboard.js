import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";

const Dashboard = () => {
    const [latestReadings, setLatestReadings] = useState([]);
    const navigate = useNavigate();

    // Canvas references
    const tempChartRef = useRef(null);
    const humidityChartRef = useRef(null);

    useEffect(() => {
        fetchLatestReadings();
    }, []);

    // Fetch the latest reading
    const fetchLatestReadings = async () => {
        try {
            const auth = localStorage.getItem("auth");
            const response = await fetch("http://127.0.0.1:8000/latest", {
                headers: { Authorization: `Basic ${auth}` },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch data");
            }

            const data = await response.json();
            setLatestReadings(data);
            renderCharts(data);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    // Render the charts
    const renderCharts = (data) => {
        if (!data || data.length === 0) return;

        const labels = data.map((entry) => entry.time);
        const tempData = data.map((entry) => entry.temperature);
        const humidityData = data.map((entry) => entry.humidity);

        if (window.tempChart instanceof Chart) window.tempChart.destroy();
        if (window.humidityChart instanceof Chart) window.humidityChart.destroy();

        if (tempChartRef.current) {
            window.tempChart = new Chart(tempChartRef.current, {
                type: "line",
                data: {
                    labels,
                    datasets: [{ label: "Temperature (°C)", data: tempData, borderColor: "red", backgroundColor: "rgba(255, 0, 0, 0.2)" }]
                },
            });
        }

        if (humidityChartRef.current) {
            window.humidityChart = new Chart(humidityChartRef.current, {
                type: "line",
                data: {
                    labels,
                    datasets: [{ label: "Humidity (%RH)", data: humidityData, borderColor: "blue", backgroundColor: "rgba(0, 0, 255, 0.2)" }]
                },
            });
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("auth");
        navigate("/");
    };

    // Get latest readings
    const latestReading = latestReadings.length > 0 ? latestReadings[0] : null;
    const latestTemp = latestReading ? latestReading.temperature : "N/A";
    const latestHumidity = latestReading ? latestReading.humidity : "N/A";
    const lastUpdated = latestReading ? `${latestReading.date} at ${latestReading.time}` : "N/A";

    // Determine temperature & humidity status
    const tempStatus = latestTemp > 30 ? "Hot" : latestTemp < 18 ? "Cold" : "Normal";
    const humidityStatus = latestHumidity > 50 ? "Wet" : "Normal";

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <h2>Advance Environitor</h2>
                <nav>
                    <button onClick={() => navigate("/history")}>📊 View Past Readings</button>
                    <p className="menu-description">View history of temperature and humidity readings. Generate PDF or spreadsheet for data analysis report.</p>

                    <button onClick={() => navigate("/settings")}>⚙️ Change Alert Levels</button>
                    <p className="menu-description">Adjust values when you should be alert.</p>

                    <button className="btn-danger" onClick={handleLogout}>🚪 Logout</button>
                </nav>
            </aside>

            {/* Main Content */}
            <div className="main-content">
                <nav className="navbar">
                    <h1>Advance Environitor</h1>
                </nav>

                <div className="card">
                    <h2>Latest Readings</h2>

                    {/* Numerical Values in Pill Boxes */}
                    <div className="latest-values">
                        <div className="reading-box">🌡️ {latestTemp}°C</div>
                        <div className="reading-box">💧 {latestHumidity}% RH</div>
                    </div>

                    {/* Last Updated Info */}
                    <div className="last-updated-box">Last updated: {lastUpdated}</div>

                    {/* Charts */}
                    <div className="charts-container">
                        <div className="chart">
                            <canvas ref={tempChartRef}></canvas>
                            <p className="status-label">Status: {tempStatus}</p>
                        </div>
                        <div className="chart">
                            <canvas ref={humidityChartRef}></canvas>
                            <p className="status-label">Status: {humidityStatus}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
