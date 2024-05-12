{
  description = "A Simple Discord Bot";

  inputs.nixpkgs.url = "nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      # Systems supported
      allSystems = [
        "x86_64-linux"
        "aarch64-linux"
      ];

      # Helper to provide system-specific attributes
      forAllSystems =
        f: nixpkgs.lib.genAttrs allSystems (system: f { pkgs = import nixpkgs { inherit system; }; });
    in
    {
      packages = forAllSystems (
        { pkgs }:
        {
          default = pkgs.buildGoModule {
            pname = "aml-discord-bot";
            version = "0.1.0";

            src = ./.;
            vendorHash = "sha256-VfflDgSvjm3TRcZKEygfQjZRFkiDOLS3iGaFdN6QZxk=";

            ldflags = [ "-s -w" ];
          };
        }
      );

      nixosModules.default =
        {
          config,
          pkgs,
          lib,
          ...
        }:
        let
          inherit (lib)
            types
            mkIf
            mkEnableOption
            mkOption
            ;

          cfg = config.services.aml-discord-bot;

          format = pkgs.formats.json { };
          configFile = format.generate "config.json" cfg.settings;
        in
        {
          options.services.aml-discord-bot = {
            enable = mkEnableOption "Enable aml-discord-bot";

            user = mkOption {
              type = types.str;
              description = "The user name to use to run the bot";
              default = "discordbot";
            };

            secretsFile = mkOption {
              type = with types; nullOr str;
              description = "Path to a json file containing secrets used by the bot";
              default = null;
            };

            settings = {
              http = {
                listenPort = mkOption {
                  type = types.int;
                  description = "Port for the bot's HTTP server";
                  default = 5000;
                };

                listenHost = mkOption {
                  type = types.str;
                  description = "IP to bind to for the bot's HTTP server";
                  default = "127.0.0.1";
                };
                host = mkOption {
                  type = types.str;
                  description = "The external host URL to present";
                  default = "http://localhost:5000";
                };
              };

              blizzard = {
                authTokenUrl = mkOption {
                  type = types.str;
                  description = "The URL used to fetch an auth token from Blizzard";
                  default = "https://us.battle.net/oauth/token?grant_type=client_credentials";
                };
                tokenPriceUrl = mkOption {
                  type = types.str;
                  description = "The URL used to fetch the current WoW token price";
                  default = "https://us.api.blizzard.com/data/wow/token/index?namespace=dynamic-us";
                };
              };

              epicGamesStore = {
                productBaseUrl = mkOption {
                  type = types.str;
                  description = "The URL used as a base for building a url to a product on the Epic Games Store";
                  default = "https://www.epicgames.com/store/en-US/product/";
                };
                freeGamesApiUrl = mkOption {
                  type = types.str;
                  description = "The URL used to fetch the current free games from the Epic Games Store API";
                  default = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en_US&country=US&allowCountries=US";
                };
              };
            };
          };

          config = mkIf cfg.enable {
            systemd.services.discord-bot =
              let
                pkg = self.packages.${pkgs.stdenv.hostPlatform.system}.default;
              in
              {
                description = "A Simple Discord Bot";
                documentation = [ "https://github.com/aloop/discord-bot" ];

                wants = [
                  "network-online.target"
                  "nss-lookup.target"
                ];
                after = [
                  "network-online.target"
                  "nss-lookup.target"
                ];
                wantedBy = [ "multi-user.target" ];

                script = ''
                  ${pkg}/bin/discord-bot
                '';

                serviceConfig = {
                  DynamicUser = true;
                  User = cfg.user;
                  Restart = "on-failure";
                  RestartSec = "10s";
                  WorkingDirectory = "%S";
                  Type = "simple";

                  LoadCredential = [
                    "config.json:${configFile}"
                    "secrets.json:${cfg.secretsFile}"
                  ];

                  UMask = "0027";
                  DevicePolicy = "closed";
                  MemoryAccounting = true;
                  ProcSubset = "pid";
                  RemoveIPC = true;
                  PrivateTmp = true;
                  PrivateDevices = true;
                  PrivateUsers = true;
                  PrivateMounts = true;
                  ProtectClock = true;
                  ProtectHome = true;
                  ProtectSystem = "strict";
                  ProtectKernelLogs = true;
                  ProtectKernelModules = true;
                  ProtectKernelTunables = true;
                  ProtectControlGroups = true;
                  ProtectProc = "invisible";
                  ProtectHostname = true;
                  RestrictNamespaces = true;
                  RestrictRealtime = true;
                  RestrictSUIDSGID = true;

                  SystemCallArchitectures = "native";
                  SystemCallFilter = [
                    "@system-service"
                    "~@privileged"
                  ];
                  SystemCallErrorNumber = "EPERM";
                  LockPersonality = true;
                  NoNewPrivileges = true;

                  RestrictAddressFamilies = [
                    "AF_INET"
                    "AF_INET6"
                  ];
                  SocketBindDeny = "any";
                  SocketBindAllow = "tcp:${toString cfg.settings.http.listenPort}";

                  CapabilityBoundingSet = [ ];

                  ConfigurationDirectory = "discord-bot";
                  ConfigurationDirectoryMode = "0750";

                  StateDirectory = "discord-bot";
                  StateDirectoryMode = "0750";

                  RuntimeDirectory = "discord-bot";
                  RuntimeDirectoryMode = "0750";
                };
              };
          };
        };
    };
}
