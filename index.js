// ================= IMPORT =================
const express = require("express");
const fs = require("fs");
const path = require("path");

const { Client, GatewayIntentBits } = require("discord.js");

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  getVoiceConnection,
} = require("@discordjs/voice");

// ================= ENV =================
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

if (!TOKEN || !GUILD_ID || !VOICE_CHANNEL_ID) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

// ================= STATE =================
let connection;
let player;
let isConnected = false;
let nowPlaying = null;
let volume = 0.6;
let pulse = 0;

// ================= DISCORD =================
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.once("ready", () => {
  console.log("🤖 Logged in as", client.user.tag);
});

client.login(TOKEN);

// ================= MUSIC =================
function randomTrack() {
  const dir = path.join(__dirname, "music");
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mp3"));
  if (!files.length) return null;

  return path.join(dir, files[Math.floor(Math.random() * files.length)]);
}

function playNext() {
  const track = randomTrack();
  if (!track) return;

  nowPlaying = path.basename(track);
  pulse = Math.random();

  const resource = createAudioResource(track, {
    inlineVolume: true,
  });

  resource.volume.setVolume(volume);
  player.play(resource);
}

// ================= VOICE =================
function joinVC() {
  if (isConnected) return;

  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;

  connection = joinVoiceChannel({
    channelId: VOICE_CHANNEL_ID,
    guildId: GUILD_ID,
    adapterCreator: guild.voiceAdapterCreator,
  });

  player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play,
    },
  });

  connection.subscribe(player);
  isConnected = true;

  playNext();
  player.on(AudioPlayerStatus.Idle, playNext);
}

function leaveVC() {
  const conn = getVoiceConnection(GUILD_ID);
  if (conn) conn.destroy();
  isConnected = false;
  nowPlaying = null;
}

// ================= EXPRESS =================
const app = express();
app.use(express.json());
app.use(express.static("public"));

app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public/index.html")),
);

app.get("/join", (_, res) => {
  joinVC();
  res.send("joined");
});

app.get("/disconnect", (_, res) => {
  leaveVC();
  res.send("disconnected");
});

app.post("/volume", (req, res) => {
  volume = Math.max(0, Math.min(1, req.body.volume));
  if (player?.state?.resource?.volume) {
    player.state.resource.volume.setVolume(volume);
  }
  res.json({ volume });
});

app.get("/status", (_, res) => {
  pulse = isConnected ? Math.random() * volume : 0;
  res.json({
    connected: isConnected,
    track: nowPlaying,
    volume,
    pulse,
  });
});

app.listen(PORT, () => console.log("🌐 Dashboard running on port", PORT));
