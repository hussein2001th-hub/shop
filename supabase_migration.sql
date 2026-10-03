-- Migration for Debts App

-- 1. Create the customers table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    balance NUMERIC DEFAULT 0,
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy that allows all operations (Select, Insert, Update, Delete)
-- For a real production app, you might want to lock this down to authenticated users,
-- but since this is a Telegram Mini App without a separate auth system, we allow anon access.
CREATE POLICY "Allow all operations for anon" ON public.customers
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. Create a function to automatically update 'updated_at' on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Attach the trigger to the customers table
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
