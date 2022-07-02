import http from "node:http";

import Router from "../utils/router.js";
import * as handlers from "./handlers.js";

import loadConfig from "../utils/config.js";
const config = await loadConfig();

export function startHTTPServer() {
    const router = new Router();

    router.setHost(config.http.host);

    router.get(
        /^\/wow-token\/chart\/(?<unit>hours|days)\/(?<period>[1-9][0-9]?)\/?$/,
        handlers.tokenChart
    );

    router.get(
        // Only allow up to 12 months
        /^\/wow-token\/chart\/(?<unit>months)\/(?<period>[1-9]|1[0-2])\/?$/,
        handlers.tokenChart
    );

    const server = http.createServer(
        {
            keepAlive: true,
        },
        (request, response) => {
            try {
                router.run(request, response);
            } catch (err) {
                console.error(err);
                Router.handlers.serverError(request, response);
            }
        }
    );

    server.once("listening", () => {
        console.log("HTTP server started");
    });

    server.listen(config.http.listenPort || 5000);
}
