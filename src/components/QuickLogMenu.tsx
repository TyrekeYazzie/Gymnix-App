import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  StyleSheet, Dimensions, Modal
} from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ORBS = [
  { key: 'workout',  label: 'Workout',  emoji: '💪', color: COLORS.primary },
  { key: 'cardio',   label: 'Cardio',   emoji: '🏃', color: COLORS.neonGreen },
  { key: 'water',    label: 'Water',    emoji: '💧', color: COLORS.neonBlue },
  { key: 'weight',   label: 'Weight',   emoji: '⚖️', color: COLORS.accent },
  { key: 'calories', label: 'Calories', emoji: '🔥', color: COLORS.neonYellow },
];

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
                style={[styles.orb, { borderColor: orb.color, shadowColor: orb.color }]}
                onPress={() => handleOrbPress(orb.key)}
                activeOpacity={0.8}
              >
                <Text style={styles.orbEmoji}>{orb.emoji}</Text>
              </TouchableOpacity>
              <Text style={[styles.orbLabel, { color: orb.color }]}>{orb.label}</Text>
            </Animated.View>
          );
        })}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bgOverlay,
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
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  orbEmoji: {
    fontSize: 24,
  },
  orbLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
