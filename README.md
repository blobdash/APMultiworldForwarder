# APMultiworldForwarder

Forward an Archipelago room's text to a Discord channel using webhooks.

Warning : This is very barebones.

Features :
- Queue system : will never miss a single message from your archipelago game, while not sending too many messages at once to avoid hitting discord rate limits. In case of rooms shutting down, will clear the queue before exiting.
- Color based embeds : embeds will have the color of the item the message is talking about. Useful to easily know if a progression item has been unlocked or if it's junk!

### Setup

Requires node v18.20.5 or higher. Might break on later versions.

- Install dependencies : `npm i`
- Copy the sample config to `config.json` and modify it for your room.
- `node index.js`
