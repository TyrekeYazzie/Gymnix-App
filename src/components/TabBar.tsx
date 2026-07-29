import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS, SPACING } from '@/constants/theme';

interface Props extends BottomTabBarProps {
  onPressCenter: () => void;
}

export default function TabBar({ state, descriptors, navigation, onPressCenter }: Props) {
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleCenterPress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.85,
        damping: 10,
        stiffness: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 10,
        stiffness: 400,
        useNativeDriver: true,
      }),
    ]).start();
    onPressCenter();
  };

  // split tabs 2 left, 2 right
  const leftTabs = state.routes.slice(0, 2);
  const rightTabs = state.routes.slice(2, 4);

  const renderTab = (route: typeof state.routes[0], index: number, offset = 0) => {
    const actualIndex = index + offset;
    const { options } = descriptors[route.key];
    const isFocused = state.index === actualIndex;
    const label = options.title ?? route.name;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        style={styles.tab}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {options.tabBarIcon?.({
          color: isFocused ? COLORS.primary : COLORS.textMuted,
          size: 22,
          focused: isFocused,
        })}
        <Text style={[
          styles.tabLabel,
          { color: isFocused ? COLORS.primary : COLORS.textMuted }
        ]}>
          {label}
        </Text>
        {isFocused && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
      <BlurView intensity={40} tint="light" style={styles.container}>
        {/* Left tabs */}
        <View style={styles.tabGroup}>
          {leftTabs.map((route, i) => renderTab(route, i, 0))}
        </View>

        {/* Center + button */}
        <View style={styles.centerContainer}>
          <Animated.View style={[styles.centerButtonWrapper, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
              style={styles.centerButton}
              onPress={handleCenterPress}
              activeOpacity={0.9}
            >
              <Text style={styles.centerIcon}>+</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Right tabs */}
        <View style={styles.tabGroup}>
          {rightTabs.map((route, i) => renderTab(route, i, 2))}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    bottom: 0,
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: 'rgba(251, 248, 241, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(74, 107, 90, 0.22)',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    paddingTop: SPACING.sm,
    alignItems: 'center',
    height: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  tabGroup: {
    flex: 1,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    position: 'relative',
  },
  tabLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -SPACING.sm,
    width: 20,
    height: 2,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },

  // Center button
  centerContainer: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
  },
  centerButtonWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  centerIcon: {
    color: COLORS.textInverse,
    fontSize: 28,
    fontWeight: FONT_WEIGHTS.black,
    lineHeight: 32,
  },
});
