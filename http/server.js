import HyperExpress from "hyper-express";

import * as handlers from "./handlers.js";

import loadConfig from "../utils/config.js";
const config = await loadConfig();

const webserver = new HyperExpress.Server();

export async function startHTTPServer() {
    webserver.get(
        "/wow-token/chart/hours/:period",
        handlers.tokenChart("hours", (period) => period >= 1 && period <= 72)
    );

    webserver.get(
        "/wow-token/chart/days/:period",
        handlers.tokenChart("days", (period) => period >= 1 && period <= 90)
    );

    webserver.get(
        "/wow-token/chart/months/:period",
        handlers.tokenChart("months", (period) => period >= 1 && period <= 12)
    );

    try {
        await webserver.listen(
            config.http?.listenPort ?? 5000,
            config.http?.listenHost ?? "localhost"
        );

        console.log("HTTP server started");
    } catch (err) {
        const port = config.http?.listenPort ?? 5000;
        console.error(`Failed to start webserver on port ${port}`, err);
        process.exit(1);
    }
}
