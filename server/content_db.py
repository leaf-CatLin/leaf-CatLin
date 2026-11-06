"""主站内容库访问层（Neon Postgres）。

作品 / 帖子 / 友链都存在同一个库里，库结构见同目录 content_schema.sql。
连接串按以下顺序取第一个非空的环境变量：
    CRAZYING_DATABASE_URL  ->  DATABASE_URL  ->  POSTGRES_URL
Vercel 上请配置 CRAZYING_DATABASE_URL（Neon 的 pooled 连接串）。

没有配置连接串、或数据库暂时连不上时，查询一律返回空结果，
让页面走「暂无内容」分支，而不是整站 500。
"""
from __future__ import annotations

import os


def dsn() -> str:
    for name in ('CRAZYING_DATABASE_URL', 'DATABASE_URL', 'POSTGRES_URL'):
        value = os.environ.get(name, '').strip()
        if value:
            return value
    return ''


def query(sql: str, params=None):
    """执行只读查询，返回 dict 列表；失败时返回空列表。"""
    url = dsn()
    if not url:
        return []

    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        return []

    conn = None
    try:
        conn = psycopg2.connect(url, connect_timeout=5,
                                cursor_factory=psycopg2.extras.RealDictCursor)
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return [dict(row) for row in cur.fetchall()]
    except Exception as exc:  # noqa: BLE001 —— 数据库异常不应让页面 500
        print('[content_db]', exc)
        return []
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:  # noqa: BLE001
                pass
