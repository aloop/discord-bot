# Simple Discord Bot

## Configuration

Copy `config.example.json` to `config.json` and fill in the fields

## Installation

### With systemd

Until I figure out a better method, you'll need to set the permissions of the base
directory to allow other users write access (note that only the base directory needs this permission, this gives the systemd service has permission to create the node_modules folder).

The service is setup to both run an npm install if necessary, and run `npm run deploy-commands` before starting the server proper.

```sh
sudo cp systemd/discord-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start discord-bot
```

### Without systemd

```sh
npm ci
npm run deploy-commands
npm run serve
```
