// The rendered 3D pictures of road situations. Vite gives each a hashed URL, or inlines it in the single-file build.
const urls = import.meta.glob<string>('../../assets/scenes/*.webp', { eager: true, query: '?url', import: 'default' });

export const sceneUrl = (id: string): string => urls[`../../assets/scenes/${id}.webp`] ?? '';

export const allSceneUrls = (): string[] => Object.values(urls);
