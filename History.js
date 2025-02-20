import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const History = () => {
    const [pastReadings, setPastReadings] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchPastReadings();
    }, []);

    // ✅ Fetch ALL past readings
    const fetchPastReadings = async () => {
        const auth = localStorage.getItem("auth");
        const response = await fetch("http://127.0.0.1:8000/past-readings", {
            headers: { Authorization: `Basic ${auth}` },
        });

        if (response.ok) {
            const data = await response.json();
            setPastReadings(data);
        }
    };

    return (
        <div className="container">
            <h1>Past Readings</h1>
            <table className="table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Temperature (°C)</th>
                        <th>Humidity (%RH)</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {pastReadings.length > 0 ? (
                        pastReadings.map((reading, index) => (
                            <tr key={index}>
                                <td>{reading.date}</td>
                                <td>{reading.time}</td>
                                <td>{reading.temperature}°C</td>
                                <td>{reading.humidity}%</td>
                                <td>
                                    <span className={
                                        reading.temperature > 30 ? "hot" :
                                        reading.temperature < 18 ? "cold" :
                                        reading.humidity > 70 ? "humid" : "normal"
                                    }>
                                        {reading.temperature > 30 ? "Hot" :
                                        reading.temperature < 18 ? "Cold" :
                                        reading.humidity > 70 ? "Humid" : "Normal"}
                                    </span>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="5">No past readings available.</td>
                        </tr>
                    )}
                </tbody>
            </table>
            <button className="btn-secondary" onClick={() => navigate("/dashboard")}>
                Back to Dashboard
            </button>
        </div>
    );
};

export default History;
