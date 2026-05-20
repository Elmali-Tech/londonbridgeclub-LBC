-- Server-side helpers for opportunity interest reads/writes under custom auth.
-- API routes validate the app session before calling these SECURITY DEFINER RPCs.

CREATE OR REPLACE FUNCTION public.list_opportunity_interests_for_crm()
RETURNS TABLE (
  id INTEGER,
  user_id INTEGER,
  opportunity_id INTEGER,
  customer_opportunity_id INTEGER,
  status TEXT,
  notes TEXT,
  followed_up_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    interest.id,
    interest.user_id,
    interest.opportunity_id,
    interest.customer_opportunity_id,
    interest.status::TEXT,
    interest.notes,
    interest.followed_up_at,
    interest.created_at
  FROM public.opportunity_interests AS interest
  ORDER BY interest.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_opportunity_interest_for_user(
  p_user_id INTEGER,
  p_opportunity_id INTEGER
)
RETURNS TABLE (
  id INTEGER,
  customer_opportunity_id INTEGER,
  status TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    interest.id,
    COALESCE(interest.customer_opportunity_id, opportunity.customer_opportunity_id),
    interest.status::TEXT
  FROM public.opportunity_interests AS interest
  INNER JOIN public.opportunities AS opportunity
    ON opportunity.id = interest.opportunity_id
  WHERE interest.user_id = p_user_id
    AND interest.opportunity_id = p_opportunity_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.record_member_opportunity_interest(
  p_user_id INTEGER,
  p_opportunity_id INTEGER
)
RETURNS TABLE (
  id INTEGER,
  inserted BOOLEAN,
  customer_opportunity_id INTEGER
)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_opportunity_id INTEGER;
BEGIN
  SELECT opportunity.customer_opportunity_id
  INTO v_customer_opportunity_id
  FROM public.opportunities AS opportunity
  WHERE opportunity.id = p_opportunity_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opportunity % not found', p_opportunity_id
      USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  WITH inserted_interest AS (
    INSERT INTO public.opportunity_interests (
      user_id,
      opportunity_id,
      customer_opportunity_id,
      status
    )
    VALUES (
      p_user_id,
      p_opportunity_id,
      v_customer_opportunity_id,
      'new'
    )
    ON CONFLICT (user_id, opportunity_id) DO NOTHING
    RETURNING
      opportunity_interests.id,
      TRUE AS inserted,
      opportunity_interests.customer_opportunity_id
  ),
  updated_existing AS (
    UPDATE public.opportunity_interests AS interest
    SET customer_opportunity_id = COALESCE(
      interest.customer_opportunity_id,
      v_customer_opportunity_id
    )
    WHERE interest.user_id = p_user_id
      AND interest.opportunity_id = p_opportunity_id
      AND NOT EXISTS (SELECT 1 FROM inserted_interest)
    RETURNING
      interest.id,
      FALSE AS inserted,
      interest.customer_opportunity_id
  )
  SELECT * FROM inserted_interest
  UNION ALL
  SELECT * FROM updated_existing
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_opportunity_interests_for_crm() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_opportunity_interest_for_user(INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_member_opportunity_interest(INTEGER, INTEGER) TO anon, authenticated;
