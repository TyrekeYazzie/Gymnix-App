import { Tabs } from 'expo-router';
import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.bgSecondary,
          borderTopWidth: 0,
          height: SPACING.xxxl, // Increased from 85 to bigger for better touch targets
          paddingBottom: SPACING.lg,
          paddingTop: SPACING.xl,
          position: 'absolute', // Ensure it floats above content
        },
        tabBarActiveTintColorStyle: {
          fontSize: FONT_SIZES.md,
          fontWeight: FONT_WEIGHTS.semibold,
        },
        tabBarLabelStyle: {
          fontSize: FONT_SIZES.sm,
          fontWeight: FONT_WEIGHTS.semibold,
          color: '#ffffff',
          marginLeft: SPACING.xs,
          marginRight: SPACING.xs,
        },
        headerShown: false,
        tabBarButtonStyle: {
          paddingVertical: SPACING.sm, // Extra vertical padding for icons
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <Ionicons name="grid-outline" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
          tabBarIcon: ({ color }) => (
            <Ionicons name="barbell-outline" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calories"
        options={{
          title: 'Calories',
          tabBarIcon: ({ color }) => (
            <Ionicons name="nutrition-outline" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}