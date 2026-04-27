// src/idb-queue.js
import { openDB } from 'idb';

const DB_NAME = 'warmstore';
const DB_VERSION = 1;
const STORE = 'orders';

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export async function enqueueOrder(order, token = '') {
  const db = await getDB();
  await db.add(STORE, { data: order, token, createdAt: Date.now() });
}

export async function getAllOrders() {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function removeOrder(id) {
  const db = await getDB();
  return db.delete(STORE, id);
}
