import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { mockChildren, mockTeachers } from '../../mocks/mockData';
import type { Teacher } from '../../types';

/**
 * SDP-9: Admin Faculty Management (Add/Edit Teachers).
 * TODO: wire to a real API; edit/reassign is a tap-to-select stub for
 * now (fills the form for re-submission) pending a proper edit modal.
 */
export function FacultyManagementScreen() {
  const [teachers, setTeachers] = useState<Teacher[]>(mockTeachers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [roomName, setRoomName] = useState('');

  const studentCount = (teacherId: string) =>
    mockChildren.filter(c => c.teacherId === teacherId).length;

  const resetForm = () => {
    setEditingId(null);
    setFullName('');
    setEmail('');
    setRoomName('');
  };

  const startEdit = (teacher: Teacher) => {
    setEditingId(teacher.id);
    setFullName(teacher.fullName);
    setEmail(teacher.email);
    setRoomName(teacher.roomName);
  };

  const submit = () => {
    if (!fullName.trim() || !email.trim() || !roomName.trim()) return;

    if (editingId) {
      setTeachers(prev =>
        prev.map(t =>
          t.id === editingId ? { ...t, fullName, email, roomName } : t,
        ),
      );
    } else {
      const newTeacher: Teacher = {
        id: `teacher-${Date.now()}`,
        fullName,
        email,
        roomName,
        studentIds: [],
      };
      setTeachers(prev => [...prev, newTeacher]);
    }
    resetForm();
  };

  return (
    <Screen title="Faculty" subtitle="Add teachers and assign their classroom.">
      <View style={styles.card}>
        <Text style={styles.formTitle}>{editingId ? 'Edit Teacher' : 'Add Teacher'}</Text>
        <TextInput style={styles.input} placeholder="Full Name" value={fullName} onChangeText={setFullName} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Assigned Room / Class Name"
          value={roomName}
          onChangeText={setRoomName}
        />
        <View style={styles.formActions}>
          {editingId && (
            <TouchableOpacity style={styles.secondaryButton} onPress={resetForm}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.primaryButton} onPress={submit}>
            <Text style={styles.primaryButtonText}>{editingId ? 'Save Changes' : 'Add Teacher'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {teachers.map(teacher => (
        <TouchableOpacity key={teacher.id} style={styles.card} onPress={() => startEdit(teacher)}>
          <Text style={styles.teacherName}>{teacher.fullName}</Text>
          <Text style={styles.teacherMeta}>{teacher.roomName} · {teacher.email}</Text>
          <Text style={styles.teacherMeta}>{studentCount(teacher.id)} students enrolled</Text>
        </TouchableOpacity>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E4E9',
    gap: 10,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1D23',
  },
  input: {
    backgroundColor: '#F5F6F8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E4E9',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1D23',
  },
  teacherMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
});
