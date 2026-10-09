import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { SummaryTile } from '../../components/SummaryTile';
import { Banner, Button, COLORS, Card, Muted } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, type DistrictSchool } from '../../services/api';

/**
 * District admins: every school in their district at a glance. "Open"
 * switches the app to that school (same as the school picker in Menu);
 * every tab then shows and acts on that school.
 */
export function DistrictOverviewScreen() {
  const { token, activeSchoolId, setActiveSchool } = useAuth();
  const [schools, setSchools] = useState<DistrictSchool[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) api.districtOverview(token).then(setSchools).catch(error => setMessage(error.message));
  }, [token]);

  const districtName = schools[0]?.districtName;

  return (
    <Screen title={districtName ? `District: ${districtName}` : 'District'} subtitle="Every school in your district. Open one to manage it.">
      <Banner text={message} />
      {schools.map(school => {
        const isOpen = school.schoolId === activeSchoolId;
        return (
          <Card key={school.schoolId}>
            <View style={styles.header}>
              <View style={styles.flex}>
                <Text style={styles.name}>{school.schoolName}</Text>
                <Muted>Code {school.schoolCode}{isOpen ? ' · currently open' : ''}</Muted>
              </View>
              <Button label={isOpen ? 'Open now' : 'Open'} small disabled={isOpen} onPress={() => { setActiveSchool(school.schoolId); setMessage(`Now working in ${school.schoolName}.`); }} />
            </View>
            <View style={styles.tiles}>
              <SummaryTile label="Students" value={school.students} />
              <SummaryTile label="Teachers" value={school.teachers} />
              <SummaryTile label="Present now" value={school.presentToday} accentColor={COLORS.green} />
              <SummaryTile label="Pending requests" value={school.pendingRequests} accentColor={COLORS.amberText} />
              <SummaryTile label="Awaiting approval" value={school.pendingGuardianApprovals} accentColor="#7C3AED" />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  name: { fontSize: 17, fontWeight: '700', color: '#374151' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
