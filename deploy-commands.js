import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REST, Routes } from "discord.js";

import loadConfig from "./utils/config.js";

const {
    discord: { clientId, guildId, token },
} = await loadConfig();

const commands = [];
const commandsPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "commands"
);
const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(filePath);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(token);

try {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });

    const commandNames = commands.map(({ name }) => name);
    console.log(
        "Successfully registered application commands:",
        commandNames.join(", ")
    );
} catch (error) {
    console.error(error);
    process.exit(1)
}
