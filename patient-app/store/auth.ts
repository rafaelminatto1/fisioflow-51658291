// Re-export auth store from lib/firebase to maintain backward compatibility
export {
  useAuthStore,
  auth,
  db,
  storage,
  type User,
} from '@/lib/firebase';
