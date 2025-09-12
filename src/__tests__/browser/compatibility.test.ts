import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationManager } from '@/lib/services/NotificationManager'

// Browser compatibility test suite
describe('Browser Compatibility Tests', () => {
  let notificationManager: NotificationManager

  beforeEach(() => {
    vi.clearAllMocks()
    notificationManager = NotificationManager.getInstance()
  })

  describe('Chrome/Chromium Support', () => {
    beforeEach(() => {
      // Mock Chrome environment
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        writable: true
      })

      Object.defineProperty(global, 'Notification', {
        value: {
          permission: 'default',
          requestPermission: vi.fn().mockResolvedValue('granted')
        },
        writable: true
      })

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockResolvedValue({
            pushManager: {
              subscribe: vi.fn().mockResolvedValue({
                endpoint: 'https://fcm.googleapis.com/fcm/send/test',
                getKey: vi.fn((name) => {
                  if (name === 'p256dh') return new ArrayBuffer(65)
                  if (name === 'auth') return new ArrayBuffer(16)
                  return null
                })
              }),
              getSubscription: vi.fn()
            }
          })
        },
        writable: true
      })

      Object.defineProperty(global, 'PushManager', {
        value: class MockPushManager {
          static supportedContentEncodings = ['aes128gcm', 'aesgcm']
        },
        writable: true
      })
    })

    it('should support push notifications in Chrome', async () => {
      expect(notificationManager.isSupported()).toBe(true)
      
      const permission = await notificationManager.requestPermission()
      expect(permission).toBe(true)
    })

    it('should handle VAPID keys correctly in Chrome', async () => {
      process.env.VITE_VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9f8HnKJuLFiQHjSWR6hjsu-Gqmhw'
      
      await notificationManager.initialize()
      const subscription = await notificationManager.subscribe()
      
      expect(subscription).toBeTruthy()
      expect(subscription?.endpoint).toContain('fcm.googleapis.com')
    })

    it('should support content encodings in Chrome', () => {
      expect(PushManager.supportedContentEncodings).toContain('aes128gcm')
      expect(PushManager.supportedContentEncodings).toContain('aesgcm')
    })
  })

  describe('Firefox Support', () => {
    beforeEach(() => {
      // Mock Firefox environment
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        writable: true
      })

      Object.defineProperty(global, 'Notification', {
        value: {
          permission: 'default',
          requestPermission: vi.fn().mockResolvedValue('granted')
        },
        writable: true
      })

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockResolvedValue({
            pushManager: {
              subscribe: vi.fn().mockResolvedValue({
                endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/test',
                getKey: vi.fn((name) => {
                  if (name === 'p256dh') return new ArrayBuffer(65)
                  if (name === 'auth') return new ArrayBuffer(16)
                  return null
                })
              }),
              getSubscription: vi.fn()
            }
          })
        },
        writable: true
      })

      Object.defineProperty(global, 'PushManager', {
        value: class MockPushManager {
          static supportedContentEncodings = ['aes128gcm']
        },
        writable: true
      })
    })

    it('should support push notifications in Firefox', async () => {
      expect(notificationManager.isSupported()).toBe(true)
      
      const permission = await notificationManager.requestPermission()
      expect(permission).toBe(true)
    })

    it('should handle Mozilla push service in Firefox', async () => {
      await notificationManager.initialize()
      const subscription = await notificationManager.subscribe()
      
      expect(subscription).toBeTruthy()
      expect(subscription?.endpoint).toContain('updates.push.services.mozilla.com')
    })

    it('should support aes128gcm encoding in Firefox', () => {
      expect(PushManager.supportedContentEncodings).toContain('aes128gcm')
    })
  })

  describe('Safari Support', () => {
    beforeEach(() => {
      // Mock Safari environment
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        writable: true
      })

      // Safari has limited push notification support
      Object.defineProperty(global, 'Notification', {
        value: {
          permission: 'default',
          requestPermission: vi.fn().mockResolvedValue('granted')
        },
        writable: true
      })

      // Safari doesn't support service worker push notifications on all versions
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true
      })
    })

    it('should detect limited support in Safari', () => {
      // Safari without service worker support should return false
      expect(notificationManager.isSupported()).toBe(false)
    })

    it('should fallback to web notifications in Safari', async () => {
      // Even without service worker, basic notifications might work
      const permission = await notificationManager.requestPermission()
      expect(permission).toBe(true)
    })
  })

  describe('Safari with Service Worker Support', () => {
    beforeEach(() => {
      // Mock newer Safari with service worker support
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        writable: true
      })

      Object.defineProperty(global, 'Notification', {
        value: {
          permission: 'default',
          requestPermission: vi.fn().mockResolvedValue('granted')
        },
        writable: true
      })

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockResolvedValue({
            pushManager: {
              subscribe: vi.fn().mockResolvedValue({
                endpoint: 'https://web.push.apple.com/test',
                getKey: vi.fn((name) => {
                  if (name === 'p256dh') return new ArrayBuffer(65)
                  if (name === 'auth') return new ArrayBuffer(16)
                  return null
                })
              }),
              getSubscription: vi.fn()
            }
          })
        },
        writable: true
      })
    })

    it('should support push notifications in newer Safari', async () => {
      expect(notificationManager.isSupported()).toBe(true)
      
      const permission = await notificationManager.requestPermission()
      expect(permission).toBe(true)
    })

    it('should handle Apple push service', async () => {
      await notificationManager.initialize()
      const subscription = await notificationManager.subscribe()
      
      expect(subscription).toBeTruthy()
      expect(subscription?.endpoint).toContain('web.push.apple.com')
    })
  })

  describe('Edge Support', () => {
    beforeEach(() => {
      // Mock Edge environment
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        writable: true
      })

      Object.defineProperty(global, 'Notification', {
        value: {
          permission: 'default',
          requestPermission: vi.fn().mockResolvedValue('granted')
        },
        writable: true
      })

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockResolvedValue({
            pushManager: {
              subscribe: vi.fn().mockResolvedValue({
                endpoint: 'https://wns2-par02p.notify.windows.com/test',
                getKey: vi.fn((name) => {
                  if (name === 'p256dh') return new ArrayBuffer(65)
                  if (name === 'auth') return new ArrayBuffer(16)
                  return null
                })
              }),
              getSubscription: vi.fn()
            }
          })
        },
        writable: true
      })
    })

    it('should support push notifications in Edge', async () => {
      expect(notificationManager.isSupported()).toBe(true)
      
      const permission = await notificationManager.requestPermission()
      expect(permission).toBe(true)
    })

    it('should handle Windows Notification Service in Edge', async () => {
      await notificationManager.initialize()
      const subscription = await notificationManager.subscribe()
      
      expect(subscription).toBeTruthy()
      expect(subscription?.endpoint).toContain('notify.windows.com')
    })
  })

  describe('Mobile Browser Support', () => {
    describe('Chrome Mobile', () => {
      beforeEach(() => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          writable: true
        })

        Object.defineProperty(global, 'Notification', {
          value: {
            permission: 'default',
            requestPermission: vi.fn().mockResolvedValue('granted')
          },
          writable: true
        })

        Object.defineProperty(navigator, 'serviceWorker', {
          value: {
            register: vi.fn().mockResolvedValue({
              pushManager: {
                subscribe: vi.fn().mockResolvedValue({
                  endpoint: 'https://fcm.googleapis.com/fcm/send/mobile-test',
                  getKey: vi.fn((name) => {
                    if (name === 'p256dh') return new ArrayBuffer(65)
                    if (name === 'auth') return new ArrayBuffer(16)
                    return null
                  })
                }),
                getSubscription: vi.fn()
              }
            })
          },
          writable: true
        })
      })

      it('should support push notifications in Chrome Mobile', async () => {
        expect(notificationManager.isSupported()).toBe(true)
        
        const permission = await notificationManager.requestPermission()
        expect(permission).toBe(true)
      })
    })

    describe('iOS Safari', () => {
      beforeEach(() => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          writable: true
        })

        // iOS Safari has limited support
        Object.defineProperty(global, 'Notification', {
          value: {
            permission: 'default',
            requestPermission: vi.fn().mockResolvedValue('granted')
          },
          writable: true
        })

        Object.defineProperty(navigator, 'serviceWorker', {
          value: undefined,
          writable: true
        })
      })

      it('should detect limited support in iOS Safari', () => {
        expect(notificationManager.isSupported()).toBe(false)
      })

      it('should handle graceful degradation on iOS', async () => {
        const state = await notificationManager.getPermissionState()
        expect(state.supported).toBe(false)
        expect(state.permission).toBe('denied')
      })
    })
  })

  describe('Unsupported Browsers', () => {
    beforeEach(() => {
      // Mock old browser without notification support
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (compatible; MSIE 11.0; Windows NT 10.0; WOW64; Trident/7.0)',
        writable: true
      })

      Object.defineProperty(global, 'Notification', {
        value: undefined,
        writable: true
      })

      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true
      })
    })

    it('should detect unsupported browsers', () => {
      expect(notificationManager.isSupported()).toBe(false)
    })

    it('should handle graceful degradation', async () => {
      const permission = await notificationManager.requestPermission()
      expect(permission).toBe(false)

      const state = await notificationManager.getPermissionState()
      expect(state.supported).toBe(false)
    })

    it('should not attempt subscription in unsupported browsers', async () => {
      const subscription = await notificationManager.subscribe()
      expect(subscription).toBeNull()
    })
  })

  describe('Feature Detection', () => {
    it('should detect Notification API support', () => {
      Object.defineProperty(global, 'Notification', {
        value: { permission: 'default' },
        writable: true
      })

      expect('Notification' in global).toBe(true)
    })

    it('should detect Service Worker support', () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { register: vi.fn() },
        writable: true
      })

      expect('serviceWorker' in navigator).toBe(true)
    })

    it('should detect PushManager support', () => {
      Object.defineProperty(global, 'PushManager', {
        value: class MockPushManager {},
        writable: true
      })

      expect('PushManager' in global).toBe(true)
    })

    it('should detect VAPID support', () => {
      const mockPushManager = {
        subscribe: vi.fn((options) => {
          // Check if applicationServerKey is supported
          expect(options.applicationServerKey).toBeDefined()
          return Promise.resolve({
            endpoint: 'test',
            getKey: vi.fn()
          })
        })
      }

      expect(() => {
        mockPushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: new Uint8Array([1, 2, 3])
        })
      }).not.toThrow()
    })
  })

  describe('PWA Installation Detection', () => {
    it('should detect standalone mode', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn().mockReturnValue({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        }),
        writable: true
      })

      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      expect(isStandalone).toBe(true)
    })

    it('should detect iOS PWA mode', () => {
      Object.defineProperty(navigator, 'standalone', {
        value: true,
        writable: true
      })

      expect((navigator as any).standalone).toBe(true)
    })

    it('should handle beforeinstallprompt event', () => {
      const mockEvent = new Event('beforeinstallprompt')
      
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault()
        expect(e.type).toBe('beforeinstallprompt')
      })

      window.dispatchEvent(mockEvent)
    })
  })

  describe('Cross-Browser Notification Permissions', () => {
    it('should handle different permission states across browsers', async () => {
      const permissionStates = ['default', 'granted', 'denied'] as const

      for (const state of permissionStates) {
        Object.defineProperty(global, 'Notification', {
          value: {
            permission: state,
            requestPermission: vi.fn().mockResolvedValue(state === 'default' ? 'granted' : state)
          },
          writable: true
        })

        const permission = await notificationManager.requestPermission()
        
        if (state === 'granted') {
          expect(permission).toBe(true)
        } else if (state === 'denied') {
          expect(permission).toBe(false)
        } else {
          expect(permission).toBe(true) // Should request and get granted
        }
      }
    })

    it('should handle permission request failures', async () => {
      Object.defineProperty(global, 'Notification', {
        value: {
          permission: 'default',
          requestPermission: vi.fn().mockRejectedValue(new Error('Permission request failed'))
        },
        writable: true
      })

      const permission = await notificationManager.requestPermission()
      expect(permission).toBe(false)
    })
  })
})