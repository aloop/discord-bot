# Simple Discord Bot

## Configuration

Copy `config.example.json` to `config.json` and fill in the fields

## Installation

### Docker

#### Docker Compose

Copy `docker-compose.example.yml` from this repository and alter it to your liking.

#### Docker Run

To deploy the bot commands, execute the following:

```sh
docker run --rm -it -v "$(pwd)/config.json:/app/config.json:ro" aloop/discord-bot:latest pnpm run deploy-commands
```

Then, to start the bot and webserver:

```sh
docker run --rm -d -p 127.0.0.1:5000:5000/tcp -v "$(pwd)/config.json:/app/config.json:ro" -v "$(pwd)/db:/app/db" aloop/discord-bot:latest
```

#### Docker notes

You may want to set `listenHost` to 0.0.0.0 in your `config.json` so that the HTTP server binds to the container's ip.

### systemd

Note that if you have changed the listenPort in config.json from the default of 5000 you will need to change `SocketBindAllow=tcp:5000` in the systemd service file to reflect that change.

```sh
sudo cp systemd/discord-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
# Don't forget to run this every time the lockfile updates!
pnpm install --prod --frozen-lockfile
# deploy-commands also needs to be run whenever a command is either added or
# has had its interface updated
pnpm run deploy-commands
sudo systemctl start discord-bot
```

### Standalone

```sh
pnpm install --prod --frozen-lockfile
pnpm run serve
```
