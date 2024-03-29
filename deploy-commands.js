import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REST, Routes } from "discord.js";

import loadSecrets from "./utils/load-secrets.js";

const {
    discord: { clientId, token },
} = await loadSecrets();

const commands = [];

const commandFoldersPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "commands"
);

const commandFolders = await fs.readdir(commandFoldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(commandFoldersPath, folder);
    const commandFiles = (await fs.readdir(commandsPath)).filter((file) =>
        file.endsWith(".js")
    );

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = await import(filePath);
        if ("data" in command && "execute" in command) {
            commands.push(command.data.toJSON());
        } else {
            console.warn(
                `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
            );
        }
    }
}

const rest = new REST().setToken(token);

try {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });

    const commandNames = commands.map(({ name }) => name);
    console.log(
        "Successfully registered the following application commands:",
        commandNames.join(", ")
    );
} catch (error) {
    console.error(error);
}
