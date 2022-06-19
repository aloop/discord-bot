const assertJSON = {
    assert: { type: "json" },
};

let config = null;

export default async function loadConfig() {
    if (config !== null) {
        return config;
    }

    try {
        return (config = (
            await import(
                `${process.env.CREDENTIALS_DIRECTORY ?? "."}/config.json`,
                assertJSON
            )
        ).default);
    } catch (err) {
        console.error(
            "Unable to load config.json, make sure it exists and you have permission to read the file",
            err
        );
        process.exit(1);
    }
}
