// Uploaded audio files are too large for localStorage, so their raw bytes live in IndexedDB
// and saved sounds only keep the sample's id.
const DB_NAME = 'notification-samples'
const STORE = 'samples'

const openDb = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

const run = async (mode, action) => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = action(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(req?.result)
    tx.onerror = () => reject(tx.error)
  })
}

export const saveSample = (id, data) => run('readwrite', (store) => store.put(data, id))

export const loadSample = (id) => run('readonly', (store) => store.get(id))

export const deleteSamplesExcept = (keepIds) =>
  run('readwrite', (store) => {
    const req = store.getAllKeys()
    req.onsuccess = () => req.result.filter((id) => !keepIds.includes(id)).forEach((id) => store.delete(id))
  })
