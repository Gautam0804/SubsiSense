import pool from "./database.js";

export async function saveSensorReading(deviceId, telemetry) {
    const query = `
        INSERT INTO sensor_readings
        (
            device_id,
            accel_x,
            accel_y,
            accel_z,
            tilt_x,
            tilt_y
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
    `;

    const values = [
        deviceId,
        telemetry.accelX,
        telemetry.accelY,
        telemetry.accelZ,
        telemetry.tiltX,
        telemetry.tiltY
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
}

export async function getSensorHistory(
    limit = 100,
    timeRange = "1hour"
) {
    const rangeMap = {
        "15min": "15 minutes",
        "1hour": "1 hour",
        "6hours": "6 hours",
        "24hours": "24 hours"
    };

    const interval = rangeMap[timeRange] || "1 hour";

    const query = `
        SELECT
            id,
            device_id,
            accel_x,
            accel_y,
            accel_z,
            tilt_x,
            tilt_y,
            recorded_at
        FROM sensor_readings
        WHERE recorded_at >= NOW() - $1::interval
        ORDER BY recorded_at ASC
        LIMIT $2;
    `;

    const result = await pool.query(
        query,
        [interval, limit]
    );

    return result.rows;
}