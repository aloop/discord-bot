# Simple Discord Bot

## Configuration

Copy `config.example.json` to `config.json` and fill in the fields

## Installation

### With systemd

The service is setup to run an `npm clean-install` before the server is started.

```sh
cp -P node_modules.systemd node_modules
sudo cp systemd/discord-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start discord-bot
```

### Without systemd

```sh
npm ci
npm run serve
```
