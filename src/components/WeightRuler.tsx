import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Animated,
  NativeSyntheticEvent, NativeScrollEvent, LayoutChangeEvent,
} from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';

const ITEM_WIDTH = 10;      // px per `step` unit along the ruler
const TICK_AREA_HEIGHT = 34;
const MAJOR_HEIGHT = 30;
const MINOR_HEIGHT = 18;
const FINE_HEIGHT = 10;

interface Props {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  /** smallest increment the ruler snaps to */
  step: number;
  /** value interval for medium, unlabeled tick marks */
  minorStep: number;
  /** value interval for tall, labeled tick marks */
  majorStep: number;
  accentColor?: string;
  formatLabel?: (v: number) => string;
}

// true when `value` lands on (or within half a step of) a multiple of `multiple`
function isNearMultiple(value: number, multiple: number, tolerance: number): boolean {
  const nearest = Math.round(value / multiple) * multiple;
  return Math.abs(value - nearest) < tolerance;
}

export default function WeightRuler({
  value, onChange, min, max, step, minorStep, majorStep, accentColor, formatLabel,
}: Props) {
  const color = accentColor ?? COLORS.primary;
  const count = Math.round((max - min) / step) + 1;

  const [wrapWidth, setWrapWidth] = useState(0);
  const scrollRef = useRef<any>(null);
  const dragging = useRef(false);
  const didInit = useRef(false);

  const clamp = (v: number) => Math.min(Math.max(v, min), max);
  const valueToOffset = (v: number) => Math.round((clamp(v) - min) / step) * ITEM_WIDTH;

  useEffect(() => {
    if (dragging.current || !wrapWidth) return;
    scrollRef.current?.scrollTo({ x: valueToOffset(value), animated: didInit.current });
    didInit.current = true;
  }, [value, wrapWidth]);

  const handleLayout = (e: LayoutChangeEvent) => {
    setWrapWidth(e.nativeEvent.layout.width);
  };

  const commitFromOffset = (x: number) => {
    const index = Math.min(Math.max(Math.round(x / ITEM_WIDTH), 0), count - 1);
    const newValue = Math.round((min + index * step) * 100) / 100;
    if (newValue !== value) onChange(newValue);
  };

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    dragging.current = false;
    commitFromOffset(e.nativeEvent.contentOffset.x);
  };

  const handleScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    commitFromOffset(e.nativeEvent.contentOffset.x);
  };

  // Fires continuously while the finger is down (and through momentum) so the
  // pointer's value — and anything reading it, like the number readout above
  // the ruler — tracks the ruler live instead of only snapping once on release.
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!dragging.current) return;
    commitFromOffset(e.nativeEvent.contentOffset.x);
  };

  // Measure first so we know how much side padding centers the pointer —
  // rendering ticks before that would put them in the wrong place for a frame.
  if (!wrapWidth) {
    return <View style={styles.wrap} onLayout={handleLayout} />;
  }

  const sidePad = wrapWidth / 2;

  return (
    <View style={styles.wrap} onLayout={handleLayout}>
      <View pointerEvents="none" style={[styles.pointer, { left: sidePad - 1, backgroundColor: color }]} />
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: sidePad }}
        onScrollBeginDrag={() => { dragging.current = true; }}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
      >
        {Array.from({ length: count }, (_, i) => Math.round((min + i * step) * 100) / 100).map((v) => {
          const isMajor = isNearMultiple(v, majorStep, step / 2);
          const isMinor = !isMajor && isNearMultiple(v, minorStep, step / 2);
          const height = isMajor ? MAJOR_HEIGHT : isMinor ? MINOR_HEIGHT : FINE_HEIGHT;
          return (
            <View key={v} style={[styles.tickCol, { width: ITEM_WIDTH }]}>
              <View
                style={[
                  styles.tick,
                  {
                    height,
                    width: isMajor ? 2 : 1,
                    backgroundColor: isMajor ? color : COLORS.borderDefault,
                  },
                ]}
              />
              {isMajor && (
                <Text style={styles.tickLabel} numberOfLines={1}>
                  {formatLabel ? formatLabel(v) : Math.round(v)}
                </Text>
              )}
            </View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: TICK_AREA_HEIGHT + 18 },
  pointer: {
    position: 'absolute', top: 0, width: 2, height: TICK_AREA_HEIGHT,
    borderRadius: 1, zIndex: 2,
  },
  tickCol: { height: TICK_AREA_HEIGHT, alignItems: 'center', justifyContent: 'flex-end' },
  tick: { borderRadius: 1 },
  tickLabel: {
    position: 'absolute', top: TICK_AREA_HEIGHT + 2, width: 40, left: -19,
    textAlign: 'center', fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textMuted,
  },
});
