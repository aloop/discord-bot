import HyperExpress from "hyper-express";

import * as handlers from "./handlers.js";

import loadConfig from "../utils/load-config.js";
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

    webserver.set_not_found_handler((request, response) => {
        response.status(404).send("404: Page Not Found");
    });

    try {
        await webserver.listen(
            config.http?.listenPort ?? 5000,
            config.http?.listenHost ?? "localhost"
        );

        console.log("HTTP server started");

        return function stopServer() {
            webserver.close();
        };
    } catch (err) {
        const port = config.http?.listenPort ?? 5000;
        console.error(`Failed to start webserver on port ${port}`, err);
        process.exit(1);
    }
}
