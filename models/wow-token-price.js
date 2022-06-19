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
const getAllQuery = getLatestQuery;
const fetchLatestQuery = `
    INSERT INTO token_prices
        (updated_at,price)
    VALUES
        (:updated_at,:price);
`;

export async function getLatest() {
    const { updated_at, price } = await db.get(getLatestQuery);

    return {
        updatedAt: updated_at,
        price,
    };
}

export async function getAll() {
    const results = await db.all(getAllQuery);

    return results.map(({ updated_at, price }) => ({
        updatedAt: updated_at,
        price,
    }));
}

export async function fetchLatest() {
    const { updatedAt, price } = await fetchTokenPrice();

    try {
        await db.run(fetchLatestQuery, {
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
