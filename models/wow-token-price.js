import sqlite3 from "sqlite3";
import { open } from "sqlite";

import { fetchTokenPrice } from "../api-client/blizzard.js";

const db = await open({
    // If STATE_DIRECTORY exists that should mean we were launched
    // from the systemd service.
    filename: `${
        process.env.STATE_DIRECTORY ?? "./db"
    }/wow-token-prices.sqlite`,
    driver: sqlite3.cached.Database,
});

await db.migrate();

const getLatestQuery = `SELECT * FROM token_prices ORDER BY id DESC`;
const getAllQuery = `SELECT * FROM token_prices ORDER BY id`;
const getAllSinceQuery = `SELECT price, updated_at FROM token_prices WHERE updated_at/1000 >= unixepoch('now',?) ORDER BY id`;

const insertPriceQuery = `
    INSERT INTO token_prices
        (updated_at,price)
    VALUES
        (:updated_at,:price);
`;

const formatResult = ({ updated_at, price }) => ({
    updatedAt: updated_at,
    price,
});

export async function getLatest() {
    const result = await db.get(getLatestQuery);

    // If there is no result, or the stored price is older than 20 minutes,
    // fetch the latest price from the blizzard api
    if (!result || new Date(result.updated_at + 20 * 60 * 1000) < Date.now()) {
        return await fetchLatest();
    }

    return {
        updatedAt: result.updated_at,
        price: result.price,
    };
}

export async function getAll(descending = true) {
    const results = await db.all(
        `${getAllQuery} ${descending ? "DESC" : "ASC"}`
    );

    return results.map(formatResult);
}

export async function getAllSince(
    period = -24,
    unit = "hours",
    descending = true
) {
    // Ensure that the time is negative
    const timeFrame = `${Math.abs(period) * -1} ${unit}`;

    const results = await db.all(
        `${getAllSinceQuery} ${descending ? "DESC" : "ASC"}`,
        timeFrame
    );

    return results.map(formatResult);
}

export async function fetchLatest() {
    const { updatedAt, price } = await fetchTokenPrice();

    try {
        await db.run(insertPriceQuery, {
            ":updated_at": updatedAt,
            ":price": price,
        });
    } catch (e) {
        if (
            e?.code !== "SQLITE_CONSTRAINT" &&
            !e?.message?.match?.(/.*UNIQUE.*/)
        ) {
            throw e;
        }
    }

    return { updatedAt, price };
}
