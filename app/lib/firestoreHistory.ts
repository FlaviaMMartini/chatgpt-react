import {
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
  limit
} from "firebase/firestore";
import { db } from "../api/chat/client";


export async function loadUserHistory(uid: string, maxItems = 200) {
  const col = collection(db, "users", uid, "memory");
  const q = query(col, orderBy("ts", "asc"), limit(maxItems));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function saveUserMessage(
  uid: string,
  role: "user" | "assistant",
  content: string
) {
  const col = collection(db, "users", uid, "memory");
  await addDoc(col, {
    role,
    content,
    ts: serverTimestamp(),
  });
}
