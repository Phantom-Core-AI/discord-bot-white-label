require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { Client, Routes, Collection, GatewayIntentBits, Partials } = require("discord.js");
const { DISCORD_TOKEN, APP_ID, SERVER_ID } = process.env;
const express = require("express"); // Import express

const client = new Client({
    intents: [
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Channel],
    rest: { version: "10" },
});

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/healthz", (req, res) => {
    if (client.isReady()) {
        res.status(200).send("OK");
    } else {
        res.status(503).send("Service Unavailable");
    }
});

app.listen(PORT, () => {
    console.log(`Health check server listening on port ${PORT}`);
});

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

client.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    // Handle cleanup or gracefully shutdown here
});

client.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    // Handle cleanup or gracefully shutdown here
});

client.rest.setToken(DISCORD_TOKEN);

async function main() {
    try {
        await client.login(DISCORD_TOKEN);
    } catch (err) {
        console.log(err);
    }
}

main();
