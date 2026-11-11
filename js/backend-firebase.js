// Cloud storage using Firebase Cloud Firestore. Every page listens live, so a
// change on a staff page reaches every student page within about a second.
// Uses the Firebase "compat" scripts, which store.js loads only when a config
// is set in config.js.
window.SS = window.SS || {};

SS.createFirebaseBackend = function (config) {
  const HOUR = 3600 * 1000;
  const app = firebase.initializeApp(config);
  const db = firebase.firestore(app);

  async function inChunks(items, fn) {
    for (let i = 0; i < items.length; i += 400) {
      const batch = db.batch();
      items.slice(i, i + 400).forEach((item) => fn(batch, item));
      await batch.commit();
    }
  }

  function strip(obj) {
    const copy = Object.assign({}, obj);
    delete copy.id;
    return copy;
  }

  return {
    subscribe(cb) {
      const orders = new Map();
      const recs = new Map();
      const stalls = {};
      const emit = () => cb({ orders: [...orders.values()], stalls: Object.assign({}, stalls), recs: [...recs.values()] });

      const unsubs = [
        db.collection("orders").where("createdAt", ">", Date.now() - 6 * HOUR).onSnapshot(
          (snap) => {
            snap.docChanges().forEach((ch) => {
              if (ch.type === "removed") orders.delete(ch.doc.id);
              else orders.set(ch.doc.id, Object.assign({ id: ch.doc.id }, ch.doc.data()));
            });
            emit();
          },
          (err) => console.error("orders listener", err)
        ),
        db.collection("stalls").onSnapshot(
          (snap) => {
            snap.docChanges().forEach((ch) => {
              if (ch.type === "removed") delete stalls[ch.doc.id];
              else stalls[ch.doc.id] = ch.doc.data();
            });
            emit();
          },
          (err) => console.error("stalls listener", err)
        ),
        db.collection("recs").where("at", ">", Date.now() - HOUR / 2).onSnapshot(
          (snap) => {
            snap.docChanges().forEach((ch) => {
              if (ch.type === "removed") recs.delete(ch.doc.id);
              else recs.set(ch.doc.id, Object.assign({ id: ch.doc.id }, ch.doc.data()));
            });
            emit();
          },
          (err) => console.error("recs listener", err)
        )
      ];
      return () => unsubs.forEach((u) => u());
    },

    // set() with a fixed id means sending the same change twice is harmless,
    // which matters when offline changes are re-sent after reconnecting.
    addOrder(order) {
      return db.collection("orders").doc(order.id).set(strip(order), { merge: true });
    },
    markReady(id, at) {
      return db.collection("orders").doc(id).set({ readyAt: at }, { merge: true });
    },
    heartbeat(stallId) {
      return db.collection("stalls").doc(stallId).set({ lastSeen: Date.now() }, { merge: true });
    },
    addRec(rec) {
      return db.collection("recs").doc(rec.id).set(strip(rec));
    },
    bulkAdd(list) {
      return inChunks(list, (batch, o) => batch.set(db.collection("orders").doc(o.id), strip(o)));
    },
    async resetAll() {
      for (const name of ["orders", "stalls", "recs"]) {
        const snap = await db.collection(name).get();
        await inChunks(snap.docs, (batch, d) => batch.delete(d.ref));
      }
    }
  };
};
