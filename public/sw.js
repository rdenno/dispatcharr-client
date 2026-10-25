// Minimal service worker so browsers treat the app as installable.
// It only handles page navigations (to show an offline notice); API calls and
// stream playback go straight to the network untouched.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

const OFFLINE_PAGE = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dispatcharr</title>
<body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#14161c;color:#e8eaf0;font-family:system-ui,sans-serif;text-align:center;padding:24px">
<div><h1 style="font-size:20px">You're offline</h1><p style="color:#8b93a7">Dispatcharr needs a connection. Reconnect and try again.</p>
<button onclick="location.reload()" style="margin-top:12px;padding:10px 18px;border:0;border-radius:12px;background:#2fc5a8;font-weight:600">Retry</button></div>`;

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
    ),
  );
});
