import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { MfaSignInStep } from '../../components/MfaSignInStep';
import { PasswordInput } from '../../components/ui';
import type { MfaChallenge } from '../../types';

const WEBSITE = 'sdpmplus.com';
const WEBSITE_URL = 'https://sdpmplus.com';

// New-school registration happens on the website, not in the app — this
// explains that and offers to open it.
function sendToWebsite(title: string, message: string) {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: `Open ${WEBSITE}`, onPress: () => Linking.openURL(WEBSITE_URL).catch(() => {}) },
  ]);
}

const FEATURES: { icon: string; title: string; body: string }[] = [
  {
    icon: '🚗',
    title: 'Tap to check in',
    body: "Alert your child's teacher the moment you're in the lane.",
  },
  {
    icon: '✅',
    title: 'Live attendance',
    body: 'Drop-offs and pick-ups sync to the class roster instantly.',
  },
  {
    icon: '🔔',
    title: 'Stay in the loop',
    body: 'Messages from the school and teachers, right on your phone.',
  },
];

/**
 * SDP-1: Setup Authentication & Role-Based Access Control (RBAC).
 * Login by email/phone + password, then — for accounts with two-step
 * verification (always for admins) — a code from the authenticator app
 * (MfaSignInStep). On success, RootNavigator reads the resulting user's
 * role and routes to the matching Parent / Teacher / Admin navigator.
 *
 * Local demo accounts use admin@school.test, teacher@school.test, or
 * parent@school.test with password "password".
 */
export function LoginScreen() {
  const { login, adoptSession, isAuthenticating } = useAuth();
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  // "Forgot password?" swaps the sign-in form for an email field; the
  // server emails a reset link that opens the website's reset page.
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);

  // While the keypad is up, the feature list is hidden and the form is
  // scrolled to the top of what's left, so the fields and the button
  // stay above the keypad even on a small phone.
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const formY = useRef(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const showForm = () => scrollRef.current?.scrollTo({ y: Math.max(0, formY.current - 12), animated: true });

  const openForgot = () => {
    setForgotMode(true);
    setResetMessage(null);
    setError(null);
    if (identifier.includes('@')) setResetEmail(identifier.trim());
  };
  const sendResetLink = async () => {
    setError(null);
    if (!resetEmail.trim().includes('@')) {
      setError('Enter the email address you sign in with.');
      return;
    }
    setResetBusy(true);
    try {
      setResetMessage((await api.forgotPassword(resetEmail.trim())).message);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Something went wrong. Please try again.');
    } finally {
      setResetBusy(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!identifier || !password) {
      setError('Enter both email/phone and password.');
      return;
    }
    try {
      setChallenge(await login(identifier, password));
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Login failed. Please try again.',
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Image
            source={require('../../assets/sdpmplus-logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="SDPMPlus — School Drop-off & Pick-up"
          />
          <Text style={styles.tagline}>
            Faster, safer drop-offs and pick-ups for parents, teachers, and
            staff.
          </Text>
        </View>

        {!keyboardOpen && <View style={styles.featureList}>
          {FEATURES.map(feature => (
            <View key={feature.title} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureBody}>{feature.body}</Text>
              </View>
            </View>
          ))}
        </View>}

        <View
          onLayout={event => {
            formY.current = event.nativeEvent.layout.y;
            if (keyboardOpen) showForm();
          }}
        >
        {challenge ? (
          <View style={styles.formCard}>
            <MfaSignInStep
              challenge={challenge}
              onSignedIn={adoptSession}
              onRestart={message => { setChallenge(null); setPassword(''); setError(message); }}
            />
          </View>
        ) : forgotMode ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Reset your password</Text>
            {resetMessage ? (
              <Text style={styles.success}>
                {resetMessage} The link works for 1 hour.
              </Text>
            ) : (
              <>
                <Text style={styles.formHint}>
                  Enter the email you sign in with and we'll send you a link
                  to choose a new password.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <TouchableOpacity
                  style={styles.button}
                  onPress={sendResetLink}
                  disabled={resetBusy}
                >
                  {resetBusy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Send reset link</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => { setForgotMode(false); setError(null); }}
            >
              <Text style={styles.forgotText}>Back to sign in</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Sign in to continue</Text>

          <TextInput
            style={styles.input}
            placeholder="Email or phone"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            keyboardType="email-address"
            value={identifier}
            onChangeText={setIdentifier}
          />
          <PasswordInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
            autoComplete="current-password"
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton} onPress={openForgot}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() =>
              sendToWebsite(
                'Register your school',
                `Schools register on our website. Go to ${WEBSITE} to set up your school and administrator account.`,
              )
            }
          >
            <Text style={styles.registerText}>Register your school</Text>
          </TouchableOpacity>
        </View>
        )}
        </View>

        <Text style={styles.footer}>
          Parent, Teacher, and Admin accounts all sign in here — you'll land on
          the dashboard built for your role.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#F4F8FC',
  },
  registerButton: { paddingVertical: 14, alignItems: 'center' },
  linkButton: { paddingTop: 14, alignItems: 'center' },
  forgotText: { color: '#6B7280', fontWeight: '600' },
  logo: { width: '100%', maxWidth: 340, height: 113, marginBottom: 12 },
  registerText: { color: '#1976D2', fontWeight: '600' },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  tagline: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    lineHeight: 20,
  },
  featureList: {
    gap: 14,
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureIcon: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  featureBody: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E4E9',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F4F8FC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E4E9',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
    color: '#374151',
  },
  error: {
    color: '#DC2626',
    marginBottom: 12,
    fontSize: 13,
  },
  formHint: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: -8,
    marginBottom: 14,
  },
  // Success = green (brand); text stays Slate for contrast.
  success: {
    backgroundColor: 'rgba(57, 168, 68, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#39A844',
    borderRadius: 8,
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#1976D2',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  footer: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 12,
    lineHeight: 17,
  },
});
