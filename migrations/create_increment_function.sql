-- Increment fonksiyonu oluştur (postgres'de doğrudan increment operatörü yok)
CREATE OR REPLACE FUNCTION increment(value integer)
RETURNS integer AS $$
BEGIN
  RETURN value + 1;
END;
$$ LANGUAGE plpgsql; 