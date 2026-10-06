import { widgetTaskHandler } from '@/widgets/android/task-handler';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

// Must run at the entry point: Android starts a headless JS task for a widget tap with no UI mounted.
registerWidgetTaskHandler(widgetTaskHandler);
