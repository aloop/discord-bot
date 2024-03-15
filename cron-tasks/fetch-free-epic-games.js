import { EmbedBuilder } from "discord.js";

import { fetchNewGames } from "../models/epic-games-store.js";
import loadSecrets from "../utils/load-secrets.js";

const { channels: { deals = false } = {} } = await loadSecrets();

function postNewDeals(client, games) {
    if (games.length > 0 && deals) {
        try {
            const channel = client.channels.cache.get(deals);

            const embeds = games.map((game) =>
                new EmbedBuilder()
                    .setTitle(game.title)
                    .setURL(game.url)
                    .addFields([
                        {
                            name: "Free at",
                            value: "Epic Games Store",
                        },
                        {
                            name: "Description",
                            value: game.description,
                        },
                        {
                            name: "Free until",
                            value: game.freeUntil,
                        },
                    ])
                    .setImage(game.thumbnailUrl)
            );

            channel.send({
                embeds: embeds,
            });
        } catch (err) {
            console.error(err);
        }
    }
}

// 2 hours in milliseconds
const intervalLength = 2 * 60 * 60 * 1000;

let intervalId = null;

export function stop() {
    if (intervalId !== null) {
        clearInterval(intervalId);
    }
}

export async function start(client) {
    if (!intervalId) {
        const freeGames = await fetchNewGames();
        postNewDeals(client, freeGames);

        intervalId = setInterval(async () => {
            console.log(
                "Cron Task: Fetching latest free games from Epic Games Store"
            );

            const freeGames = await fetchNewGames();
            postNewDeals(client, freeGames);
        }, intervalLength);
    }
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
