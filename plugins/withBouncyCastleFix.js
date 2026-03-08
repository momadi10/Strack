const { createRunOncePlugin, withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

const BOUNCY_FIX = `
    configurations.all {
        resolutionStrategy.eachDependency { details ->
            if (details.requested.group == 'org.bouncycastle') {
                def name = details.requested.name
                if (name.startsWith('bcutil')) {
                    details.useTarget 'org.bouncycastle:bcutil-jdk18on:1.78'
                } else {
                    details.useTarget 'org.bouncycastle:bcprov-jdk18on:1.78'
                }
                details.because 'Unify Bouncy Castle for expo-updates'
            }
        }
    }
`;

const withBouncyCastleFix = (config) => {
  // Apply at root so all subprojects use the same Bouncy Castle resolution
  config = withProjectBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      /allprojects\s*\{\s*repositories/,
      `allprojects {\n${BOUNCY_FIX}\n  repositories`
    );
    return config;
  });
  // Also apply in app/build.gradle for the app project
  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      /android\s*\{/,
      `android {\n${BOUNCY_FIX}\n`
    );
    return config;
  });
};

module.exports = createRunOncePlugin(withBouncyCastleFix, 'withBouncyCastleFix', '1.0.0');
