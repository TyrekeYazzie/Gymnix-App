// Expo's default Metro config plus Sentry's serializer, which stamps each
// bundle and its source map with a matching debug ID so production stack
// traces in Sentry resolve to the original source.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
