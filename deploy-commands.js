import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";

import loadConfig from "./config.js";

const { clientId, guildId, token } = await loadConfig();

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

const rest = new REST({ version: "9" }).setToken(token);

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
    .then(() => {
        const commandNames = commands.map(({ name }) => name);
        console.log(
            "Successfully registered application commands:",
            commandNames.join(", ")
        );
    })
    .catch(console.error);
