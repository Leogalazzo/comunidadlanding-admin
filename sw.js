// Service Worker del Panel Admin - Comunidad Emprendedora
// Cachea únicamente el "shell" de la app (HTML/JS/CSS/íconos propios).
// Todo lo que va a Firebase, Cloudinary, Google Fonts, etc. se deja pasar
// directo a la red: los datos del panel siempre tienen que estar frescos.

const CACHE_NAME = 'ce-admin-cache-v2';

const APP_SHELL = [
    '/admin',
    '/admin.js',
    '/manifest.json',
    '/web-app-manifest-192x192.png',
    '/web-app-manifest-512x512.png'
];

// Instalación: precachea el shell de la app.
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

// Activación: borra caches de versiones anteriores.
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((nombres) =>
            Promise.all(
                nombres
                    .filter((nombre) => nombre !== CACHE_NAME)
                    .map((nombre) => caches.delete(nombre))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch: solo intervenimos pedidos al propio origen (mismo dominio).
// Todo pedido externo (Firebase, Firestore, Cloudinary, fuentes, CDNs)
// se ignora y sigue el camino normal a la red.
self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') return;
    if (new URL(request.url).origin !== self.location.origin) return;

    // Network-first para el HTML, así el admin siempre ve la versión más
    // nueva del panel apenas tenga conexión; si no hay red, cae al cache.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((respuesta) => {
                    const copia = respuesta.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));
                    return respuesta;
                })
                .catch(() => caches.match(request).then((r) => r || caches.match('/admin')))
        );
        return;
    }

    // Cache-first (con actualización en segundo plano) para el resto de
    // los archivos propios del shell (js, íconos, etc.).
    event.respondWith(
        caches.match(request).then((cacheado) => {
            const fetchPromise = fetch(request)
                .then((respuesta) => {
                    if (respuesta && respuesta.ok) {
                        const copia = respuesta.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));
                    }
                    return respuesta;
                })
                .catch(() => cacheado);
            return cacheado || fetchPromise;
        })
    );
});
