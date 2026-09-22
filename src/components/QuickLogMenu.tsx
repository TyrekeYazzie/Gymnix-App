import React, { useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  StyleSheet, Dimensions, Modal
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/context/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS, RADIUS, Theme, Colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function getOrbs(colors: Colors): { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] {
  return [
    { key: 'workout',  label: 'Workout',  icon: 'barbell-outline',   color: colors.primary },
    { key: 'cardio',   label: 'Cardio',   icon: 'heart-outline',     color: colors.neonGreen },
    { key: 'water',    label: 'Water',    icon: 'water-outline',     color: colors.neonBlue },
    { key: 'weight',   label: 'Weight',   icon: 'body-outline',      color: colors.accent },
    { key: 'calories', label: 'Calories', icon: 'nutrition-outline', color: colors.neonYellow },
  ];
}

const ARC_RADIUS = 145;
const START_ANGLE = 210;
const END_ANGLE = 330;

function getOrbPosition(index: number, total: number) {
  const angle = START_ANGLE + (index / (total - 1)) * (END_ANGLE - START_ANGLE);
  const rad = (angle * Math.PI) / 180;
  return {
    x: ARC_RADIUS * Math.cos(rad),
    y: ARC_RADIUS * Math.sin(rad),
  };
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (key: string) => void;
}

export default function QuickLogMenu({ visible, onClose, onSelect }: Props) {
  const { theme, isDark } = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const ORBS = useMemo(() => getOrbs(colors), [colors]);
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const orbAnims = useRef(ORBS.map(() => new Animated.Value(0))).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 15,
          stiffness: 300,
          useNativeDriver: true,
        }),
        ...orbAnims.map((anim, i) =>
          Animated.spring(anim, {
            toValue: 1,
            damping: 14,
            stiffness: 280,
            delay: i * 40,
            useNativeDriver: true,
          })
        ),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 0.8,
          damping: 15,
          stiffness: 300,
          useNativeDriver: true,
        }),
        ...orbAnims.map((anim) =>
          Animated.spring(anim, {
            toValue: 0,
            damping: 15,
            stiffness: 300,
            useNativeDriver: true,
          })
        ),
      ]).start();
    }
  }, [visible]);

  const handleOrbPress = (key: string) => {
    onClose();
    setTimeout(() => {
      onSelect(key);
    }, 250);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <View style={styles.orbsAnchor} pointerEvents="box-none">
        {ORBS.map((orb, i) => {
          const pos = getOrbPosition(i, ORBS.length);
          return (
            <Animated.View
              key={orb.key}
              style={[
                styles.orbWrapper,
                {
                  transform: [
                    {
                      translateX: orbAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, pos.x],
                      }),
                    },
                    {
                      translateY: orbAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, pos.y],
                      }),
                    },
                    {
                      scale: orbAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      }),
                    },
                  ],
                  opacity: orbAnims[i],
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.orb, { borderColor: orb.color }]}
                onPress={() => handleOrbPress(orb.key)}
                activeOpacity={0.8}
              >
                <BlurView intensity={45} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={[colors.glassHighlight, 'rgba(255,255,255,0)']}
                  start={{ x: 0.2, y: 0.05 }}
                  end={{ x: 0.85, y: 0.9 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name={orb.icon} size={24} color={orb.color} />
              </TouchableOpacity>
              <Text style={styles.orbLabel}>{orb.label}</Text>
            </Animated.View>
          );
        })}
      </View>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  const { colors } = theme;
  return StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bgOverlay,
  },
  orbsAnchor: {
    position: 'absolute',
    bottom: 72,
    left: SCREEN_WIDTH / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  orb: {
    width: 58,
    height: 58,
    borderRadius: RADIUS.full,
    // Fallback fill for platforms where BlurView has no real effect (older
    // Android, web) so the orb still reads as a solid button rather than
    // looking broken/transparent. Left uncolored (vs. a tinted wash) so the
    // circle reads as clear glass — the border + icon carry the category color.
    backgroundColor: colors.bgElevated + 'aa',
    overflow: 'hidden',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    // Neutral, minimal lift instead of a colored glow — keeps the glass look flat.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  orbLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0.5,
    marginTop: 6,
    color: colors.textOnOverlay,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  });
}
