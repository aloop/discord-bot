import loadConfig from "../utils/load-config.js";
import loadSecrets from "../utils/load-secrets.js";

const { blizzard } = await loadConfig();
const creds = await loadSecrets();

let token = "";
let tokenExpiresAt = 0;

async function fetchAuthToken() {
    if (token !== null && tokenExpiresAt > Date.now()) {
        return token;
    }

    const secrets = Buffer.from(
        `${creds?.blizzard?.clientId}:${creds?.blizzard?.clientSecret}`
    ).toString("base64");

    const auth_response = await fetch(blizzard.authTokenUrl, {
        method: "POST",
        headers: {
            Authorization: `Basic ${secrets}`,
        },
    });

    if (!auth_response.ok) {
        throw new Error(
            `Could not obtain Auth Token, server responded with: ${response}`
        );
    }

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

    if (!response.ok) {
        throw new Error(
            `Could not obtain Token Price, server responded with: ${response}`
        );
    }

    const { price, last_updated_timestamp } = await response.json();

    // Price is in copper, convert to gold
    return {
        updatedAt: parseInt(last_updated_timestamp, 10),
        price: price / 100 / 100,
    };
}
