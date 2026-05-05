/**
 * Config plugin that injects SWIFT_STRICT_CONCURRENCY = minimal into the existing
 * post_install block of the Podfile. Necessary because Xcode 16.4+ uses Swift 6
 * strict concurrency by default, breaking expo-modules-core and other Swift 5.x pods.
 *
 * Injects inside the EXISTING post_install block (instead of appending a new one)
 * because CocoaPods does not support multiple post_install blocks.
 *
 * Uses a flexible regex that matches any post_install do line regardless of
 * the block variable name or surrounding whitespace.
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
        "  # Fix: Xcode 16.4 / Swift 6 strict concurrency breaks expo-modules-core.",
        "  installer.pods_project.targets.each do |target|",
        "    target.build_configurations.each do |config|",
        "      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'",
        "    end",
        "  end",
        "",
      ].join("\n");

      // Flexible regex: matches any "post_install do ..." opening line and captures
      // through the trailing newline so we can inject content immediately after it.
      const postInstallRegex = /(post_install\s+do\b[^\n]*\n)/;

      if (postInstallRegex.test(podfile)) {
        podfile = podfile.replace(postInstallRegex, `$1${injection}`);
      } else {
        // No post_install block found at all — add one.
        podfile += `\npost_install do |installer|\n${injection}end\n`;
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};
