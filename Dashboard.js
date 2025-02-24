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

    // Fetch only the latest 10 readings for charts
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

            // Ensure `data` is an array (API returns a single object)
            const readingsArray = Array.isArray(data) ? data : [data];

            setLatestReadings(readingsArray);
            renderCharts(readingsArray);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    // Render the temperature & humidity charts
    const renderCharts = (data) => {
        if (!data || data.length === 0) {
            console.warn("No data available for charts.");
            return;
        }

        // Extract readings
        const labels = data.map((entry) => entry.time);
        const tempData = data.map((entry) => entry.temperature);
        const humidityData = data.map((entry) => entry.humidity);

        // Destroy existing charts if they exist
        if (window.tempChart instanceof Chart) window.tempChart.destroy();
        if (window.humidityChart instanceof Chart) window.humidityChart.destroy();

        // Create new charts
        if (tempChartRef.current) {
            window.tempChart = new Chart(tempChartRef.current, {
                type: "line",
                data: {
                    labels,
                    datasets: [
                        {
                            label: "Temperature (°C)",
                            data: tempData,
                            borderColor: "red",
                            backgroundColor: "rgba(255, 0, 0, 0.2)",
                        },
                    ],
                },
            });
        }

        if (humidityChartRef.current) {
            window.humidityChart = new Chart(humidityChartRef.current, {
                type: "line",
                data: {
                    labels,
                    datasets: [
                        {
                            label: "Humidity (%RH)",
                            data: humidityData,
                            borderColor: "blue",
                            backgroundColor: "rgba(0, 0, 255, 0.2)",
                        },
                    ],
                },
            });
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("auth");
        navigate("/");
    };

    return (
        <div className="container">
            <nav className="navbar">
                <h1>Temperature & Humidity Dashboard</h1>
                <button onClick={handleLogout} className="btn-danger">Logout</button>
            </nav>

            <div className="card">
                <h2>Latest Readings</h2>
                <div className="charts-container">
                    <div className="chart">
                        <canvas ref={tempChartRef}></canvas>
                    </div>
                    <div className="chart">
                        <canvas ref={humidityChartRef}></canvas>
                    </div>
                </div>
            </div>

            <div className="button-group">
                <button className="btn-secondary" onClick={() => navigate("/history")}>
                    View Past Readings
                </button>
                <button className="btn-secondary" onClick={() => navigate("/settings")}>
                    Change Alert Levels
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
