import React, { useCallback, useRef, useState } from 'react';
import { RefreshControl } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

// Pull-to-refresh for a screen's main ScrollView:
//   const refreshControl = usePullToRefresh(() => loadData());
//   <ScrollView refreshControl={refreshControl}>
// The spinner stays until the returned promise settles. `load` is read
// through a ref, so it can be a function defined further down the component.
export function usePullToRefresh(load: () => unknown) {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const loadRef = useRef(load);
  loadRef.current = load;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadRef.current();
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={theme.colors.primary}
      colors={[theme.colors.primary]}
    />
  );
}
