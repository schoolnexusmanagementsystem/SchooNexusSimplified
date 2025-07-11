const CACHE_NAME = 'school-nexus-v1.0.0';
const RUNTIME_CACHE = 'school-nexus-runtime';
const OFFLINE_URL = '/offline.html';

// Resources to cache immediately
const STATIC_CACHE_URLS = [
  '/',
  '/login',
  '/dashboard',
  '/offline.html',
  '/manifest.json',
  // Add critical CSS and JS files
  '/static/css/main.css',
  '/static/js/main.js',
  // Add essential icons
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints that should be cached for offline access
const API_CACHE_URLS = [
  '/api/schools/public',
  '/api/auth/me'
];

// Install event - cache static resources
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      try {
        console.log('Service Worker: Installing...');
        
        const cache = await caches.open(CACHE_NAME);
        
        // Cache static resources with individual error handling
        const cachePromises = STATIC_CACHE_URLS.map(async url => {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
              console.log(`Cached: ${url}`);
            }
          } catch (error) {
            console.warn(`Failed to cache ${url}:`, error);
          }
        });
        
        await Promise.allSettled(cachePromises);
        
        // Force activation
        self.skipWaiting();
        
        console.log('Service Worker: Installation complete');
      } catch (error) {
        console.error('Service Worker: Installation failed:', error);
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      try {
        console.log('Service Worker: Activating...');
        
        // Clean up old caches
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
          .filter(cacheName => 
            cacheName !== CACHE_NAME && 
            cacheName !== RUNTIME_CACHE
          )
          .map(cacheName => {
            console.log(`Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          });
        
        await Promise.all(deletePromises);
        
        // Take control of all clients
        await self.clients.claim();
        
        console.log('Service Worker: Activation complete');
      } catch (error) {
        console.error('Service Worker: Activation failed:', error);
      }
    })()
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return;
  
  event.respondWith(handleFetch(request));
});

async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // Handle navigation requests (HTML pages)
    if (request.mode === 'navigate') {
      return await handleNavigationRequest(request);
    }
    
    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
      return await handleAPIRequest(request);
    }
    
    // Handle static assets
    if (url.pathname.startsWith('/static/') || 
        url.pathname.startsWith('/icons/') ||
        url.pathname.includes('.css') ||
        url.pathname.includes('.js') ||
        url.pathname.includes('.png') ||
        url.pathname.includes('.jpg') ||
        url.pathname.includes('.svg')) {
      return await handleStaticAsset(request);
    }
    
    // Default: network first, then cache
    return await networkFirst(request);
    
  } catch (error) {
    console.error('Fetch handler error:', error);
    return await handleOffline(request);
  }
}

// Navigation request handler - network first with offline fallback
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful navigation responses
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Navigation network failed, trying cache:', error);
    
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page as last resort
    return await caches.match(OFFLINE_URL) || new Response('Offline', { status: 503 });
  }
}

// API request handler - network first with cache fallback
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses for specific endpoints
      if (API_CACHE_URLS.some(pattern => url.pathname.includes(pattern))) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }
    
    throw new Error('API response not ok');
  } catch (error) {
    console.log('API network failed, trying cache:', error);
    
    // Try cache for safe requests (GET)
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Add offline indicator header
      const response = cachedResponse.clone();
      response.headers.set('X-Served-By', 'ServiceWorker-Cache');
      return response;
    }
    
    // Return error response for uncached API requests
    return new Response(
      JSON.stringify({
        error: 'Network unavailable',
        message: 'This feature requires an internet connection',
        offline: true
      }), 
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Static asset handler - cache first
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Serve from cache
    return cachedResponse;
  }
  
  try {
    // Fetch from network and cache
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Static asset fetch failed:', error);
    
    // Return placeholder or error response
    if (request.url.includes('.png') || request.url.includes('.jpg')) {
      // Return placeholder image for failed image requests
      return new Response('', { 
        status: 200, 
        headers: { 'Content-Type': 'image/svg+xml' }
      });
    }
    
    return new Response('Asset unavailable', { status: 404 });
  }
}

// Network first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Offline fallback handler
async function handleOffline(request) {
  if (request.mode === 'navigate') {
    const offlinePage = await caches.match(OFFLINE_URL);
    return offlinePage || new Response('You are offline', { status: 503 });
  }
  
  return new Response('Offline', { status: 503 });
}

// Handle background sync for when connection is restored
self.addEventListener('sync', event => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  try {
    // Sync pending data when connection is restored
    console.log('Performing background sync...');
    
    // Check if we can reach the server
    const response = await fetch('/api/health');
    if (response.ok) {
      // Broadcast to clients that we're back online
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'BACK_ONLINE',
          timestamp: Date.now()
        });
      });
    }
  } catch (error) {
    console.log('Background sync failed - still offline');
  }
}

// Handle push notifications
self.addEventListener('push', event => {
  console.log('Push notification received:', event);
  
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.message || 'You have a new notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: data.tag || 'default',
      renotify: true,
      requireInteraction: false,
      actions: [
        {
          action: 'open',
          title: 'Open App',
          icon: '/icons/action-open.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/action-dismiss.png'
        }
      ],
      data: {
        url: data.url || '/dashboard',
        timestamp: Date.now()
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'School Nexus', options)
    );
  } catch (error) {
    console.error('Error handling push notification:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    (async () => {
      try {
        // Try to focus existing window
        const clients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });
        
        const existingClient = clients.find(client => 
          client.url.includes(self.location.origin)
        );
        
        if (existingClient) {
          await existingClient.focus();
          existingClient.navigate(urlToOpen);
        } else {
          // Open new window
          await self.clients.openWindow(urlToOpen);
        }
      } catch (error) {
        console.error('Error handling notification click:', error);
      }
    })()
  );
});

// Handle messages from clients
self.addEventListener('message', event => {
  console.log('Service Worker received message:', event.data);
  
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'CACHE_URLS':
      event.waitUntil(cacheUrls(event.data.urls));
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(clearCaches());
      break;
  }
});

// Cache specific URLs on demand
async function cacheUrls(urls) {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.addAll(urls);
    console.log('URLs cached successfully:', urls);
  } catch (error) {
    console.error('Error caching URLs:', error);
  }
}

// Clear all caches
async function clearCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('All caches cleared');
  } catch (error) {
    console.error('Error clearing caches:', error);
  }
}

// Periodic background sync
self.addEventListener('periodicsync', event => {
  console.log('Periodic sync triggered:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(performPeriodicSync());
  }
});

async function performPeriodicSync() {
  try {
    console.log('Performing periodic sync...');
    
    // Sync critical data in the background
    const response = await fetch('/api/sync/critical');
    if (response.ok) {
      const data = await response.json();
      
      // Update cached data
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put('/api/sync/critical', new Response(JSON.stringify(data)));
      
      console.log('Periodic sync completed');
    }
  } catch (error) {
    console.log('Periodic sync failed:', error);
  }
}

console.log('Service Worker loaded:', CACHE_NAME);