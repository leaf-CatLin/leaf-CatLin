-- 主站内容库（Neon Postgres）
-- 作品 / 帖子 / 友链统一落库，管理端 Self-Website 项目直接维护这三张表。
-- 主站只读取 is_published = TRUE 的记录。

CREATE TABLE IF NOT EXISTS site_posts (
    id           SERIAL PRIMARY KEY,
    title        TEXT        NOT NULL,
    excerpt      TEXT        NOT NULL DEFAULT '',
    content      TEXT        NOT NULL DEFAULT '',
    image        TEXT        NOT NULL DEFAULT '',
    link         TEXT        NOT NULL DEFAULT '',
    author       TEXT        NOT NULL DEFAULT '林',
    avatar       TEXT        NOT NULL DEFAULT '',
    published_at DATE        NOT NULL DEFAULT CURRENT_DATE,
    is_published BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_works (
    id           SERIAL PRIMARY KEY,
    name         TEXT        NOT NULL,
    link         TEXT        NOT NULL DEFAULT '',
    status       SMALLINT    NOT NULL DEFAULT 0,
    can_join     BOOLEAN     NOT NULL DEFAULT TRUE,
    can_support  BOOLEAN     NOT NULL DEFAULT TRUE,
    sort_order   INTEGER     NOT NULL DEFAULT 0,
    is_published BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_friends (
    id           SERIAL PRIMARY KEY,
    name         TEXT        NOT NULL,
    site         TEXT        NOT NULL DEFAULT '',
    avatar       TEXT        NOT NULL DEFAULT '',
    about        TEXT        NOT NULL DEFAULT '',
    sort_order   INTEGER     NOT NULL DEFAULT 0,
    is_published BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_posts_published ON site_posts(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_works_order ON site_works(is_published, sort_order);
CREATE INDEX IF NOT EXISTS idx_site_friends_order ON site_friends(is_published, sort_order);
