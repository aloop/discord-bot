const assertJSON = {
    assert: { type: "json" },
};

let config = null;

export default async function loadConfig() {
    if (config !== null) {
        return config;
    }

    try {
        if (process.env.CREDENTIALS_DIRECTORY) {
            config = (
                await import(
                    `${process.env.CREDENTIALS_DIRECTORY}/config.json`,
                    assertJSON
                )
            ).default;
        }

        config = (await import("./config.json", assertJSON)).default;

        return config;
    } catch (err) {
        console.error(
            "Unable to load config.json, make sure it exists and you have permission to read the file",
            err
        );
        process.exit(1);
    }
}
