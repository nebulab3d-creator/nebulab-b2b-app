import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  isSupported,
  canSendNotifications,
  requestPermission,
  sendNotification,
} from './notifications';

interface MockNotification {
  addEventListener: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

describe('notifications module', () => {
  beforeEach(() => {
    // Reset window.Notification mock
    const win = global as unknown as Record<string, unknown>;
    delete win.Notification;
  });

  describe('isSupported', () => {
    it('returns false when Notification is not available', () => {
      expect(isSupported()).toBe(false);
    });

    it('returns true when Notification is available', () => {
      const win = global as unknown as Record<string, unknown>;
      win.Notification = {};
      expect(isSupported()).toBe(true);
    });
  });

  describe('canSendNotifications', () => {
    it('returns false when notifications not supported', () => {
      expect(canSendNotifications()).toBe(false);
    });

    it('returns false when permission is not granted', () => {
      const win = global as unknown as Record<string, unknown>;
      win.Notification = {
        permission: 'denied',
      };
      expect(canSendNotifications()).toBe(false);
    });

    it('returns true when supported and permission granted', () => {
      const win = global as unknown as Record<string, unknown>;
      win.Notification = {
        permission: 'granted',
      };
      expect(canSendNotifications()).toBe(true);
    });
  });

  describe('requestPermission', () => {
    it('returns denied when Notification not supported', async () => {
      const result = await requestPermission();
      expect(result).toBe('denied');
    });

    it('returns existing permission if not default', async () => {
      const win = global as unknown as Record<string, unknown>;
      win.Notification = {
        permission: 'granted',
        requestPermission: vi.fn(),
      };
      const result = await requestPermission();
      expect(result).toBe('granted');
    });
  });

  describe('sendNotification', () => {
    it('returns null when notifications not supported', () => {
      const result = sendNotification('Test', { body: 'test body' });
      expect(result).toBeNull();
    });

    it('returns null when permission not granted', () => {
      const win = global as unknown as Record<string, unknown>;
      win.Notification = {
        permission: 'denied',
      };
      const result = sendNotification('Test', { body: 'test body' });
      expect(result).toBeNull();
    });

    it('creates and returns notification when supported and granted', () => {
      const mockNotification: MockNotification = {
        addEventListener: vi.fn(),
        close: vi.fn(),
      };

      const win = global as unknown as Record<string, unknown>;
      win.Notification = vi.fn().mockReturnValue(mockNotification);
      (win.Notification as unknown as Record<string, unknown>).permission = 'granted';

      const result = sendNotification('Test Title', {
        body: 'Test Body',
        tag: 'test-tag',
      });

      expect(result).toBe(mockNotification);
      expect(win.Notification).toHaveBeenCalledWith(
        'Test Title',
        expect.objectContaining({
          body: 'Test Body',
          tag: 'test-tag',
          vibrate: [200],
        }),
      );
    });
  });
});
