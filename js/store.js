// Picks where data is stored: Firebase (cloud) when configured, otherwise
// this browser only (demo mode). Every page talks to the same small API:
//
//   subscribe(callback) -> unsubscribe     callback({ orders, stalls, recs })
//   addOrder(order)      markReady(id, at)  heartbeat(stallId)
//   addRec(rec)          bulkAdd(orders)    resetAll()
window.SS = window.SS || {};

(function () {
  const FIREBASE_VERSION = "10.12.2";
  const config = window.STALLSENSE_FIREBASE_CONFIG;
  const params = new URLSearchParams(location.search);
  const useCloud = Boolean(config) && params.get("mode") !== "local";

  SS.MODE = useCloud ? "cloud" : "local";

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Could not load ${src}`));
      document.head.appendChild(s);
    });
  }

  let storePromise = null;

  SS.getStore = function () {
    if (!storePromise) {
      if (useCloud) {
        const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
        storePromise = loadScript(`${base}/firebase-app-compat.js`)
          .then(() => loadScript(`${base}/firebase-firestore-compat.js`))
          .then(() => SS.createFirebaseBackend(config))
          .catch((err) => {
            console.error("Cloud unavailable, using demo mode", err);
            SS.MODE = "local";
            return SS.createLocalBackend();
          });
      } else {
        storePromise = Promise.resolve(SS.createLocalBackend());
      }
    }
    return storePromise;
  };

  SS.modeBadge = function () {
    return SS.MODE === "cloud"
      ? `<span class="badge badge-cloud">Cloud connected</span>`
      : `<span class="badge">Demo mode: data stays in this browser</span>`;
  };
})();
