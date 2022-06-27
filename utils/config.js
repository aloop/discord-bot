const assertJSON = {
    assert: { type: "json" },
};

let configPromise = null;
let config = null;

export default async function loadConfig() {
    if (config !== null) {
        return config;
    }

    if (configPromise !== null) {
        return (await configPromise).default;
    }

    try {
        // Immediately store the promise to try and avoid multiple requests
        configPromise = import(
            `${process.env.CREDENTIALS_DIRECTORY ?? ".."}/config.json`,
            assertJSON
        );

        // and cache the end result
        config = (await configPromise).default;

        return config;
    } catch (err) {
        console.error(
            "Unable to load config.json, make sure it exists and you have permission to read the file",
            err
        );
        process.exit(1);
    }
}
