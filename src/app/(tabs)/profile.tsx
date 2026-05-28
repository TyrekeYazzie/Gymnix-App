import React from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, StyleSheet
} from 'react-native';
import supabase from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function Profile() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>JD</Text>
        </View>
        <Text style={styles.name}>John Doe</Text>
        <Text style={styles.email}>john@example.com</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Goals</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Daily Calories</Text>
          <Text style={styles.rowValue}>2,000 kcal</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Weekly Workouts</Text>
          <Text style={styles.rowValue}>4 days</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Stats</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Total Workouts</Text>
          <Text style={styles.rowValue}>47</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Current Streak</Text>
          <Text style={styles.rowValue}>7 days</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 24 },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#ff4500', justifyContent: 'center',
    alignItems: 'center', marginBottom: 12
  },
  avatarText: { color: '#ffffff', fontSize: 28, fontWeight: 'bold' },
  name: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  email: { color: '#888888' },
  card: {
    backgroundColor: '#1a1a1a', borderRadius: 16,
    padding: 20, marginBottom: 16
  },
  cardTitle: {
    fontSize: 18, fontWeight: 'bold',
    color: '#ffffff', marginBottom: 16
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 12
  },
  rowLabel: { color: '#888888' },
  rowValue: { color: '#ffffff', fontWeight: 'bold' },
  logoutButton: {
    backgroundColor: '#ff4500', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8
  },
  logoutText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 }
});