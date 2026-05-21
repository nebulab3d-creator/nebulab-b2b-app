/**
 * Web Notifications API wrapper
 * Provides cross-browser support for system notifications
 */

export function isSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!isSupported()) {
    return 'denied';
  }

  // Si ya tenemos permiso, no pedir de nuevo
  if (Notification.permission !== 'default') {
    return Notification.permission;
  }

  return Notification.requestPermission();
}

export interface NotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  vibrate?: VibratePattern;
}

export function sendNotification(
  title: string,
  options: NotificationOptions = {},
): Notification | null {
  if (!isSupported() || Notification.permission !== 'granted') {
    return null;
  }

  const notification = new Notification(title, {
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200],
    ...options,
  });

  // Refocus la ventana cuando hace click
  notification.addEventListener('click', () => {
    window.focus();
    notification.close();
  });

  return notification;
}

export function canSendNotifications(): boolean {
  return isSupported() && Notification.permission === 'granted';
}
