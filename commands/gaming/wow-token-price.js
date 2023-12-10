import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

import { getAllSince } from "../../models/wow-token-price.js";
import loadConfig from "../../utils/config.js";
import singularize from "../../utils/singularize.js";
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
                {
                    name: "24 hours",
                    value: JSON.stringify({ period: 24, unit: "hours" }),
                },
                {
                    name: "48 hours",
                    value: JSON.stringify({ period: 48, unit: "hours" }),
                },
                {
                    name: "10 days",
                    value: JSON.stringify({ period: 10, unit: "days" }),
                },
                {
                    name: "30 days",
                    value: JSON.stringify({ period: 30, unit: "days" }),
                },
                {
                    name: "3 months",
                    value: JSON.stringify({ period: 3, unit: "months" }),
                }
            );
    });

const defaultOptions = Object.freeze({
    period: 48,
    unit: "hours",
});

export async function execute(interaction) {
    try {
        const options = interaction.options.getString("chart");
        const { period, unit } =
            options !== null ? JSON.parse(options) : defaultOptions;

        const history = await getAllSince(period, unit);
        const [{ price, updatedAt }] = history;

        // I'm pretty sure the token price is only updated every 20 minutes,
        // so we'll do some math and figure out how much time we have until the
        // next update.
        const expiresAt = new Date(updatedAt + 20 * 60 * 1000);
        const updateTime = Math.max(
            Math.ceil((expiresAt - Date.now()) / (60 * 1000)),
            1
        );

        let highestPrice = -Infinity;
        let lowestPrice = Infinity;

        for (const { price: historicPrice } of history) {
            if (historicPrice > highestPrice) {
                highestPrice = historicPrice;
            }

            if (historicPrice < lowestPrice) {
                lowestPrice = historicPrice;
            }
        }

        const embed = new EmbedBuilder()
            .setTitle("World of Warcraft Token Price")
            .addFields([
                {
                    name: "Current Price",
                    value: `${price.toLocaleString()} gold`,
                },
                {
                    name: `${period}-${singularize(unit)} High`,
                    value: `${highestPrice.toLocaleString()} gold`,
                    inline: true,
                },
                {
                    name: `${period}-${singularize(unit)} Low`,
                    value: `${lowestPrice.toLocaleString()} gold`,
                    inline: true,
                },
                {
                    name: "Next Update",
                    value: `In approximately **${updateTime}** ${
                        updateTime === 1 ? "minute" : "minutes"
                    }`,
                },
            ])
            .setImage(
                `${config.http.host}/wow-token/chart/${unit}/${period}?t=${updatedAt}`
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
