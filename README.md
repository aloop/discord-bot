# Simple Discord Bot

## Configuration & Usage

First, add this repository as an input to your flake.nix:

```nix
aml-discord-bot = {
  url = "github:aloop/discord-bot";
  # Probably want to follow your nixpkgs
  inputs.nixpkgs.follows = "nixpkgs";
};
```

Then add `aml-discord-bot.nixosModules.default` to the modules list of your nixosConfiguration.

The following is an example configuration making use of sops-nix for secrets:

```nix
{
  services.aml-discord-bot = {
    enable = true;
    secretsFile = config.sops.secrets."discord-bot/secrets".path;
    # Check config.example.json for an example of settings
    settings = {
      http = {
        listenPort = 8080;
        host = "https://bot.example.com";
      };
    };
  };

  sops.secrets."discord-bot/secrets" = {
    sopsFile = ./secrets.yml;
    # We use systemd's LoadCredential functionality, so permissions for the secrets
    # file can be restricted.
    mode = "0600";
  };
}
```

where `secrets.yml` looks like the following:

```yaml
discord-bot:
  secrets: |
    {
      "discord": {
        "clientId": "",
        "guildId": "",
        "token": ""
      },
      "channels": {
        "deals": ""
      },
      "blizzard": {
        "clientId": "",
        "clientSecret": ""
      },
      "database": {
          "connectionString": "postgresql://user:password@localhost/discord-bot"
      }
    }
```