// Demo-mode storage: keeps everything in this browser's localStorage, so
// several tabs on the same device share it (open the staff page in one tab
// and the student page in another). Nothing leaves the device.
window.SS = window.SS || {};

SS.createLocalBackend = function () {
  const KEY = "stallsense-demo-v1";
  const KEEP_ORDERS_MS = 6 * 3600 * 1000;
  const KEEP_RECS_MS = 30 * 60 * 1000;
  const listeners = new Set();
  let memory = null; // fallback when localStorage is blocked

  function empty() {
    return { orders: {}, stalls: {}, recs: [] };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : memory || empty();
    } catch (e) {
      return memory || empty();
    }
  }

  function prune(s) {
    const now = Date.now();
    for (const [id, o] of Object.entries(s.orders)) {
      if (o.createdAt < now - KEEP_ORDERS_MS) delete s.orders[id];
    }
    s.recs = s.recs.filter((r) => r.at > now - KEEP_RECS_MS);
  }

  function snapshot() {
    const s = load();
    return { orders: Object.values(s.orders), stalls: s.stalls, recs: s.recs };
  }

  function notify() {
    const snap = snapshot();
    listeners.forEach((cb) => cb(snap));
  }

  function change(fn) {
    const s = load();
    fn(s);
    prune(s);
    memory = s;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) {
      /* kept in memory only */
    }
    notify();
    return Promise.resolve();
  }

  window.addEventListener("storage", (e) => {
    if (e.key === KEY) notify();
  });

  return {
    subscribe(cb) {
      listeners.add(cb);
      cb(snapshot());
      return () => listeners.delete(cb);
    },
    addOrder(order) {
      return change((s) => { s.orders[order.id] = Object.assign({}, order); });
    },
    markReady(id, at) {
      return change((s) => { if (s.orders[id]) s.orders[id].readyAt = at; });
    },
    heartbeat(stallId) {
      return change((s) => { s.stalls[stallId] = { lastSeen: Date.now() }; });
    },
    addRec(rec) {
      return change((s) => { s.recs.push(Object.assign({}, rec)); });
    },
    bulkAdd(orders) {
      return change((s) => { for (const o of orders) s.orders[o.id] = Object.assign({}, o); });
    },
    resetAll() {
      return change((s) => { s.orders = {}; s.stalls = {}; s.recs = []; });
    }
  };
};
