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

  const renderTab = (route: typeof state.routes[0], index: number) => {
    const { options } = descriptors[route.key];
    const isFocused = state.index === index;
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

  // The log button floats above the bar as its own element instead of taking a tab
  // slot, so all 5 tabs split the row evenly with no odd-count asymmetry.
  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
      <View style={styles.centerFloating} pointerEvents="box-none">
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

      <BlurView intensity={40} tint="light" style={styles.container}>
        {state.routes.map((route, i) => renderTab(route, i))}
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

  // Floats above the pill bar, centered, independent of tab count/spacing
  centerFloating: {
    position: 'absolute',
    top: -32,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
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
