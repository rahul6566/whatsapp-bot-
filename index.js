const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

//  Global Debug Log: See every hit to the server
app.use((req, res, next) => {
    console.log(`🌐 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 🏥 Health Check: Confirm environment variables are loaded
app.get("/health", (req, res) => {
    res.json({
        status: "alive",
        config: {
            verify_token_set: !!process.env.VERIFY_TOKEN,
            access_token_set: !!process.env.ACCESS_TOKEN ? "✅ Set (Secret)" : "❌ Not Set",
            phone_id: process.env.PHONE_NUMBER_ID || "❌ Not Set"
        }
    });
});

// 🔐 CONFIG (Using Environment Variables for Security)
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const GROQ_API_KEY = process.env.GROQ_API_KEY; // 🧠 New: Groq Key

// 🧠 AI Logic: Groq Initialization
const Groq = require("groq-sdk");
let groq = null;
if (GROQ_API_KEY) {
    groq = new Groq({ apiKey: GROQ_API_KEY });
    console.log("✅ Groq AI Initialized");
} else {
    console.warn("⚠️ GROQ_API_KEY missing - Bot will work in Basic Mode");
}

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
        // ⚡ FAST ACKNOWLEDGE: Meta ko turant bata do ki message mil gaya
        res.sendStatus(200);

        console.log("📥 Raw Request Body:", JSON.stringify(req.body, null, 2));
        const entry = req.body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message) {
            const from = message.from;
            const text = message.text?.body?.toLowerCase();

            console.log(`📩 Message received from ${from}: ${text}`);

            let reply = "";

            // 🤖 Smart Logic:
            if (["hi", "hello", "hey"].includes(text)) {
                reply = "Hi there! This is *R-bot*\nfrom *R Style Fashion* 👔\n\nHow can I help you?\n\nWhich language do you prefer?\n- Hindi\n- English\n\n(Aap mujhse kisi bhi bhasha mein baat kar sakte hain!)";
            } else if (text === "1") {
                reply = "🛍️ *Hamare Best Sellers:*\n\n👕 *Shirts* - ₹499 se shuru\n👖 *Jeans* - ₹799 se shuru\n🧥 *Jackets* - ₹999 se shuru\n\nOrder karne ke liye photo bhejein!";
            } else if (text === "2") {
                reply = "📦 *Order Status:*\nAapna Order ID likh kar bhejein (Example: #Order123)";
            } else if (text === "3") {
                reply = "📞 *Customer Support:*\nTeam se baat karne ke liye call karein: +91-8758424155\nTime: 10 AM - 7 PM";
            } else {
                // 🧠 AI Response (Groq) for everything else
                if (groq) {
                    try {
                        const chatCompletion = await groq.chat.completions.create({
                            messages: [
                                {
                                    role: "system",
                                    content: "You are a helpful, friendly shop assistant for 'R Style Fashion', a clothing brand in India. \n" +
                                        "Your Goal: Answer customer queries primarily in ENGLISH. \n" +
                                        "If the user selects or speaks in Hindi, reply in Hindi. If they speak Hinglish, reply in Hinglish. \n" +
                                        "Default Language: English. \n" +
                                        "Tone: Casual, using emojis, helpful. \n" +
                                        "Key Info: We sell Shirts (499+), Jeans (799+), Jackets (999+). \n" +
                                        "If unsure, ask them to choose options 1, 2, or 3. \n" +
                                        "Keep replies short (under 50 words)."
                                },
                                {
                                    role: "user",
                                    content: text
                                }
                            ],
                            model: "llama-3.3-70b-versatile",
                        });
                        reply = chatCompletion.choices[0]?.message?.content || "Maaf karein, mujhe samajh nahi aaya. 1 dabayein products ke liye.";
                    } catch (aiErr) {
                        console.error("❌ Groq API Error:", aiErr.response?.data || aiErr.message);
                        reply = "Mafi chahta hoon, mera AI dimaag abhi thoda busy hai. 😅\n\nKripya 1, 2, ya 3 dabayein ya thodi der baad try karein.";
                    }
                } else {
                    reply = "AI mode off hai. Kripya 1, 2, ya 3 dabayein.";
                }
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
    } catch (err) {
        // Note: Humne pehle hi 200 bhej diya hai, toh ab error log karein bas
        console.error("❌ Processing Error:", err.response?.data || err.message);
    }
});

// 🚀 Server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("WhatsApp bot running on port", PORT);
});
