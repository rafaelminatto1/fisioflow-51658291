/**
 * Config plugin that injects SWIFT_STRICT_CONCURRENCY = minimal into the existing
 * post_install block of the Podfile. Necessary because Xcode 16.4+ uses Swift 6
 * strict concurrency by default, breaking expo-modules-core and other Swift 5.x pods.
 *
 * Injects inside the EXISTING post_install block (instead of appending a new one)
 * because CocoaPods does not support multiple post_install blocks.
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
        return config;
      }

      const injection = [
        "",
        "  # Fix: Xcode 16.4 / Swift 6 strict concurrency breaks expo-modules-core.",
        "  installer.pods_project.targets.each do |target|",
        "    target.build_configurations.each do |config|",
        "      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'",
        "    end",
        "  end",
      ].join("\n");

      // Inject inside the existing post_install block (first occurrence)
      if (/^post_install do \|installer\|/m.test(podfile)) {
        podfile = podfile.replace(
          /^(post_install do \|installer\|)/m,
          `$1${injection}`
        );
      } else {
        // No post_install block at all — add one
        podfile += `\npost_install do |installer|\n${injection}\nend\n`;
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};
