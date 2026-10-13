/**
 * @format
 */

import 'react-native-gesture-handler'; // must be the first import
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
// The app's old name: a build made before the rename to SDPMPlus still
// asks for it, and would otherwise open on a "not registered" error.
AppRegistry.registerComponent('schooldropottpickup', () => App);
