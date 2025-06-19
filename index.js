import makeWASocket, { fetchLatestBaileysVersion, useMultiFileAuthState } from "@whiskeysockets/baileys";
import express from "express";
import qrcode from "qrcode";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

const { state, saveCreds } = await useMultiFileAuthState('./sessions');
const { version } = await fetchLatestBaileysVersion();

const sock = makeWASocket({
  version,
  auth: state
});

sock.ev.on("creds.update", saveCreds);

sock.ev.on("connection.update", ({ connection, qr }) => {
  if (qr) {
    qrcode.toFile("qr.png", qr, () => console.log("✅ QR code saved"));
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

app.get("/", (req, res) => {
  res.send("🤖 Бот жұмыс істеп тұр.");
});

app.listen(PORT, () => console.log("🟢 Сервер портта іске қосылды:", PORT));
