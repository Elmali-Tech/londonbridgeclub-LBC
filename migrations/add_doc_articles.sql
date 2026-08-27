-- Documentation CMS articles table
CREATE TABLE IF NOT EXISTS doc_articles (
  id          SERIAL PRIMARY KEY,
  title       TEXT    NOT NULL,
  slug        TEXT    NOT NULL UNIQUE,
  content     TEXT,
  category    TEXT    NOT NULL DEFAULT 'General',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_articles_category    ON doc_articles(category);
CREATE INDEX IF NOT EXISTS idx_doc_articles_published   ON doc_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_doc_articles_sort        ON doc_articles(sort_order);
