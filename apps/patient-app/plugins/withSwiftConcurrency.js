/**
 * Config plugin: sets SWIFT_VERSION=6 + SWIFT_STRICT_CONCURRENCY=minimal +
 * IsolatedConformances flag ONLY on the ExpoModulesCore pod.
 *
 * Required when building with Xcode 16.x (not needed on Xcode 26+, which is
 * the EAS Build default for SDK 55 via the sdk-55 / macos-sequoia-15.6-xcode-26.2 image).
 *
 * Tracking issue: https://github.com/expo/expo/issues/42525
 * Reference implementation: tamagui/tamagui kitchen-sink plugin
 *
 * To re-enable: add "./plugins/withSwiftConcurrency" to app.json plugins array.
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withSwiftConcurrency(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfile = fs.readFileSync(podfilePath, "utf8");

      if (podfile.includes("# workaround: expo-modules-core 55.x")) {
        return config;
      }

      // Inserts before the closing `end` of the post_install block.
      // Uses `ms` flags: `m` = ^ matches line start, `s` = . matches newlines.
      const workaround = `
    # workaround: expo-modules-core 55.x requires Swift 6 mode with isolated
    # conformances (SE-0470) for @MainActor in protocol conformance syntax.
    # SWIFT_STRICT_CONCURRENCY=minimal suppresses concurrency warnings/errors.
    installer.pods_project.targets.each do |target|
      if target.name == 'ExpoModulesCore'
        target.build_configurations.each do |build_config|
          build_config.build_settings['SWIFT_VERSION'] = '6'
          build_config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
          flags = build_config.build_settings['OTHER_SWIFT_FLAGS'] || '$(inherited)'
          unless flags.include?('IsolatedConformances')
            build_config.build_settings['OTHER_SWIFT_FLAGS'] = "#{flags} -enable-upcoming-feature IsolatedConformances"
          end
        end
      end
    end
`;

      const updated = podfile.replace(
        /(post_install do \|installer\|.*?)(^\s+end\s*\nend)/ms,
        `$1${workaround}$2`
      );

      if (updated === podfile) {
        console.warn(
          "[withSwiftConcurrency] WARNING: post_install block not found in Podfile — workaround NOT applied"
        );
      } else {
        console.log("[withSwiftConcurrency] applied ExpoModulesCore Swift 6 workaround");
        fs.writeFileSync(podfilePath, updated);
      }

      return config;
    },
  ]);
};
