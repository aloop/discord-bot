import { generateChart } from "../utils/chart.js";
import { getAllSince } from "../models/wow-token-price.js";

export async function tokenChart(request, response, url, params) {
    const period = parseInt(params.period, 10);
    const { unit } = params;

    const data = await getAllSince(period, unit);
    const chart = await generateChart(data, period, unit);

    const image = Buffer.from(chart.split(",")[1], "base64");

    response.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": image.length,
        "Cache-Control": "no-cache, no-store",
    });

    response.end(image);
}
