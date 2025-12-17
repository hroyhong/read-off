import "server-only";

import fs from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { createEmptyDB, normalizeDBInPlace, type DB } from "./model";

const KEY = "read-off:db:v1";
const FILE_PATH = path.join(process.cwd(), "data.json");

function kvEnabled() {
  return !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;
}

export async function loadDB(): Promise<DB> {
  // 1) Prefer Vercel KV when configured
  if (kvEnabled()) {
    const existing = await kv.get<DB>(KEY);
    if (existing) {
      normalizeDBInPlace(existing);
      // 轻量级纠偏：把修正后的结果写回（避免脏数据反复出现）
      await kv.set(KEY, existing);
      return existing;
    }
    const db = createEmptyDB();
    await kv.set(KEY, db);
    return db;
  }

  // 2) Local dev fallback: data.json
  try {
    const raw = await fs.readFile(FILE_PATH, "utf-8");
    const db = JSON.parse(raw) as DB;
    normalizeDBInPlace(db);
    await fs.writeFile(FILE_PATH, JSON.stringify(db, null, 2));
    return db;
  } catch {
    const db = createEmptyDB();
    try {
      await fs.writeFile(FILE_PATH, JSON.stringify(db, null, 2));
    } catch {
      // ignore
    }
    return db;
  }
}

export async function saveDB(db: DB): Promise<void> {
  normalizeDBInPlace(db);

  if (kvEnabled()) {
    await kv.set(KEY, db);
    return;
  }

  await fs.writeFile(FILE_PATH, JSON.stringify(db, null, 2));
}


