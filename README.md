# LinkBridge Monitor

Leave a phone at home. Watch it from another phone when you are out.

No Base44 subscription. Free public site.

## Open this on both phones

https://berserkerloko1-coder.github.io/link-bridge-monitor/

Bookmark that link. Add it to the home screen if you want.

## How to use it when you leave

1. Plug in the home phone. Open the link above.
2. Tap **Use as Camera**, name it, start broadcasting.
3. Optional: tap **Hide screen** so the home phone looks asleep or like a normal home screen. Triple-tap to come back.
4. Keep that tab open. Do not lock the home phone. Screen can be dimmed with **Hide screen**.
5. When you are out, open the same link on your phone (Wi-Fi or cellular).
6. Tap **View a Camera** and enter the 6-character code (or use the copied viewer link). After the first time, **View last camera** connects in one tap.

## Keep the home phone alive (Galaxy / Android)

Chrome will kill a background camera tab. Do this once on the home phone:

1. Add the site to the home screen (Chrome menu → Add to Home screen).
2. Settings → Battery → Background usage limits → put Chrome (or the PWA) on **Unrestricted**.
3. Settings → Apps → Chrome → Battery → **Unrestricted**.
4. Leave the screen on. Plug in. Disable auto-lock or set it to 30 minutes while broadcasting.
5. Do not swipe the tab away. Hide screen is camouflage, not a closed tab.

The app now re-grabs the screen wake lock when Android releases it, and the camera PeerJS connection tries to reconnect if the signaling drop happens.

## Viewer

- **Split screen** — add up to four cameras. Stack in portrait, side-by-side in landscape, or a 2×2 grid.
- **Listen** — Voice / Bass / Treble / Night / Cut rumble. Toggles stack. Per-camera volume and mute.
- **Record on the phone you carry** — video of the focused camera, audio only, or the whole split view. Stills too. Clips stay in this browser until you download or delete them.
- **Hold Talk** — speak through the home phone speaker.
- **Lamp** — torch on cameras that support it.
- Saved codes, auto-reconnect, picture-in-picture, fullscreen.

The home phone is the camera. This website only introduces the two phones. Video goes over the internet so you can watch from outside the house.

Hide screen is for your own home camera so a visitor does not immediately see a live preview. It is not for recording other people in secret.

## Local code

```
C:\Users\allen\projects\link-bridge-monitor
```

```
npm install
npm test
npm run dev
```
