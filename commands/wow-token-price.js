import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed } from "discord.js";

import { getLatest } from "../models/wow-token-price.js";

export const data = new SlashCommandBuilder()
    .setName("wowtoken")
    .setDescription("Displays the current WoW token price in gold");

export async function execute(interaction) {
    try {
        const { price, updatedAt } = await getLatest();

        // I'm pretty sure the token price is only updated every 20 minutes,
        // so we'll do some math and figure out how much time we have until the
        // next update.
        const updateTime = Math.ceil(
            (new Date(updatedAt + 20 * 60 * 1000) - Date.now()) / (60 * 1000)
        );

        const embed = new MessageEmbed()
            .setTitle("World of Warcraft Token Price")
            .addFields(
                {
                    name: "Current Price",
                    value: `**${price.toLocaleString()}** gold`,
                },
                {
                    name: "Next Update",
                    value: `In approximately **${updateTime}** minutes`,
                }
            );

        await interaction.reply({
            embeds: [embed],
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
