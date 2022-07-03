import { formatRFC7231 } from "date-fns";

import { generateChart } from "../utils/chart.js";
import { getAllSince } from "../models/wow-token-price.js";

export function tokenChart(unit) {
    return async function (request, response, url, params) {
        const period = parseInt(params.period, 10);

        const data = await getAllSince(period, unit);
        const image = await generateChart(data, period, unit);

        const expiry = formatRFC7231(
            new Date(data[0].updatedAt + 21 * 60 * 1000)
        );

        response.writeHead(200, {
            "Content-Type": "image/png",
            "Content-Length": image.length,
            Expires: expiry,
        });

        response.end(image);
    };
}
