// Service Worker for Daily Scheduler App
// Enables offline functionality

const CACHE_NAME = 'daily-scheduler-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/css/dark-mode.css',
    '/css/ios-styles.css',
    '/js/app.js',
    '/js/db.js',
    '/js/ui.js',
    '/js/notifications.js',
    '/js/ios-integration.js',
    '/manifest.json',
    '/images/icons/app-icon.svg',
    '/images/splashscreens/splash.svg',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache assets
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching files');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activated');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Clearing old cache', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    
    // Ensure the service worker takes control immediately
    return self.clients.claim();
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached response if found
                if (response) {
                    return response;
                }
                
                // Otherwise try to fetch from network
                return fetch(event.request)
                    .then(response => {
                        // Don't cache if not a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response
                        const responseToCache = response.clone();
                        
                        // Open cache and add the new response
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(error => {
                        console.error('Fetch failed:', error);
                        // Return a custom offline page if appropriate
                        // For now, just throw the error
                        throw error;
                    });
            })
    );
});

// Handle notifications in the background
self.addEventListener('push', event => {
    console.log('Service Worker: Push received');
    
    const title = 'Task Reminder';
    const options = {
        body: event.data ? event.data.text() : 'Time for your scheduled task!',
        icon: '/images/icons/app-icon.svg',
        vibrate: [100, 50, 100],
        badge: '/images/icons/app-icon.svg',
        actions: [
            {
                action: 'complete',
                title: 'Mark Complete',
                icon: '/images/icons/app-icon.svg'
            },
            {
                action: 'snooze',
                title: 'Snooze',
                icon: '/images/icons/app-icon.svg'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification click received', event.action);
    
    // Get task ID from the notification data
    const taskId = event.notification.data?.taskId;
    console.log('Task ID from notification:', taskId);
    
    // Close the notification right away
    event.notification.close();
    
    // Handle action button clicks
    if (event.action === 'complete') {
        // Mark task as complete
        const completeUrl = `/?complete=${taskId}`;
        
        // First try to find an existing window and send a message
        event.waitUntil(
            clients.matchAll({ type: 'window' })
                .then(clientList => {
                    // Try to use existing clients first
                    if (clientList.length > 0) {
                        // Send message to clients to handle the task completion
                        clientList.forEach(client => {
                            client.postMessage({
                                type: 'NOTIFICATION_ACTION',
                                action: 'complete',
                                taskId: taskId
                            });
                        });
                        
                        // Focus the first visible client
                        const visibleClient = clientList.find(client => client.visibilityState === 'visible');
                        if (visibleClient) {
                            return visibleClient.focus();
                        }
                        return clientList[0].focus();
                    }
                    
                    // If no clients, open a new window with the complete URL
                    return clients.openWindow(completeUrl);
                })
        );
        return;
    } 
    else if (event.action === 'snooze') {
        // Snooze the notification
        const snoozeUrl = `/?snooze=${taskId}`;
        
        // Similar approach as for complete action
        event.waitUntil(
            clients.matchAll({ type: 'window' })
                .then(clientList => {
                    if (clientList.length > 0) {
                        // Send message to clients to handle the snooze action
                        clientList.forEach(client => {
                            client.postMessage({
                                type: 'NOTIFICATION_ACTION',
                                action: 'snooze',
                                taskId: taskId
                            });
                        });
                        
                        const visibleClient = clientList.find(client => client.visibilityState === 'visible');
                        if (visibleClient) {
                            return visibleClient.focus();
                        }
                        return clientList[0].focus();
                    }
                    
                    return clients.openWindow(snoozeUrl);
                })
        );
        return;
    }
    
    // Default action - Clicked on the notification body
    // Try to find and focus an existing window, or open a new one
    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then(clientList => {
                // If we have task ID, send message to highlight the task
                if (taskId) {
                    clientList.forEach(client => {
                        client.postMessage({
                            type: 'NOTIFICATION_CLICKED',
                            taskId: taskId
                        });
                    });
                }
                
                // Focus an existing window
                if (clientList.length > 0) {
                    // Try to find an already visible window to focus
                    const visibleClient = clientList.find(client => client.visibilityState === 'visible');
                    if (visibleClient) {
                        return visibleClient.focus();
                    }
                    
                    // Otherwise use the first window
                    return clientList[0].focus();
                }
                
                // If no windows found, open a new one
                return clients.openWindow(taskId ? `/?task=${taskId}` : '/');
            })
    );
});

// Add support for iOS interaction with notifications in the service worker
self.addEventListener('message', event => {
    console.log('Service Worker: Message received', event.data);
    
    // Handle showing notifications from iOS devices
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        console.log('Service Worker: Showing notification from iOS device');
        
        const task = event.data.task;
        
        // Create and show a notification
        self.registration.showNotification('Task Reminder', {
            body: task.title,
            icon: event.data.icon || '/images/icons/app-icon.svg',
            tag: `task-${task.id}`,
            requireInteraction: true,
            data: { taskId: task.id },
            actions: [
                {
                    action: 'complete',
                    title: 'Complete',
                    icon: '/images/icons/app-icon.svg'
                },
                {
                    action: 'snooze',
                    title: 'Remind Later',
                    icon: '/images/icons/app-icon.svg'
                }
            ]
        });
        
        // Find the client that sent the message and send a confirmation
        event.waitUntil(
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'NOTIFICATION_SHOWN',
                        taskId: task.id,
                        success: true
                    });
                });
            })
        );
    }
    
    // Handle initialization of iOS push notifications
    else if (event.data && event.data.type === 'INIT_IOS_PUSH') {
        // iOS devices need special handling for push notifications
        console.log('Service Worker: iOS push notification initialization');
        // Acknowledge receipt
        if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ success: true });
        } else {
            // Find the client that sent the message and send a confirmation
            event.waitUntil(
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({
                            type: 'INIT_IOS_PUSH_RESPONSE', 
                            success: true
                        });
                    });
                })
            );
        }
    }
});
