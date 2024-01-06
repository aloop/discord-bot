const productBaseUrl = "https://www.epicgames.com/store/en-US/product/";
const freeGamesApiUrl =
    "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US";

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
        return new Date(giveawayEnd).toLocaleString("en-US", {
            timeZone: "America/Los_Angeles",
            dateStyle: "full",
            timeStyle: "long",
        });
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
        url: new URL(`${game?.productSlug}`, productBaseUrl).href,
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
            `Could not obtain Token Price, server responded with: ${response}`
        );
    }

    const result = await response.json();

    const elements = result?.data?.Catalog?.searchStore?.elements;

    if (elements) {
        return elements.filter(selectFreeGames).map(formatGameData);
    }
}
