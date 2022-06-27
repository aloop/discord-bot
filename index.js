import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client, Collection, Intents } from "discord.js";

import loadConfig from "./utils/config.js";

const { token } = await loadConfig();

import { startHTTPServer } from "./http/server.js";

const cronTasksPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "cron-tasks"
);

const cronTasks = fs
    .readdirSync(cronTasksPath)
    .filter((file) => file.endsWith(".js"));

for (const file of cronTasks) {
    const filePath = path.join(cronTasksPath, file);
    const cronTask = await import(filePath);
    await cronTask?.start?.();
}

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.commands = new Collection();
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
    // Set a new item in the Collection
    // With the key as the command name and the value as the exported module
    client.commands.set(command.data.name, command);
}

client.once("ready", () => {
    console.log("Discord.js Ready");
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
        });
    }
});

client.login(token);

// Start HTTP server
startHTTPServer();
