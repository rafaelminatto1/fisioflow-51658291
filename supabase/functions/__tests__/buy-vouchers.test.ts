import { test, expect, vi } from 'vitest';
import { handleCheckoutCompleted } from '../webhook-stripe/index.ts';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table) => ({
      select: vi.fn().mockResolvedValue({ data: [{ validity_days: 30 }], error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

// Mock Stripe
const mockStripe = {
  webhooks: {
    constructEvent: vi.fn(),
  },
};
vi.mock('stripe', () => ({
  default: vi.fn(() => mockStripe),
}));


test('handleCheckoutCompleted should process voucher purchases', async () => {
  const mockSession = {
    id: 'cs_test_123',
    metadata: {
      user_id: 'user_123',
      voucher_id: 'voucher_123',
    },
    amount_total: 5000,
    payment_intent: 'pi_123',
  };

  await handleCheckoutCompleted(mockSession);

  const supabase = createClient('url', 'key');
  expect(supabase.from).toHaveBeenCalledWith('vouchers_purchases');
  expect(supabase.from('vouchers_purchases').insert).toHaveBeenCalledWith(
    expect.objectContaining({
      user_id: 'user_123',
      voucher_id: 'voucher_123',
      stripe_checkout_session_id: 'cs_test_123',
    })
  );
});
