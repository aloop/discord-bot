import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client, Collection, Events, GatewayIntentBits } from "discord.js";

import loadConfig from "./utils/config.js";

const {
    discord: { token },
} = await loadConfig();

import { startHTTPServer } from "./http/server.js";

/*
    Setup Client and Register Client Commands
*/

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

const commandFoldersPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "commands"
);

const commandFolders = fs.readdirSync(commandFoldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(commandFoldersPath, folder);
    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = await import(filePath);
        // Set a new item in the Collection
        // With the key as the command name and the value as the exported module
        if ("data" in command && "execute" in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.warn(
                `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
            );
        }
    }
}

/*
    Setup Client Event Handlers
*/

client.once(Events.ClientReady, (c) => {
    console.log(`Discord.js Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
        return;
    }

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(
            `No command matching ${interaction.commandName} was found.`
        );
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: "There was an error while executing this command!",
                ephemeral: true,
            });
        } else {
            await interaction.reply({
                content: "There was an error while executing this command!",
                ephemeral: true,
            });
        }
    }
});

/*
    Start up the HTTP server and Login to Discord
*/
const stopHTTPServer = await startHTTPServer();

await client.login(token);

const startGracefulShutdown = (signal) => {
    console.log(`Received ${signal}, shutting down...`);
    client.destroy();
    stopHTTPServer();
};

process.on("SIGTERM", () => startGracefulShutdown("SIGTERM"));
process.on("SIGINT", () => startGracefulShutdown("SIGINT"));

/*
    Setup Scheduled Tasks
*/

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
    await cronTask?.start?.(client);
}
