const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/*
  react-native-android-widget always declares its widgets as home-screen only. Android can also show widgets
  on the lock screen (tablets, and phones on recent versions), but only when the provider opts in with the
  `keyguard` category. Older systems ignore the extra category, so this is safe everywhere.

  This has to run after react-native-android-widget's own plugin has written the file. Expo runs mods of the
  same kind in reverse order of registration, so it is listed BEFORE that plugin in app.json.
 */
function withWidgetLockscreen(config, { widgets }) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      for (const name of widgets) {
        const file = path.join(
          config.modRequest.platformProjectRoot,
          'app/src/main/res/xml',
          `widgetprovider_${name.toLowerCase()}.xml`,
        );
        if (!fs.existsSync(file)) {
          throw new Error(
            `android-widget-lockscreen: ${file} was not generated; this plugin must be listed before react-native-android-widget in app.json`,
          );
        }
        const xml = fs.readFileSync(file, 'utf8');
        fs.writeFileSync(
          file,
          xml.replace(/android:widgetCategory="[^"]*"/, 'android:widgetCategory="home_screen|keyguard"'),
        );
      }
      return config;
    },
  ]);
}

module.exports = withWidgetLockscreen;
