import { Readable } from "node:stream";
import { formatRFC7231 } from "date-fns";

import { generateChart } from "../utils/chart.js";
import { getAllSince } from "../models/wow-token-price.js";

export function tokenChart(unit, constraint) {
    return async function (request, response) {
        const params = request.path_parameters;
        const period = parseInt(params.period, 10);

        if (!constraint(period)) {
            response.status(400).send("Bad Request: value out of range.");

            return;
        }

        let image, expiry;
        try {
            const data = await getAllSince(period, unit);
            image = await generateChart(data, period, unit);

            expiry = formatRFC7231(
                new Date(data[0].updatedAt + 21 * 60 * 1000)
            );
        } catch (err) {
            response.status(500).send("Internal Server Error");
            console.error(err);
            return;
        }

        response
            .status(200)
            .header("Content-Type", "image/png")
            .header("Expires", expiry)
            .stream(Readable.from(image), image.length);
    };
}
