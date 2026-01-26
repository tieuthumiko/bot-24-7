const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const {
  joinVoiceChannel,
  getVoiceConnection
} = require("@discordjs/voice");

const express = require("express");

// ===== WEB SERVER =====
const app = express();
app.get("/", (req, res) => res.send("Bot alive"));
app.listen(3000);

// ===== DISCORD CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// ===== REGISTER SLASH =====
const commands = [
  new SlashCommandBuilder().setName("join").setDescription("Join voice"),
  new SlashCommandBuilder().setName("disconnect").setDescription("Leave voice")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );
})();

// ===== COMMANDS =====
client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;

  if (i.commandName === "join") {
    const ch = i.member.voice.channel;
    if (!ch)
      return i.reply({ content: "Vào voice trước đi Onii-chan (><)", ephemeral: true });

    joinVoiceChannel({
      channelId: ch.id,
      guildId: ch.guild.id,
      adapterCreator: ch.guild.voiceAdapterCreator
    });
    i.reply("Em vào voice rồi nè (≥▽≤)");
  }

  if (i.commandName === "disconnect") {
    const c = getVoiceConnection(i.guild.id);
    if (!c)
      return i.reply({ content: "Em chưa ở voice mà (0~0;)", ephemeral: true });

    c.destroy();
    i.reply("Em thoát rồi đó (づ3)づ");
  }
});

client.login(TOKEN);
