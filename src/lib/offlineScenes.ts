import { allSceneUrls } from '../components/figures/sceneImages';

// the cache of the service worker (public/sw.js)
const CACHE = 'teoriprove-v1';

/** Stores all scene pictures for offline use, one at a time, unless the device asks to save data. */
export async function cacheScenes(): Promise<void> {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData || !('caches' in window)) return;
  const cache = await caches.open(CACHE);
  for (const url of allSceneUrls()) {
    if (url.startsWith('data:') || await cache.match(url)) continue;
    await cache.add(url).catch(() => {});
  }
}
