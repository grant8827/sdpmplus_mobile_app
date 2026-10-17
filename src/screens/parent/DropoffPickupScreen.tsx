import React, { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import type { Child } from '../../types';
import { CHILD_STATUS_COLOR, CHILD_STATUS_LABEL, CHILD_STATUS_TEXT_COLOR } from '../../utils/childStatus';
import { api, ApiError } from '../../services/api';
import { PinModal } from '../../components/PinModal';
import { Avatar } from '../../components/ui';
import { hasGeofence, isWithinGeofence, type Coordinates } from '../../utils/geofence';

const POLL_MS = 4000;
// How often the screen re-checks that the last location is still recent
// (isWithinGeofence ignores one older than 30 seconds).
const LOCATION_TICK_MS = 5000;

// Android: use Google's location service (GPS + Wi-Fi + cell towers).
// The library's default there is GPS only, which can take a minute or
// more to get a first fix, especially inside a car or building.
Geolocation.setRNConfiguration({ skipPermissionRequests: false, locationProvider: 'playServices' });

const toCoordinates = (position: { coords: { latitude: number; longitude: number; accuracy: number } }): Coordinates =>
  ({ lat: position.coords.latitude, lon: position.coords.longitude, accuracy: position.coords.accuracy, timestamp: Date.now() });

async function requestLocationPermission(): Promise<boolean> {
  // iOS: calling Geolocation.getCurrentPosition triggers the system
  // permission prompt itself (backed by NSLocationWhenInUseUsageDescription
  // in Info.plist) — no separate request call needed there. Android
  // requires the app to drive the runtime permission dialog explicitly.
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Location Permission',
      message: "Used to confirm you're at school before enabling drop-off and pick-up.",
      buttonPositive: 'OK',
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

function getCurrentPosition(): Promise<Coordinates | null> {
  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      position => resolve(toCoordinates(position)),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 },
    );
  });
}

const isFresh = (position: Coordinates | null): position is Coordinates =>
  position != null && position.timestamp != null && Date.now() - position.timestamp < 15000;

/**
 * Whether a child's drop-off/pick-up should be geofence-blocked right now.
 * A campus with no coordinates yet isn't gated at all (today's
 * status-only behavior, so schools that haven't set an address yet
 * aren't broken by this). Otherwise, no device position yet (still
 * loading, or permission denied) fails CLOSED — the buttons stay
 * disabled rather than silently allowing the action, matching the
 * safety intent behind gating in the first place.
 */
function isGeofenceBlocked(child: Child, position: Coordinates | null): boolean {
  if (!hasGeofence(child)) return true;
  if (!position) return true;
  return !isWithinGeofence(position, child);
}

function geofenceMessage(child: Child, position: Coordinates | null, permissionDenied: boolean): string | null {
  if (!isGeofenceBlocked(child, position)) return null;
  if (!hasGeofence(child)) return 'School location is not configured yet. Ask the administrator to save the campus address.';
  if (permissionDenied) return 'Enable Location in Settings to drop off or pick up.';
  if (!position) return 'Getting your location…';
  return 'Get closer to campus to drop off or pick up.';
}

/**
 * SDP-3: Parent Tab 1 - Drop-off & Pick-up Screen.
 *
 * Backed by the real backend: requesting a drop-off/pick-up hits
 * queue_items directly, and this polls /me/students so a teacher's
 * (or admin's) approval — from any device, mobile or web — shows up
 * here without a manual refresh. No websocket transport yet, hence
 * polling.
 */
export function DropoffPickupScreen() {
  const { token } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [message, setMessage] = useState('');
  const [hasPin, setHasPin] = useState(true);
  const [pinFor, setPinFor] = useState<Child | null>(null);

  useEffect(() => {
    if (token) api.myPin(token).then(result => setHasPin(result.hasPin)).catch(() => {});
  }, [token]);
  const [devicePosition, setDevicePosition] = useState<Coordinates | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [, setLocationTick] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = () => api.myStudents(token).then(next => { if (!cancelled) setChildren(next); }).catch(() => {});
    load();
    const interval = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token]);

  // Location stays on while this screen is open (watchPosition), so the
  // phone keeps improving its fix and the buttons enable as soon as it is
  // good enough. Asking for a brand-new fix every few seconds instead
  // made the phone start from scratch each time.
  useEffect(() => {
    let cancelled = false;
    let watchId: number | null = null;
    (async () => {
      const granted = await requestLocationPermission();
      if (cancelled) return;
      setLocationPermissionDenied(!granted);
      if (!granted) { setDevicePosition(null); return; }
      // A quick first answer (a recent or approximate location) while the precise one arrives.
      Geolocation.getCurrentPosition(
        position => { if (!cancelled) setDevicePosition(current => current ?? toCoordinates(position)); },
        () => {},
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 15000 },
      );
      watchId = Geolocation.watchPosition(
        position => { if (!cancelled) { setDevicePosition(toCoordinates(position)); setLocationPermissionDenied(false); } },
        // One failed reading keeps the last good one; it simply expires after 30 seconds.
        error => { if (!cancelled && error.code === 1) { setLocationPermissionDenied(true); setDevicePosition(null); } },
        { enableHighAccuracy: true, distanceFilter: 0, interval: 2000, fastestInterval: 1000, maximumAge: 5000 },
      );
    })();
    const interval = setInterval(() => setLocationTick(value => value + 1), LOCATION_TICK_MS);
    return () => { cancelled = true; clearInterval(interval); if (watchId != null) Geolocation.clearWatch(watchId); };
  }, []);

  // When a button is tapped: the location already on screen if it is
  // recent, otherwise a new one (so the tap doesn't wait for nothing).
  const positionForRequest = async () => (isFresh(devicePosition) ? devicePosition : getCurrentPosition());

  const requestDropOff = async (child: Child) => {
    if (!token) return;
    setMessage('');
    try {
      const current = await positionForRequest();
      if (!current || !isWithinGeofence(current, child)) throw new Error('You must be at the school location to drop off.');
      await api.requestDropOff(token, child.id, { latitude: current.lat, longitude: current.lon }); setChildren(await api.myStudents(token));
    }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not submit drop-off'); }
  };

  // Pick Up asks for the parent's pickup PIN first (PinModal): "create"
  // the first time, "enter" after that. The request is only sent with it.
  const startPickUp = (child: Child) => {
    setMessage('');
    setPinFor(child);
  };
  const submitPickUp = async (pin: string) => {
    if (!token || !pinFor) return;
    const current = await positionForRequest();
    if (!current || !isWithinGeofence(current, pinFor)) throw new Error('You must be at the school location to pick up.');
    if (!hasPin) { await api.createPin(token, pin); setHasPin(true); }
    try {
      await api.requestPickUp(token, pinFor.id, { latitude: current.lat, longitude: current.lon }, pin);
    } catch (error) {
      // The PIN was removed elsewhere (or never set): ask them to create one.
      if (error instanceof ApiError && error.code === 'PIN_NOT_SET') setHasPin(false);
      throw error;
    }
    setPinFor(null);
    setMessage(`Pickup requested for ${pinFor.fullName}.`);
    setChildren(await api.myStudents(token));
  };

  return (
    <Screen
      title="Drop-off & Pick-up"
      subtitle="Alert your child's teacher when you arrive."
    >
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {children.length === 0 ? (
        <Text style={styles.empty}>No children linked to this account yet.</Text>
      ) : (
        children.map(child => {
          // PICKED_UP is the old name for "at home again after a pickup".
          const dropOffStatusOk = child.status === 'AT_HOME' || child.status === 'PICKED_UP';
          const pickUpStatusOk = child.status === 'PRESENT';
          const geofenceBlocked = isGeofenceBlocked(child, devicePosition);
          // Only worth explaining the geofence when it's the actual reason
          // an otherwise-eligible action is unavailable — a child that's
          // already PICKED_UP shouldn't show a location message too.
          const showGeofenceMessage = (dropOffStatusOk || pickUpStatusOk) && geofenceBlocked;

          return (
            <View key={child.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.childIdentity}>
                  <Avatar uri={child.photoUrl} name={child.fullName} />
                  <Text style={styles.childName}>{child.fullName}</Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: CHILD_STATUS_COLOR[child.status] },
                  ]}
                >
                  <Text style={[styles.statusText, { color: CHILD_STATUS_TEXT_COLOR[child.status] }]}>
                    {CHILD_STATUS_LABEL[child.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.dropOffButton,
                    (!dropOffStatusOk || geofenceBlocked) && styles.disabledButton,
                  ]}
                  disabled={!dropOffStatusOk || geofenceBlocked}
                  onPress={() => requestDropOff(child)}
                >
                  <Text style={styles.actionText}>Drop Off</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.pickUpButton,
                    (!pickUpStatusOk || geofenceBlocked) && styles.disabledButton,
                  ]}
                  disabled={!pickUpStatusOk || geofenceBlocked}
                  onPress={() => startPickUp(child)}
                >
                  <Text style={styles.actionText}>Pick Up</Text>
                </TouchableOpacity>
              </View>

              {showGeofenceMessage && (
                <Text style={styles.geofenceMessage}>
                  {geofenceMessage(child, devicePosition, locationPermissionDenied)}
                </Text>
              )}
            </View>
          );
        })
      )}
      <PinModal
        visible={pinFor !== null}
        mode={hasPin ? 'enter' : 'create'}
        childName={pinFor?.fullName ?? ''}
        onSubmit={submitPickUp}
        onForgot={async () => (await api.forgotPin(token!)).message}
        onClose={() => setPinFor(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  message: {
    color: '#DC2626',
    fontSize: 13,
  },
  empty: {
    color: '#6B7280',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E4E9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  childIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  childName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dropOffButton: {
    backgroundColor: '#1976D2',
  },
  pickUpButton: {
    backgroundColor: '#123B6D',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
  },
  geofenceMessage: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
  },
});
