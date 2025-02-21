from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import mysql.connector
from datetime import datetime, timedelta

# Database connection settings
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "NewPasswordHere",
    "database": "tempandhumidity_readings",
}

# Hardcoded credentials (for testing)
HARD_CODED_USERNAME = "admin"
HARD_CODED_PASSWORD = "password"

# Initialize FastAPI app
app = FastAPI()

# CORS Middleware (allow frontend access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBasic()

# Function to verify Basic Auth credentials
def verify_user(credentials: HTTPBasicCredentials = Depends(security)):
    if credentials.username == HARD_CODED_USERNAME and credentials.password == HARD_CODED_PASSWORD:
        return credentials.username
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid username or password",
        headers={"WWW-Authenticate": "Basic"},
    )

# Function to connect to the database
def get_db():
    return mysql.connector.connect(**DB_CONFIG)


@app.post("/login")
def login(credentials: HTTPBasicCredentials = Depends(security)):
    if credentials.username == HARD_CODED_USERNAME and credentials.password == HARD_CODED_PASSWORD:
        return {"message": "Login successful"}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid username or password",
        headers={"WWW-Authenticate": "Basic"},
    )

# Protected route: Get user info
@app.get("/users/me")
def read_users_me(current_user: str = Depends(verify_user)):
    return {"username": current_user}

# Get the latest temperature & humidity reading (protected)
@app.get("/latest")
def get_latest_reading(current_user: str = Depends(verify_user)):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT reading_ID, temperature, humidity, clock, date, alert_temperature, alert_humidity
            FROM readings
            ORDER BY reading_ID DESC
            LIMIT 1
        """)
        result = cursor.fetchone()
        cursor.close()
        conn.close()

        if result:
            try:
                formatted_time = str(result["clock"]) if isinstance(result["clock"], timedelta) else "00:00:00"
                full_datetime = datetime.strptime(f"{result['date']} {formatted_time}", "%Y-%m-%d %H:%M:%S")
                result["time"] = full_datetime.strftime("%H:%M:%S")
                result["date"] = full_datetime.strftime("%Y-%m-%d")
                del result["clock"]
            except ValueError as e:
                return {"error": f"Time conversion failed: {str(e)}"}

            return [result]
        else:
            return [] 
    except Exception as e:
        return {"error": str(e)}


@app.get("/past-readings")
def get_past_readings(
    current_user: str = Depends(verify_user),
    limit: int = Query(20, description="Number of past readings to retrieve"),
    start_date: str = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(None, description="End date in YYYY-MM-DD format")
):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)

        query = "SELECT reading_ID, temperature, humidity, clock, date, alert_temperature, alert_humidity FROM readings"
        conditions = []
        params = []

        if start_date:
            conditions.append("date >= %s")
            params.append(start_date)
        if end_date:
            conditions.append("date <= %s")
            params.append(end_date)

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY reading_ID DESC LIMIT %s"
        params.append(limit)

        cursor.execute(query, tuple(params))
        results = cursor.fetchall()
        cursor.close()
        conn.close()

        # Format time
        for result in results:
            formatted_time = str(result["clock"]) if isinstance(result["clock"], timedelta) else "00:00:00"
            full_datetime = datetime.strptime(f"{result['date']} {formatted_time}", "%Y-%m-%d %H:%M:%S")
            result["time"] = full_datetime.strftime("%H:%M:%S")
            result["date"] = full_datetime.strftime("%Y-%m-%d")
            del result["clock"]

        return results if results else {"message": "No data found"}
    except Exception as e:
        return {"error": str(e)}

# Run FastAPI app with Uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)
