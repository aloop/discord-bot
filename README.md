# Simple Discord Bot

## Configuration

Copy `config.example.json` to `config.json` and fill in the fields

## Installation

### With systemd

The service is setup to run `pnpm install --prod --frozen-lockfile` before the server is started.

Note that if you have changed the listenPort in config.json from the default of 5000 you will need to change `SocketBindAllow=tcp:5000` in `discord-bot.service` to reflect that change

```sh
cp -P node_modules.systemd node_modules
sudo cp systemd/discord-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start discord-bot
```

### Without systemd

```sh
pnpm install --prod --frozen-lockfile
pnpm run serve
```
