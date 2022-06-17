module.exports = function loadConfig() {
    try {
        if (process.env.CREDENTIALS_DIRECTORY) {
            return require(`${process.env.CREDENTIALS_DIRECTORY}/config.json`);
        }

        return require("./config.json");
    } catch (err) {
        console.error(
            "Unable to load config.json, make sure it exists and you have permission to read the file",
            err
        );
        process.exit(1);
    }
};
