import { useRef } from 'react';
import { PanResponder, Dimensions } from 'react-native';
import { useRouter, useSegments } from 'expo-router';

// order matches the tab bar left-to-right (the center "+" button isn't a real tab)
const TAB_ORDER = ['dashboard', 'workouts', 'calendar', 'calories', 'profile'];

// swipe must start within this many px of the left/right screen edge,
// so it doesn't fight with horizontal scrollers (chips, charts) elsewhere on screen
const EDGE_ZONE = 32;
const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 0.4;

// Attach the returned panHandlers to a screen's outermost view to let the user
// swipe left/right from the screen edge to move to the previous/next tab.
// Page-flip convention: dragging left pulls in the next tab (to the right in the
// bar), dragging right pulls in the previous tab (to the left in the bar).
export function useSwipeTabs() {
  const router = useRouter();
  const segments = useSegments();

  // PanResponder below is only ever built once (via useRef), so its callbacks would
  // otherwise close over whatever `segments` was on the very first render and never
  // see updates. Route through a ref, kept fresh every render, so gesture-release
  // always reads the actual current tab instead of a frozen one.
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;

  const startX = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (evt) => {
        startX.current = evt.nativeEvent.pageX;
        return false;
      },
      onMoveShouldSetPanResponderCapture: (_, gesture) => {
        const { width } = Dimensions.get('window');
        const startedAtEdge = startX.current < EDGE_ZONE || startX.current > width - EDGE_ZONE;
        return startedAtEdge && Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5;
      },
      onPanResponderRelease: (_, gesture) => {
        const currentSegments = segmentsRef.current;
        const currentTab = currentSegments[currentSegments.length - 1];
        const currentIndex = TAB_ORDER.indexOf(currentTab);
        if (currentIndex === -1) return;

        const swipedLeft = gesture.dx < -SWIPE_DISTANCE || gesture.vx < -SWIPE_VELOCITY;
        const swipedRight = gesture.dx > SWIPE_DISTANCE || gesture.vx > SWIPE_VELOCITY;

        if (swipedLeft && currentIndex < TAB_ORDER.length - 1) {
          router.navigate(`/${TAB_ORDER[currentIndex + 1]}` as any);
        } else if (swipedRight && currentIndex > 0) {
          router.navigate(`/${TAB_ORDER[currentIndex - 1]}` as any);
        }
      },
    })
  ).current;

  return panResponder.panHandlers;
}
