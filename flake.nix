{
  description = "A Simple Discord.js Bot";

  inputs.nixpkgs.url = "nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs, }:
    let
      # Systems supported
      allSystems = [ "x86_64-linux" "aarch64-linux" ];

      # Helper to provide system-specific attributes
      forAllSystems = f:
        nixpkgs.lib.genAttrs allSystems
        (system: f { pkgs = import nixpkgs { inherit system; }; });
    in {
      packages = forAllSystems ({ pkgs }: {
        default = pkgs.buildNpmPackage {
          name = "aml-discord-bot";

          dontNpmBuild = true;

          buildInputs = with pkgs; [
            nodejs
            gcc
            cairo
            pango
            libpng
            libjpeg
            giflib
            librsvg
            pixman
          ];

          nativeBuildInputs = with pkgs; [ pkg-config ];

          src = ./.;
          npmDepsHash = "sha256-niZpESAYN19vun9yNYcXwhxfGA+OS27TvyI8TS9GkAw=";
          makeCacheWritable = true;

          installPhase = ''
            runHook preInstall

            mkdir -p "$out"

            cp -pr --reflink=auto ./ "$out/"

            runHook postInstall
          '';
        };
      });

      nixosModules.default = { config, pkgs, lib, ... }:
        let
          inherit (lib) types mkIf mkDefault mkEnableOption mkOption;

          cfg = config.services.aml-discord-bot;

          format = pkgs.formats.json { };
          configFile = format.generate "config.json" cfg.settings;
        in {
          options.services.aml-discord-bot = {
            enable = mkEnableOption "Enable aml-discord-bot";

            secretsFile = mkOption {
              type = with types; nullOr str;
              default = null;
            };

            settings = {
              http = {
                listenPort = mkOption {
                  type = types.int;
                  default = 5000;
                };

                listenHost = mkOption {
                  type = types.str;
                  default = "127.0.0.1";
                };
                host = mkOption {
                  type = types.str;
                  default = "http://localhost:5000";
                };
              };

              timeZone = mkOption {
                type = types.str;
                default = config.time.timeZone or "America/Los_Angeles";
              };
              locale = mkOption {
                type = types.str;
                default = "en-US";
              };
              country = mkOption {
                type = types.str;
                default = "US";
              };

              blizzard = {
                authTokenUrl = mkOption {
                  type = types.str;
                  default =
                    "https://us.battle.net/oauth/token?grant_type=client_credentials";
                };
                tokenPriceUrl = mkOption {
                  type = types.str;
                  default =
                    "https://us.api.blizzard.com/data/wow/token/index?namespace=dynamic-us";
                };
              };

              epicGamesStore = {
                productBaseUrl = mkOption {
                  type = types.str;
                  default = "https://www.epicgames.com/store/en-US/product/";
                };
                freeGamesApiUrl = mkOption {
                  type = types.str;
                  default =
                    "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en_US&country=US&allowCountries=US";
                };
              };
            };
          };

          config = mkIf cfg.enable {
            # Make sure we have some fonts available to render our charts with
            fonts.packages = [ pkgs.dejavu_fonts ];

            systemd.services.aml-discord-bot = let
              aml-discord-bot-pkg =
                self.packages.${pkgs.stdenv.hostPlatform.system}.default;
            in {
              description = "A Simple Discord Bot";
              documentation = [ "https://github.com/aloop/discord-bot" ];

              wants = [ "network-online.target" "nss-lookup.target" ];
              after = [ "network-online.target" "nss-lookup.target" ];
              wantedBy = [ "multi-user.target" ];

              environment.NODE_ENV = "production";

              script = ''
                ${pkgs.nodejs}/bin/node ${aml-discord-bot-pkg}/deploy-commands.js && \
                ${pkgs.nodejs}/bin/node ${aml-discord-bot-pkg}/index.js
              '';

              serviceConfig = {
                DynamicUser = true;
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
                SystemCallFilter = [ "@system-service" "~@privileged" ];
                SystemCallErrorNumber = "EPERM";
                LockPersonality = true;
                NoNewPrivileges = true;

                RestrictAddressFamilies = [ "AF_INET" "AF_INET6" ];
                SocketBindDeny = "any";
                SocketBindAllow =
                  "tcp:${toString cfg.settings.http.listenPort}";

                CapabilityBoundingSet = [ ];

                ConfigurationDirectory = "aml-discord-bot";
                ConfigurationDirectoryMode = "0750";

                StateDirectory = "aml-discord-bot";
                StateDirectoryMode = "0750";

                RuntimeDirectory = "aml-discord-bot";
                RuntimeDirectoryMode = "0750";
              };
            };
          };
        };
    };
}
