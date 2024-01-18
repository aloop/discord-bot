import loadConfig from "../utils/config.js";

const { settings = {}, epicGamesStore = {} } = await loadConfig();

const timeZone = settings?.timeZone || "America/Los_Angeles";
const locale = settings?.locale || "en-US";
const country = settings?.country || "US";

const productBaseUrl =
    epicGamesStore?.productBaseUrl ||
    `https://www.epicgames.com/store/${locale}/product/`;
const freeGamesApiUrl =
    epicGamesStore?.freeGamesApiUrl ||
    `https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=${locale}&country=${country}&allowCountries=${country}`;

function isCurrentlyFree(game) {
    const currentDate = Date.now();
    const giveawayStart =
        game?.promotions?.promotionalOffers[0]?.promotionalOffers[0]?.startDate;
    const giveawayEnd =
        game?.promotions?.promotionalOffers[0]?.promotionalOffers[0]?.endDate;

    if (giveawayStart !== null && giveawayEnd !== null) {
        return (
            new Date(giveawayStart) - currentDate < 0 &&
            new Date(giveawayEnd) - currentDate > 0
        );
    }

    return false;
}

function getFormattedEndDate(game) {
    const giveawayEnd =
        game?.promotions?.promotionalOffers[0]?.promotionalOffers[0]?.endDate;

    if (giveawayEnd !== null) {
        return new Date(giveawayEnd).toLocaleString(locale, {
            timeZone,
            dateStyle: "full",
            timeStyle: "long",
        });
    }

    return null;
}

function pickSlug(mapping) {
    return mapping?.pageType?.toLowerCase?.() === "producthome";
}

function formatUrlFromSlug(slug) {
    return slug ? new URL(slug, productBaseUrl).href : null;
}

function getUrl(game) {
    if (game?.productSlug ?? false) {
        return formatUrlFromSlug(game.productSlug);
    } else if (
        game?.catalogNs?.mappings?.length > 0 &&
        Array.isArray(game.catalogNs.mappings)
    ) {
        return formatUrlFromSlug(
            game.catalogNs.mappings.find(pickSlug)?.pageSlug
        );
    }

    return null;
}

function selectFreeGames(game) {
    return (
        // Check for a discounted price of $0
        game?.price?.totalPrice?.discountPrice === 0 &&
        // Make sure it has "promotional offers"
        game?.promotions?.promotionalOffers?.length > 0 &&
        // Make sure it's actually free
        isCurrentlyFree(game)
    );
}

function formatGameData(game) {
    return {
        title: game.title,
        description: game.description,
        id: game.id,
        url: getUrl(game),
        thumbnailUrl:
            game?.keyImages?.find(
                (img) => img?.type?.toLowerCase() === "thumbnail"
            )?.url ?? game?.keyImages[0]?.url,
        freeUntil: getFormattedEndDate(game),
        endDate:
            game?.promotions?.promotionalOffers[0]?.promotionalOffers[0]
                ?.endDate,
    };
}

export async function fetchFreeGames() {
    const response = await fetch(freeGamesApiUrl);

    if (!response.ok) {
        throw new Error(
            `Error while fetching free Epic Games Store games, server responded with: ${response}`
        );
    }

    const result = await response.json();

    const elements = result?.data?.Catalog?.searchStore?.elements;

    if (elements) {
        return elements.filter(selectFreeGames).map(formatGameData);
    }
}
