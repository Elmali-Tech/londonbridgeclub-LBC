-- Store the person who referred or introduced a customer account.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS reference_person VARCHAR(255);

UPDATE customers AS customer
SET reference_person = source.referral_source
FROM (
  SELECT DISTINCT ON (customer_id)
    customer_id,
    referral_source
  FROM customer_opportunities
  WHERE customer_id IS NOT NULL
    AND nullif(trim(referral_source), '') IS NOT NULL
  ORDER BY customer_id, created_at ASC
) AS source
WHERE customer.id = source.customer_id
  AND customer.reference_person IS NULL;
