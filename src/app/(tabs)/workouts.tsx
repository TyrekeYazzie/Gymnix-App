import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Alert, TextInput, Picker
} from 'react-native';
import * as DateTimePicker from '@expo/react-native-time-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const categories = [
  { name: 'Chest', emoji: '💪' },
  { name: 'Back', emoji: '🏋️' },
  { name: 'Legs', emoji: '🦵' },
  { name: 'Shoulders', emoji: '🏆' },
  { name: 'Arms', emoji: '💯' },
  { name: 'Cardio', emoji: '🏃' },
];

const recentWorkouts = [
  { name: 'Chest Day', category: 'Chest', date: 'Today' },
  { name: 'Leg Press', category: 'Legs', date: 'Yesterday' },
  { name: 'Pull Day', category: 'Back', date: '2 days ago' },
];

// Interface for workout form data
interface WorkoutFormData {
  name: string;
  durationMinutes: number;
  exercises: { name: string; sets: number; reps: number; weightLbs: number }[];
  caloriesBurned: number;
  notes: string;
  isFavorite: boolean;
}

export default function Workouts() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workouts</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => alert('Log Workout feature coming soon!')}
        >
          <Text style={styles.addButtonText}>+ Log Workout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Categories</Text>
      <View style={styles.grid}>
        {categories.map((cat) => (
          <TouchableOpacity key={cat.name} style={styles.categoryCard} onPress={() => alert(`${cat.name} workouts coming soon!`)}>
            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
            <Text style={styles.categoryName}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Recent Workouts</Text>
      {recentWorkouts.map((workout, i) => (
        <View key={i} style={styles.workoutItem}>
          <Text style={styles.workoutName}>{workout.name}</Text>
          <Text style={styles.workoutMeta}>
            {workout.category} • {workout.date}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 24 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24, marginTop: 8
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  addButton: {
    backgroundColor: '#ff4500', borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  addButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: {
    fontSize: 20, fontWeight: 'bold',
    color: '#ffffff', marginBottom: 12
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24 },
  categoryCard: {
    width: '30.6%', backgroundColor: '#1a1a1a',
    borderRadius: 16, padding: 18, alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  categoryEmoji: { fontSize: 36, marginBottom: 10 },
  categoryName: { color: '#ffffff', fontWeight: 'bold' },
  workoutItem: {
    backgroundColor: '#1a1a1a', borderRadius: 12,
    padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a2a'
  },
  workoutName: { color: '#ffffff', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  workoutMeta: { color: '#888888', fontSize: 13 }
});