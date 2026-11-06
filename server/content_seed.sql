-- 主站内容库初始数据（可重复执行：ON CONFLICT 需要主键，这里用显式 id + 先清空）
-- 仅在首次建库时手动执行一次，后续数据全部由管理端 Self-Website 维护。

INSERT INTO site_posts (id, title, excerpt, content, image, link, author, avatar, published_at)
VALUES
    (1, '个人站完工', '个人站完工，网页进入点这里👉www.crazying-dev.top',
     '<p>个人站完工，网页进入点这里👉<a href="https://www.leaf-catlin.com">www.leaf-catlin.com</a></p>',
     '', '', 'crazying-dev', '/leaf-catlin.com/me.png', '2026-06-22'),
    (3, '好无聊啊，没人找我玩，打游戏也没意思', '如题', '', '', '', '林', '/leaf-catlin.com/me.png', '2026-08-15'),
    (4, 'nginx我是用不懂一点，还不如自己手搓一个', '手搓真好玩,就是有点小累', '', '', '', '林', '/leaf-catlin.com/me.png', '2026-08-15')
ON CONFLICT (id) DO NOTHING;

INSERT INTO site_works (name, link, status, can_join, can_support, sort_order)
VALUES
    ('妖精论坛', 'https://yjlt.top', 0, FALSE, TRUE, 1),
    ('PyFixEnhance', 'https://github.com/crazying-dev/PyFixEnhance', 1, TRUE, TRUE, 2),
    ('全球CPU(TCO)', 'https://github.com/crazying-dev/The-CPUs-for-One', -1, TRUE, TRUE, 3),
    ('众生之门', 'https://github.com/crazying-dev/The-Door-of-All-Beings', -1, TRUE, TRUE, 4),
    ('MAIWR', '', 0, TRUE, TRUE, 5),
    ('[小说]', '', 0, FALSE, TRUE, 6),
    ('Pylon', 'https://github.com/crazying-deev/Pylon', 1, TRUE, TRUE, 7)
ON CONFLICT DO NOTHING;

INSERT INTO site_friends (name, site, avatar, about, sort_order)
VALUES
    ('Jack', 'https://github.com/Jack_Tyla', 'https://img.crazying-dev.top/Friend/Jack-Tyla.png', '', 1),
    ('路狐羽', 'https://navifox.net', 'https://www.navifox.net/favicon.ico', '', 2),
    ('UnknownMp', 'https://www.unknownmp.top/', 'https://cdn.unknownmp.top/website/logo.jpg', '', 3),
    ('孤久', 'https://zcx0217.qzz.io/', 'https://zcx0217.qzz.io/images/favicon.png', '', 4)
ON CONFLICT DO NOTHING;

SELECT setval('site_posts_id_seq', (SELECT MAX(id) FROM site_posts));
