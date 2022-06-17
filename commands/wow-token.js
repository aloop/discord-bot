const { SlashCommandBuilder } = require('@discordjs/builders');
const axios = require('axios').default;

const { token } = require('../store.js');

const { blizzard: { client_id, client_secret } } = require("../config.json");

const host = "https://us.api.blizzard.com"

async function getAuthToken() {
    if (token.accessToken !== null && token.expiresAt > Date.now()) {
        console.log("re-using token");
        return token.accessToken;
    }

    const auth_response = await axios({
        method: "POST",
        url: 'https://us.battle.net/oauth/token',
        auth: {
            username: client_id,
            password: client_secret
        },
        data: "grant_type=client_credentials"
    });

    token.expiresAt = Date.now() + parseInt(auth_response.data.expires_in, 10);
    token.accessToken = auth_response.data.access_token;

    return token.accessToken;
}

async function getTokenPrice() {
    const response = await axios({
        method: "GET",
        url: `${host}/data/wow/token/index?namespace=dynamic-us`,
        headers: {
            "Authorization": `Bearer ${await getAuthToken()}`
        }
    });

    // Price is in copper, convert to gold
    return response.data.price / 100 / 100;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('wowtoken')
		.setDescription('Displays the current WoW token price in gold'),
	async execute(interaction) {
        const formattedPrice = (await getTokenPrice()).toLocaleString();
		await interaction.reply(`The WoW token price is currently **${formattedPrice} gold**`);
	},
};
