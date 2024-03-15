const assertJSON = {
    assert: { type: "json" },
};

export default function createConfigLoader(file) {
    let configPromise = null;
    let config = null;

    return async function configLoader() {
        if (config !== null) {
            return config;
        }

        if (configPromise !== null) {
            return (await configPromise).default;
        }

        try {
            // Immediately store the promise to try and avoid multiple requests
            configPromise = import(file, assertJSON);

            // and cache the end result
            config = (await configPromise).default;

            return config;
        } catch (err) {
            console.error(
                `Unable to load ${file}, make sure it exists and you have permission to read the file`,
                err
            );
            process.exit(1);
        }
    };
}
