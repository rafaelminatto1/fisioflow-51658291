/**
 * Config plugin que injeta SWIFT_STRICT_CONCURRENCY = minimal no Podfile gerado
 * pelo expo prebuild. Necessário porque Xcode 16.4+ usa Swift 6 strict concurrency
 * por padrão, o que quebra expo-modules-core e outros pods escritos para Swift 5.x.
 *
 * Appenda um segundo post_install block — CocoaPods executa todos em sequência.
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withSwiftConcurrency(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfile = fs.readFileSync(podfilePath, "utf8");

      if (podfile.includes("SWIFT_STRICT_CONCURRENCY")) {
        // Já aplicado — nada a fazer
        return config;
      }

      const hook = `
# Fix: Xcode 16.4 / Swift 6 strict concurrency quebra expo-modules-core.
# Define SWIFT_STRICT_CONCURRENCY = minimal para todos os pods (comportamento Swift 5.x).
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
    end
  end
end
`;

      fs.writeFileSync(podfilePath, podfile + hook);
      return config;
    },
  ]);
};
