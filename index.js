const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// 🔐 CONFIG (change values)
const VERIFY_TOKEN = "whatsapp_bot_verify_123"; // same token Meta me dalna
const ACCESS_TOKEN = "EAAUQ4EeGk3QBQXBEVr30ywsBUQk5gBwM2ope6cZBgWo4ucjEulty4xpeWFEVQQjRCVupSc60OG1FepqI6hXH2U8ZCfp7RlIm2TwRh8qITZAEZCqqZCZBlAUfzR0BXQD3xx6GMs8xmaz9PG1Vfk8lZAZArNVWoztFIbgwApscvMG4ZC5hOrzd1ZC5r0NtaeoTh6UedBfXDBqfO99hhO41xllXMmIhizGMhSwEddb0v9mIO2wF6v0vVO92UZAhUzstPP2ZCT0NN0ApXizZAH1H2TTgAhaOxBvXM";
const PHONE_NUMBER_ID = "846207071714929";

// ✅ Webhook verification (Meta ke liye)
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("Webhook verified");
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// 📩 Incoming message receive
app.post("/webhook", async (req, res) => {
    try {
        const entry = req.body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message) {
            const from = message.from;
            const text = message.text?.body?.toLowerCase();

            let reply = "Hello 👋 R Style Fashion me aapka swagat hai";

            if (text === "hi" || text === "hello") {
                reply = "Hi 👋\n1️⃣ Products\n2️⃣ Order Status\n3️⃣ Support\nReply with number";
            } else if (text === "1") {
                reply = "🛍️ Hamare Products:\n- Shirts\n- Jeans\n- Jackets";
            } else if (text === "2") {
                reply = "📦 Apna order ID bhejein";
            } else if (text === "3") {
                reply = "📞 Support team aapse jaldi contact karegi";
            }

            await axios.post(
                `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
                {
                    messaging_product: "whatsapp",
                    to: from,
                    text: { body: reply }
                },
                {
                    headers: {
                        Authorization: `Bearer ${ACCESS_TOKEN}`,
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        res.sendStatus(200);
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.sendStatus(500);
    }
});

// 🚀 Server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("WhatsApp bot running on port", PORT);
});
