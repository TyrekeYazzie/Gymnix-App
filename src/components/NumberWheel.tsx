import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS } from '@/constants/theme';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

interface Props {
  options: number[];
  value: number;
  onChange: (value: number) => void;
  width?: number;
  accentColor?: string;
  formatLabel?: (v: number) => string;
}

export default function NumberWheel({ options, value, onChange, width = 90, accentColor, formatLabel }: Props) {
  const color = accentColor ?? COLORS.primary;
  const initialIndex = Math.max(options.indexOf(value), 0);
  const scrollY = useRef(new Animated.Value(initialIndex * ITEM_HEIGHT)).current;
  const scrollRef = useRef<any>(null);
  const dragging = useRef(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (dragging.current || editing) return;
    const idx = options.indexOf(value);
    if (idx < 0) return;
    scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
  }, [value]);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    dragging.current = false;
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.min(Math.max(Math.round(y / ITEM_HEIGHT), 0), options.length - 1);
    onChange(options[index]);
  };

  const startEditing = () => {
    setDraft(String(value));
    setEditing(true);
  };

  const commitEdit = () => {
    const num = parseInt(draft, 10);
    if (!isNaN(num)) {
      const clamped = Math.min(Math.max(num, options[0]), options[options.length - 1]);
      onChange(clamped);
    }
    setEditing(false);
  };

  return (
    <View style={[styles.wrap, { width }]}>
      <Pressable onPress={startEditing} style={[styles.highlight, { borderColor: color + '88', backgroundColor: color + '14' }]}>
        {editing && (
          <TextInput
            style={styles.editInput}
            value={draft}
            onChangeText={(t) => setDraft(t.replace(/[^0-9]/g, ''))}
            onBlur={commitEdit}
            onSubmitEditing={commitEdit}
            keyboardType="number-pad"
            autoFocus
            selectTextOnFocus
            maxLength={4}
          />
        )}
      </Pressable>
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: PADDING }}
        onScrollBeginDrag={() => { dragging.current = true; }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScrollEnd}
      >
        {options.map((opt, index) => {
          const inputRange = [
            (index - 2) * ITEM_HEIGHT,
            (index - 1) * ITEM_HEIGHT,
            index * ITEM_HEIGHT,
            (index + 1) * ITEM_HEIGHT,
            (index + 2) * ITEM_HEIGHT,
          ];
          const opacity = scrollY.interpolate({ inputRange, outputRange: [0.25, 0.55, 1, 0.55, 0.25], extrapolate: 'clamp' });
          const scale = scrollY.interpolate({ inputRange, outputRange: [0.8, 0.9, 1.15, 0.9, 0.8], extrapolate: 'clamp' });
          return (
            <View key={opt} style={styles.item}>
              <Animated.Text style={[styles.itemText, { opacity, transform: [{ scale }] }]}>
                {formatLabel ? formatLabel(opt) : opt}
              </Animated.Text>
            </View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: WHEEL_HEIGHT, overflow: 'hidden' },
  highlight: {
    position: 'absolute', left: 0, right: 0, top: PADDING,
    height: ITEM_HEIGHT, borderTopWidth: 1, borderBottomWidth: 1,
    borderRadius: RADIUS.sm, zIndex: 1, alignItems: 'center', justifyContent: 'center',
  },
  editInput: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    textAlign: 'center', fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary, backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.sm,
  },
  item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
});
