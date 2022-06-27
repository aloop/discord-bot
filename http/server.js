import http from "http";

import { generateChart } from "../utils/chart.js";
import { getLast30Days, getLast24Hours } from "../models/wow-token-price.js";

import loadConfig from "../utils/config.js";
const config = await loadConfig();

const pngResponse = (res, imageBase64) => {
    const image = Buffer.from(imageBase64.split(",")[1], "base64");

    res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": image.length,
        "Cache-Control": "no-cache, no-store",
    });

    res.end(image);
};

const routes = {
    default(req, res) {
        res.writeHead(404, {
            "Content-Type": "text/plain",
            "Cache-Control": "no-cache, no-store",
        });
        res.end(`404: Page not found`);
    },

    badRequest(req, res) {
        res.writeHead(400, {
            "Content-Type": "text/plain",
            "Cache-Control": "no-cache, no-store",
        });
        res.end(`400: Bad Request`);
    },

    async tokenLast24Hours(req, res) {
        const data = await getLast24Hours("ASC");
        const chart = await generateChart(data, "hour");
        pngResponse(res, chart);
    },

    async tokenLast30Days(req, res) {
        const data = await getLast30Days("ASC");
        const chart = await generateChart(data, "day");
        pngResponse(res, chart);
    },
};

export function startHTTPServer() {
    const server = http.createServer(async (req, res) => {
        const { host } = new URL(config.http.host);
        const url = new URL(req.url, `https://${req.headers.host}`);

        if (url.host !== host) {
            console.error(
                "HTTP Server: bad request, host name and port do not match"
            );
            routes.badRequest(req, res);
            return;
        }

        switch (url.pathname) {
            case "/wow-token/charts/last-24-hours":
                await routes.tokenLast24Hours(req, res);
                break;
            case "/wow-token/charts/last-30-days":
                await routes.tokenLast30Days(req, res);
                break;

            default:
                routes.default(req, res);
                break;
        }
    });

    server.once("listening", () => {
        console.log("HTTP server started");
    });

    server.listen(config.http.listenPort || 5000);
}
