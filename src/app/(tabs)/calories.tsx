import React from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, StyleSheet
} from 'react-native';

const meals = [
  { name: 'Oatmeal with Banana', calories: 350 },
  { name: 'Grilled Chicken Salad', calories: 480 },
  { name: 'Protein Shake', calories: 220 },
];

export default function Calories() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calories</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Add Meal</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today</Text>
        <Text style={styles.calorieText}>
          <Text style={styles.calorieNumber}>1,240</Text> of 2,000 kcal
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '62%' }]} />
        </View>
      </View>

      <View style={styles.macrosRow}>
        {[
          { label: 'Protein', value: '80g' },
          { label: 'Carbs', value: '140g' },
          { label: 'Fat', value: '45g' },
        ].map((macro) => (
          <View key={macro.label} style={styles.macroCard}>
            <Text style={styles.macroValue}>{macro.value}</Text>
            <Text style={styles.macroLabel}>{macro.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Today's Meals</Text>
      {meals.map((meal, i) => (
        <View key={i} style={styles.mealItem}>
          <Text style={styles.mealName}>{meal.name}</Text>
          <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 24 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  addButton: {
    backgroundColor: '#ff4500', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 16
  },
  addButtonText: { color: '#ffffff', fontWeight: 'bold' },
  card: {
    backgroundColor: '#1a1a1a', borderRadius: 16,
    padding: 20, marginBottom: 16
  },
  cardTitle: {
    fontSize: 18, fontWeight: 'bold',
    color: '#ffffff', marginBottom: 8
  },
  calorieText: { color: '#888888', marginBottom: 12 },
  calorieNumber: { color: '#ffffff', fontWeight: 'bold', fontSize: 20 },
  progressBar: {
    backgroundColor: '#2a2a2a', height: 8, borderRadius: 4
  },
  progressFill: {
    backgroundColor: '#ff4500', height: 8, borderRadius: 4
  },
  macrosRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  macroCard: {
    flex: 1, backgroundColor: '#1a1a1a',
    borderRadius: 12, padding: 16, alignItems: 'center'
  },
  macroValue: {
    color: '#ffffff', fontWeight: 'bold',
    fontSize: 18, marginBottom: 4
  },
  macroLabel: { color: '#888888', fontSize: 13 },
  sectionTitle: {
    fontSize: 18, fontWeight: 'bold',
    color: '#ffffff', marginBottom: 12
  },
  mealItem: {
    backgroundColor: '#1a1a1a', borderRadius: 12,
    padding: 16, marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between'
  },
  mealName: { color: '#ffffff' },
  mealCalories: { color: '#ff4500', fontWeight: 'bold' }
});