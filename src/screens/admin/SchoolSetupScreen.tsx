import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { SubTabs } from '../../components/SubTabs';
import { Dropdown } from '../../components/Dropdown';
import { LogoPicker } from '../../components/LogoPicker';
import { Banner, Button, Card, EmptyText, Heading, Input, Label, Muted, Pill, Row, confirm, errorText } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, type CampusProfile, type SchoolProfile } from '../../services/api';
import { emptyAddress, formatAddress, storedAddress, type AddressFields } from '../../utils/address';

// Every 15 minutes from 6 AM to 8 PM — picked from the existing
// Modal-based Dropdown, so no native time-picker dependency is needed.
const TIME_OPTIONS = (() => {
  const options: { label: string; value: string }[] = [{ label: 'Not set', value: '' }];
  for (let h = 6; h <= 20; h++) {
    for (let m = 0; m < 60; m += 15) options.push({ label: formatTime(`${pad(h)}:${pad(m)}`), value: `${pad(h)}:${pad(m)}` });
  }
  return options;
})();
function pad(n: number) { return String(n).padStart(2, '0'); }
function formatTime(value: string) {
  const [h, m] = value.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}
// A saved time off the 15-minute grid (set on the website) still shows.
const timeOptionsWith = (value: string) =>
  !value || TIME_OPTIONS.some(o => o.value === value) ? TIME_OPTIONS : [...TIME_OPTIONS, { label: formatTime(value), value }];

const DEFAULT_RADIUS = '150';
type Tab = 'profile' | 'location';

interface LocationForm {
  id: string | null; // null = a new location
  name: string;
  address: AddressFields;
  geofenceRadius: string;
  startTime: string;
  dismissalTime: string;
  extendedTime: string;
}
const emptyLocation = (): LocationForm => ({ id: null, name: '', address: emptyAddress(), geofenceRadius: DEFAULT_RADIUS, startTime: '', dismissalTime: '', extendedTime: '' });
// Editing: the location's own values, falling back to the school-wide
// ones it currently uses (same as the website).
const toLocationForm = (c: CampusProfile, school: SchoolProfile | null): LocationForm => ({
  id: c.id,
  name: c.name,
  address: storedAddress(c) ?? (school && storedAddress(school)) ?? emptyAddress(),
  geofenceRadius: c.geofenceRadius != null ? String(c.geofenceRadius) : DEFAULT_RADIUS,
  startTime: c.startTime || school?.startTime || '',
  dismissalTime: c.dismissalTime || school?.dismissalTime || '',
  extendedTime: c.extendedTime || school?.extendedTime || '',
});
const formatDate = (utc?: string) => (utc ? new Date(`${utc.replace(' ', 'T')}Z`).toLocaleDateString() : '—');

/**
 * School Setup — same as the website's two tabs: School Profile lists
 * the school's locations (date added, address, status) with edit /
 * suspend / delete; the primary location can't be deleted. Add Location
 * (or Edit) sets one location's name, address, pickup radius and daily
 * start / dismissal / extended (daycare) times.
 */
export function SchoolSetupScreen() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');
  const [school, setSchool] = useState<SchoolProfile | null>(null);
  const [campuses, setCampuses] = useState<CampusProfile[]>([]);
  const [location, setLocation] = useState<LocationForm>(emptyLocation());
  const [message, setMessage] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const setup = await api.adminSetup(token);
    setSchool(setup.school);
    setCampuses(setup.campuses);
  }, [token]);
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [load]);

  // The logo saves as soon as it is chosen (or removed).
  const saveLogo = async (logoDataUrl: string) => {
    if (!token) return;
    setBusy(true);
    setMessage('');
    try {
      await api.updateSchoolProfile(token, { logoDataUrl });
      await load();
      setMessage(logoDataUrl ? 'Logo saved.' : 'Logo removed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the logo');
    } finally {
      setBusy(false);
    }
  };

  const openForm = (campus: CampusProfile | null) => {
    setLocation(campus ? toLocationForm(campus, school) : emptyLocation());
    setFormMessage('');
    setTab('location');
  };
  const update = (patch: Partial<LocationForm>) => setLocation(current => ({ ...current, ...patch }));
  const updateAddress = (key: keyof AddressFields, value: string) =>
    setLocation(current => ({ ...current, address: { ...current.address, [key]: value } }));

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    setMessage('');
    try {
      setMessage(await action());
      await load();
    } catch (error) {
      setMessage(errorText(error, 'Something went wrong'));
    } finally {
      setBusy(false);
    }
  };

  const toggleSuspend = async (campus: CampusProfile) => {
    if (!token) return;
    const suspending = campus.status !== 'SUSPENDED';
    if (suspending && !(await confirm(`Suspend ${campus.name}?`, "Parents won't be able to request drop-off or pick-up there until you reactivate it.", 'Suspend'))) return;
    run(async () => {
      await api.setCampusActive(token, campus.id, !suspending);
      return `${campus.name} ${suspending ? 'suspended. Drop-off and pick-up are paused there.' : 'reactivated.'}`;
    });
  };

  const remove = async (campus: CampusProfile) => {
    if (!token) return;
    if (!(await confirm(`Delete ${campus.name}?`, 'Its students and classes will move to the primary location.', 'Delete', true))) return;
    run(async () => {
      const { moved } = await api.removeCampus(token, campus.id);
      return `${campus.name} deleted.${moved.students || moved.classes ? ` ${moved.students} student(s) and ${moved.classes} class(es) moved to the primary location.` : ''}`;
    });
  };

  const save = async () => {
    if (!token) return;
    const { address } = location;
    if (!location.name.trim()) { setFormMessage('Location name is required.'); return; }
    if (!address.addressLine1.trim() || !address.city.trim() || !address.state.trim() || !address.postalCode.trim()) {
      setFormMessage('Street address, city, state, and ZIP/postal code are required for the pickup area.');
      return;
    }
    const radius = Number(location.geofenceRadius);
    if (!Number.isFinite(radius) || radius <= 0) { setFormMessage('The radius must be a positive number of meters.'); return; }
    setFormMessage('Checking the address…');
    setBusy(true);
    try {
      const input = {
        name: location.name.trim(), address: formatAddress(address), geofenceRadius: radius,
        startTime: location.startTime, dismissalTime: location.dismissalTime, extendedTime: location.extendedTime,
      };
      if (location.id) await api.updateCampus(token, location.id, input);
      else await api.addCampus(token, input);
      await load();
      setMessage(`${input.name} saved and mapped.`);
      setLocation(emptyLocation());
      setTab('profile');
    } catch (error) {
      setFormMessage(errorText(error, 'Could not save the location'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="School Setup" subtitle={school ? `${school.name}: locations, pickup areas and hours.` : 'Locations, pickup areas and hours.'}>
      <SubTabs
        tabs={[{ key: 'profile', label: 'School Profile' }, { key: 'location', label: tab === 'location' && location.id ? 'Edit Location' : 'Add Location' }]}
        active={tab}
        onChange={key => (key === 'profile' ? setTab('profile') : openForm(null))}
      />

      {tab === 'profile' && (
        <>
          <Banner text={message} onDismiss={() => setMessage('')} />
          <Card>
            <Heading>School logo</Heading>
            <Muted>Shown at the top of the dashboard for your parents, teachers and staff.</Muted>
            <LogoPicker value={school?.logoUrl ?? ''} onChange={saveLogo} disabled={busy || !school} />
          </Card>
          {campuses.length === 0 ? <EmptyText>No locations yet. Use Add Location to set the drop-off/pick-up area.</EmptyText> : campuses.map(campus => {
            const suspended = campus.status === 'SUSPENDED';
            return (
              <Card key={campus.id}>
                <View style={styles.header}>
                  <Text style={styles.name}>{campus.name}</Text>
                  <Row>
                    {campus.isPrimary && <Pill label="Primary" tone="blue" />}
                    <Pill label={suspended ? 'Suspended' : 'Active'} tone={suspended ? 'amber' : 'green'} />
                  </Row>
                </View>
                <Muted>{campus.address || 'No address yet'}</Muted>
                <Muted>Added {formatDate(campus.createdAt)} · {school?.name}</Muted>
                <Row>
                  <Button label="Edit" variant="secondary" small onPress={() => openForm(campus)} disabled={busy} />
                  <Button label={suspended ? 'Reactivate' : 'Suspend'} variant="secondary" small onPress={() => toggleSuspend(campus)} disabled={busy} />
                  {!campus.isPrimary && <Button label="Delete" variant="danger" small onPress={() => remove(campus)} disabled={busy} />}
                </Row>
              </Card>
            );
          })}
        </>
      )}

      {tab === 'location' && (
        <Card>
          <Heading>{location.id ? `Edit ${location.name || 'location'}` : 'New Location'}</Heading>
          <Label>Location name</Label>
          <Input value={location.name} onChangeText={name => update({ name })} />
          <Label>Address</Label>
          <Input placeholder="Street address" value={location.address.addressLine1} onChangeText={v => updateAddress('addressLine1', v)} />
          <Input placeholder="Suite, unit, building (optional)" value={location.address.addressLine2} onChangeText={v => updateAddress('addressLine2', v)} />
          <Input placeholder="City" value={location.address.city} onChangeText={v => updateAddress('city', v)} />
          <View style={styles.pair}>
            <Input style={styles.flex} placeholder="State/Province" value={location.address.state} onChangeText={v => updateAddress('state', v)} />
            <Input style={styles.flex} placeholder="ZIP/Postal code" value={location.address.postalCode} onChangeText={v => updateAddress('postalCode', v)} />
          </View>
          <Input placeholder="Country" value={location.address.country} onChangeText={v => updateAddress('country', v)} />
          <Label>Pickup/drop-off radius (meters)</Label>
          <Input keyboardType="number-pad" value={location.geofenceRadius} onChangeText={geofenceRadius => update({ geofenceRadius: geofenceRadius.replace(/\D/g, '') })} />
          <Muted>A parent must be within this distance of the address for drop-off and pick-up to work.</Muted>
          <Dropdown label="Start time" options={timeOptionsWith(location.startTime)} value={location.startTime} onChange={startTime => update({ startTime })} />
          <Dropdown label="Dismissal time" options={timeOptionsWith(location.dismissalTime)} value={location.dismissalTime} onChange={dismissalTime => update({ dismissalTime })} />
          <Dropdown label="Extended time (daycare dismissal)" options={timeOptionsWith(location.extendedTime)} value={location.extendedTime} onChange={extendedTime => update({ extendedTime })} />
          <Muted>A drop-off after the start time shows as "L" (late) on the parent's attendance.</Muted>
          {formMessage ? <Text style={styles.formMessage}>{formMessage}</Text> : null}
          <Row>
            <Button label={busy ? 'Saving…' : location.id ? 'Save Changes' : 'Save Location'} onPress={save} disabled={busy} />
            <Button label="Cancel" variant="secondary" onPress={() => setTab('profile')} />
          </Row>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 16, fontWeight: '700', color: '#374151', flexShrink: 1 },
  pair: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  formMessage: { fontSize: 14, color: '#374151' },
});
