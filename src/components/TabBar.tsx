import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Platform, LayoutChangeEvent
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS, SPACING } from '@/constants/theme';

interface Props extends BottomTabBarProps {
  onPressCenter: () => void;
}

export default function TabBar({ state, descriptors, navigation, onPressCenter }: Props) {
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Measured in onLayout since the bar's width depends on screen width minus
  // the wrapper's side margins — tabs are evenly flexed, so each tab's slot
  // width is just barWidth / route count.
  const [barWidth, setBarWidth] = useState(0);
  const tabWidth = barWidth / state.routes.length;
  const slideAnim = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: state.index,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
    }).start();
  }, [state.index]);

  const onBarLayout = (e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width);

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
            <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFillObject} />
            <View style={styles.centerTint} />
            <LinearGradient
              colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.9, y: 0.95 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.centerIcon}>+</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <BlurView intensity={40} tint="light" style={styles.container} onLayout={onBarLayout}>
        {barWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.slider,
              {
                width: tabWidth - SPACING.sm * 2,
                transform: [
                  { translateX: Animated.add(Animated.multiply(slideAnim, tabWidth), SPACING.sm) },
                ],
              },
            ]}
          >
            <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFillObject} />
            <View style={styles.sliderTint} />
            <LinearGradient
              colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.9, y: 0.95 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
        )}
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

  // Glass pill that slides behind the active tab. Sized/positioned from
  // measured barWidth (see onBarLayout) since tabs are evenly flexed.
  slider: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  sliderTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primary + '26',
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
    // Fallback fill for platforms where BlurView has no real effect (older
    // Android, web) so the button still reads as solid rather than empty.
    backgroundColor: COLORS.primaryDark,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  // Sage tint over the blur — keeps the button's brand color readable as
  // "colored glass" instead of a flat frosted circle.
  centerTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primaryDark + '80',
  },
  centerIcon: {
    color: COLORS.textInverse,
    fontSize: 28,
    fontWeight: FONT_WEIGHTS.black,
    lineHeight: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
