import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { mockParents, mockTeachers } from '../../mocks/mockData';
import type { Parent } from '../../types';

interface DraftChild {
  name: string;
  teacherId: string;
}

/** SDP-10: Admin Family Management (Add Parents & Link Children), with multi-child support. */
export function FamilyManagementScreen() {
  const [parents, setParents] = useState<Parent[]>(mockParents);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [draftChildren, setDraftChildren] = useState<DraftChild[]>([
    { name: '', teacherId: mockTeachers[0]?.id ?? '' },
  ]);

  const updateDraftChild = (index: number, patch: Partial<DraftChild>) => {
    setDraftChildren(prev =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );
  };

  const addAnotherChild = () => {
    setDraftChildren(prev => [...prev, { name: '', teacherId: mockTeachers[0]?.id ?? '' }]);
  };

  const removeChild = (index: number) => {
    setDraftChildren(prev => prev.filter((_, i) => i !== index));
  };

  const registerFamily = () => {
    const validChildren = draftChildren.filter(c => c.name.trim());
    if (!fullName.trim() || !phoneNumber.trim() || !email.trim() || validChildren.length === 0) {
      return;
    }

    // TODO: POST parent + children to the backend once it exists; this
    // only creates the Parent record locally (children would need real
    // ids from that call to link properly).
    const newParent: Parent = {
      id: `parent-${Date.now()}`,
      fullName,
      phoneNumber,
      email,
      childIds: validChildren.map((_, i) => `pending-child-${Date.now()}-${i}`),
    };
    setParents(prev => [...prev, newParent]);

    setFullName('');
    setPhoneNumber('');
    setEmail('');
    setDraftChildren([{ name: '', teacherId: mockTeachers[0]?.id ?? '' }]);
  };

  return (
    <Screen title="Families" subtitle="Register parents and link their children to a teacher.">
      <View style={styles.card}>
        <Text style={styles.formTitle}>Add Parent</Text>
        <TextInput style={styles.input} placeholder="Full Name" value={fullName} onChangeText={setFullName} />
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.fieldLabel}>Children</Text>
        {draftChildren.map((child, index) => (
          <View key={index} style={styles.childRow}>
            <TextInput
              style={[styles.input, styles.childNameInput]}
              placeholder="Child Name"
              value={child.name}
              onChangeText={name => updateDraftChild(index, { name })}
            />
            <View style={styles.teacherChips}>
              {mockTeachers.map(teacher => (
                <TouchableOpacity
                  key={teacher.id}
                  style={[
                    styles.teacherChip,
                    child.teacherId === teacher.id && styles.teacherChipActive,
                  ]}
                  onPress={() => updateDraftChild(index, { teacherId: teacher.id })}
                >
                  <Text
                    style={
                      child.teacherId === teacher.id
                        ? styles.teacherChipTextActive
                        : styles.teacherChipText
                    }
                  >
                    {teacher.fullName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {draftChildren.length > 1 && (
              <TouchableOpacity onPress={() => removeChild(index)}>
                <Text style={styles.removeLink}>Remove child</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.secondaryButton} onPress={addAnotherChild}>
          <Text style={styles.secondaryButtonText}>+ Add Another Child</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={registerFamily}>
          <Text style={styles.primaryButtonText}>Register Family</Text>
        </TouchableOpacity>
      </View>

      {parents.map(parent => (
        <View key={parent.id} style={styles.card}>
          <Text style={styles.parentName}>{parent.fullName}</Text>
          <Text style={styles.parentMeta}>{parent.phoneNumber} · {parent.email}</Text>
          <Text style={styles.parentMeta}>{parent.childIds.length} linked child(ren)</Text>
        </View>
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
  fieldLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#F5F6F8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E4E9',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  childRow: {
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F4',
  },
  childNameInput: {
    marginBottom: 0,
  },
  teacherChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  teacherChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  teacherChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  teacherChipText: {
    color: '#374151',
    fontSize: 13,
  },
  teacherChipTextActive: {
    color: '#fff',
    fontSize: 13,
  },
  removeLink: {
    color: '#DC2626',
    fontSize: 13,
  },
  primaryButton: {
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
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  parentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1D23',
  },
  parentMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
});
