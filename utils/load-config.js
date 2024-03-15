import createConfigLoader from "./config-loader.js";

export default createConfigLoader(
    `${process.env.CREDENTIALS_DIRECTORY ?? ".."}/config.json`
);
