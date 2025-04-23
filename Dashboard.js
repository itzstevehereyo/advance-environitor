import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import { useAuth } from "./AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/dashboard.css";
import logo from "./styles/logo.png";
import axios from "axios"

const Dashboard = () => {
    const { auth } = useAuth();
    const username = auth.username;
    const password = auth.password;
    const role = auth.role;

    const currentPage = window.location.pathname;
    	
    const [maxTemp, setMaxTemp] = useState(null);
    const [minTemp, setMinTemp] = useState(null);
    const [minHumidity, setMinHumidity] = useState(null);
    const [maxHumidity, setMaxHumidity] = useState(null);
    const [alertLogs, setAlertLogs] = useState([]);
    const [dailyStats, setDailyStats] = useState({
        avgTemp: null,
        minTemp: null,
        maxTemp: null,
        avgHumidity: null,
        minHumidity: null,
        maxHumidity: null
    });
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [expandedChart, setExpandedChart] = useState(null);
    const [tempChannelPage, setTempChannelPage] = useState(0);
    const [humidityChannelPage, setHumidityChannelPage] = useState(0);
    const itemsPerPage = 3;
    const [tempWidgetPage, setTempWidgetPage] = useState(0);
    const [humidityWidgetPage, setHumidityWidgetPage] = useState(0);
    const widgetItemsPerPage = 5;


    const [alertLogListPage, setalertLogListPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetch(`http://127.0.0.1:8000/alert-logs?page=${alertLogListPage}&username=${username}&password=${password}`)
            .then(res => res.json())
            .then(data => {
                setAlertLogs(data.logs);
                setTotalPages(data.total_pages);
            })
            .catch(error => console.error("Error fetching alert logs: ", error));
    }, [alertLogListPage]);

    useEffect(() => {
        fetch(`http://127.0.0.1:8000/daily-stats?username=${username}&password=${password}`)
            .then(res => res.json())
            .then(data => setDailyStats(data))
            .catch(error => console.error("Eroor fetching daily summary:", error));
    }, []);



    useEffect(() => {
        axios.get(`http://127.0.0.1:8000/get-thresholds?username=${username}&password=${password}`)
            .then(response => {
                if (response.data) {
                    setMinTemp(response.data.min_temperature);
                    setMaxTemp(response.data.max_temperature);
                    setMinHumidity(response.data.min_humidity);
                    setMaxHumidity(response.data.max_humidity);
                }
            })
            .catch(error => {
                console.error("Error fetching thresholds:", error);
                toast.error("Failed to load thresholds.");
            });
    }, []);

   
    const [latestReadings, setLatestReadings] = useState(() => {
        const savedData = localStorage.getItem("latestReadings");
        return savedData ? JSON.parse(savedData) : [];
    });

    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const navigate = useNavigate();
    const tempChartRef = useRef(null);
    const humidityChartRef = useRef(null);

    useEffect(() => {
        const interval = setInterval(fetchLatestReadings, 10000);
        return () => clearInterval(interval);
    }, []);

    const colorMap = {
        "Lab": "#e74c3c",          // Red
        "Server Room": "#3498db",  // Blue
        "Greenhouse": "#2ecc71",   // Green
        "Office": "#9b59b6",       // Purple
    };
    
    const generatedColors = {};
    
    const getColor = (label) => {
        if (colorMap[label]) return colorMap[label];
        if (!generatedColors[label]) {
            generatedColors[label] = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
        }
        return generatedColors[label];
    };
    

    const groupByChannel = (readings, type) => {
        const grouped = {};
        readings.forEach(reading => {
            const key = reading.channel_name || `Channel ${reading.channel_id}`;
            if (!grouped[key]) {
                grouped[key] = {
                    label: key,
                    data: [],
                    borderColor: getColor(key),
                    tension: 0.3,
                    fill: false
                };
            }
            grouped[key].data.push({ x: reading.time, y: reading[type] });
        });
        return Object.values(grouped);
    };

    const fetchLatestReadings = async () => {
        setLoading(true);
        try {
            const response = await fetch(`http://127.0.0.1:8000/latest?username=${username}&password=${password}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            const data = await response.json();

            if (response.ok && data.length > 0) {
                const latestData = data[0];
                checkAbnormalLevels(latestData);

                setLatestReadings((prevReadings) => {
                    const updatedReadings = [...prevReadings, latestData].slice(-10);
                    localStorage.setItem("latestReadings", JSON.stringify(updatedReadings));
                    return updatedReadings;
                });
            } else {
                console.error("Authentication failed or no data returned");
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const checkAbnormalLevels = (reading) => {
        let alertMessage = "";
    
        if (reading.temperature > maxTemp) {
            alertMessage = `🔥 High Temperature: ${reading.temperature}°C`;
            toast.warning(alertMessage, { position: "top-right" });
        }
        if (reading.temperature < minTemp) {
            alertMessage = `❄️ Low Temperature: ${reading.temperature}°C`;
            toast.warning(alertMessage, { position: "top-right" });
        }
        if (reading.humidity > maxHumidity) {
            alertMessage = `💦 High Humidity: ${reading.humidity}%`;
            toast.warning(alertMessage, { position: "top-right" });
        }
        if (reading.humidity < minHumidity) {
            alertMessage = `🌵 Low Humidity: ${reading.humidity}%`;
            toast.warning(alertMessage, { position: "top-right" });
        }
    
        // Send alert email if any abnormal condition is met
        if (alertMessage) {
            axios.get("http://127.0.0.1:8000/check-alerts?username=${username}&password=${password}", {
                username,
                password,
                subject: "Alert: Abnormal Sensor Reading",
                message: `Alert! ${alertMessage}. Please check the dashboard for details.`,
            })
            .then(() => console.log("Alert email sent"))
            .catch((error) => console.error("Failed to send alert email:", error));
        }
    };
    

    useEffect(() => {
        if (latestReadings.length > 0) {
            setTimeout(() => renderCharts(latestReadings), 100);
        }
    }, [latestReadings]);

    const renderCharts = (data) => {
        let tempDatasets = groupByChannel(data, "temperature");
        let humidityDatasets = groupByChannel(data, "humidity");

        if (selectedChannel) {
            tempDatasets = tempDatasets.filter(ds => ds.label === selectedChannel);
            humidityDatasets = humidityDatasets.filter(ds => ds.label === selectedChannel);
        }
    
        // Reset canvas height
        if (tempChartRef.current) tempChartRef.current.height = 300;
        if (humidityChartRef.current) humidityChartRef.current.height = 300;
    
        // Temperature chart
        if (tempChartRef.current) {
            if (window.tempChart) window.tempChart.destroy();
            window.tempChart = new Chart(tempChartRef.current, {
                type: "line",
                data: { datasets: tempDatasets },
                options: {
                    responsive: true,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: { mode: 'index', intersect: false }
                    },
                    scales: {
                        x: { title: { display: true, text: 'Time' } },
                        y: { title: { display: true, text: 'Temperature (°C)' } }
                    }
                }
            });
        }
    
        // Humidity chart
        if (humidityChartRef.current) {
            if (window.humidityChart) window.humidityChart.destroy();
            window.humidityChart = new Chart(humidityChartRef.current, {
                type: "line",
                data: { datasets: humidityDatasets },
                options: {
                    responsive: true,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: { mode: 'index', intersect: false }
                    },
                    scales: {
                        x: { title: { display: true, text: 'Time' } },
                        y: { title: { display: true, text: 'Humidity (%)' } }
                    }
                }
            });
        }
    };
    
    const handleLogout = () => {
        localStorage.removeItem("username");
        localStorage.removeItem("password");
        navigate("/");
    };

    const getStatusMessage = (reading) => {
        if (reading.temperature > 35) return "🔥 Too Hot";
        if (reading.temperature < 15) return "❄️ Too Cold";
        if (reading.humidity > 50) return "💦 Too Humid";
        if (reading.humidity < 30) return "🌵 Too Dry";
        return "✅ Normal";
    };

    const getStatusClass = (reading) => {
        if (reading.temperature > 35 || reading.temperature < 15 || reading.humidity > 80 || reading.humidity < 20) {
            return "status-warning";
        }
        return "status-normal";
    };

    const getLatestPerChannel = (readings) => {
        const seen = new Set();
        return readings.filter(reading => {
            if (seen.has(reading.channel_id)) return false
            seen.add(reading.channel_id);
            return true;
        });
    };

    return (
        <div className="dashboard-container">
            {/* Sidebar Navigation */}
            <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
                {/* Sidebar Toggle (Attached to Sidebar) */}
                <button 
                    className="sidebar-toggle"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                    ☰
                </button>

                <img src={logo} alt="Advance Environitor Logo" className="logo" />

                <div className="user-info-box">
                    <p>
                        Welcome, <strong>{username}</strong>!
                        Role: <em>{role}</em>
                        <button className="btn-secondary" onClick={() => navigate("/update-profile")}>
                            🧍‍♂️ Update Profile
                        </button>
                    </p>
                </div>

                <nav>
                    <button className={currentPage === "/dashboard" ? "active" : ""} onClick={() => navigate("/dashboard")}>
                        📊 Latest Reading Analytics
                    </button>
                    <button className={currentPage === "/history" ? "active" : ""} onClick={() => navigate("/history")}>
                        📜 View Past Readings
                    </button>
                    <button className={currentPage === "/settings" ? "active" : ""} onClick={() => navigate("/settings")}>
                        ⚙️ Set Alert Thresholds
                    </button>
                    <button className="btn-danger" onClick={handleLogout}>🚪 Logout</button>
                </nav>
            </aside>
    
    
                {/* <header className="page-title">
                    <img src={logo} alt="Advance Environitor Logo" className="logo"/>
                    <div className="navbar-titles">
                        <h1 className="header-title">Advance Environitor</h1>
                        <p className="header-subtitle">Latest Readings</p>
                    </div>
                </header> */}

                {(role === "technician" || role === "admin") && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
                        <button 
                            className="btn-secondary" 
                            onClick={() => navigate("/register-channel")}
                        >
                            ➕ Register Channel
                        </button>
                    </div>
                )}
    
                    {/* Status Label */}
                    {latestReadings && latestReadings.length > 0 && (
                        <div className="status-label">
                            <p>
                                Status: 
                                <span className={getStatusClass(latestReadings[latestReadings.length - 1])}>
                                    {getStatusMessage(latestReadings[latestReadings.length - 1])}
                                </span>
                            </p>
                        </div>
                    )}

                    {/* TEMPERATURE CHART AND WIDGET */}
                    <div className="chart-row">
                    {/* Widget Column */}
                    <div className="reading-widgets-container">
                        <h4 style={{ textAlign: "center" }}>🌡 Temperature</h4>
                        <div className="reading-widgets">
                        {getLatestPerChannel(latestReadings)
                            .slice(tempWidgetPage * widgetItemsPerPage, (tempWidgetPage + 1) * widgetItemsPerPage)
                            .map((r, idx) => (
                            <div key={idx} className="reading-widget">
                                <p><strong style={{ color: getColor(r.channel_name) }}>{r.channel_name}</strong></p>
                                <p>{r.temperature}°C</p>
                            </div>
                            ))}
                        </div>
                        <div className="widget-pagination">
                        <button onClick={() => setTempWidgetPage(Math.max(0, tempWidgetPage - 1))} disabled={tempWidgetPage === 0}>◀</button>
                        <span>Page {tempWidgetPage + 1}</span>
                        <button
                            onClick={() => setTempWidgetPage(tempWidgetPage + 1)}
                            disabled={(tempWidgetPage + 1) * widgetItemsPerPage >= getLatestPerChannel(latestReadings).length}
                        >
                            ▶
                        </button>
                        </div>
                    </div>
                    </div>

                    {/* Chart & Stats Column */}
                    <div className="charts-content">
                        <div className="chart">
                        <div className="chart-header">
                            <h3 className="graph-title">Temperature</h3>
                            <button className="expand-btn" onClick={() => setExpandedChart("temperature")}>⤢</button>
                        </div>
                        <canvas ref={tempChartRef}></canvas>

                        <div className="chart-stats-table">
                            <table>
                            <thead>
                                <tr>
                                <th>Channel</th>
                                <th>Min</th>
                                <th>Max</th>
                                <th>Avg</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.keys(dailyStats)
                                .slice(
                                    expandedChart === "temperature" ? 0 : tempChannelPage * itemsPerPage,
                                    expandedChart === "temperature" ? undefined : (tempChannelPage + 1) * itemsPerPage
                                )
                                .map(channel => {
                                    const stats = dailyStats[channel];
                                    if (!stats) return null;

                                    return (
                                    <tr key={channel} style={{ background: selectedChannel === channel ? "#eef6ff" : "transparent" }}>
                                        <td
                                        style={{ color: getColor(channel), cursor: "pointer", fontWeight: selectedChannel === channel ? "bold" : "normal" }}
                                        onClick={() => setSelectedChannel(selectedChannel === channel ? null : channel)}
                                        >
                                        {channel}
                                        </td>
                                        <td>{stats.minTemp} °C</td>
                                        <td>{stats.maxTemp} °C</td>
                                        <td>{stats.avgTemp} °C</td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                            </table>


                         {/* Table pagination */}
                        {expandedChart !== "temperature" && (
                        <div className="table-pagination">
                        <button
                            onClick={() => setTempChannelPage(Math.max(0, tempChannelPage - 1))}
                            disabled={tempChannelPage === 0}
                            >
                            ◀ Prev
                            </button>
                            <span style={{ margin: "0 10px" }}>
                            Page {tempChannelPage + 1} of {Math.ceil(Object.keys(dailyStats).length / itemsPerPage)}
                            </span>
                            <button
                            onClick={() => setTempChannelPage(tempChannelPage + 1)}
                            disabled={(tempChannelPage + 1) * itemsPerPage >= Object.keys(dailyStats).length}
                            >
                            Next ▶
                        </button>
                        </div>
                        )})
                        </div>
                        

                    {/* HUMIDITY CHART AND WIDGET */}
                    <div className="chart-row">
                        {/* Widget Column */}
                        <div className="reading-widgets-container">
                            <h4 style={{ textAlign: "center" }}>💧 Humidity</h4>
                            <div className="reading-widgets">
                            {getLatestPerChannel(latestReadings)
                                .slice(humidityWidgetPage * widgetItemsPerPage, (humidityWidgetPage + 1) * widgetItemsPerPage)
                                .map((r, idx) => (
                                <div key={idx} className="reading-widget">
                                    <p><strong style={{ color: getColor(r.channel_name) }}>{r.channel_name}</strong></p>
                                    <p>{r.humidity}% RH</p>
                                </div>
                                ))}
                            </div>
                            <div className="widget-pagination">
                            <button
                                onClick={() => setHumidityWidgetPage(Math.max(0, humidityWidgetPage - 1))}
                                disabled={humidityWidgetPage === 0}
                            >
                                ◀
                            </button>
                            <span>Page {humidityWidgetPage + 1}</span>
                            <button
                                onClick={() => setHumidityWidgetPage(humidityWidgetPage + 1)}
                                disabled={(humidityWidgetPage + 1) * widgetItemsPerPage >= getLatestPerChannel(latestReadings).length}
                            >
                                ▶
                            </button>
                            </div>
                        </div>
                            
                           {/* Chart & Stats Column */}
                            <div className="charts-content">
                                <div className="chart">
                                <div className="chart-header">
                                    <h3 className="graph-title">Humidity</h3>
                                    <button className="expand-btn" onClick={() => setExpandedChart("humidity")}>⤢</button>
                                </div>
                                <canvas ref={humidityChartRef}></canvas>

                                <div className="chart-stats-table">
                                    <table>
                                    <thead>
                                        <tr>
                                        <th>Channel</th>
                                        <th>Min</th>
                                        <th>Max</th>
                                        <th>Avg</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.keys(dailyStats)
                                        .slice(
                                            expandedChart === "humidity" ? 0 : humidityChannelPage * itemsPerPage,
                                            expandedChart === "humidity" ? undefined : (humidityChannelPage + 1) * itemsPerPage
                                        )
                                        .map(channel => {
                                            const stats = dailyStats[channel];
                                            if (!stats) return null;
                                            return (
                                            <tr key={channel} style={{ background: selectedChannel === channel ? "#eef6ff" : "transparent" }}>
                                                <td
                                                style={{ color: getColor(channel), cursor: "pointer", fontWeight: selectedChannel === channel ? "bold" : "normal" }}
                                                onClick={() => setSelectedChannel(selectedChannel === channel ? null : channel)}
                                                >
                                                {channel}
                                                </td>
                                                <td>{stats.minHumidity}% RH</td>
                                                <td>{stats.maxHumidity}% RH</td>
                                                <td>{stats.avgHumidity}% RH</td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                    </table>

                               {/* Table pagination */}
                                {expandedChart !== "humidity" && (
                                <div className="table-pagination">
                                    <button
                                    onClick={() => setHumidityChannelPage(Math.max(0, humidityChannelPage - 1))}
                                    disabled={humidityChannelPage === 0}
                                    >
                                    ◀ Prev
                                    </button>
                                    <span style={{ margin: "0 10px" }}>
                                    Page {humidityChannelPage + 1} of {Math.ceil(Object.keys(dailyStats).length / itemsPerPage)}
                                    </span>
                                    <button
                                    onClick={() => setHumidityChannelPage(humidityChannelPage + 1)}
                                    disabled={(humidityChannelPage + 1) * itemsPerPage >= Object.keys(dailyStats).length}
                                    >
                                    Next ▶
                                    </button>
                                </div>
                                )}
                            </div>

                        {/* Alert Logs Table */}
                        <div className="alert-logs">
                            <h3>Alert Logs</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Temperature</th>
                                        <th>Humidity</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alertLogs && alertLogs.length > 0 ? (
                                        alertLogs.map((log, index) => (
                                            <tr key={index}>
                                                <td>{log.timestamp}</td>
                                                <td>{log.temperature}°C</td>
                                                <td>{log.humidity}%</td>
                                                <td className={log.status === "High" ? "high-alert" : "low-alert"}>
                                                    {log.status}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4">No alerts recorded.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            </div>
            </div>
            </div>
                )}
            
export default Dashboard;
