import { SlashCommandBuilder } from "@discordjs/builders";

import { getLatest } from "../models/wow-token-price.js";

export const data = new SlashCommandBuilder()
    .setName("wowtoken")
    .setDescription("Displays the current WoW token price in gold");

export async function execute(interaction) {
    try {
        const price = (await getLatest()).price.toLocaleString();
        await interaction.reply({
            content: `The WoW token price is currently **${price} gold**`,
            ephemeral: true,
        });
    } catch (err) {
        console.error(err);

        await interaction.reply({
            content: "Failed to fetch the current WoW token price",
            ephemeral: true,
        });
    }
}
