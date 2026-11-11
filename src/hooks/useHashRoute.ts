import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_ROUTE, NAV_ITEMS, type RouteId } from '../config/navigation';

function readRoute(): RouteId {
  const id = window.location.hash.replace(/^#\/?/, '');
  return NAV_ITEMS.some((item) => item.id === id) ? (id as RouteId) : DEFAULT_ROUTE;
}

/** Tiny hash router — avoids adding a routing dependency. */
export function useHashRoute(): [RouteId, (route: RouteId) => void] {
  const [route, setRoute] = useState<RouteId>(readRoute);

  useEffect(() => {
    const onChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: RouteId) => {
    window.location.hash = `/${next}`;
  }, []);

  return [route, navigate];
}
