import { fetchLatest } from "../models/wow-token-price.js";

let intervalId = null;

export function stop() {
    if (intervalId !== null) {
        clearInterval(intervalId);
    }
}

// 15 minutes in milliseconds
const intervalLength = 15 * 1000 * 60;

export async function start() {
    if (!intervalId) {
        await fetchLatest();

        intervalId = setInterval(async () => {
            console.log("Cron Task: WoW token price update triggered");

            await fetchLatest();
        }, intervalLength);
    }
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
