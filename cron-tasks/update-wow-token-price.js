import { fetchLatest } from "../models/wow-token-price.js";

let intervalId = null;

export function stop() {
    if (invervalId !== null) {
        clearInterval(intervalId);
    }
}

export async function start() {
    // Fetch the latest token price before starting the timer
    await fetchLatest();

    if (!intervalId) {
        intervalId = setInterval(async () => {
            console.log("Cron Task: WoW token price update triggered");

            await fetchLatest();
        }, 5 * 1000 * 60);
    }
}
