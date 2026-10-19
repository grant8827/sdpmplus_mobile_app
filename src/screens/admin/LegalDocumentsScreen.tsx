import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, type RouteProp, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button, COLORS, Card, Heading, Muted, errorText } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { POLICIES_VERSION, POLICY_DOCUMENTS, SCHOOL_DOCUMENTS } from '../../legal/documents';
import { Markdown } from '../../legal/Markdown';
import { api } from '../../services/api';
import { policyAcknowledgmentChanged, usePolicyAcknowledgment } from '../../utils/policyAcknowledgment';
import type { MenuStackParamList } from '../../navigation/MenuStackNavigator';

const GROUPS = [
  { group: 'legal', title: 'Agreements and privacy' },
  { group: 'trust', title: 'Security and data handling' },
] as const;
const when = (stamp: string) => new Date(`${stamp.replace(' ', 'T')}Z`).toLocaleString();

/**
 * Who confirmed reading these documents, or (for a school administrator)
 * the switch to confirm it — recorded for the platform with each
 * document's date, same as the website's. A document being updated asks again.
 */
function AcknowledgmentCard() {
  const { token, canManageSchool, schools, activeSchoolId } = useAuth();
  const schoolName = (schools.find(s => s.schoolId === activeSchoolId) ?? schools[0])?.schoolName ?? 'my school';
  const { acknowledgment, current, setAcknowledgment } = usePolicyAcknowledgment();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (current === undefined) return null;
  if (current && acknowledgment) {
    return (
      <Card style={[styles.ack, { borderLeftColor: COLORS.green }]}>
        <Text style={styles.text}>Read and confirmed by <Text style={styles.bold}>{acknowledgment.userName}</Text> on {when(acknowledgment.acknowledgedAt)}.</Text>
      </Card>
    );
  }
  const confirmRead = async () => {
    if (!token || !checked) return;
    setBusy(true);
    setError('');
    try {
      setAcknowledgment((await api.acknowledgePolicies(token, { version: POLICIES_VERSION, documents: POLICY_DOCUMENTS })).acknowledgment);
      policyAcknowledgmentChanged();
    } catch (err) {
      setError(errorText(err, 'Could not save your confirmation'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card style={[styles.ack, { borderLeftColor: COLORS.amber }]}>
      <Heading>{acknowledgment ? 'Some documents were updated' : 'Please read and confirm'}</Heading>
      <Text style={styles.text}>
        {acknowledgment
          ? `${acknowledgment.userName} confirmed the earlier versions on ${when(acknowledgment.acknowledgedAt)}. Please read the documents below again and confirm.`
          : 'Read each document below, then confirm. The confirmation is recorded with the date of each document.'}
      </Text>
      {canManageSchool ? (
        <>
          <View style={styles.switchRow}>
            <Switch value={checked} onValueChange={setChecked} accessibilityLabel={`I have read these policies on behalf of ${schoolName}`} />
            <Text style={[styles.text, styles.flex]}>I have read these policies on behalf of {schoolName}.</Text>
          </View>
          <Button label={busy ? 'Saving…' : 'Confirm'} onPress={confirmRead} disabled={!checked || busy} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </>
      ) : <Muted>A school administrator needs to confirm this.</Muted>}
    </Card>
  );
}

/** Menu → Legal & Policies: every document the school agrees to or may be asked for, same as the website's tab. */
export function LegalDocumentsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MenuStackParamList>>();
  return (
    <Screen title="Legal & Policies" subtitle="The agreements and policies that cover your school's use of SDPMPlus.">
      <AcknowledgmentCard />
      {GROUPS.map(({ group, title }) => (
        <Card key={group}>
          <Heading>{title}</Heading>
          {SCHOOL_DOCUMENTS.filter(doc => doc.group === group).map(doc => (
            <TouchableOpacity key={doc.slug} style={styles.row} onPress={() => navigation.navigate('LegalDocument', { slug: doc.slug })} accessibilityRole="button">
              <Text style={styles.rowText}>{doc.title}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

/** One legal or policy document, read inside the app. */
export function LegalDocumentScreen() {
  const route = useRoute<RouteProp<MenuStackParamList, 'LegalDocument'>>();
  const navigation = useNavigation<NativeStackNavigationProp<MenuStackParamList>>();
  const doc = SCHOOL_DOCUMENTS.find(d => d.slug === route.params.slug) ?? SCHOOL_DOCUMENTS[0];
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <Markdown source={doc.source} onOpenDocument={slug => navigation.push('LegalDocument', { slug })} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F4F8FC' },
  pageContent: { padding: 16, paddingBottom: 40 },
  ack: { borderLeftWidth: 4, gap: 10 },
  text: { fontSize: 14, color: COLORS.slate, lineHeight: 20 },
  bold: { fontWeight: '700' },
  flex: { flex: 1 },
  error: { color: COLORS.red, fontSize: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  rowText: { fontSize: 15, color: COLORS.blue, fontWeight: '600' },
  chevron: { fontSize: 20, color: COLORS.faint },
});
