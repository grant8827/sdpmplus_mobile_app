import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Avatar, Banner, Card, EmptyText, Pill } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, type RosterStudent, type TeacherClass } from '../../services/api';

/**
 * Teacher Class tab — same as the website's: who's in the classroom the
 * teacher was assigned to, and each student's enrollment status (active
 * or suspended, set by an admin; read-only here). Daily attendance is
 * marked on the Attendance tab.
 */
export function ClassRosterScreen() {
  const { token, user } = useAuth();
  const [myClass, setMyClass] = useState<TeacherClass | null>(null);
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    api.teacherClass(token).then(setMyClass).catch(() => {});
    api.teacherStudents(token).then(setStudents).catch(error => setMessage(error.message));
  }, [token]);

  const subtitle = myClass
    ? [`Grade ${myClass.gradeName}`, myClass.roomName, user?.fullName].filter(Boolean).join(' · ')
    : "You haven't been assigned to a classroom yet. Ask your admin to set it in Faculty.";

  return (
    <Screen title={myClass?.name ?? 'Class'} subtitle={subtitle}>
      <Banner text={message} />
      {students.length === 0 ? <EmptyText>No students in this class yet.</EmptyText> : (
        <Card style={styles.list}>
          {students.map((student, index) => (
            <View key={student.id} style={[styles.row, index > 0 && styles.divider]}>
              <Avatar uri={student.photoUrl} name={student.fullName} size={36} />
              <Text style={styles.name}>{student.fullName}</Text>
              <Pill label={student.status === 'SUSPENDED' ? 'Suspended' : 'Active'} tone={student.status === 'SUSPENDED' ? 'amber' : 'green'} />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 4, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: '#EEF0F3' },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: '#374151' },
});
