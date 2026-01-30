const fs = require("fs");
const path = require("path");
const express = require("express");

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  getVoiceConnection,
} = require("@discordjs/voice");

// ================= WEB SERVER (RENDER)
const app = express();
app.get("/", (req, res) => res.send("Bot alive"));
app.listen(3000, () => console.log("🌐 Web server online"));

// ================= CONFIG
const MUSIC_DIR = path.join(__dirname, "music");

// ================= DISCORD CLIENT
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ THIẾU ENV");
  process.exit(1);
}

// ================= SLASH COMMANDS
const commands = [
  new SlashCommandBuilder()
    .setName("join")
    .setDescription("Bot vào voice và phát nhạc"),

  new SlashCommandBuilder()
    .setName("disconnect")
    .setDescription("Bot rời voice"),
].map((c) => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });
    console.log("✅ Slash commands registered");
  } catch (e) {
    console.error("❌ Slash error:", e);
  }
})();

// ================= MUSIC PLAYER
let connection = null;

const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Play,
  },
});

function getRandomSong() {
  if (!fs.existsSync(MUSIC_DIR)) return null;
  const files = fs.readdirSync(MUSIC_DIR).filter((f) => f.endsWith(".mp3"));
  if (!files.length) return null;
  return path.join(MUSIC_DIR, files[Math.floor(Math.random() * files.length)]);
}

function playRandom() {
  const song = getRandomSong();
  if (!song) {
    console.log("⚠️ Không có file mp3");
    return;
  }

  const resource = createAudioResource(song);
  player.play(resource);
  console.log("🎵 Playing:", path.basename(song));
}

player.on(AudioPlayerStatus.Idle, () => {
  setTimeout(playRandom, 1000); // loop mượt
});

player.on("error", (err) => {
  console.error("🎧 Player error:", err.message);
  setTimeout(playRandom, 2000);
});

// ================= INTERACTIONS
client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;

  if (i.commandName === "join") {
    const vc = i.member.voice.channel;
    if (!vc) return i.reply({ content: "❌ Vào voice trước", ephemeral: true });

    connection = joinVoiceChannel({
      channelId: vc.id,
      guildId: vc.guild.id,
      adapterCreator: vc.guild.voiceAdapterCreator,
    });

    connection.subscribe(player);
    playRandom();

    await i.reply("🎶 Bot đã vào voice");
  }

  if (i.commandName === "disconnect") {
    const conn = getVoiceConnection(i.guild.id);
    if (conn) conn.destroy();
    connection = null;
    await i.reply("👋 Bot đã thoát voice");
  }
});

// ================= READY
client.once("ready", () => {
  console.log(`🤖 Bot online: ${client.user.tag}`);
});

client.login(TOKEN);
