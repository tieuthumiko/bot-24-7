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

// ================= WEB SERVER (RENDER GIỮ ONLINE)
const app = express();
app.get("/", (req, res) => res.send("Bot alive"));
app.listen(3000, () => console.log("🌐 Web server online"));

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
    .setDescription("Join voice và phát nhạc"),

  new SlashCommandBuilder()
    .setName("disconnect")
    .setDescription("Ngắt kết nối bot"),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });
    console.log("✅ Slash commands registered");
  } catch (e) {
    console.error("❌ Register command error:", e);
  }
})();

// ================= MUSIC SETUP
const MUSIC_DIR = path.join(__dirname, "music");

function getRandomSong() {
  const files = fs.readdirSync(MUSIC_DIR).filter((f) => f.endsWith(".mp3"));
  if (!files.length) return null;
  return path.join(MUSIC_DIR, files[Math.floor(Math.random() * files.length)]);
}

const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Pause,
  },
});

player.on(AudioPlayerStatus.Idle, () => {
  const song = getRandomSong();
  if (!song) return;
  console.log("🎵 Playing:", path.basename(song));
  player.play(createAudioResource(song));
});

player.on("error", (err) => {
  console.error("🎧 Player error:", err.message);
});

// ================= INTERACTION
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "join") {
    const channel = interaction.member.voice.channel;
    if (!channel) {
      return interaction.reply({
        content: "❌ Vào voice trước đã",
        ephemeral: true,
      });
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    connection.subscribe(player);

    const song = getRandomSong();
    if (!song) {
      return interaction.reply("❌ Folder music không có mp3");
    }

    player.play(createAudioResource(song));
    console.log("▶️ Start:", path.basename(song));

    await interaction.reply("🎶 Bot đã vào voice và phát nhạc");
  }

  if (interaction.commandName === "disconnect") {
    const conn = getVoiceConnection(interaction.guild.id);
    if (conn) conn.destroy();
    await interaction.reply("👋 Bot đã thoát voice");
  }
});

// ================= READY
client.once("ready", () => {
  console.log(`🤖 Bot online: ${client.user.tag}`);
});

client.login(TOKEN);
