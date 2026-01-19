const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// � Global Debug Log: See every hit to the server
app.use((req, res, next) => {
    console.log(`🌐 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// �🔐 CONFIG (Using Environment Variables for Security)
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

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
        console.log("📥 Raw Request Body:", JSON.stringify(req.body, null, 2));
        const entry = req.body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message) {
            const from = message.from;
            const text = message.text?.body?.toLowerCase();

            console.log(`📩 Message received from ${from}: ${text}`);

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
                `https://graph.facebook.com/v24.0/${PHONE_NUMBER_ID}/messages`,
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

            console.log(`📤 Reply sent to ${from}: ${reply.replace(/\n/g, ' ')}`);
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
