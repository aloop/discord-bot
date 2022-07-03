import { generateChart } from "../utils/chart.js";
import { getAllSince } from "../models/wow-token-price.js";

export function tokenChart(unit) {
    return async function (request, response, url, params) {
        const period = parseInt(params.period, 10);

        const data = await getAllSince(period, unit);
        const chart = await generateChart(data, period, unit);

        const image = Buffer.from(chart.split(",")[1], "base64");

        response.writeHead(200, {
            "Content-Type": "image/png",
            "Content-Length": image.length,
        });

        response.end(image);
    };
}
