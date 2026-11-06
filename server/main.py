import os
import random
import requests
from datetime import datetime, timezone
from typing import Literal
from xml.sax.saxutils import escape

from flask import *

# 可选：本地运行时从 .env 读配置；Vercel 上由平台注入环境变量，没有 .env 也不会报错
try:
	from dotenv import load_dotenv
	load_dotenv()
except ImportError:
	pass

app = Flask(__name__)

base = 'path/base.html'
webside = os.environ.get('CRAZYING_SITE_DOMAIN', 'leaf-catlin.com')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# 静态资源域名 / 版本号
# 原 assets / img 两个子域名已合并进主站 leaf-catlin.com，默认走同域相对路径；
# 仍可用环境变量覆盖，方便本地预览或临时切回 CDN：
#   CRAZYING_ASSETS_BASE   CSS / JS 根地址（默认空 = 同域，如 /CSS、/JS）
#   CRAZYING_IMG_BASE      图片 / 头像根地址（默认空 = 同域）
#   CRAZYING_API_BASE      文章 / 作品 / 友人 / 邮件根地址（默认空 = 同域）
#   CRAZYING_SITE_BASE     站点绝对地址（RSS / favicon 跳转用）
#   CRAZYING_STATUS_API    妖精论坛的状态日志接口（网站状态统计图的数据源）
#                          注意用 www 域名：裸域会 301 且跳转响应没有 CORS 头
#   CRAZYING_ASSETS_VER    资源版本号，改这个就能让浏览器立刻拿到新 CSS/JS
#   CRAZYING_DATABASE_URL  主站内容库（Neon Postgres），作品 / 帖子 / 友链都从这里读
#                          也兼容 SELF_WEBSITE_DATABASE_URL / SELF_WEBSITE_POSTGRES_URL
# ---------------------------------------------------------------------------
SITE = os.environ.get('CRAZYING_SITE_BASE', 'https://leaf-catlin.com').rstrip('/')
ASSETS = os.environ.get('CRAZYING_ASSETS_BASE', '').rstrip('/')
IMG = os.environ.get('CRAZYING_IMG_BASE', '').rstrip('/')
API = os.environ.get('CRAZYING_API_BASE', '').rstrip('/')
# 歌单音频体积太大（单个约 1.8MB，共 11 个），暂不进仓库，仍走旧 CDN
AUDIO = os.environ.get('CRAZYING_AUDIO_BASE', 'https://assets.crazying-dev.top').rstrip('/')
STATUS_API = os.environ.get('CRAZYING_STATUS_API', 'https://www.yjlt.top/api/status-log')
ASSETS_VER = os.environ.get('CRAZYING_ASSETS_VER', '30')

# 静态资源目录：CSS / JS / 字体 / 头像图片 / 其它图片，都已合并进本仓库 server/static
STATIC_DIR = os.path.join(BASE_DIR, 'static')

# 注入模板全局变量：模板里直接写 {{ ASSETS }} / {{ IMG }} / {{ API }} / {{ ASSETS_VER }}
app.jinja_env.globals.update(ASSETS=ASSETS, IMG=IMG, API=API, AUDIO=AUDIO,
							 STATUS_API=STATUS_API, ASSETS_VER=ASSETS_VER)


def content_dsn():
	"""内容库连接串：优先 SELF_WEBSITE_*，其次本仓库原有的 CRAZYING_*，最后 Vercel 注入的通用变量。"""
	for name in ('SELF_WEBSITE_DATABASE_URL', 'SELF_WEBSITE_POSTGRES_URL',
				 'CRAZYING_DATABASE_URL', 'DATABASE_URL', 'POSTGRES_URL'):
		value = os.environ.get(name, '').strip()
		if value:
			return value
	# 兜底：任何 SELF_WEBSITE_ 前缀且值是 Postgres 连接串的变量
	for key, value in os.environ.items():
		if key.startswith('SELF_WEBSITE_') and value.strip().startswith('postgresql://'):
			return value.strip()
	return ''


def content_query(sql, params=None):
	"""只读查询内容库，返回 dict 列表；没配库或连不上时返回空列表，避免整站 500。"""
	url = content_dsn()
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
	except Exception as exc:  # noqa: BLE001
		print('[content_db]', exc)
		return []
	finally:
		if conn is not None:
			try:
				conn.close()
			except Exception:  # noqa: BLE001
				pass


def render_page(content_template, page_title=None, page_desc=None, status=200, **extra):
	"""
	统一的整页渲染：把 HTML 片段塞进 path/base.html 骨架里。
	片段仍然是 fragment-only（没有 <html>/<head>/<body>），这样它既能被 include，
	也能单独渲染成一个完整页面。
	**extra 会原样透传给模板（片段 include 时同样能拿到）。
	"""
	return render_template(
		base,
		content_template=content_template,
		page_title=page_title,
		page_desc=page_desc,
		**extra
	), status


# 页面元信息：内容片段 -> (标题, 描述)
PAGES = {
	'index.html': ('林の窝 · 一个写着玩的小站',
				   '林の窝 —— 记录代码、作品与碎碎念的小小角落，欢迎来唠唠嗑喵～'),
	'HTML/AboutMe.html': ('关于我 · 林の窝', 'emm...来让我做一下自我介绍吧'),
	'HTML/CommentMe.html': ('联系我 · 林の窝', '欢迎与我交流喵～邮箱、QQ、微信、小红书都能找到我'),
	'HTML/MyWriter.html': ('我的作品 · 林の窝', '林的项目与创作，感兴趣就点进去看看喵～'),
	'HTML/Friend.html': ('我的朋友 · 林の窝', '这些是我认识的有趣的人，欢迎来换友链喵～'),
	'HTML/Privacy.html': ('隐私声明 · 林の窝', '本站承诺保护你的隐私'),
	'HTML/StatusPage.html': ('网站状态 · 林の窝', '妖精论坛（yjlt.top）的最近请求状态日志，折线 / 柱状随便看喵～'),
}


def render_named(name, status=200, **extra):
	"""按 PAGES 里登记的片段名渲染整页（自动带上标题 / 描述）"""
	title, desc = PAGES[name]
	return render_page(name, title, desc, status, **extra)


# tool.py
def get_random_file(dir_path):
	# 收集所有文件
	files = []
	for name in os.listdir(dir_path):
		fp = os.path.join(dir_path, name)
		if os.path.isfile(fp):
			files.append(fp)
	if not files:
		return None
	return os.path.abspath(os.path.normpath(random.choice(files)))


# tool.py end


def http_request(url, method: Literal["GET", "POST"] = "GET", params=None, json_data=None, timeout=5):
	"""
	    通用 HTTP 请求函数
	    :param url: 请求地址
	    :param method: 请求方式，GET / POST
	    :param params: URL 查询参数，字典
	    :param json_data: POST JSON 体，字典
	    :param timeout: 超时时间
	    :return: 响应文本 / 错误信息
	    """
	params = params or {}
	json_data = json_data or {}
	
	try:
		if method.upper() == "GET":
			resp = requests.get(url, params=params, timeout=timeout)
		elif method.upper() == "POST":
			resp = requests.post(url, params=params, json=json_data, timeout=timeout)
		else:
			# 方法不合法：内容None，自定义状态码-1
			return None, -1
		
		# 正常返回：(响应内容, 真实HTTP状态码)
		return resp.text, resp.status_code
	
	except requests.exceptions.RequestException:
		# 网络、超时、连接失败等：内容None，自定义状态码0
		return None, 0


#GET.py —— 旧版给直链 / 爬虫用的裸片段入口
# 现在统一渲染整页（片段仍然 fragment-only），直接访问也不会再看到没有样式的半张页面
@app.route('/GET')
def indexGet():
	return render_named('index.html')


@app.route('/AboutMe/GET')
def AboutMeGet():
	return render_named('HTML/AboutMe.html')


@app.route('/CommentMe/GET')
def CommentMeGet():
	return render_named('HTML/CommentMe.html')


@app.route('/MyWrite/GET')
def MyWriterGet():
	return render_named('HTML/MyWriter.html')


@app.route('/friend/GET')
def FriendGet():
	return render_named('HTML/Friend.html')


@app.route('/privacy/GET')
def PrivacyGet():
	return render_named('HTML/Privacy.html')


#GET.py end
#api.py
import re

@app.route('/api/xhs-title')
def get_xhs_title():
    url = request.args.get('url', '')
    if not url:
        return jsonify({'error': '缺少 url 参数'}), 400

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        }
        resp = requests.get(url, headers=headers, timeout=10, allow_redirects=True)
        resp.encoding = resp.apparent_encoding or 'utf-8'
        html = resp.text

        # 提取 <title> 标签内容
        match = re.search(r'<title\b[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        if not match:
            return jsonify({'error': '未找到页面标题'}), 404

        title = match.group(1).strip()
        # 截取 " - 小红书" 前的内容（兼容 "- 小红书" 或 " - 小红书 RED" 等）
        if ' - 小红书' in title:
            title = title.split(' - 小红书')[0].strip()
        elif '-小红书' in title:
            title = title.split('-小红书')[0].strip()

        return jsonify({'title': title})
    except Exception as e:
        return jsonify({'error': f'请求失败: {str(e)}'}), 500


@app.route('/api/bili-title')
def get_bili_title():
    url = request.args.get('url', '')
    if not url:
        return jsonify({'error': '缺少 url 参数'}), 400

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Referer': 'https://www.bilibili.com/'
        }
        resp = requests.get(url, headers=headers, timeout=10, allow_redirects=True)
        data = resp.json()

        # 从 JSON 中提取用户名
        if data.get('code') == 0:
            name = None
            # web-interface/card 接口: data.card.name
            if 'card' in data.get('data', {}):
                name = data['data']['card'].get('name')
            # space/acc/info 接口: data.name
            elif 'name' in data.get('data', {}):
                name = data['data'].get('name')

            if name:
                return jsonify({'title': name})

        return jsonify({'error': '未能从 API 响应中提取用户名'}), 404
    except Exception as e:
        return jsonify({'error': f'请求失败: {str(e)}'}), 500

#api.py end
#page.py
@app.route('/')
def index():
	return render_named('index.html')

@app.route('/AboutMe')
def AboutMe():
	return render_named('HTML/AboutMe.html')

@app.route('/CommentMe')
def CommentMe():
	return render_named('HTML/CommentMe.html')

@app.route('/MyWrite')
def MyWrite():
	return render_named('HTML/MyWriter.html')

@app.route('/friend')
def friend():
	return render_named('HTML/Friend.html')

@app.route('/privacy')
def privacy():
	return render_named('HTML/Privacy.html')


@app.route('/stats')
def stats():
	# status_more=False：状态页自己就不再显示「查看详情 →」链接了
	return render_named('HTML/StatusPage.html', status_more=False)


@app.route('/stats/GET')
def statsGet():
	return render_named('HTML/StatusPage.html', status_more=False)


#page.py end

# 静态资源：原来分散在 assets / img 两个子域名，现已合并进 server/static，
# 对外仍是同域路径 /CSS、/JS、/font、/leaf-catlin.com、/other
@app.route('/CSS/<path:filename>')
def static_css(filename):
	return send_from_directory(os.path.join(STATIC_DIR, 'CSS'), filename)


@app.route('/JS/<path:filename>')
def static_js(filename):
	return send_from_directory(os.path.join(STATIC_DIR, 'JS'), filename)


@app.route('/font/<path:filename>')
def static_font(filename):
	return send_from_directory(os.path.join(STATIC_DIR, 'font'), filename)


@app.route('/leaf-catlin.com/<path:filename>')
def static_img(filename):
	return send_from_directory(os.path.join(STATIC_DIR, 'leaf-catlin.com'), filename)


@app.route('/other/<path:filename>')
def static_other(filename):
	return send_from_directory(os.path.join(STATIC_DIR, 'other'), filename)


@app.route('/favicon.ico')
def favicon():
	return send_from_directory(os.path.join(STATIC_DIR, 'leaf-catlin.com'), 'favicon.ico')


@app.route('/bg')
def bg():
	Type = request.args.get('type', None)
	if (Type is None) or (Type not in ['pc', 'mobile']):
		return abort(400)
	if Type == 'pc':
		file = get_random_file(os.path.join(BASE_DIR, 'img', 'bg', 'pc'))
		if file is None:
			return abort(500)
		return send_file(file, mimetype='image/webp')
	elif Type == 'mobile':
		file = get_random_file(os.path.join(BASE_DIR, 'img', 'bg', 'mobile'))
		if file is None:
			return abort(500)
		return send_file(file, mimetype='image/webp')
	abort(400)


_WEEKDAYS = ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')
_MONTHS = ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')


def rfc822(date_str):
	"""把日期转成 RSS 要求的 RFC822 时间（东八区）。"""
	try:
		dt = datetime.strptime(str(date_str)[:10], '%Y-%m-%d')
	except (TypeError, ValueError):
		dt = datetime.now(timezone.utc).replace(tzinfo=None)
	return '%s, %02d %s %d 00:00:00 +0800' % (
		_WEEKDAYS[dt.weekday()], dt.day, _MONTHS[dt.month - 1], dt.year)


def date_text(value):
	"""数据库里的 DATE / TIMESTAMP 统一成前端习惯的 'yyyy-mm-dd HH:MM:SS'。"""
	if isinstance(value, datetime):
		return value.strftime('%Y-%m-%d %H:%M:%S')
	if value is None:
		return ''
	try:
		return value.strftime('%Y-%m-%d') + ' 00:00:00'
	except AttributeError:
		return str(value)


# ---------------------------------------------------------------------------
# 内容接口：作品 / 帖子 / 友链全部来自 Neon 内容库（管理端 Self-Website 维护）
# ---------------------------------------------------------------------------
@app.route('/work')
def work():
	rows = content_query(
		'SELECT name, link, status, can_join, can_support FROM site_works '
		'WHERE is_published ORDER BY sort_order, id')
	return jsonify([{
		'name': row['name'],
		'from': row['link'] or '',
		'run': int(row['status']),
		'join': 1 if row['can_join'] else 0,
		'help': 1 if row['can_support'] else 0,
	} for row in rows])


@app.route('/post')
def post_list():
	rows = content_query(
		'SELECT id, title, excerpt, image, link, published_at FROM site_posts '
		'WHERE is_published ORDER BY published_at DESC, id DESC')
	return jsonify([{
		'title': row['title'],
		'text': row['excerpt'] or '',
		'img': row['image'] or '',
		'link': row['link'] or '/post/%d' % row['id'],
		'date': date_text(row['published_at']),
	} for row in rows])


@app.route('/api/post/<int:post_id>')
def api_post(post_id):
	rows = content_query(
		'SELECT id, title, content, author, avatar, published_at FROM site_posts '
		'WHERE id = %s AND is_published', (post_id,))
	if not rows:
		return jsonify({'error': '文章不存在'}), 404
	row = rows[0]
	return jsonify({
		'title': row['title'],
		'text': row['content'] or '',
		'auto': row['author'] or '',
		'avter': row['avatar'] or '',
		'date': date_text(row['published_at']),
	})


@app.route('/api/friend')
def friend_list():
	rows = content_query(
		'SELECT name, site, avatar, about FROM site_friends '
		'WHERE is_published ORDER BY sort_order, id')
	return jsonify([{
		'name': row['name'],
		'avter': row['avatar'] or '',
		'OneWebSite': row['site'] or '',
		'AboutTA': row['about'] or '',
	} for row in rows])


@app.route('/rss.xml')
def rss():
	# 动态合成 RSS 2.0：数据源是内容库的 site_posts，与首页"碎碎念"一致
	rows = content_query(
		'SELECT id, title, excerpt, link, published_at FROM site_posts '
		'WHERE is_published ORDER BY published_at DESC, id DESC')
	posts = [{
		'title': row['title'],
		'link': row['link'] or '/post/%d' % row['id'],
		'date': row['published_at'],
		'desc': row['excerpt'] or '',
	} for row in rows]

	posts = sorted(posts, key=lambda p: str(p.get('date') or ''), reverse=True)

	def esc(value):
		return escape(str(value or ''), {'"': '&quot;', "'": '&apos;'})

	items = []
	for post in posts:
		link = str(post.get('link') or '')
		if not link.startswith('http'):
			link = SITE + '/' + link.lstrip('/')
		items.append(
			'<item>'
			'<title>%s</title>'
			'<link>%s</link>'
			'<guid isPermaLink="true">%s</guid>'
			'<pubDate>%s</pubDate>'
			'<description>%s</description>'
			'</item>' % (esc(post.get('title')), esc(link), esc(link),
						 rfc822(post.get('date')), esc(post.get('desc')))
		)

	last_build = rfc822(posts[0].get('date')) if posts else rfc822('')
	xml = (
		'<?xml version="1.0" encoding="UTF-8"?>'
		'<rss version="2.0"><channel>'
		'<title>林の窝 · 碎碎念</title>'
		'<link>%s/</link>'
		'<description>一个喜欢玩电脑的理科生，罗小黑死粉，会一点点 Python。</description>'
		'<language>zh-CN</language>'
		'<lastBuildDate>%s</lastBuildDate>'
		'%s'
		'</channel></rss>' % (SITE, last_build, ''.join(items))
	)
	return Response(xml, mimetype='application/rss+xml')


@app.errorhandler(404)
def not_found(error):
	return render_page('error/404.html', '不好！找不到页面 · 林の窝',
					   '这个页面大概是跑到二次元去玩了，要不要回首页重新找找喵？', 404)


# 文章详情：旧版这里漏了 content_template，导致文章页永远是空白，已修正
@app.route('/post/<int:post_id>')
def post(post_id):
	return render_page('HTML/PostBase.html', '文章 · 林の窝', '林の碎碎念')


@app.route('/post/<int:post_id>/GET')
def postGET(post_id):
	return render_page('HTML/PostBase.html', '文章 · 林の窝', '林の碎碎念')


@app.route('/pinshu/phone')
def PinShu_Phone():
	return render_template("/PinShu/Phone.html")


if __name__ == '__main__':
	# 本地预览：python server/main.py  （可用 HOST / PORT 环境变量覆盖）
	app.run(host=os.environ.get('HOST', '127.0.0.1'),
			port=int(os.environ.get('PORT', '5000')))
