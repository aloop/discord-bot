import loadConfig from "../utils/config.js";

const { blizzard } = await loadConfig();

let token = "";
let tokenExpiresAt = 0;

async function fetchAuthToken() {
    if (token !== null && tokenExpiresAt > Date.now()) {
        return token;
    }

    const credentials = Buffer.from(
        `${blizzard.client_id}:${blizzard.client_secret}`
    ).toString("base64");

    const auth_response = await fetch(blizzard.authTokenUrl, {
        method: "POST",
        headers: {
            Authorization: `Basic ${credentials}`,
        },
    });

    const { access_token, expires_in } = await auth_response.json();

    tokenExpiresAt = Date.now() + parseInt(expires_in, 10);
    token = access_token;

    return token;
}

export async function fetchTokenPrice() {
    const response = await fetch(blizzard.tokenPriceUrl, {
        headers: {
            Authorization: `Bearer ${await fetchAuthToken()}`,
        },
    });

    const { price, last_updated_timestamp } = await response.json();

    // Price is in copper, convert to gold
    return {
        updatedAt: parseInt(last_updated_timestamp, 10),
        price: price / 100 / 100,
    };
}
