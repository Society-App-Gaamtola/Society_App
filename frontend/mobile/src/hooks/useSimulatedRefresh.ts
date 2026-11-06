import { useCallback, useState } from 'react';

const REFRESH_MS = 800;

/** Pull-to-refresh state for lists whose data does not come from an API yet. */
export function useSimulatedRefresh() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    // TODO: reload the data from the API.
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), REFRESH_MS);
  }, []);

  return { refreshing, onRefresh };
}
