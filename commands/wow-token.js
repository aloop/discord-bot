const { SlashCommandBuilder } = require("@discordjs/builders");

const { token } = require("../store.js");

const { blizzard } = require("../config.js")();

const authTokenUrl =
    "https://us.battle.net/oauth/token?grant_type=client_credentials";
const tokenPriceUrl =
    "https://us.api.blizzard.com/data/wow/token/index?namespace=dynamic-us";

async function getAuthToken() {
    if (token.accessToken !== null && token.expiresAt > Date.now()) {
        console.log("re-using token");
        return token.accessToken;
    }

    const credentials = Buffer.from(
        `${blizzard.client_id}:${blizzard.client_secret}`
    ).toString("base64");

    const auth_response = await fetch(authTokenUrl, {
        method: "POST",
        headers: {
            Authorization: `Basic ${credentials}`,
        },
    });

    const data = await auth_response.json();

    token.expiresAt = Date.now() + parseInt(data.expires_in, 10);
    token.accessToken = data.access_token;

    return token.accessToken;
}

async function getTokenPrice() {
    const response = await fetch(tokenPriceUrl, {
        headers: {
            Authorization: `Bearer ${await getAuthToken()}`,
        },
    });

    const data = await response.json();

    // Price is in copper, convert to gold
    return data.price / 100 / 100;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("wowtoken")
        .setDescription("Displays the current WoW token price in gold"),
    async execute(interaction) {
        try {
            const formattedPrice = (await getTokenPrice()).toLocaleString();
            await interaction.reply(
                `The WoW token price is currently **${formattedPrice} gold**`
            );
        } catch (err) {
            console.error(err);
            await interaction.reply({
                content: "Failed to fetch the current WoW token price",
                ephemeral: true,
            });
        }
    },
};
