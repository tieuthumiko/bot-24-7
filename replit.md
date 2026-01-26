# Discord Voice Bot

## Overview
A Discord bot that can join and leave voice channels using slash commands.

## Project Structure
- `index.js` - Main bot file with Express health check server and Discord bot logic
- `package.json` - Node.js dependencies

## Environment Variables Required
- `TOKEN` - Discord bot token
- `CLIENT_ID` - Discord application client ID

## Commands
- `/join` - Bot joins the user's current voice channel
- `/disconnect` - Bot leaves the voice channel

## Running
The bot runs via `node index.js` which starts:
1. Express server on port 3000 (health check)
2. Discord bot client

## Tech Stack
- Node.js 20
- discord.js v14
- @discordjs/voice
- Express
