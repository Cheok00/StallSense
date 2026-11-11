# StallSense

A cloud-based website that shows students the live order count and estimated wait at campus food stalls, before they walk there.

Built for the APU Cloud Innovation Hackathon 2026, Track 1: Smart Campus & Student Experience.

> **Prototype:** the stalls and orders are simulated for the demo. StallSense collects no student information, only order numbers and times. It is not connected to APCard or any real APU system.

## Pages

| Page | Who uses it | What it does |
|---|---|---|
| `index.html` | Students | Every stall's orders waiting and estimated wait, "Pick a stall for me" and "Will I make it to class?" |
| `staff.html` | Stall staff | **New order** and **Order ready** buttons. Works offline and syncs when reconnected |
| `demo.html` | Demo | Loads a simulated lunch rush, runs a live rush, and runs the smart spreading test |

## How the wait is calculated

**Wait = (orders waiting + your order) ÷ orders the stall finished per minute in the last 10 minutes**

- Shown as a range (−20% to +30%), because it's an estimate.
- **Live**: measured from at least 3 orders finished in the last 10 minutes.
- **Estimate**: not enough recent orders, so it uses the stall's typical speed.
- **Recent report**: no update from the stall for over 2 minutes.
- **Estimate unavailable**: no update for over 15 minutes, so no number is shown.

The code is in `js/estimate.js`.

## What makes it different

- **Smart spreading** (`js/estimate.js` → `recommend`): when a student asks where to eat, StallSense counts students it has already sent to each stall. That stops everyone being sent to the same "shortest" queue. The demo page compares it with a plain shortest-queue app on the same simulated rush.
- **Will I make it?**: uses the longer end of the wait range, plus walking and eating time, to say whether there's time before class.
- **Offline sync** (`js/outbox.js`): the staff page saves every change on the device first, then sends it when connected. If the connection drops, nothing is lost, and students see "Last updated X min ago" instead of a wrong number.

## Try it

- **Online:** open the demo link (GitHub Pages, see below).
- **On your computer:** download the repository (**Code → Download ZIP**), unzip the folder first, then double-click `index.html`. No server or install is needed.
- **First time:** open `demo.html` and click **Load lunch rush data**, otherwise every stall shows "Estimate unavailable".

Without Firebase set up, it runs in **demo mode**: data stays in your browser and is shared between tabs on the same device. Open the staff page in one tab and the student page in another to see updates move between them.

## Connect the cloud (Firebase Firestore)

1. Go to https://console.firebase.google.com and create a project (Google Analytics isn't needed).
2. **Build → Firestore Database → Create database**. Pick the `asia-southeast1` (Singapore) location and start in **production mode**.
3. In Firestore, open the **Rules** tab, paste in the contents of `firestore.rules`, and click **Publish**.
4. **Project settings → General → Your apps → Web (`</>`)**. Register the app (no hosting needed), and copy the `firebaseConfig` object.
5. Paste it into `js/config.js` in place of `null`, so it reads `window.STALLSENSE_FIREBASE_CONFIG = { apiKey: "...", ... };`.

The Firebase web config is meant to be public. The Firestore rules are what protect the data.

Once configured, every page shows **Cloud connected**, and changes reach every device live. Add `?mode=local` to any page address to use demo mode instead.

## Put it online (GitHub Pages)

1. Create a public GitHub repository. On its page, click **uploading an existing file**, then drag in everything inside this folder, so `index.html` is at the top level, and click **Commit changes**.
2. In the repository, open **Settings → Pages**, set **Source** to **Deploy from a branch**, choose `main` and `/ (root)`, and save.
3. After a minute or two, the site is live at `https://<username>.github.io/<repository>/`. Use that as the demo link.

## Demo script

1. Open `demo.html` and click **Load lunch rush data**.
2. Open `index.html` on a phone: every stall shows a live wait. Try **Pick a stall for me** and **Will I make it to class?**
3. Open `staff.html?stall=noodles` on another device. Tap **+ New order** and watch the student page update.
4. Stop the live rush if it's running. Tap **Simulate disconnect** on the staff page and add a few orders: they show "not synced yet". After 2 minutes, the student page shows "Recent report, last updated 2 min ago". Tap **Reconnect** and everything syncs.
5. On `demo.html`, click **Run test** to compare smart spreading with a plain shortest-queue app.

## Limits

- Order data is simulated. A real rollout would need stalls to record orders, or a connection to their existing ordering system.
- The smart spreading test assumes every student follows the app, everyone walks the same time, and stalls work at a steady speed.
- The prototype rules let anyone with the link write data. Real use would need staff sign-in.

## Project structure

```text
index.html          student page
staff.html          staff page
demo.html           simulator and smart spreading test
css/style.css       styles, light and dark
js/config.js        Firebase config (null = demo mode)
js/stalls.js        sample stalls
js/estimate.js      wait calculation, smart spreading, "Will I make it?"
js/store.js         chooses cloud or demo storage
js/backend-local.js demo storage (this browser only)
js/backend-firebase.js  cloud storage (Firestore, live updates)
js/outbox.js        offline saving and sync for the staff page
js/spread.js        smart spreading test
firestore.rules     Firestore security rules for the prototype
```
