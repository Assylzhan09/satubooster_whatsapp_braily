const { default: makeWASocket, useSingleFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const express = require("express");
const fs = require("fs");
const qrcode = require("qrcode");
const app = express();
const PORT = process.env.PORT || 3000;

const { useMultiFileAuthState } = require("@whiskeysockets/baileys");
const { state, saveCreds } = await useMultiFileAuthState('./sessions');

async function startBot() {
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: true
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, qr } = update;
        if (qr) {
            qrcode.toFile("qr.png", qr, () => console.log("QR code saved"));
        }
        if (connection === "open") {
            console.log("✅ WhatsApp connected");
        }
    });

    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.key.fromMe && msg.message?.conversation) {
            const text = msg.message.conversation;
            const sender = msg.key.remoteJid;
            console.log("💬", sender, ":", text);

            await sock.sendMessage(sender, { text: `Сәлем! Сіз жаздыңыз: ${text}` });
        }
    });

    // Обработка внешнего POST-запроса для отправки сообщений
    app.use(express.json());
    app.post("/send", async (req, res) => {
        const { number, message } = req.body;
        try {
            await sock.sendMessage(number + "@s.whatsapp.net", { text: message });
            res.json({ status: "sent" });
        } catch (e) {
            res.json({ error: e.message });
        }
    });
}

startBot();

app.get("/", (req, res) => {
    res.send("🤖 Бот работает.");
});

app.listen(PORT, () => console.log("🟢 Сервер запущен на порту " + PORT));
