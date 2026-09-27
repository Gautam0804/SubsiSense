import thingsBoardClient from "./thingsboardClient.js";

export async function getLatestTelemetry(deviceId) {
    const response = await thingsBoardClient.get(
        `/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries`
    );

    const data = response.data;

    return {
        accelX: data.accelX?.[0]
            ? Number(data.accelX[0].value)
            : null,

        accelY: data.accelY?.[0]
            ? Number(data.accelY[0].value)
            : null,

        accelZ: data.accelZ?.[0]
            ? Number(data.accelZ[0].value)
            : null,

        tiltX: data.tiltX?.[0]
            ? Number(data.tiltX[0].value)
            : null,

        tiltY: data.tiltY?.[0]
            ? Number(data.tiltY[0].value)
            : null,
    };
}