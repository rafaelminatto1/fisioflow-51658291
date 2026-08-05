/**
 * Config plugin que injeta SWIFT_STRICT_CONCURRENCY = minimal no Podfile gerado
 * pelo expo prebuild. Necessário porque Xcode 16.4+ usa Swift 6 strict
 * concurrency por padrão, o que quebra expo-modules-core e outros pods
 * escritos para Swift 5.x.
 *
 * A versão anterior ACRESCENTAVA um segundo bloco `post_install`, com o
 * comentário de que "CocoaPods executa todos em sequência". Isso é falso:
 * CocoaPods aborta com `[!] Specifying multiple post_install hooks is
 * unsupported.` — o Podfile do Expo já traz um `post_install`, então o build
 * quebrava no `pod install`. Agora o hook é FUNDIDO no bloco existente, e só
 * criamos um novo quando não há nenhum.
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const AJUSTE = [
  "    # SWIFT_STRICT_CONCURRENCY = minimal: Swift 6 quebra expo-modules-core.",
  "    installer.pods_project.targets.each do |swift_concurrency_target|",
  "      swift_concurrency_target.build_configurations.each do |swift_concurrency_config|",
  "        swift_concurrency_config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'",
  "      end",
  "    end",
].join("\n");

module.exports = function withSwiftConcurrency(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      const podfile = fs.readFileSync(podfilePath, "utf8");

      // Idempotente: o workflow de CI também injeta este ajuste. Rodar os dois
      // não pode duplicar nem quebrar.
      if (podfile.includes("SWIFT_STRICT_CONCURRENCY")) {
        return config;
      }

      const abertura = /post_install do \|installer\|\n/;

      if (abertura.test(podfile)) {
        // Funde no bloco existente, logo após a abertura.
        fs.writeFileSync(
          podfilePath,
          podfile.replace(abertura, `post_install do |installer|\n${AJUSTE}\n`),
        );
        return config;
      }

      // Sem post_install no Podfile: aí sim criamos um.
      fs.writeFileSync(
        podfilePath,
        `${podfile}\npost_install do |installer|\n${AJUSTE}\nend\n`,
      );
      return config;
    },
  ]);
};
