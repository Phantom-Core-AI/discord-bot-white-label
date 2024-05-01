require("dotenv").config();
const { Events, MessageActionRow, MessageButton, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageEmbed, EmbedBuilder } = require("discord.js");
const { interact } = require("../utils/dialogapi.js");
const axios = require("axios");
const fetch = require("node-fetch");
const defaultQuestions = require("../defaultQuestions.json");

const userActiveMessages = new Map();

async function query(data) {
    try {
        const response = await fetch(process.env.STACKAI_LINK, {
            headers: { Authorization: process.env.STACKAI_KEY, "Content-Type": "application/json" },
            method: "POST",
            body: JSON.stringify(data),
        });
        const result = await response.json();
        console.log("STACKAI RESULT:");
        console.log(result);
        return result;
    } catch (error) {
        console.log(error?.message);
    }
}

async function queryVoiceflow(userInput, userId) {
    return new Promise((resolve, reject) => {
        const url = `https://general-runtime.voiceflow.com/state/user/${userId}/interact`;

        const headers = {
            "Content-Type": "application/json",
            Authorization: `${process.env.VOICEFLOW_API_KEY}`,
        };

        const actionBody = {
            action: {
                type: "text",
                payload: userInput,
            },
            config: {
                tts: false,
                stripSSML: true,
                stopAll: true,
                excludeTypes: ["path", "debug", "flow", "block"],
            },
        };

        axios
            .post(url, actionBody, { headers: headers })
            .then((response) => {
                if (response.data[0]?.payload?.message) {
                    resolve(response.data[0]?.payload?.message);
                } else {
                    resolve("support");
                }
            })
            .catch((err) => {
                console.log("======Error msg=======");
                console.log(err.message);
                reject(err.message);
            });
    });
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) {
            return;
        }

        console.log(message.content);

        // If the message either include the bot's id or role id in the tag
        // These values after the || are the default values for the bot and role id for our server
        // You can change them to your own bot and role id
        if (
            message.content.includes(`<@${process.env.BOT_ID || "1166213631701168128"}>`) ||
            message.content.includes(`<@&${process.env.BOT_ROLE_ID || "1166660825281470535"}>`)
        ) {
            // If the bot is tagged, we directly ask stack ai
            try {
                responseMessage = await query({
                    "in-0": message.content,
                    user_id: message.author.id,
                });

                message.reply(responseMessage["out-0"]);
            } catch (error) {
                console.log(error?.message);
            }

            // Return of the function because we don't want to continue the execution
            return;
        }

        const existingMessageId = userActiveMessages.get(message.author.id);

        if (existingMessageId) {
            return;
        }

        if (process.env.LIVEANSWERS_CHANNELS.includes(message.channel.id)) {
            const newob = JSON.stringify(message.member);
            const userRoles = JSON.parse(newob).roles;

            // Moderator and support roles
            // These values are the default values for the bot and role id for our server
            // You can change them to your own bot and role id
            const moderatorRoles = ["1033766629319909427", "1150807715417952378"];

            // If the user who wrote the message has a mod role, we return
            // since the bot should not respond to a mod
            if (userRoles.some((item) => moderatorRoles.includes(item))) {
                console.log("is mod");
                return;
            }

            // checkIfDefaultReply(message.content).then((res) => {
            const messageId = message.id;

            //if (res.includes("support")) {
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`time_limits-${messageId}`).setLabel("⏱️ Time Limits").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`payout_rules-${messageId}`).setLabel("💰 Payout Rules").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`current_discounts-${messageId}`).setLabel("💸 Discounts").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`news_rules-${messageId}`).setLabel("🗞️ News Rules").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`restricted_countries-${messageId}`)
                    .setLabel("🚫 Restricted Countries")
                    .setStyle(ButtonStyle.Secondary)
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`prohibited_strategies-${messageId}`)
                    .setLabel("⛔️ Prohibited Strategies")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`trading_rules-${message.id}`).setLabel("📜 Trading Rules").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`ask_ai-${message.id}`).setLabel("❓🤖 Ask AI").setStyle(ButtonStyle.Primary)
                // Add more buttons here if needed, up to 5 per row
            );

            const embed = new EmbedBuilder().setColor("#0099ff").setTitle("Response to your message").setDescription("Here are your options:");

            // Send the initial reply with buttons
            message
                .reply({
                    content: `**Please select a button below or choose ask AI, otherwise buttons will disappear in 30 seconds**`,
                    components: [row1, row2],
                    ephemeral: true,
                })
                .then((sentMessage) => {
                    userActiveMessages.set(message.author.id, sentMessage.id);

                    // Delete the message after 15 seconds
                    setTimeout(() => {
                        sentMessage.delete().catch((e) => console.error("Error deleting message: ", e));
                        userActiveMessages.delete(message.author.id);
                    }, 30000); // 30 seconds timeout
                })
                .catch((error) => console.error(error));
            // } else {
            //     return;
            // }
            //});
        }
    },

    query,
    queryVoiceflow,
    userActiveMessages,
};
