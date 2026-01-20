CREATE TABLE vouchers_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    voucher_id UUID NOT NULL REFERENCES vouchers(id),
    stripe_checkout_session_id TEXT NOT NULL,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vouchers_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to see their own voucher purchases" ON vouchers_purchases
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Allow service role to insert voucher purchases" ON vouchers_purchases
    FOR INSERT
    WITH CHECK (true);
