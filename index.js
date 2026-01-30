/*********************/
/*   ANTI CRASH      */
/*********************/
process.on("unhandledRejection", e => console.error("❌ Unhandled:", e));
process.on("uncaughtException", e => console.error("❌ Uncaught:", e));

/*********************/
/*     IMPORTS       */
/*********************/
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  entersState,
  VoiceConnectionStatus,
  NoSubscriberBehavior
} = require("@discordjs/voice");

/*********************/
/*   ENV VALIDATE    */
/*********************/
console.log("🚀 Bot starting...");
console.log("TOKEN:", process.env.TOKEN ? "OK" : "MISSING");
console.log("GUILD_ID:", process.env.GUILD_ID || "MISSING");

if (!process.env.TOKEN || !process.env.GUILD_ID) {
  console.error("❌ ENV missing → STOP BOT");
  process.exit(1);
}

/*********************/
/* KEEP ALIVE SERVER */
/*********************/
const app = express();
app.get("/", (_, res) => res.send("Bot alive"));
app.listen(3000, () => console.log("🌐 Web server online"));

/*********************/
/*   DISCORD CLIENT  */
/*********************/
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

/*********************/
/*   AUDIO PLAYER    */
/*********************/
const player = createAudioPlayer({
  behaviors: { noSubscriber: NoSubscriberBehavior.Play }
});

player.on("error", e => console.error("🎧 Player error:", e));

let connection = null;

/*********************/
/*   MUSIC SYSTEM    */
/*********************/
const MUSIC_DIR = path.join(__dirname, "music");

function getRandomSong() {
  if (!fs.existsSync(MUSIC_DIR)) return null;

  const files = fs.readdirSync(MUSIC_DIR)
    .filter(f => /\.(mp3|wav|ogg)$/i.test(f));

  if (!files.length) return null;

  return path.join(
    MUSIC_DIR,
    files[Math.floor(Math.random() * files.length)]
  );
}

function playNext() {
  const song = getRandomSong();
  if (!song) {
    console.log("❌ No music found");
    return;
  }

  console.log("🎵 Playing:", path.basename(song));

  const resource = createAudioResource(song, {
    ffmpegArgs: [
      "-vn",
      "-ar", "48000",
      "-ac", "2",
      "-b:a", "192k"
    ]
  });

  player.play(resource);
}

player.on(AudioPlayerStatus.Idle, () => {
  console.log("🔁 Next song");
  playNext();
});

/*********************/
/*  SLASH COMMANDS   */
/*********************/
const commands = [
  new SlashCommandBuilder()
    .setName("join")
    .setDescription("Join voice & play music"),
  new SlashCommandBuilder()
    .setName("disconnect")
    .setDescription("Disconnect bot")
].map(c => c.toJSON());

/*********************/
/*     READY         */
/*********************/
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(
        client.user.id,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("📜 Guild slash commands registered");
  } catch (e) {
    console.error("❌ Slash register error:", e);
  }
});

/*********************/
/*  INTERACTIONS     */
/*********************/
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "join") {
    const vc = interaction.member.voice.channel;
    if (!vc) return interaction.reply("❌ Vào voice trước");

    try {
      connection = joinVoiceChannel({
        channelId: vc.id,
        guildId: vc.guild.id,
        adapterCreator: vc.guild.voiceAdapterCreator,
        selfDeaf: false
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 45_000);
      console.log("🔊 Voice READY");

      connection.subscribe(player);
      playNext();

      await interaction.reply("🎶 Bot đã join & phát nhạc");
    } catch (e) {
      console.error("❌ Voice join failed:", e);
      if (connection) connection.destroy();
      return interaction.reply("❌ Không kết nối được voice");
    }
  }

  if (interaction.commandName === "disconnect") {
    if (connection) connection.destroy();
    connection = null;
    player.stop();
    interaction.reply("👋 Bot đã thoát");
  }
});

/*********************/
/*     LOGIN         */
/*********************/
client.login(process.env.TOKEN);
