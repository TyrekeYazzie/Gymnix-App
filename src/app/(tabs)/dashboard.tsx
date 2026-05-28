import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

export default function DashboardScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good Morning!</Text>
        <Text style={styles.date}>Tuesday, January 16</Text>
      </View>

      <View style={[styles.statsCard, { backgroundColor: '#1a1a1a' }]}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Calories Consumed</Text>
          <Text style={styles.statValue}>1240 / 2000</Text>
          <View style={[styles.progressBar, { width: '60%', backgroundColor: '#2a2a2a' }]}>
            <View style={[styles.progressFill, { width: '62%', backgroundColor: '#ff4500' }]} />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Workouts This Week</Text>
          <Text style={styles.statValue}>3 / 4</Text>
          <View style={[styles.progressBar, { width: '75%', backgroundColor: '#2a2a2a' }]}>
            <View style={[styles.progressFill, { width: '75%', backgroundColor: '#ff4500' }]} />
          </View>
        </View>
      </View>

      <View style={styles.streakCard} numberOfLines={1}>
        <Text style={styles.streakNumber}>7</Text>
        <Text style={styles.streakEmoji}>🔥 Day Streak</Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Workouts</Text>
      </View>

      <View style={styles.recentWorkoutsList}>
        {[
          { name: 'Chest Day', category: 'Upper Body', date: 'Today' },
          { name: 'Leg Press', category: 'Lower Body', date: 'Yesterday' },
          { name: 'Back & Biceps', category: 'Pull Day', date: '2 days ago' },
        ].map((workout, index) => (
          <View key={index} style={[styles.workoutCard, { backgroundColor: '#1a1a1a' }]}>
            <Text style={styles.workoutName}>{workout.name}</Text>
            <Text style={styles.workoutCategory}>{workout.category}</Text>
            <Text style={styles.workoutDate}>{workout.date}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  date: {
    fontSize: 16,
    color: '#888888',
    marginTop: 4,
  },
  statsCard: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    marginBottom: 15,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  divider: {
    height: 16,
  },
  streakCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    marginBottom: 15,
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ff4500',
  },
  streakEmoji: {
    fontSize: 16,
    color: '#ffffff',
    marginTop: 4,
  },
  sectionHeader: {
    marginHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  recentWorkoutsList: {
    paddingHorizontal: 20,
  },
  workoutCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  workoutCategory: {
    fontSize: 13,
    color: '#ff4500',
    marginBottom: 4,
  },
  workoutDate: {
    fontSize: 12,
    color: '#888888',
  },
});