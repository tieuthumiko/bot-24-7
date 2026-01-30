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
  StreamType,
  getVoiceConnection,
} = require("@discordjs/voice");

const prism = require("prism-media");
const ffmpeg = require("ffmpeg-static");

// ===== ENV =====
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

if (!TOKEN || !GUILD_ID || !VOICE_CHANNEL_ID) {
  console.error("❌ Missing ENV");
  process.exit(1);
}

// ===== DISCORD =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.login(TOKEN);
client.once("ready", () => console.log("🤖 Bot online"));

// ===== STATE =====
let player;
let isConnected = false;
let nowPlaying = null;
let volume = 0.6;

// ===== MUSIC =====
function randomTrack() {
  const dir = path.join(__dirname, "music");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mp3"));
  if (!files.length) return null;
  return path.join(dir, files[Math.floor(Math.random() * files.length)]);
}

function createResource(file) {
  const ffmpegProcess = new prism.FFmpeg({
    args: [
      "-analyzeduration",
      "0",
      "-loglevel",
      "0",
      "-i",
      file,
      "-f",
      "s16le",
      "-ar",
      "48000",
      "-ac",
      "2",
    ],
    executable: ffmpeg,
  });

  const opus = new prism.opus.Encoder({
    rate: 48000,
    channels: 2,
    frameSize: 960,
  });

  const stream = ffmpegProcess.pipe(opus);

  return createAudioResource(stream, {
    inputType: StreamType.Opus,
    inlineVolume: true,
  });
}

function playNext() {
  const track = randomTrack();
  if (!track) return;

  nowPlaying = path.basename(track);
  const resource = createResource(track);
  resource.volume.setVolume(volume);
  player.play(resource);
  console.log("🎵 Playing", nowPlaying);
}

// ===== VOICE =====
function joinVC() {
  if (isConnected) return;

  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;

  const conn = joinVoiceChannel({
    guildId: GUILD_ID,
    channelId: VOICE_CHANNEL_ID,
    adapterCreator: guild.voiceAdapterCreator,
  });

  player = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Play },
  });

  conn.subscribe(player);
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

// ===== WEB =====
const app = express();
app.use(express.json());
app.use(express.static("public"));

app.get("/join", (_, res) => {
  joinVC();
  res.send("ok");
});

app.get("/disconnect", (_, res) => {
  leaveVC();
  res.send("ok");
});

app.post("/volume", (req, res) => {
  volume = Math.max(0, Math.min(1, req.body.volume));
  if (player?.state?.resource?.volume)
    player.state.resource.volume.setVolume(volume);
  res.json({ volume });
});

app.get("/status", (_, res) => {
  res.json({
    connected: isConnected,
    track: nowPlaying,
    volume,
  });
});

app.listen(PORT, () => console.log("🌐 Web running"));
