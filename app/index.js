// Custom entry so widget task handlers are registered before the app's own routing starts. A widget tap can
// launch a headless JS runtime with no UI, and it only finds the handler if it is registered at load time.
import './src/widgets/register-widgets';
import 'expo-router/entry';
