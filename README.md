# ⛏️ MineGuard

## Real-Time Mine Safety & Risk Monitoring Platform

MineGuard is a real-time mine safety monitoring platform designed to monitor sensor telemetry, detect abnormal mine conditions, calculate safety risk levels, and provide automatic alerts.

The platform connects IoT sensor data through **ThingsBoard**, processes the telemetry through a **Node.js/Express backend**, stores historical readings in **PostgreSQL**, and presents the information through a modern **React dashboard**.

---

## 🚀 Project Overview

MineGuard provides a centralized monitoring system for mine safety conditions.

The system continuously receives sensor readings such as:

- Tilt X
- Tilt Y
- Acceleration X
- Acceleration Y
- Acceleration Z

The backend processes these readings and determines the current safety condition of the connected sensor node.

The dashboard provides:

- Live sensor monitoring
- Risk-level detection
- Historical sensor trends
- Mine node monitoring
- Automatic safety alarms
- Sensor status information
- Risk visualization
- Safety monitoring interface

---

## 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │     IoT Sensor       │
                    │   ESP32 / Sensors    │
                    └──────────┬───────────┘
                               │
                               │ Telemetry
                               ▼
                    ┌──────────────────────┐
                    │     ThingsBoard      │
                    │  IoT Device Platform │
                    └──────────┬───────────┘
                               │
                               │ REST API
                               ▼
                    ┌──────────────────────┐
                    │   Node.js + Express  │
                    │      Backend API     │
                    └───────┬───────┬──────┘
                            │       │
                  ┌─────────┘       └──────────┐
                  ▼                            ▼
        ┌──────────────────┐          ┌──────────────────┐
        │   PostgreSQL     │          │   Risk Engine    │
        │ Historical Data  │          │ Safety Analysis  │
        └──────────────────┘          └────────┬─────────┘
                                               │
                                               ▼
                                    ┌──────────────────────┐
                                    │      React UI        │
                                    │ Monitoring Dashboard │
                                    └──────────┬───────────┘
                                               │
                                               ▼
                                      🔊 Safety Alerts

                                      ✨ Features
📡 Real-Time Sensor Monitoring

MineGuard retrieves live telemetry from ThingsBoard through the Node.js backend.

The monitoring system currently handles:

Tilt X
Tilt Y
Acceleration X
Acceleration Y
Acceleration Z

Live telemetry is refreshed automatically.

⚠️ Risk Detection

MineGuard evaluates sensor tilt values and assigns a safety risk level.

Current tilt thresholds:

Tilt Condition	Risk Level	Alert
≤ 50°	NORMAL	🔇 No
> 50°	WARNING	🔊 Alert
> 60°	HIGH	🔊 Alert
> 70°	CRITICAL	🚨 Emergency Alert

The system checks both:

Tilt X
Tilt Y

If either axis crosses the configured threshold, the corresponding risk level is generated.

🔊 Automatic Safety Alarm

MineGuard includes an integrated browser-based alarm system.

When the sensor enters a warning, high, or critical condition:

ThingsBoard
     ↓
Node.js Backend
     ↓
Risk Engine
     ↓
React Dashboard
     ↓
AlertSound
     ↓
🔊 Automatic Alarm

When the sensor returns to the normal range:

Risk = NORMAL
     ↓
🔇 Alarm stops

The alarm system must first be armed through the dashboard because browsers restrict automatic audio playback without user interaction.

📊 Historical Monitoring

MineGuard stores sensor readings in PostgreSQL.

Historical data can be used to visualize:

Tilt X trends
Tilt Y trends
Sensor behavior
Previous readings
Time-based monitoring

Supported monitoring ranges include:

15 minutes
1 hour
6 hours
24 hours
🖥️ Dashboard

The React dashboard provides a centralized interface for mine monitoring.

Major sections include:

Dashboard

Provides an overview of:

Mine nodes
Risk levels
Sensor status
Safety conditions
Live Monitoring

Provides:

Real-time telemetry
Tilt X
Tilt Y
Acceleration
Risk status
Historical trend charts
Automatic alarms
Mine Map

Provides a visual representation of monitored mine nodes.

AI Risk Analysis

Provides risk-analysis information and safety indicators.

Safety Workers

Provides worker and safety monitoring information within the application interface.

🛠️ Technology Stack
Frontend
React.js
JavaScript
Vite
CSS
Lucide React
Backend
Node.js
Express.js
Axios
Database
PostgreSQL
IoT Platform
ThingsBoard
Hardware / Sensors
ESP32
Motion / Tilt Sensors
📁 Project Structure
MineGuard/
│
├── public/
│
├── src/
│   ├── assets/
│   │
│   ├── components/
│   │   ├── AlertSound.jsx
│   │   ├── Navbar.jsx
│   │   ├── RiskBar.jsx
│   │   ├── RiskTrendChart.jsx
│   │   ├── SensorChart.jsx
│   │   └── StatusIndicator.jsx
│   │
│   ├── data/
│   │   └── mockData.js
│   │
│   ├── hooks/
│   │   └── useTheme.js
│   │
│   ├── pages/
│   │   ├── AIRiskAnalysis.jsx
│   │   ├── Dashboard.jsx
│   │   ├── LiveMonitoring.jsx
│   │   ├── MineMap.jsx
│   │   └── SafetyWorkers.jsx
│   │
│   ├── styles/
│   │   ├── global.css
│   │   └── mineMap.css
│   │
│   └── utils/
│       └── riskUtils.js
│
├── server/
│   ├── db/
│   │   ├── database.js
│   │   └── sensorRepository.js
│   │
│   ├── thingsboard/
│   │   ├── thingsboardClient.js
│   │   └── telemetry.js
│   │
│   ├── utils/
│   │   └── riskEngine.js
│   │
│   ├── server.js
│   ├── testDatabase.js
│   └── testThingsBoard.js
│
├── .env
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
⚙️ Installation
1. Clone the Repository
git clone YOUR_GITHUB_REPOSITORY_URL

Move into the project:

cd MineGuard
2. Install Dependencies
npm install
🔐 Environment Variables

Create a .env file in the project root.

Example:

PORT=5000

THINGSBOARD_URL=https://eu.thingsboard.cloud

THINGSBOARD_API_KEY=YOUR_THINGSBOARD_API_KEY

THINGSBOARD_DEVICE_ID=YOUR_DEVICE_ID

DATABASE_URL=postgresql://USERNAME:PASSWORD@localhost:5432/terras_safe

CORS_ORIGINS=http://localhost:5173
Important

Never commit your real:

THINGSBOARD_API_KEY
DATABASE_URL password

to GitHub.

Keep .env inside .gitignore.

🗄️ PostgreSQL Setup

Create a PostgreSQL database:

CREATE DATABASE terras_safe;

Create the sensor readings table:

CREATE TABLE sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL,
    accel_x DOUBLE PRECISION,
    accel_y DOUBLE PRECISION,
    accel_z DOUBLE PRECISION,
    tilt_x DOUBLE PRECISION,
    tilt_y DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
📡 ThingsBoard Configuration

MineGuard uses ThingsBoard as the IoT telemetry platform.

Configure a ThingsBoard device and provide the device ID and API credentials through environment variables.

The backend retrieves telemetry using the ThingsBoard REST API.

The telemetry flow is:

Sensor
  ↓
ThingsBoard
  ↓
Node.js
  ↓
PostgreSQL
  ↓
React Dashboard
▶️ Running the Application
Start Backend

From the project root:

node server/server.js

The backend runs on:

http://localhost:5000
Start Frontend

Open another terminal:

npm run dev

The Vite development server normally runs on:

http://localhost:5173
🔌 API Endpoints
Get Live Telemetry
GET /api/telemetry

Example response:

{
  "success": true,
  "device": {
    "id": "DEVICE_ID",
    "name": "MINE NODE 01"
  },
  "telemetry": {
    "accelX": 0.12,
    "accelY": -0.94,
    "accelZ": 0.15,
    "tiltX": 12.5,
    "tiltY": 8.3
  },
  "risk": {
    "level": "NORMAL",
    "score": 10
  }
}
Get Historical Telemetry
GET /api/telemetry/history

Example with range:

GET /api/telemetry/history?range=1hour&limit=100

Supported ranges:

15min
1hour
6hours
24hours
🧠 Risk Engine

The risk engine is located at:

server/utils/riskEngine.js

The current normal tilt limit is:

export const NORMAL_TILT_DEGREE = 50;

Risk calculation:

≤ 50°
   ↓
NORMAL

> 50°
   ↓
WARNING

> 60°
   ↓
HIGH

> 70°
   ↓
CRITICAL

Both axes are evaluated independently:

Tilt X OR Tilt Y

Therefore, if either axis exceeds the configured threshold, the risk level changes.

🔊 Alarm System

The alarm component is:

src/components/AlertSound.jsx

The component supports:

NORMAL
WARNING
HIGH
CRITICAL

The alarm automatically responds to the risk level received from the backend.

Example:

NORMAL
↓
No sound

WARNING
↓
Warning beep

HIGH
↓
High-risk alert

CRITICAL
↓
Emergency siren
🧪 Testing
Test Backend

Run:

node server/server.js

Then open:

http://localhost:5000/api/telemetry
Test Database

You can test the PostgreSQL connection using:

node server/testDatabase.js
Test ThingsBoard
node server/testThingsBoard.js
🔄 Data Flow

The complete real-time data flow is:

                SENSOR
                   │
                   ▼
             THINGSBOARD
                   │
                   │ REST API
                   ▼
             NODE.JS API
                   │
          ┌────────┴────────┐
          │                 │
          ▼                 ▼
     RISK ENGINE       POSTGRESQL
          │                 │
          │                 │
          └────────┬────────┘
                   ▼
             REACT FRONTEND
                   │
          ┌────────┴────────┐
          │                 │
          ▼                 ▼
     LIVE MONITORING    ALERT SOUND
🔒 Security

The project follows basic security practices such as:

API credentials stored in environment variables
.env excluded from Git
ThingsBoard credentials kept on the backend
Frontend does not directly access private ThingsBoard credentials
PostgreSQL credentials stored server-side

Never expose private API keys in:

React components
GitHub
README.md
Screenshots
Frontend JavaScript
📈 Future Improvements

Potential future improvements include:

Multiple real IoT sensor nodes
Machine-learning-based risk prediction
Worker location tracking
SMS alerts
Email notifications
WhatsApp/Telegram alerts
Advanced mine mapping
More sensor types
Temperature monitoring
Gas detection
Vibration monitoring
Crack detection
Automated incident reports
Role-based authentication
Cloud deployment
Real-time WebSocket telemetry
Advanced analytics
Alert history and acknowledgement
Sensor health monitoring
🎯 Project Goals

MineGuard is designed to demonstrate how modern web technologies and IoT systems can be combined to create a real-time safety monitoring platform.

The main goals are:

Real-time IoT monitoring
Automated risk detection
Historical sensor analysis
Safety alert automation
Centralized mine monitoring
Scalable backend architecture
Production-oriented application design
👨‍💻 Development

Built using:

React
Node.js
Express
PostgreSQL
ThingsBoard
IoT Sensors
JavaScript
📜 License

This project is developed for educational, portfolio, and demonstration purposes.

Add an appropriate open-source license if the repository is intended to be publicly reused.