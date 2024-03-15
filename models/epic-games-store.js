import path from "node:path";
import { cwd } from "node:process";

import Store from "../utils/json-store.js";
import { fetchFreeGames } from "../api-client/epic-games-store.js";

const pickGameId = (game) => game.id;

export async function fetchNewGames() {
    let freeGames = [];

    try {
        freeGames = await fetchFreeGames();
    } catch (err) {
        console.error(
            "Error fetching free games from the Epic Games Store:",
            err
        );
    }

    const currentDate = Date.now();
    const store = new Store(
        path.join(
            process.env.STATE_DIRECTORY ?? cwd(),
            "epic-games-store-free-games.json"
        )
    );
    const currentGames = await store.read();
    const currentGameIds = currentGames.map(pickGameId);

    // Filter out any games that we have already announced
    const newFreeGames = freeGames.filter(
        (game) => !currentGameIds.includes(game.id)
    );

    // Remove expired games
    const currentGamesWithExpiredRemoved = currentGames.filter(
        (game) => new Date(game.endDate) - currentDate > 0
    );

    // Update file with all current games, removing expired games and adding new ones.
    await store.write([...newFreeGames, ...currentGamesWithExpiredRemoved]);

    return newFreeGames;
}
