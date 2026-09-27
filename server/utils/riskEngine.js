// server/utils/riskEngine.js

// ==========================================
// FIXED NORMAL TILT LIMIT
// ==========================================
// Up to 50° = NORMAL
// Above 50° = WARNING
export const NORMAL_TILT_DEGREE = 50;

export function calculateAcceleration(accelX, accelY, accelZ) {
    if (
        accelX === null ||
        accelY === null ||
        accelZ === null ||
        accelX === undefined ||
        accelY === undefined ||
        accelZ === undefined
    ) {
        return null;
    }

    return Math.sqrt(
        accelX ** 2 +
        accelY ** 2 +
        accelZ ** 2
    );
}

export function calculateRisk(telemetry) {
    const tiltX = Number(telemetry.tiltX);
    const tiltY = Number(telemetry.tiltY);

    const acceleration = calculateAcceleration(
        telemetry.accelX,
        telemetry.accelY,
        telemetry.accelZ
    );

    const absTiltX = Math.abs(tiltX);
    const absTiltY = Math.abs(tiltY);

    let level = "NORMAL";
    let score = 10;

    // ==========================================
    // CRITICAL
    // More than 70°
    // ==========================================
    if (
        absTiltX > 70 ||
        absTiltY > 70
    ) {
        level = "CRITICAL";
        score = 90;
    }

    // ==========================================
    // HIGH
    // More than 60°
    // ==========================================
    else if (
        absTiltX > 60 ||
        absTiltY > 60
    ) {
        level = "HIGH";
        score = 70;
    }

    // ==========================================
    // WARNING
    // More than normal 50°
    // ==========================================
    else if (
        absTiltX > NORMAL_TILT_DEGREE ||
        absTiltY > NORMAL_TILT_DEGREE
    ) {
        level = "WARNING";
        score = 40;
    }

    // ==========================================
    // NORMAL
    // 50° or below
    // ==========================================
    else {
        level = "NORMAL";
        score = 10;
    }

    return {
        level,
        score,

        // Current sensor values
        tiltX,
        tiltY,

        // Acceleration is returned for monitoring,
        // but does NOT trigger the tilt alarm.
        acceleration,

        // Send the configured limit to frontend
        normalTiltDegree: NORMAL_TILT_DEGREE,

        factors: {
            tiltX: absTiltX,
            tiltY: absTiltY,
            acceleration
        }
    };
}