import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed } from "discord.js";

import { getLatest } from "../models/wow-token-price.js";
import loadConfig from "../config.js";
const config = await loadConfig();

export const data = new SlashCommandBuilder()
    .setName("wowtoken")
    .setDescription("Displays the current WoW token price in gold")
    .addStringOption((option) => {
        return option
            .setName("chart")
            .setDescription(
                "Define the time period used when generating the price history"
            )
            .addChoices(
                { name: "24 hours", value: "24-hours" },
                { name: "30 days", value: "30-days" }
            );
    });

export async function execute(interaction) {
    try {
        const { price, updatedAt } = await getLatest();

        // I'm pretty sure the token price is only updated every 20 minutes,
        // so we'll do some math and figure out how much time we have until the
        // next update.
        const expiresAt = new Date(updatedAt + 20 * 60 * 1000);
        const updateTime = Math.max(
            Math.ceil((expiresAt - Date.now()) / (60 * 1000)),
            1
        );

        let imageUrl = `${config.http.host}/wow-token/charts/last-24-hours?t=${updatedAt}`;

        const period = interaction.options.getString("period");

        if (period) {
            imageUrl = `${config.http.host}/wow-token/charts/last-${period}?t=${updatedAt}`;
        }

        const embed = new MessageEmbed()
            .setTitle("World of Warcraft Token Price")
            .addField("Current Price", `**${price.toLocaleString()}** gold`)
            .addField(
                "Next Update",
                `In approximately **${updateTime}** ${
                    updateTime === 1 ? "minute" : "minutes"
                }`
            )
            .setImage(imageUrl);

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
