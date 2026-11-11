// Offline sync for the staff page. Every change is saved on this device first,
// then sent to the store when connected. If the connection drops, changes
// wait here and are sent in order once it comes back.
window.SS = window.SS || {};

SS.createOutbox = function (store, key) {
  let items = read();
  let simulatedOffline = false;
  let flushing = false;
  const listeners = new Set();

  function read() {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch (e) {
      /* keep in memory only */
    }
    emit();
  }

  function emit() {
    listeners.forEach((cb) => cb());
  }

  function isConnected() {
    return !simulatedOffline && navigator.onLine;
  }

  function apply(op) {
    if (op.type === "add") return store.addOrder(op.order);
    if (op.type === "ready") return store.markReady(op.id, op.at);
    return Promise.resolve();
  }

  async function flush() {
    if (flushing || !isConnected()) return;
    flushing = true;
    try {
      while (items.length && isConnected()) {
        await apply(items[0]);
        items.shift();
        save();
      }
    } catch (err) {
      console.warn("Sync failed, will retry", err);
    } finally {
      flushing = false;
      emit();
    }
  }

  window.addEventListener("online", () => {
    emit();
    flush();
  });
  window.addEventListener("offline", emit);
  setInterval(flush, 5000);

  return {
    get items() {
      return items;
    },
    get simulatedOffline() {
      return simulatedOffline;
    },
    isConnected,
    push(op) {
      items.push(op);
      save();
      flush();
    },
    setSimulatedOffline(value) {
      simulatedOffline = value;
      emit();
      if (!value) flush();
    },
    onChange(cb) {
      listeners.add(cb);
    },
    flush
  };
};
