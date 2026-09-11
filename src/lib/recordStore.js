const DB_NAME = "lb-monitor";
const STORE = "recordings";
const VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This phone cannot keep recordings"));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Could not open recordings"));
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRecording({ blob, name, kind, code, mime }) {
  const db = await openDb();
  const record = {
    id: crypto.randomUUID(),
    name,
    kind,
    code: code || "",
    mime: mime || blob.type,
    createdAt: Date.now(),
    blob,
  };
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(record);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
  return {
    ...record,
    url: URL.createObjectURL(blob),
  };
}

export async function listRecordings() {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const rows = await requestToPromise(tx.objectStore(STORE).getAll());
  db.close();
  return (rows || [])
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .map((row) => ({
      ...row,
      url: URL.createObjectURL(row.blob),
    }));
}

export async function deleteRecording(id) {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
