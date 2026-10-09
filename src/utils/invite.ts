import { Alert, Share } from 'react-native';
import type { InviteResult } from '../services/api';

/**
 * After adding someone: confirms their invite email went out, or — when
 * it couldn't be sent — offers to share the one-time set-up link another
 * way (text message, etc.). Nobody chooses a password for anyone else.
 */
export function showInviteResult(name: string, result: InviteResult, addedMessage = `${name} was added.`) {
  if (result.emailSent) {
    Alert.alert('Added', `${addedMessage} We emailed them a link to set up their account.`);
    return;
  }
  const link = result.setupLink;
  if (!link) {
    Alert.alert('Added', addedMessage);
    return;
  }
  Alert.alert(
    "Email couldn't be sent",
    `${addedMessage} Share this one-time link with ${name} so they can choose a password. Keep it private: whoever opens it can set up the account.`,
    [
      { text: 'Close', style: 'cancel' },
      { text: 'Share link', onPress: () => Share.share({ message: `Set up your SDPMPlus account: ${link}` }).catch(() => {}) },
    ],
  );
}
