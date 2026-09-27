import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSoundStore = create()(
  persist(
    (set) => ({
      sounds: [],
      add: (sound) => set((s) => ({ sounds: [...s.sounds, { ...sound, id: Date.now() }] })),
      update: (id, patch) =>
        set((s) => ({ sounds: s.sounds.map((sound) => (sound.id === id ? { ...sound, ...patch } : sound)) })),
      clear: () => set({ sounds: [] }),
    }),
    { name: 'notification-sounds' }
  )
)
