import "dotenv/config";

import { getLatestTelemetry } from "./thingsboard/telemetry.js";

async function test() {
    try {
        console.log("Connecting to ThingsBoard...");

        const data = await getLatestTelemetry(
            process.env.THINGSBOARD_DEVICE_ID
        );

        console.log("Successfully connected to ThingsBoard!");

        console.log(
            JSON.stringify(data, null, 2)
        );

    } catch (error) {
        console.error("ThingsBoard connection failed:");

        console.error(
            "Status:",
            error.response?.status
        );

        console.error(
            "Response:",
            error.response?.data || error.message
        );
    }
}

test();