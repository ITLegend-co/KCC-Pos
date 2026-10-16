// Deliberately do not cache pages, scripts, payment records, PDFs or Firebase traffic.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>KCC POS</title><body style="font:18px system-ui;padding:32px;background:#f4f6f2;color:#163c35"><h1>KCC POS</h1><p>Connect to the internet, then reopen KCC POS to access payments and treasury.</p><button onclick="location.reload()">Try again</button></body></html>',
    {status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}}
  )));
});
