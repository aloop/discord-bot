import http from "node:http";

import Router from "../utils/router.js";
import * as handlers from "./handlers.js";

import loadConfig from "../utils/config.js";
const config = await loadConfig();

export function startHTTPServer() {
    const router = new Router();

    router.setHost(config.http.host);

    router.get(
        /^\/wow-token\/chart\/(?<unit>hours)\/(?<period>\d+)\/?$/,
        handlers.tokenChart,
        {
            period: (period) => period >= 1 && period <= 72,
        }
    );

    router.get(
        /^\/wow-token\/chart\/(?<unit>days)\/(?<period>\d+)\/?$/,
        handlers.tokenChart,
        {
            period: (period) => period >= 1 && period <= 90,
        }
    );

    router.get(
        // Only allow up to 12 months
        /^\/wow-token\/chart\/(?<unit>months)\/(?<period>\d+)\/?$/,
        handlers.tokenChart,
        {
            period: (period) => period >= 1 && period <= 12,
        }
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
