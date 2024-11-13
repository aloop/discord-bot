{
  description = "A Simple Discord Bot";

  inputs.nixpkgs.url = "nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      lastModifiedDate = self.lastModifiedDate or self.lastModified or "19700101";
      version = builtins.substring 0 8 lastModifiedDate;
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
        rec {
          aml-discord-bot = pkgs.buildGoModule {
            pname = "aml-discord-bot";
            inherit version;

            src = ./.;
            vendorHash = "sha256-8w/c6d/AZUfi20SLbYA0N6bohA8R8EGqbjhcUS2h+q8=";

            CGO_ENABLED = 0;

            ldflags = [
              "-s"
              "-w"
            ];
          };

          default = aml-discord-bot;
        }
      );

      overlays = rec {
        default = aml-discord-bot;
        aml-discord-bot = final: prev: {
          aml-discord-bot = self.packages."${final.system}".aml-discord-bot;
        };
      };

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
                socketPermissions = mkOption {
                  type = types.str;
                  description = "Permissions for the unix socket when used";
                  default = "0666";
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
                  default = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US";
                };
              };
            };
          };

          config = mkIf cfg.enable {
            systemd.services.discord-bot =
              let
                pkg = self.packages.${pkgs.stdenv.hostPlatform.system}.aml-discord-bot;
              in
              {
                description = "A Simple Discord Bot";
                documentation = [ "https://github.com/aloop/discord-bot" ];

                wants = [
                  "network-online.target"
                  "nss-lookup.target"
                  "postgresql.service"
                ];
                after = [
                  "network-online.target"
                  "nss-lookup.target"
                  "postgresql.service"
                ];
                wantedBy = [ "multi-user.target" ];

                serviceConfig = {
                  ExecStart = "${pkg}/bin/discord-bot";
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

                  UMask = "0077";
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
                    "AF_UNIX"
                  ];
                  SocketBindDeny = "any";
                  SocketBindAllow = "tcp";

                  AmbientCapabilities = "";
                  CapabilityBoundingSet = "";

                  ConfigurationDirectory = "discord-bot";
                  ConfigurationDirectoryMode = "0750";

                  StateDirectory = "discord-bot";
                  StateDirectoryMode = "0750";

                  RuntimeDirectory = "discord-bot";
                  RuntimeDirectoryMode = "0755";
                };
              };
          };
        };
    };
}
