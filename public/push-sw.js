self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  const payload = event.data.json();

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: { linkPath: payload.linkPath ?? null },
      icon: '/favicon.ico',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const linkPath = event.notification.data?.linkPath;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          if (linkPath && 'navigate' in client) {
            client.navigate(linkPath);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(linkPath || '/');
      }
    }),
  );
});
