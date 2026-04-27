import { openDB } from 'idb';
export const DB_NAME = 'pwa-store';
export async function getDB(){
  return openDB(DB_NAME, 1, {
    upgrade(db){
      if(!db.objectStoreNames.contains('cart')) db.createObjectStore('cart', { keyPath:'sku' });
      if(!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath:'id' });
    }
  });
}
export async function enqueue(action){
  const db = await getDB();
  const id = action.id || (Date.now() + '-' + Math.random().toString(36).slice(2,8));
  await db.put('queue', {...action, id});
  return id;
}
export async function getQueue(){ const db=await getDB(); return db.getAll('queue'); }
export async function removeFromQueue(id){ const db=await getDB(); return db.delete('queue', id); }
export async function clearQueue(){ const db=await getDB(); const keys = await db.getAllKeys('queue'); for(const k of keys) await db.delete('queue', k); }
