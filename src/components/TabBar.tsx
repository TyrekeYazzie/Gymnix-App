import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Platform
} from 'react-native';
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
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDefault,
    paddingTop: SPACING.sm,
    alignItems: 'center',
    height: 70,
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
    fontFamily: 'monospace',
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
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
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
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: FONT_WEIGHTS.black,
    lineHeight: 32,
  },
});