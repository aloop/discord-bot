const plurals = {
    hours: "hour",
    days: "day",
    weeks: "week",
    months: "month",
};

/**
 * Takes a word and attempts to singularize it if it is plural.
 *
 * @param {string} word A single word
 */
export default function singularize(word) {
    return plurals?.[word] ?? word;
}
