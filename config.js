module.exports = function loadConfig() {
    if (process.env.CREDENTIALS_DIRECTORY) {
        return require(`${process.env.CREDENTIALS_DIRECTORY}/config.json`);
    }

    return require("./config.json");
};
