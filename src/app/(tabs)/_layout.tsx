import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import GymnixIcon from '@/components/GymnixIcon';
import TabBar from '@/components/TabBar';
import QuickLogMenu from '@/components/QuickLogMenu';
import WorkoutLog from '@/components/logs/WorkoutLog';
import CardioLog from '@/components/logs/CardioLog';
import WaterLog from '@/components/logs/WaterLog';
import WeightLog from '@/components/logs/WeightLog';
import CaloriesLog from '@/components/logs/CaloriesLog';
import { emitLogsChanged } from '@/lib/logEvents';

export default function TabLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [workoutLogOpen, setWorkoutLogOpen] = useState(false);
  const [cardioLogOpen, setCardioLogOpen] = useState(false);
  const [waterLogOpen, setWaterLogOpen] = useState(false);
  const [weightLogOpen, setWeightLogOpen] = useState(false);
  const [caloriesLogOpen, setCaloriesLogOpen] = useState(false);

  const handleOrbSelect = (key: string) => {
    if (key === 'workout') setWorkoutLogOpen(true);
    if (key === 'cardio')   setCardioLogOpen(true)
    if (key === 'water')    setWaterLogOpen(true)
    if (key === 'weight')   setWeightLogOpen(true)
    if (key === 'calories') setCaloriesLogOpen(true)
  };

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <TabBar
            {...props}
            onPressCenter={() => setMenuOpen(true)}
          />
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => (
              <GymnixIcon name="dashboard" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="workouts"
          options={{
            title: 'Workouts',
            tabBarIcon: ({ color }) => (
              <GymnixIcon name="workouts" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color }) => (
              <GymnixIcon name="calendar" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="calories"
          options={{
            title: 'Calories',
            tabBarIcon: ({ color }) => (
              <GymnixIcon name="calories" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => (
              <GymnixIcon name="profile" size={24} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* Quick log orb menu */}
      <QuickLogMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={handleOrbSelect}
      />

      {/* Workout log modal — opens from orb or workouts tab */}
      <WorkoutLog
        visible={workoutLogOpen}
        onClose={() => setWorkoutLogOpen(false)}
        onSaved={emitLogsChanged}
      />
      <CardioLog
      visible={cardioLogOpen}
      onClose={() => setCardioLogOpen(false)}
      onSaved={emitLogsChanged}
      />
      <WaterLog
      visible={waterLogOpen}
      onClose={() => setWaterLogOpen(false)}
      onSaved={emitLogsChanged}
      />
      <WeightLog
      visible={weightLogOpen}
      onClose={() => setWeightLogOpen(false)}
      onSaved={emitLogsChanged}
      />
      <CaloriesLog
      visible={caloriesLogOpen}
      onClose={() => setCaloriesLogOpen(false)}
      onSaved={emitLogsChanged}
      />
    </>
  );
}