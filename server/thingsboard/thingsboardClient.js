import axios from "axios";

const thingsBoardClient = axios.create({
    baseURL: process.env.THINGSBOARD_URL,
    headers: {
        "X-Authorization": `ApiKey ${process.env.THINGSBOARD_API_KEY}`,
        "Content-Type": "application/json"
    }
});

export default thingsBoardClient;