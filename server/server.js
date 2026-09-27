import "dotenv/config";
import express from "express";
import cors from "cors";

import { getLatestTelemetry } from "./thingsboard/telemetry.js";

import {
    saveSensorReading,
    getSensorHistory
} from "./db/sensorRepository.js";

import { calculateRisk } from "./utils/riskEngine.js";

const app = express();

app.use(
    cors({
        origin: "http://localhost:5173"
    })
);

app.use(express.json());

const PORT = process.env.PORT || 5000;

/* =========================================================
   ROOT
========================================================= */

app.get("/", (req, res) => {
    res.json({
        message: "Coles Mines Backend is running"
    });
});

/* =========================================================
   LIVE TELEMETRY

   ThingsBoard
        ↓
   Node.js
        ↓
   Risk Engine
        ↓
   PostgreSQL
        ↓
   React
========================================================= */

app.get("/api/telemetry", async (req, res) => {
    try {
        const deviceId =
            process.env.THINGSBOARD_DEVICE_ID;

        if (!deviceId) {
            return res.status(500).json({
                success: false,
                message:
                    "THINGSBOARD_DEVICE_ID is not configured"
            });
        }

        /*
         * Get REAL telemetry from ThingsBoard
         */
        const telemetry =
            await getLatestTelemetry(deviceId);

        /*
         * Calculate REAL risk from
         * ThingsBoard sensor values
         */
        const risk =
            calculateRisk(telemetry);

        /*
         * Save REAL sensor reading
         * into PostgreSQL
         */
        const savedReading =
            await saveSensorReading(
                deviceId,
                telemetry
            );

        /*
         * Return everything to React
         */
        res.json({
            success: true,

            device: {
                id: deviceId,
                name: "MINE NODE 01"
            },

            telemetry,

            risk,

            savedReading,

            timestamp:
                new Date().toISOString()
        });

    } catch (error) {
        console.error(
            "Telemetry processing failed:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to process ThingsBoard telemetry",
            error:
                error.message
        });
    }
});

/* =========================================================
   SENSOR HISTORY

   Supports:
   15min
   1hour
   6hours
   24hours
========================================================= */

app.get(
    "/api/telemetry/history",
    async (req, res) => {
        try {
            const limit = Math.min(
                Number(req.query.limit) || 100,
                500
            );

            const timeRange =
                req.query.range || "1hour";

            const allowedRanges = [
                "15min",
                "1hour",
                "6hours",
                "24hours"
            ];

            if (
                !allowedRanges.includes(
                    timeRange
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid time range. Use 15min, 1hour, 6hours, or 24hours."
                });
            }

            const history =
                await getSensorHistory(
                    limit,
                    timeRange
                );

            res.json({
                success: true,
                count: history.length,
                range: timeRange,
                data: history
            });

        } catch (error) {
            console.error(
                "Failed to fetch sensor history:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to fetch sensor history",
                error:
                    error.message
            });
        }
    }
);

/* =========================================================
   SERVER ERROR HANDLING
========================================================= */

app.use(
    (err, req, res, next) => {
        console.error(
            "Unhandled server error:",
            err
        );

        res.status(500).json({
            success: false,
            message:
                "Internal server error"
        });
    }
);

/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {
    console.log(
        `Backend running on http://localhost:${PORT}`
    );

    console.log(
        "ThingsBoard:",
        process.env.THINGSBOARD_URL
    );

    console.log(
        "Device:",
        process.env.THINGSBOARD_DEVICE_ID
    );
});