/**
 * WorldPulse host half.
 *
 * It owns the live-web work (search aggregation, geocoding, weather) and exposes
 * a small JSON API on the harness web server. The client half is a plain slot
 * registration and never talks to third-party origins directly.
 *
 * Live sources are best-effort: the host environment may reach only some
 * providers at a given moment, so every endpoint returns a usable, clearly
 * labelled fallback instead of failing the page.
 */

const NS = 'worldpulse';
const API = '/worldpulse/api';
const NEWS_TTL = 2 * 60 * 1000;
const PLAN_TTL = 10 * 60 * 1000;
const GEO_TTL = 24 * 60 * 60 * 1000;
const MAX_CACHE = 90;

const cache = new Map();

function remember(key, value, ttl) {
  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expires: Date.now() + ttl });
}

function recall(key, bypass) {
  if (bypass) return null;
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function clean(value, limit = 420) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

function safeUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(body);
}

function intParam(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function boolParam(value) {
  return value === '1' || value === 'true' || value === 'yes';
}

function abortAfter(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  if (typeof timer.unref === 'function') timer.unref();
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

async function fetchJson(ctx, url, ms = 10000) {
  const gate = abortAfter(ms);
  try {
    const response = await ctx.web.fetch({ url }, gate.signal);
    if (!response || response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`HTTP ${response?.statusCode ?? 'unknown'}`);
    }
    const text = response.body?.content ?? '';
    return JSON.parse(text);
  } finally {
    gate.done();
  }
}

async function searchWeb(ctx, query, maxResults = 10, ms = 12000) {
  const gate = abortAfter(ms);
  try {
    const result = await ctx.web.search({ query, maxResults }, gate.signal);
    return result && Array.isArray(result.sources) ? result : { sources: [] };
  } finally {
    gate.done();
  }
}

/* ------------------------------------------------------------------ */
/* News                                                                */
/* ------------------------------------------------------------------ */

const NEWS_QUERIES = [
  { query: 'top world news today international headlines', category: 'world' },
  { query: 'latest international conflict diplomacy security news today', category: 'conflict' },
  { query: 'global economy markets trade energy news today', category: 'economy' },
  { query: 'climate extreme weather technology science news today', category: 'climate' },
  { query: '中国 今日 国际 新闻 全球 局势', category: 'china' },
];

const NEWS_FEEDS = [
  { name: 'France 24', url: 'https://www.france24.com/en/rss' },
  { name: 'Sky News', url: 'https://feeds.skynews.com/feeds/rss/world.xml' },
  { name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml' },
  { name: 'UN News', url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml' },
  { name: 'Fox News World', url: 'https://moxie.foxnews.com/google-publisher/world.xml' },
  { name: '中国新闻网', url: 'https://www.chinanews.com.cn/rss/scroll-news.xml', category: 'china' },
  { name: 'CGTN World', url: 'https://www.cgtn.com/subscribe/rss/section/world.xml' },
];

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<!\[CDATA\[|\]\]>/gi, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      try { return String.fromCodePoint(Number.parseInt(hex, 16)); } catch { return ' '; }
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      try { return String.fromCodePoint(Number.parseInt(dec, 10)); } catch { return ' '; }
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function feedTag(block, tag) {
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = pattern.exec(block);
  if (!match) return '';
  return stripHtml(match[1].replace(/^<!\[CDATA\[/i, '').replace(/\]\]>$/i, ''));
}

function parseFeed(xml, feed) {
  const blocks = String(xml ?? '').match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  const items = [];
  for (const block of blocks) {
    const title = feedTag(block, 'title');
    const link = feedTag(block, 'link') || feedTag(block, 'guid');
    if (!title || !/^https?:\/\//i.test(link)) continue;
    const snippet = feedTag(block, 'description') || feedTag(block, 'content:encoded') || feedTag(block, 'summary');
    const publishedAt = feedTag(block, 'pubDate') || feedTag(block, 'dc:date') || feedTag(block, 'published');
    items.push({
      url: link,
      title,
      snippet,
      publishedAt,
      source: feed.name,
    });
  }
  return items;
}

async function fetchFeed(ctx, feed) {
  const gate = abortAfter(9000);
  try {
    const response = await ctx.web.fetch({ url: feed.url }, gate.signal);
    if (!response || response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`HTTP ${response?.statusCode ?? 'unknown'}`);
    }
    return parseFeed(response.body?.content ?? '', feed).slice(0, 14);
  } finally {
    gate.done();
  }
}


const REGION_QUERIES = {
  中东: 'Middle East',
  欧洲: 'Europe',
  亚太: 'Asia Pacific',
  美洲: 'Americas',
  非洲: 'Africa',
  全球: 'world',
};

const REGION_ALIASES = {
  '全球': '全球',
  '中东': '中东',
  '欧洲': '欧洲',
  '亚太': '亚太',
  '美洲': '美洲',
  '非洲': '非洲',
  Global: '全球',
  'Middle East': '中东',
  Europe: '欧洲',
  'Asia Pacific': '亚太',
  Americas: '美洲',
  Africa: '非洲',
};

const SOURCE_NAMES = {
  'bbc.com': 'BBC',
  'bbc.co.uk': 'BBC',
  'reuters.com': 'Reuters',
  'apnews.com': 'AP',
  'cnn.com': 'CNN',
  'aljazeera.com': 'Al Jazeera',
  'theguardian.com': 'The Guardian',
  'nytimes.com': 'The New York Times',
  'washingtonpost.com': 'The Washington Post',
  'ft.com': 'Financial Times',
  'bloomberg.com': 'Bloomberg',
  'cnbc.com': 'CNBC',
  'wsj.com': 'The Wall Street Journal',
  'dw.com': 'DW',
  'france24.com': 'France 24',
  'lemonde.fr': 'Le Monde',
  'spiegel.de': 'Der Spiegel',
  'tass.com': 'TASS',
  'rt.com': 'RT',
  'kyodonews.net': 'Kyodo News',
  'yonhapnews.co.kr': 'Yonhap',
  'straitstimes.com': 'The Straits Times',
  'scmp.com': 'South China Morning Post',
  'timesofindia.indiatimes.com': 'The Times of India',
  'xinhuanet.com': '新华网',
  'news.cn': '新华网',
  'chinadaily.com.cn': 'China Daily',
  'globaltimes.cn': '环球时报',
  'cctv.com': '央视新闻',
  'thepaper.cn': '澎湃新闻',
  'caixin.com': '财新',
  'yicai.com': '第一财经',
  'jiemian.com': '界面新闻',
  'guancha.cn': '观察者网',
  'huanqiu.com': '环球网',
  'zaobao.com': '联合早报',
  'zaobao.com.sg': '联合早报',
  'asia.nikkei.com': 'Nikkei Asia',
  'japantimes.co.jp': 'The Japan Times',
  'smh.com.au': 'The Sydney Morning Herald',
  'abc.net.au': 'ABC News',
  'cbc.ca': 'CBC',
  'npr.org': 'NPR',
  'skynews.com': 'Sky News',
  'foxnews.com': 'Fox News',
  'politico.com': 'Politico',
  'axios.com': 'Axios',
  'foreignpolicy.com': 'Foreign Policy',
  'economist.com': 'The Economist',
  'nature.com': 'Nature',
  'science.org': 'Science',
  'un.org': 'UN News',
  'who.int': 'WHO',
  'worldbank.org': 'World Bank',
  'imf.org': 'IMF',
};

const FALLBACK_NEWS = [
  ['BBC World', 'https://www.bbc.com/news/world', 'BBC', 'world', '英国广播公司国际新闻实时入口；当前搜索服务不可用时可直接访问。'],
  ['Reuters World', 'https://www.reuters.com/world/', 'Reuters', 'world', '路透社全球新闻实时入口，适合交叉核对突发消息。'],
  ['AP News World', 'https://apnews.com/hub/world-news', 'AP', 'world', '美联社国际新闻实时入口。'],
  ['Al Jazeera', 'https://www.aljazeera.com/news/', 'Al Jazeera', 'conflict', '半岛电视台国际新闻入口，中东与全球南方报道较集中。'],
  ['新华网国际', 'https://www.news.cn/world/', '新华网', 'china', '新华社国际新闻入口，中文信源。'],
  ['央视新闻', 'https://news.cctv.com/world/', '央视新闻', 'china', '央视国际新闻入口，中文信源。'],
  ['澎湃新闻 · 国际', 'https://www.thepaper.cn/', '澎湃新闻', 'china', '中文深度报道与国际新闻入口。'],
  ['South China Morning Post', 'https://www.scmp.com/news/world', 'SCMP', 'world', '亚洲视角的英文国际新闻入口。'],
  ['DW World', 'https://www.dw.com/en/world/s-1429', 'DW', 'world', '德国之声国际新闻入口。'],
  ['France 24', 'https://www.france24.com/en/world/', 'France 24', 'world', '法国国际新闻入口。'],
];

function sourceName(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const keys = Object.keys(SOURCE_NAMES).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (host === key || host.endsWith(`.${key}`)) return SOURCE_NAMES[key];
    }
    return host;
  } catch {
    return 'Web';
  }
}

const IGNORED_HOSTS = [
  'baike.baidu.com',
  'zhihu.com',
  'iciba.com',
  'youdao.com',
  'cambridge.org',
  'britannica.com',
  'merriam-webster.com',
  'collinsdictionary.com',
  'thefreedictionary.com',
  'vocabulary.com',
  'wikipedia.org',
  'nationsatlas.com',
  'worldatlas.com',
  'countryreports.org',
  'infoplease.com',
  'factmonster.com',
  'ducksters.com',
  'facebook.com',
  'x.com',
  'twitter.com',
  'instagram.com',
  'tiktok.com',
  'pinterest.com',
  'reddit.com',
  'youtube.com',
  'amazon.com',
  'cainiaojc.com',
  'globaldossier.uspto.gov',
  'global.com.au',
  'nic.top',
  'mdpi.com',
];

function isLowQualitySource(url, title) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (IGNORED_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) return true;
  } catch {
    return true;
  }
  return /(是什么意思|词典|翻译|音标|读音|例句|百科|知乎|dictionary|translation|pronunciation|meaning of|definition of)/i.test(title);
}

const CATEGORY_LABELS = {
  world: '全球',
  conflict: '冲突与安全',
  economy: '经济与市场',
  climate: '气候与能源',
  tech: '科技',
  china: '中国相关',
  health: '公共卫生',
  region: '地区',
};

function classify(text) {
  const value = String(text ?? '').toLowerCase();
  if (/(war|conflict|attack|military|missile|strike|ceasefire|sanction|security|army|troops|hostage|drone|战争|冲突|袭击|军事|导弹|停火|制裁|安全|军队|无人机|人质)/i.test(value)) return 'conflict';
  if (/(econom|market|trade|tariff|inflation|stock|oil price|gdp|currency|央行|经济|市场|贸易|关税|通胀|股市|油价|汇率)/i.test(value)) return 'economy';
  if (/(climate|weather|flood|drought|heatwave|heat wave|storm|wildfire|emission|cop\d|气候|天气|洪水|干旱|高温|风暴|野火|排放)/i.test(value)) return 'climate';
  if (/(artificial intelligence|a\.i\.|\bai\b|chip|semiconductor|technology|科技|人工智能|芯片|半导体)/i.test(value)) return 'tech';
  if (/(china|chinese|beijing|xi jinping|中国|北京|习近平)/i.test(value)) return 'china';
  if (/(health|virus|disease|outbreak|epidemic|疫情|病毒|疾病)/i.test(value)) return 'health';
  return 'world';
}

function interleave(items) {
  const buckets = new Map();
  for (const item of items) {
    if (!buckets.has(item.category)) buckets.set(item.category, []);
    buckets.get(item.category).push(item);
  }
  const order = ['world', 'conflict', 'china', 'economy', 'climate', 'tech', 'health', 'region'];
  const out = [];
  let added = true;
  while (added) {
    added = false;
    for (const key of order) {
      const bucket = buckets.get(key);
      if (bucket && bucket.length) {
        out.push(bucket.shift());
        added = true;
      }
    }
  }
  return out;
}

async function getNews(ctx, region, bypass) {
  const area = REGION_ALIASES[region] ?? '全球';
  const cacheKey = `news:${area}`;
  const cached = recall(cacheKey, bypass);
  if (cached) return { ...cached, cached: true };

  const queries = NEWS_QUERIES.map((entry) => ({ ...entry }));
  if (area !== '全球') {
    queries.unshift({
      query: `${REGION_QUERIES[area]} latest news today headlines`,
      category: 'region',
    });
    queries.length = Math.min(queries.length, 5);
  }

  const [results, feedResults] = await Promise.all([
    Promise.allSettled(queries.map((entry) => searchWeb(ctx, entry.query, 10, 13000))),
    Promise.allSettled(NEWS_FEEDS.map((feed) => fetchFeed(ctx, feed))),
  ]);

  const items = [];
  const seenUrl = new Set();
  const seenTitle = new Set();
  const errors = [];
  let digest = '';
  const regionPattern = area === '全球'
    ? null
    : (REGION_PATTERNS.find(([name]) => name === area)?.[1] ?? null);

  const addItem = (source, categoryHint, sourceOverride) => {
    const url = safeUrl(source?.url);
    if (!url) return;
    const title = clean(source?.title, 220);
    if (title.length < 6) return;
    if (isLowQualitySource(url, title)) return;
    const normalizedUrl = url.replace(/[#?].*$/, '').replace(/\/+$/, '').toLowerCase();
    const normalizedTitle = title.toLowerCase();
    if (seenUrl.has(normalizedUrl) || seenTitle.has(normalizedTitle)) return;
    const snippet = clean(source?.snippet ?? source?.description ?? '', 360);
    if (regionPattern && !regionPattern.test(`${title} ${snippet}`)) return;
    seenUrl.add(normalizedUrl);
    seenTitle.add(normalizedTitle);
    const category = categoryHint && categoryHint !== 'world' && categoryHint !== 'region'
      ? categoryHint
      : classify(`${title} ${snippet}`);
    items.push({
      id: `${normalizedUrl}#${items.length}`,
      title,
      url,
      source: sourceOverride || sourceName(url),
      snippet: snippet || '点击打开原始信源，核对完整报道。',
      category,
      categoryLabel: CATEGORY_LABELS[category] ?? '全球',
      publishedAt: clean(source?.publishedAt ?? '', 40),
    });
  };

  feedResults.forEach((result, index) => {
    if (result.status !== 'fulfilled') {
      errors.push(`${NEWS_FEEDS[index].name}: ${String(result.reason?.message ?? result.reason ?? 'failed')}`);
      return;
    }
    for (const source of result.value) {
      addItem(source, NEWS_FEEDS[index].category ?? 'world', NEWS_FEEDS[index].name);
    }
  });

  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') {
      errors.push(`${queries[index].query}: ${String(result.reason?.message ?? result.reason ?? 'failed')}`);
      return;
    }
    const payload = result.value;
    if (!digest && payload.content) digest = clean(payload.content, 900);
    for (const source of payload.sources ?? []) {
      addItem(source, queries[index].category);
    }
  });

  let live = items.length > 0;
  let sources = live
    ? interleave(items).slice(0, 36)
    : FALLBACK_NEWS.map(([title, url, source, category, snippet], index) => ({
      id: `fallback-${index}`,
      title,
      url,
      source,
      snippet,
      category,
      categoryLabel: CATEGORY_LABELS[category] ?? '全球',
      publishedAt: '',
      fallback: true,
    }));

  const uniqueSources = new Set(sources.map((item) => item.source));
  const value = {
    ok: true,
    generatedAt: new Date().toISOString(),
    live,
    degraded: !live,
    region: area,
    itemCount: sources.length,
    sourceCount: uniqueSources.size,
    sources,
    digest,
    errors: errors.slice(0, 4),
    note: live
      ? '标题与摘要来自公开 RSS 与搜索服务的实时聚合，点击可回到原始信源；摘要仅为索引，不替代原文。'
      : '实时信源当前不可达，以下为常用信源入口；仍可先阅读「局势研判」中的分析框架，稍后重试。',
  };
  remember(cacheKey, value, NEWS_TTL);
  return { ...value, cached: false };
}

/* ------------------------------------------------------------------ */
/* Situation analysis                                                  */
/* ------------------------------------------------------------------ */

const HOTSPOTS = [
  {
    id: 'ukraine',
    name: '乌克兰与俄乌战线',
    region: '欧洲',
    level: 'high',
    patterns: [/ukrain/i, /russia/i, /kyiv/i, /moscow/i, /nato/i, /putin/i, /zelensk/i, /kremlin/i, /乌克兰/, /俄罗斯/, /基辅/, /莫斯科/, /北约/, /普京/, /泽连/, /克里姆林/],
    context: '战线、远程打击与外部军援仍是欧洲安全的核心变量；能源基础设施与黑海航运受冲击时，全球粮食和能源价格会同步波动。',
    watch: '观察远程打击频率、黑海航运保险成本、欧洲防空与军援节奏是否出现新的拐点。',
  },
  {
    id: 'gaza',
    name: '加沙与黎以边境',
    region: '中东',
    level: 'high',
    patterns: [/gaza/i, /israel/i, /hamas/i, /hezbollah/i, /lebanon/i, /west bank/i, /加沙/, /以色列/, /哈马斯/, /真主党/, /黎巴嫩/, /约旦河西岸/],
    context: '加沙战事、人质谈判与黎以边境摩擦相互牵动；任何一方升级都会迅速外溢到红海航运与海湾能源风险溢价。',
    watch: '停火/人质谈判进展、黎以边境交火强度、援助通道是否持续开放。',
  },
  {
    id: 'iran',
    name: '伊朗与海湾安全',
    region: '中东',
    level: 'high',
    patterns: [/iran/i, /tehran/i, /hormuz/i, /persian gulf/i, /houthi/i, /red sea/i, /伊朗/, /德黑兰/, /霍尔木兹/, /波斯湾/, /胡塞/, /红海/],
    context: '伊朗核问题、地区代理力量与红海袭扰构成联动风险；霍尔木兹海峡与曼德海峡的通行安全直接影响油价与集装箱运价。',
    watch: '核谈判与制裁执行、红海商船袭击、海湾国家防空与航运改道。',
  },
  {
    id: 'taiwan',
    name: '台海与南海',
    region: '亚太',
    level: 'medium',
    patterns: [/taiwan/i, /south china sea/i, /philippine/i, /scarborough/i, /台海/, /台湾/, /南海/, /菲律宾/, /仁爱礁/, /黄岩岛/],
    context: '军事演训、海上执法与联盟政治交织；半导体供应链与航运通道使这里的任何摩擦都具有全球外溢效应。',
    watch: '演训规模与频率、海上相遇事件、地区国家联合巡航与供应链应急预案。',
  },
  {
    id: 'korea',
    name: '朝鲜半岛',
    region: '亚太',
    level: 'medium',
    patterns: [/north korea/i, /pyongyang/i, /korean peninsula/i, /kim jong/i, /朝鲜/, /平壤/, /半岛/, /金正恩/],
    context: '导弹试射、核计划与朝俄互动增加不确定性；半岛风险更多体现为突发军事信号与东北亚军备节奏。',
    watch: '试射与卫星活动、朝俄军事合作、美日韩联合演训。',
  },
  {
    id: 'sahel',
    name: '萨赫勒与西非安全',
    region: '非洲',
    level: 'high',
    patterns: [/sahel/i, /mali/i, /burkina/i, /niger/i, /jihad/i, /boko haram/i, /萨赫勒/, /马里/, /布基纳法索/, /尼日尔/, /圣战/, /博科圣地/],
    context: '武装叛乱、政权更迭与外部力量撤出叠加，边境地区治理真空扩大；对旅行者而言属于应整体回避的高风险区域。',
    watch: '政变与选举、边境军事行动、外部安全力量部署变化。',
  },
  {
    id: 'sudan',
    name: '苏丹与非洲之角',
    region: '非洲',
    level: 'high',
    patterns: [/sudan/i, /khartoum/i, /darfur/i, /south sudan/i, /ethiopia/i, /tigray/i, /苏丹/, /喀土穆/, /达尔富尔/, /南苏丹/, /埃塞俄比亚/, /提格雷/],
    context: '苏丹内战造成大规模流离失所与饥荒风险，非洲之角同时受干旱、粮食价格与边境冲突影响。',
    watch: '停火谈判、援助通道、邻国难民流动与粮食安全评估。',
  },
  {
    id: 'drc',
    name: '刚果（金）东部',
    region: '非洲',
    level: 'high',
    patterns: [/congo/i, /drc/i, /goma/i, /kivu/i, /m23/i, /刚果/, /戈马/, /基伍/, /M23/i],
    context: '东部武装冲突与资源争夺持续，人道准入困难；周边国家关系紧张会放大区域风险。',
    watch: 'M23 与政府军态势、人道走廊、区域调解机制。',
  },
  {
    id: 'haiti',
    name: '海地与加勒比治安',
    region: '美洲',
    level: 'high',
    patterns: [/haiti/i, /port-au-prince/i, /gang/i, /海地/, /太子港/, /黑帮/],
    context: '国家治理与帮派暴力危机叠加，绑架与治安事件风险极高；属于应整体回避的旅行目的地。',
    watch: '安全部队部署、选举进程、人道局势与邻国边境政策。',
  },
  {
    id: 'venezuela',
    name: '委内瑞拉与圭亚那',
    region: '美洲',
    level: 'medium',
    patterns: [/venezuela/i, /caracas/i, /guyana/i, /essequibo/i, /委内瑞拉/, /加拉加斯/, /圭亚那/, /埃塞奎博/],
    context: '政治危机、经济制裁与埃塞奎博领土争议交织；边境军事姿态与移民流动是主要观察点。',
    watch: '选举与制裁、边境军事部署、移民与能源合作。',
  },
  {
    id: 'trade',
    name: '全球贸易与关税',
    region: '全球',
    level: 'medium',
    patterns: [/tariff/i, /trade war/i, /wto/i, /export control/i, /sanction/i, /supply chain/i, /关税/, /贸易战/, /出口管制/, /制裁/, /供应链/],
    context: '关税、出口管制与产业政策正在重塑供应链；企业库存、航运运价与通胀预期是最快的传导渠道。',
    watch: '主要经济体关税清单、关键矿产与芯片出口管制、航运运价与库存周期。',
  },
  {
    id: 'energy',
    name: '能源与航运价格',
    region: '全球',
    level: 'medium',
    patterns: [/opec/i, /oil price/i, /natural gas/i, /lng/i, /shipping/i, /tanker/i, /欧佩克/, /油价/, /天然气/, /航运/, /油轮/],
    context: '地缘冲突通过能源设施、海峡通行与保险成本传导到价格；欧洲天然气库存与亚洲需求是季节性变量。',
    watch: 'OPEC+ 产量、霍尔木兹/曼德海峡通行、欧洲库存与亚洲补库。',
  },
  {
    id: 'climate',
    name: '极端天气与气候风险',
    region: '全球',
    level: 'medium',
    patterns: [/climate/i, /flood/i, /drought/i, /heatwave/i, /wildfire/i, /typhoon/i, /hurricane/i, /气候/, /洪水/, /干旱/, /高温/, /野火/, /台风/, /飓风/],
    context: '极端天气频率上升，对粮食、保险、能源与基础设施形成复合冲击；旅行规划需要把天气窗口纳入路线。',
    watch: '主要粮仓天气、灾害保险损失、能源需求峰值与港口中断。',
  },
  {
    id: 'tech',
    name: '人工智能与科技监管',
    region: '全球',
    level: 'low',
    patterns: [/artificial intelligence/i, /\bai\b/i, /chip/i, /semiconductor/i, /nvidia/i, /人工智能/, /芯片/, /半导体/, /英伟达/],
    context: '算力、芯片出口管制与 AI 监管成为大国竞争的新前沿；供应链与资本市场对政策信号高度敏感。',
    watch: '先进制程出口限制、算力投资、AI 安全与版权监管。',
  },
];

const REGION_PATTERNS = [
  ['中东', /(middle east|israel|gaza|iran|lebanon|syria|iraq|yemen|saudi|emirates|qatar|jordan|中东|以色列|加沙|伊朗|黎巴嫩|叙利亚|伊拉克|也门|沙特|阿联酋|卡塔尔|约旦)/i],
  ['欧洲', /(europe|eu |ukraine|russia|nato|germany|france|britain|poland|欧洲|欧盟|乌克兰|俄罗斯|北约|德国|法国|英国|波兰)/i],
  ['亚太', /(asia|china|japan|korea|taiwan|india|asean|pacific|中国|日本|韩国|朝鲜|台湾|印度|东盟|亚太|太平洋)/i],
  ['美洲', /(america|united states|u\.s\.|canada|brazil|mexico|venezuela|haiti|美国|加拿大|巴西|墨西哥|委内瑞拉|海地|美洲)/i],
  ['非洲', /(africa|sudan|sahel|mali|niger|nigeria|congo|ethiopia|somalia|非洲|苏丹|萨赫勒|马里|尼日尔|尼日利亚|刚果|埃塞俄比亚|索马里)/i],
  ['大洋洲', /(australia|new zealand|pacific islands|澳大利亚|新西兰|太平洋岛国|大洋洲)/i],
];

const CATEGORY_ORDER = ['conflict', 'economy', 'climate', 'tech', 'china', 'health', 'world'];

function buildBriefing(news, region) {
  const items = news.sources.filter((item) => !item.fallback);
  const degraded = items.length === 0;
  const texts = items.map((item) => `${item.title} ${item.snippet}`);

  const hotspotHits = HOTSPOTS.map((hotspot) => {
    let count = 0;
    const samples = [];
    items.forEach((item, index) => {
      if (hotspot.patterns.some((pattern) => pattern.test(texts[index]))) {
        count += 1;
        if (samples.length < 3) samples.push(item);
      }
    });
    return { ...hotspot, count, samples };
  }).filter((hotspot) => hotspot.count > 0)
    .sort((a, b) => b.count - a.count);

  const regionCounts = REGION_PATTERNS.map(([name, pattern]) => {
    let count = 0;
    texts.forEach((text) => {
      if (pattern.test(text)) count += 1;
    });
    return { name, count };
  }).filter((entry) => entry.count > 0).sort((a, b) => b.count - a.count);

  const categoryCounts = CATEGORY_ORDER.map((key) => ({
    key,
    label: CATEGORY_LABELS[key] ?? key,
    count: items.filter((item) => item.category === key).length,
  })).filter((entry) => entry.count > 0).sort((a, b) => b.count - a.count);

  const conflictCount = categoryCounts.find((entry) => entry.key === 'conflict')?.count ?? 0;
  const signalCount = hotspotHits.reduce((sum, hotspot) => sum + hotspot.count, 0);
  const topCount = hotspotHits[0]?.count ?? 0;
  const riskScore = Math.min(92, Math.round(
    12
      + Math.min(24, conflictCount * 2.2)
      + Math.min(16, signalCount * 1.4)
      + Math.min(8, topCount * 1.2)
      + (region === '全球' ? 0 : 4),
  ));
  const riskLevel = riskScore >= 64 ? '高' : riskScore >= 42 ? '偏紧' : '温和';
  const riskTone = riskScore >= 64 ? 'high' : riskScore >= 42 ? 'medium' : 'low';

  const topRegions = regionCounts.slice(0, 3).map((entry) => `${entry.name}（${entry.count} 条）`).join('、') || '全球多地';
  const topCategories = categoryCounts.slice(0, 3).map((entry) => `${entry.label}（${entry.count} 条）`).join('、') || '综合';
  const sourceCount = new Set(items.map((item) => item.source)).size;

  const overview = degraded
    ? '本轮未取得可用的实时信源，以下研判只保留结构性分析框架。请在后端搜索服务恢复后刷新，或直接打开「全球快讯」中的常用信源入口核对。'
    : `本轮扫描聚合了 ${items.length} 条信源（${sourceCount} 家媒体），地区热度集中在${topRegions}，议题以${topCategories}为主。冲突与安全类信号 ${conflictCount} 条，识别出 ${hotspotHits.length} 个值得跟踪的热点。以下为机器辅助研判，不替代专业安全评估。`;

  const topHotspots = hotspotHits.slice(0, 6);
  const security = degraded
    ? '安全信号不可用。结构性观察点仍然是：大国军事互动、地区冲突的停火谈判、以及海上通道的通行成本。'
    : (() => {
      const lead = topHotspots[0];
      const second = topHotspots[1];
      const parts = [`冲突与安全类信号占 ${conflictCount} 条。`];
      if (lead) parts.push(`最集中的是「${lead.name}」（${lead.count} 条）：${lead.context}`);
      if (second) parts.push(`其次是「${second.name}」（${second.count} 条），需要防止局部事件通过联盟义务或航运通道外溢。`);
      else parts.push('暂未出现单一热点压倒性集中，说明风险更多表现为多点、低烈度的持续摩擦。');
      return parts.join('');
    })();

  const economy = (() => {
    const count = categoryCounts.find((entry) => entry.key === 'economy')?.count ?? 0;
    const lead = items.find((item) => item.category === 'economy');
    if (!count) return '本轮经济类信号较少。可继续观察关税清单、主要央行表态、油价与航运运价四个高频指标。';
    return `经济与市场类信号 ${count} 条${lead ? `，代表性标题为「${lead.title}」` : ''}。地缘风险主要通过能源价格、航运保险与供应链库存传导；若冲突热点同步升温，市场波动可能先于官方表态出现。`;
  })();

  const climate = (() => {
    const count = categoryCounts.find((entry) => entry.key === 'climate')?.count ?? 0;
    const lead = items.find((item) => item.category === 'climate');
    if (!count) return '本轮气候与能源信号较少。旅行与供应链仍需关注季节性台风、洪水与高温窗口。';
    return `气候与能源类信号 ${count} 条${lead ? `，代表性标题为「${lead.title}」` : ''}。极端天气正在成为与地缘风险叠加的“复合冲击”，对航班、铁路、港口与保险成本的影响往往滞后显现。`;
  })();

  const watchlist = [];
  topHotspots.slice(0, 4).forEach((hotspot) => watchlist.push(`${hotspot.name}：${hotspot.watch}`));
  watchlist.push('未来 72 小时：关注官方通报、主要市场开盘反应，以及是否出现跨国航运/航空改道。');
  if (region !== '全球') watchlist.push(`区域专项：继续核对 ${region} 地区本地媒体与使领馆安全提醒，避免只依赖单一语言信源。`);

  const headlines = (degraded ? [] : items).slice(0, 8).map((item) => ({
    title: item.title,
    url: item.url,
    source: item.source,
    category: item.category,
    categoryLabel: item.categoryLabel,
  }));

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    degraded,
    region,
    riskScore,
    riskLevel,
    riskTone,
    overview,
    security,
    economy,
    climate,
    hotspots: topHotspots.map((hotspot) => ({
      id: hotspot.id,
      name: hotspot.name,
      region: hotspot.region,
      level: hotspot.level,
      count: hotspot.count,
      context: hotspot.context,
      watch: hotspot.watch,
      samples: hotspot.samples.map((item) => ({ title: item.title, url: item.url, source: item.source })),
    })),
    regionCounts,
    categoryCounts,
    watchlist,
    headlines,
    sourceCount,
    itemCount: items.length,
    note: '自动聚合与规则化研判只用于快速建立态势感；涉及安全、签证与出行决策时，请以官方通告和原始信源为准。',
  };
}

/* ------------------------------------------------------------------ */
/* Travel data                                                         */
/* ------------------------------------------------------------------ */

const CITIES = {
  tokyo: {
    zh: '东京', en: 'Tokyo', cc: 'JP', country: '日本', lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo',
    transit: 'Suica / PASMO 交通卡',
    pois: [
      ['浅草寺', '台东区', 'culture', '雷门、仲见世通与浅草寺本堂，建议清晨到访避开人流。', 2],
      ['明治神宫', '涩谷区', 'nature', '都心森林中的神道圣地，代代木公园可顺路散步。', 2],
      ['涩谷十字路口与展望台', '涩谷', 'landmark', '感受东京的密度，傍晚登展望台看城市亮灯。', 2],
      ['筑地场外市场', '中央区', 'food', '寿司、玉子烧与海鲜早餐，午前最有烟火气。', 2],
      ['上野公园与博物馆群', '台东区', 'culture', '东京国立博物馆、西洋美术馆与不忍池可组合半天。', 3],
      ['银座', '中央区', 'shopping', '老牌百货、文具与餐饮集中，适合雨天备选。', 2],
      ['新宿御苑', '新宿区', 'nature', '城市中心的庭园绿地，春季樱花与秋季红叶皆宜。', 2],
    ],
  },
  kyoto: {
    zh: '京都', en: 'Kyoto', cc: 'JP', country: '日本', lat: 35.0116, lon: 135.7681, tz: 'Asia/Tokyo',
    transit: '巴士一日券 + 地铁',
    pois: [
      ['清水寺', '东山区', 'culture', '沿二年坂、三年坂上行，清晨或傍晚更从容。', 2.5],
      ['伏见稻荷大社', '伏见区', 'culture', '千本鸟居，越往山上走人越少，预留 2–3 小时。', 3],
      ['岚山竹林与渡月桥', '右京区', 'nature', '竹林、保津川与天龙寺可组成半日路线。', 3],
      ['金阁寺', '北区', 'culture', '池畔倒影是经典视角，可与龙安寺同游。', 1.5],
      ['祇园与花见小路', '东山区', 'culture', '黄昏后的町家街景，注意不要打扰居民与艺伎。', 1.5],
      ['锦市场', '中京区', 'food', '京都食材与小吃集中，适合午餐或下午茶。', 1.5],
      ['哲学之道', '左京区', 'nature', '沿水渠散步，连接银阁寺与南禅寺。', 2],
    ],
  },
  seoul: {
    zh: '首尔', en: 'Seoul', cc: 'KR', country: '韩国', lat: 37.5665, lon: 126.978, tz: 'Asia/Seoul',
    transit: 'T-money 交通卡',
    pois: [
      ['景福宫', '钟路区', 'culture', '换岗仪式与宫阙建筑，可与北村同游。', 2],
      ['北村韩屋村', '钟路区', 'culture', '传统韩屋街巷，保持安静并避开居民区。', 1.5],
      ['明洞', '中区', 'shopping', '美妆、街头小吃与购物，晚上最热闹。', 2],
      ['南山首尔塔', '龙山区', 'landmark', '傍晚上山看夜景，可步行或乘缆车。', 2],
      ['弘大', '麻浦区', 'nightlife', '独立音乐、咖啡馆与年轻人的夜间街区。', 2],
      ['广藏市场', '钟路区', 'food', '绿豆煎饼、生拌牛肉与麻药紫菜包饭。', 1.5],
      ['汉江公园', '汝矣岛', 'nature', '租自行车、吃炸鸡看日落，适合放慢节奏。', 2],
    ],
  },
  beijing: {
    zh: '北京', en: 'Beijing', cc: 'CN', country: '中国', lat: 39.9042, lon: 116.4074, tz: 'Asia/Shanghai',
    transit: '地铁 + 步行',
    pois: [
      ['故宫', '东城区', 'culture', '中轴线核心，务必提前预约，预留半天。', 4],
      ['天坛', '东城区', 'culture', '祈年殿与回音壁，清晨可见本地晨练。', 2],
      ['慕田峪长城', '怀柔区', 'landmark', '比八达岭更舒展，建议早出发并穿防滑鞋。', 5],
      ['颐和园', '海淀区', 'nature', '昆明湖与长廊，适合半日慢游。', 3],
      ['什刹海与南锣鼓巷', '西城区', 'culture', '胡同、酒吧与小吃，傍晚适合散步。', 2.5],
      ['798 艺术区', '朝阳区', 'culture', '当代艺术空间与工业遗存，展览更换频繁。', 2.5],
      ['前门与大栅栏', '西城区', 'food', '老字号与胡同餐饮，适合安排一顿正餐。', 2],
    ],
  },
  shanghai: {
    zh: '上海', en: 'Shanghai', cc: 'CN', country: '中国', lat: 31.2304, lon: 121.4737, tz: 'Asia/Shanghai',
    transit: '地铁 + 轮渡',
    pois: [
      ['外滩', '黄浦区', 'landmark', '万国建筑与陆家嘴天际线，日落到亮灯最佳。', 1.5],
      ['豫园', '黄浦区', 'culture', '江南园林与城隍庙商圈，建议早上避峰。', 2],
      ['武康路与衡复风貌区', '徐汇区', 'culture', '梧桐街区、老洋房与咖啡馆，适合步行。', 2.5],
      ['上海博物馆', '黄浦区', 'culture', '青铜、陶瓷与书画馆藏，雨天首选。', 2.5],
      ['陆家嘴', '浦东新区', 'landmark', '登高看天际线，滨江步道适合傍晚。', 2],
      ['田子坊', '黄浦区', 'shopping', '石库门里弄与小店，适合下午闲逛。', 1.5],
      ['朱家角', '青浦区', 'nature', '水乡半日游，地铁 17 号线可达。', 4],
    ],
  },
  chengdu: {
    zh: '成都', en: 'Chengdu', cc: 'CN', country: '中国', lat: 30.5728, lon: 104.0668, tz: 'Asia/Shanghai',
    transit: '地铁 + 打车',
    pois: [
      ['成都大熊猫繁育研究基地', '成华区', 'family', '早上开园时熊猫最活跃，务必早到。', 3],
      ['宽窄巷子', '青羊区', 'culture', '清代街巷与茶馆，适合傍晚慢逛。', 2],
      ['武侯祠与锦里', '武侯区', 'culture', '三国文化与小吃的组合，晚上灯景更好。', 2.5],
      ['人民公园', '青羊区', 'culture', '鹤鸣茶社喝盖碗茶、体验采耳。', 2],
      ['杜甫草堂', '青羊区', 'culture', '竹林与诗史堂，环境清幽。', 2],
      ['太古里', '锦江区', 'shopping', '现代商业与古寺相邻，餐饮选择多。', 2],
      ['青城山', '都江堰市', 'nature', '道教名山与森林步道，安排一日往返。', 5],
    ],
  },
  hongkong: {
    zh: '香港', en: 'Hong Kong', cc: 'HK', country: '中国香港', lat: 22.3193, lon: 114.1694, tz: 'Asia/Hong_Kong',
    transit: '八达通 + 天星小轮',
    pois: [
      ['太平山顶', '中西区', 'landmark', '山顶缆车与凌霄阁，黄昏上山看维港。', 2.5],
      ['天星小轮与维港', '尖沙咀', 'landmark', '几港币的经典航线，日落时段最佳。', 1],
      ['旺角与油麻地', '九龙', 'food', '街头小吃、庙街夜市与老香港街景。', 3],
      ['大屿山天坛大佛', '大屿山', 'culture', '昂坪缆车与宝莲禅寺，安排半日。', 4],
      ['中环半山扶梯', '中西区', 'culture', '涂鸦、咖啡馆与老街，适合步行。', 2],
      ['赤柱', '南区', 'nature', '海边市集与餐厅，节奏比市区慢。', 2.5],
      ['西贡', '西贡区', 'nature', '海鲜街与离岛徒步，适合好天气。', 4],
    ],
  },
  singapore: {
    zh: '新加坡', en: 'Singapore', cc: 'SG', country: '新加坡', lat: 1.3521, lon: 103.8198, tz: 'Asia/Singapore',
    transit: 'EZ-Link / 银联闪付',
    pois: [
      ['滨海湾花园', '滨海湾', 'nature', '超级树与冷室，傍晚灯光秀值得等待。', 2.5],
      ['鱼尾狮公园', '滨海湾', 'landmark', '经典城市合影点，可与滨海湾步道串联。', 1],
      ['圣淘沙', '南部岛屿', 'family', '海滩、环球影城与缆车，适合亲子。', 4],
      ['牛车水', '唐人街', 'food', '麦士威熟食中心与佛牙寺，午餐好去处。', 2],
      ['小印度', '小印度', 'culture', '色彩街区、香料与印度餐饮。', 1.5],
      ['甘榜格南', '甘榜格南', 'culture', '苏丹回教堂、哈芝巷与独立小店。', 2],
      ['夜间动物园', '万礼', 'family', '夜间导览车，适合安排一晚。', 3],
    ],
  },
  bangkok: {
    zh: '曼谷', en: 'Bangkok', cc: 'TH', country: '泰国', lat: 13.7563, lon: 100.5018, tz: 'Asia/Bangkok',
    transit: 'BTS 轻轨 + 湄南河船',
    pois: [
      ['大皇宫与玉佛寺', '拍那空', 'culture', '着装需遮肩过膝，早上避暑避峰。', 2.5],
      ['卧佛寺与郑王庙', '拍那空', 'culture', '卧佛寺按摩学校与郑王庙日落，坐船串联。', 2.5],
      ['恰图恰周末市场', '乍都乍', 'shopping', '只在周末开放，手工艺品与小吃密集。', 3],
      ['暹罗商圈', '暹罗', 'shopping', '购物中心与美食广场，雨天备选。', 2],
      ['考山路', '拉达那哥欣', 'nightlife', '背包客街区，夜间气氛热闹。', 1.5],
      ['湄南河游船', '湄南河', 'landmark', '傍晚乘船看寺庙与城市天际线。', 1.5],
      ['安帕瓦水上市场', '夜功府', 'food', '半日车程，周末傍晚最热闹。', 5],
    ],
  },
  bali: {
    zh: '巴厘岛', en: 'Bali', cc: 'ID', country: '印度尼西亚', lat: -8.4095, lon: 115.1889, tz: 'Asia/Makassar',
    transit: '包车 / 网约车',
    pois: [
      ['乌布皇宫与市场', '乌布', 'culture', '传统舞蹈表演与手工艺市场，适合住乌布。', 2],
      ['德格拉朗梯田', '乌布', 'nature', '清晨光线最好，可结合秋千与咖啡馆。', 2],
      ['圣泉寺', '坦帕西林', 'culture', '圣泉沐浴仪式，需着装得体。', 1.5],
      ['乌鲁瓦图寺', '乌鲁瓦图', 'culture', '断崖海景与火舞表演，傍晚最热门。', 2.5],
      ['金巴兰海滩', '金巴兰', 'food', '海鲜晚餐与日落，预留交通时间。', 2],
      ['水明漾', '水明漾', 'shopping', '设计小店、咖啡馆与海滩俱乐部。', 2.5],
      ['努沙佩尼达', '离岛', 'nature', '断崖与浮潜一日游，船程较长。', 8],
    ],
  },
  paris: {
    zh: '巴黎', en: 'Paris', cc: 'FR', country: '法国', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris',
    transit: 'Navigo / 地铁单程票',
    pois: [
      ['埃菲尔铁塔', '第七区', 'landmark', '登塔或战神广场野餐，傍晚整点闪灯。', 2.5],
      ['卢浮宫', '第一区', 'culture', '提前预约，挑重点展线，避免全天疲劳。', 3.5],
      ['西岱岛与圣母院', '第四区', 'culture', '塞纳河畔、圣礼拜堂与旧城街区。', 2.5],
      ['蒙马特', '第十八区', 'culture', '圣心堂、画家广场与阶梯街巷。', 2.5],
      ['奥赛博物馆', '第七区', 'culture', '印象派馆藏，与卢浮宫二选一或分两天。', 2.5],
      ['塞纳河游船', '塞纳河', 'landmark', '夜间游船看两岸建筑亮灯。', 1.5],
      ['玛黑区', '第三/四区', 'food', '犹太街區、独立小店与咖啡馆。', 2.5],
    ],
  },
  london: {
    zh: '伦敦', en: 'London', cc: 'GB', country: '英国', lat: 51.5072, lon: -0.1276, tz: 'Europe/London',
    transit: 'Oyster / 非接触式银行卡',
    pois: [
      ['大英博物馆', '布鲁姆斯伯里', 'culture', '免费入场，重点看罗塞塔石碑与亚洲馆。', 3],
      ['塔桥与伦敦塔', '塔桥', 'landmark', '河岸步行与城堡历史，安排半天。', 3],
      ['西敏寺与大本钟', '西敏', 'landmark', '沿白厅与圣詹姆斯公园串联。', 2],
      ['白金汉宫', '西敏', 'landmark', '查看换岗时间，提前占位。', 1.5],
      ['泰特现代', '南岸', 'culture', '当代艺术与千禧桥，南岸步道适合傍晚。', 2.5],
      ['考文特花园', '西区', 'shopping', '街头表演、市集与剧院区。', 2],
      ['格林威治', '格林威治', 'nature', '本初子午线、海事博物馆与公园。', 3],
    ],
  },
  rome: {
    zh: '罗马', en: 'Rome', cc: 'IT', country: '意大利', lat: 41.9028, lon: 12.4964, tz: 'Europe/Rome',
    transit: '地铁 + 步行',
    pois: [
      ['斗兽场与古罗马广场', '古罗马区', 'culture', '联票提前预约，穿舒适的鞋。', 3.5],
      ['梵蒂冈与圣彼得大教堂', '梵蒂冈', 'culture', '博物馆需预约，着装得体。', 4],
      ['万神殿与纳沃纳广场', '历史中心', 'culture', '步行串联喷泉与巴洛克广场。', 2.5],
      ['特雷维喷泉', '历史中心', 'landmark', '清晨人少，投币许愿。', 0.5],
      ['博尔盖塞美术馆', '博尔盖塞', 'culture', '预约制，贝尼尼雕塑不可错过。', 2],
      ['台伯河畔', '台伯河', 'food', '傍晚散步，寻找本地 trattoria。', 2],
      ['阿皮亚古道', '南部', 'nature', '古罗马大道与地下墓穴，安排半日。', 3],
    ],
  },
  barcelona: {
    zh: '巴塞罗那', en: 'Barcelona', cc: 'ES', country: '西班牙', lat: 41.3874, lon: 2.1686, tz: 'Europe/Madrid',
    transit: 'T-Casual 十次票',
    pois: [
      ['圣家堂', '扩展区', 'culture', '务必提前预约，下午西晒彩窗最震撼。', 2.5],
      ['巴特罗之家与米拉之家', '扩展区', 'culture', '高迪建筑双联票，安排在上午。', 3],
      ['哥特区', '老城区', 'culture', '罗马城墙、大教堂与窄巷，适合步行。', 2.5],
      ['毕加索博物馆', '波恩区', 'culture', '了解艺术家早期创作，周边小店可逛。', 2],
      ['巴塞罗内塔海滩', '海滨', 'nature', '地中海边散步，傍晚吃海鲜饭。', 2],
      ['桂尔公园', '格拉西亚', 'nature', '高迪马赛克与城市全景，预约入园。', 2.5],
      ['蒙特惠奇山', '蒙特惠奇', 'landmark', '城堡、花园与魔幻喷泉。', 3],
    ],
  },
  istanbul: {
    zh: '伊斯坦布尔', en: 'Istanbul', cc: 'TR', country: '土耳其', lat: 41.0082, lon: 28.9784, tz: 'Europe/Istanbul',
    transit: 'Istanbulkart',
    pois: [
      ['圣索菲亚大教堂', '苏丹艾哈迈德', 'culture', '建筑与历史层叠，注意礼拜时间。', 2],
      ['蓝色清真寺', '苏丹艾哈迈德', 'culture', '免费入场，着装得体，避开礼拜。', 1.5],
      ['托普卡帕宫', '苏丹艾哈迈德', 'culture', '奥斯曼宫廷与博斯普鲁斯景观。', 3],
      ['大巴扎', '法提赫', 'shopping', '迷宫式市场，砍价并保管好财物。', 2],
      ['加拉塔塔', '贝伊奥卢', 'landmark', '登塔看金角湾，傍晚排队较长。', 1.5],
      ['博斯普鲁斯游船', '海峡', 'nature', '从水面看两岸宫殿与社区。', 2],
      ['巴拉特街区', '法提赫', 'culture', '彩色房屋、咖啡馆与街头摄影。', 2],
    ],
  },
  newyork: {
    zh: '纽约', en: 'New York', cc: 'US', country: '美国', lat: 40.7128, lon: -74.006, tz: 'America/New_York',
    transit: 'OMNY / 地铁',
    pois: [
      ['自由女神与埃利斯岛', '港口', 'landmark', '渡轮提前订票，安检排队较长。', 4],
      ['大都会艺术博物馆', '上东区', 'culture', '馆藏庞大，挑两三个展馆即可。', 3.5],
      ['中央公园', '曼哈顿', 'nature', '从南端走到水库，租自行车更省力。', 2.5],
      ['时代广场', '中城', 'landmark', '夜间霓虹，注意人流与财物。', 1],
      ['高线公园', '切尔西', 'nature', '空中步道连接切尔西市场。', 2],
      ['布鲁克林大桥', '布鲁克林', 'landmark', '从布鲁克林侧走回曼哈顿，日落最佳。', 2],
      ['现代艺术博物馆 MoMA', '中城', 'culture', '现代艺术馆藏，雨天备选。', 2.5],
    ],
  },
  sanfrancisco: {
    zh: '旧金山', en: 'San Francisco', cc: 'US', country: '美国', lat: 37.7749, lon: -122.4194, tz: 'America/Los_Angeles',
    transit: 'Clipper / Muni',
    pois: [
      ['金门大桥', '金门', 'landmark', '骑行或步行过桥，注意海风。', 2.5],
      ['渔人码头', '渔人码头', 'food', '酸面包汤与海狮，游客较多。', 2],
      ['恶魔岛', '海湾', 'culture', '需提前订票，音频导览很完整。', 3],
      ['九曲花街', '俄罗斯山', 'landmark', '短暂停留，可顺路看城市坡道。', 0.5],
      ['联合广场', '市中心', 'shopping', '购物与交通枢纽，注意周边治安。', 1.5],
      ['金门公园', '里士满', 'nature', '笛洋美术馆、植物园与日本茶园。', 3],
      ['穆尔红木森林', '米尔谷', 'nature', '半日车程，穿防滑鞋。', 4],
    ],
  },
  sydney: {
    zh: '悉尼', en: 'Sydney', cc: 'AU', country: '澳大利亚', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney',
    transit: 'Opal 卡 / 非接触支付',
    pois: [
      ['悉尼歌剧院', '环形码头', 'landmark', '外观与导览，傍晚沿港散步。', 2],
      ['海港大桥', '岩石区', 'landmark', '步行过桥或攀桥，风大注意保暖。', 2],
      ['邦迪海滩', '邦迪', 'nature', '海岸步道连接库吉，适合半日。', 3],
      ['岩石区', '岩石区', 'culture', '周末市集、老酒吧与殖民建筑。', 2],
      ['达令港', '达令港', 'family', '水族馆、海事博物馆与亲子餐饮。', 3],
      ['蓝山', '蓝山', 'nature', '一日往返，看三姐妹峰与桉树林。', 8],
      ['曼利', '曼利', 'nature', '渡轮穿越海港，海滩节奏更慢。', 4],
    ],
  },
  dubai: {
    zh: '迪拜', en: 'Dubai', cc: 'AE', country: '阿联酋', lat: 25.2048, lon: 55.2708, tz: 'Asia/Dubai',
    transit: 'Nol 卡 + 出租车',
    pois: [
      ['哈利法塔', '市中心', 'landmark', '日落时段登塔，提前预约。', 2],
      ['迪拜购物中心', '市中心', 'shopping', '水族馆、喷泉与购物，室内避暑。', 3],
      ['朱美拉清真寺', '朱美拉', 'culture', '需参加导览，着装得体。', 1.5],
      ['沙漠冲沙', '沙漠保护区', 'nature', '傍晚出发，含越野、骑骆驼与晚餐。', 5],
      ['迪拜老城与香料市场', '德拉', 'culture', '阿法迪历史区、木船与市集。', 2.5],
      ['棕榈岛', '棕榈岛', 'landmark', '观景台或海滩俱乐部，注意交通。', 2.5],
      ['未来博物馆', '市中心', 'culture', '需提前预约，建筑本身值得一看。', 2],
    ],
  },
  cairo: {
    zh: '开罗', en: 'Cairo', cc: 'EG', country: '埃及', lat: 30.0444, lon: 31.2357, tz: 'Africa/Cairo',
    transit: '网约车 / 包车',
    pois: [
      ['吉萨金字塔与狮身人面像', '吉萨', 'landmark', '清晨到访避暑避峰，准备防晒。', 4],
      ['埃及博物馆', '解放广场', 'culture', '图坦卡蒙展品与法老文物，安排半天。', 3],
      ['老开罗与悬空教堂', '老开罗', 'culture', '科普特教堂群与宗教历史街区。', 2],
      ['哈利利市场', '伊斯兰区', 'shopping', '香料、铜器与咖啡馆，注意砍价。', 2.5],
      ['萨拉丁城堡', '城堡区', 'culture', '穆罕默德·阿里清真寺与城市全景。', 2.5],
      ['尼罗河游船', '尼罗河', 'food', '晚餐游船看夜景，选择正规运营。', 2],
      ['孟菲斯与萨卡拉', '萨卡拉', 'culture', '阶梯金字塔与古都遗址，安排半日。', 4],
    ],
  },
  capetown: {
    zh: '开普敦', en: 'Cape Town', cc: 'ZA', country: '南非', lat: -33.9249, lon: 18.4241, tz: 'Africa/Johannesburg',
    transit: '租车 / 网约车',
    pois: [
      ['桌山', '桌山', 'nature', '缆车或徒步，风大时可能停运。', 3],
      ['好望角', '开普半岛', 'nature', '一日车程，沿途看海岸与企鹅。', 6],
      ['博尔德斯企鹅滩', '西蒙镇', 'family', '木栈道看非洲企鹅，保持距离。', 1.5],
      ['V&A 码头', '海滨', 'food', '餐厅、购物与港口景色，安全区域。', 2.5],
      ['罗本岛', '桌湾', 'culture', '曼德拉监狱遗址，需提前订票。', 4],
      ['康斯坦博西植物园', '南部', 'nature', '本地植物与森林步道，适合野餐。', 3],
      ['斯泰伦博斯酒庄', '酒乡', 'food', '葡萄酒品鉴与乡村午餐，安排一日。', 6],
    ],
  },
  rio: {
    zh: '里约热内卢', en: 'Rio de Janeiro', cc: 'BR', country: '巴西', lat: -22.9068, lon: -43.1729, tz: 'America/Sao_Paulo',
    transit: '地铁 + 网约车',
    pois: [
      ['基督像', '科尔科瓦多山', 'landmark', '清晨上山避开人流与云雾。', 3],
      ['面包山', '乌尔卡', 'landmark', '缆车看海湾，日落时段最佳。', 2.5],
      ['科帕卡巴纳海滩', '南区', 'nature', '海滨散步，注意财物与夜间安全。', 2],
      ['塞拉隆阶梯', '拉帕', 'culture', '彩色瓷砖阶梯，白天到访。', 1],
      ['马拉卡纳球场', '北区', 'culture', '足球圣地，参观需查开放时间。', 2],
      ['圣特蕾莎街区', '圣特蕾莎', 'culture', '山城电车、艺术工作室与咖啡馆。', 2.5],
      ['伊帕内玛海滩', '南区', 'food', '日落与海滨餐饮，适合傍晚。', 2],
    ],
  },
  mexicocity: {
    zh: '墨西哥城', en: 'Mexico City', cc: 'MX', country: '墨西哥', lat: 19.4326, lon: -99.1332, tz: 'America/Mexico_City',
    transit: '地铁 + 网约车',
    pois: [
      ['宪法广场与大教堂', '历史中心', 'culture', '阿兹特克遗址与殖民建筑层叠。', 2.5],
      ['人类学博物馆', '查普尔特佩克', 'culture', '玛雅与阿兹特克馆藏，安排半天。', 3.5],
      ['特奥蒂瓦坎', '城郊', 'culture', '日月金字塔，清晨出发避暑。', 5],
      ['弗里达·卡罗故居', '科约阿坎', 'culture', '蓝屋需预约，周边街区适合散步。', 2.5],
      ['查普尔特佩克公园', '查普尔特佩克', 'nature', '城市绿肺、城堡与博物馆群。', 2.5],
      ['罗马区', '罗马', 'food', '咖啡馆、餐厅与装饰艺术建筑。', 2],
      ['索奇米尔科', '南部', 'nature', '运河游船与花卉市场，周末热闹。', 3],
    ],
  },
  vancouver: {
    zh: '温哥华', en: 'Vancouver', cc: 'CA', country: '加拿大', lat: 49.2827, lon: -123.1207, tz: 'America/Vancouver',
    transit: 'Compass 卡',
    pois: [
      ['斯坦利公园', '市中心', 'nature', '海堤步道骑行，看图腾柱与狮门桥。', 3],
      ['格兰维尔岛', '福溪', 'food', '公共市场、手工艺与渡轮。', 2.5],
      ['卡皮拉诺吊桥', '北温哥华', 'nature', '吊桥与雨林步道，适合半日。', 3],
      ['松鸡山', '北温哥华', 'nature', '缆车与山顶步道，冬季可滑雪。', 4],
      ['煤气镇', '市中心', 'culture', '蒸汽钟、砖石建筑与独立小店。', 1.5],
      ['英吉利湾', '西区', 'nature', '日落海滩与海滨步道。', 1.5],
      ['维多利亚一日游', '温哥华岛', 'culture', '渡轮往返，花园与老城，安排整日。', 10],
    ],
  },
};

const CITY_ALIASES = new Map();
function addCityAlias(value, key) {
  const normalized = normalizeCityName(value);
  if (normalized) CITY_ALIASES.set(normalized, key);
}
for (const [key, city] of Object.entries(CITIES)) {
  addCityAlias(key, key);
  addCityAlias(city.en, key);
  addCityAlias(city.zh, key);
  addCityAlias(`${city.zh}市`, key);
}
// Traditional/Japanese/Korean spellings returned by some geocoders.
const EXTRA_CITY_ALIASES = {
  tokyo: ['東京', '东京都'],
  kyoto: ['京都府'],
  seoul: ['首爾', '서울'],
  beijing: ['北京市'],
  shanghai: ['上海市'],
  hongkong: ['香港特別行政區', '香港特别行政区'],
  singapore: ['新加坡市'],
  rome: ['羅馬', '罗马市'],
  newyork: ['紐約', '纽约市', 'New York City'],
  sanfrancisco: ['舊金山', '旧金山市', 'San Francisco City'],
  capetown: ['開普敦', '开普敦市', 'Cape Town City'],
  mexicocity: ['墨西哥城', 'Ciudad de México', 'CDMX'],
  rio: ['里約熱內盧', '里约热内卢市', 'Rio de Janeiro'],
  istanbul: ['伊斯坦堡', 'İstanbul'],
  cairo: ['開羅', '开罗市'],
  dubai: ['杜拜'],
};
for (const [key, names] of Object.entries(EXTRA_CITY_ALIASES)) {
  for (const name of names) addCityAlias(name, key);
}

function normalizeCityName(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[，,].*$/, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

function localCity(query) {
  const normalized = normalizeCityName(query);
  if (!normalized) return null;
  const key = CITY_ALIASES.get(normalized);
  if (key) return { ...CITIES[key], key, source: 'local' };
  for (const [candidate, cityKey] of CITY_ALIASES) {
    if (candidate.length > 3 && normalized.includes(candidate)) {
      return { ...CITIES[cityKey], key: cityKey, source: 'local' };
    }
  }
  return null;
}

// Known high-risk capitals: resolve them locally even when geocoding is down,
// so the planner can refuse a conflict zone instead of returning an upstream error.
const RISK_CITY_HINTS = {
  '德黑兰': { zh: '德黑兰', en: 'Tehran', cc: 'IR', country: '伊朗', lat: 35.6892, lon: 51.389, tz: 'Asia/Tehran' },
  tehran: { zh: '德黑兰', en: 'Tehran', cc: 'IR', country: '伊朗', lat: 35.6892, lon: 51.389, tz: 'Asia/Tehran' },
  '基辅': { zh: '基辅', en: 'Kyiv', cc: 'UA', country: '乌克兰', lat: 50.4501, lon: 30.5234, tz: 'Europe/Kyiv' },
  kyiv: { zh: '基辅', en: 'Kyiv', cc: 'UA', country: '乌克兰', lat: 50.4501, lon: 30.5234, tz: 'Europe/Kyiv' },
  kiev: { zh: '基辅', en: 'Kyiv', cc: 'UA', country: '乌克兰', lat: 50.4501, lon: 30.5234, tz: 'Europe/Kyiv' },
  '莫斯科': { zh: '莫斯科', en: 'Moscow', cc: 'RU', country: '俄罗斯', lat: 55.7558, lon: 37.6173, tz: 'Europe/Moscow' },
  moscow: { zh: '莫斯科', en: 'Moscow', cc: 'RU', country: '俄罗斯', lat: 55.7558, lon: 37.6173, tz: 'Europe/Moscow' },
  '明斯克': { zh: '明斯克', en: 'Minsk', cc: 'BY', country: '白俄罗斯', lat: 53.9006, lon: 27.559, tz: 'Europe/Minsk' },
  minsk: { zh: '明斯克', en: 'Minsk', cc: 'BY', country: '白俄罗斯', lat: 53.9006, lon: 27.559, tz: 'Europe/Minsk' },
  '耶路撒冷': { zh: '耶路撒冷', en: 'Jerusalem', cc: 'IL', country: '以色列', lat: 31.7683, lon: 35.2137, tz: 'Asia/Jerusalem' },
  jerusalem: { zh: '耶路撒冷', en: 'Jerusalem', cc: 'IL', country: '以色列', lat: 31.7683, lon: 35.2137, tz: 'Asia/Jerusalem' },
  '大马士革': { zh: '大马士革', en: 'Damascus', cc: 'SY', country: '叙利亚', lat: 33.5138, lon: 36.2765, tz: 'Asia/Damascus' },
  damascus: { zh: '大马士革', en: 'Damascus', cc: 'SY', country: '叙利亚', lat: 33.5138, lon: 36.2765, tz: 'Asia/Damascus' },
  '贝鲁特': { zh: '贝鲁特', en: 'Beirut', cc: 'LB', country: '黎巴嫩', lat: 33.8938, lon: 35.5018, tz: 'Asia/Beirut' },
  beirut: { zh: '贝鲁特', en: 'Beirut', cc: 'LB', country: '黎巴嫩', lat: 33.8938, lon: 35.5018, tz: 'Asia/Beirut' },
  '萨那': { zh: '萨那', en: 'Sanaa', cc: 'YE', country: '也门', lat: 15.3694, lon: 44.191, tz: 'Asia/Aden' },
  sanaa: { zh: '萨那', en: 'Sanaa', cc: 'YE', country: '也门', lat: 15.3694, lon: 44.191, tz: 'Asia/Aden' },
  '喀土穆': { zh: '喀土穆', en: 'Khartoum', cc: 'SD', country: '苏丹', lat: 15.5007, lon: 32.5599, tz: 'Africa/Khartoum' },
  khartoum: { zh: '喀土穆', en: 'Khartoum', cc: 'SD', country: '苏丹', lat: 15.5007, lon: 32.5599, tz: 'Africa/Khartoum' },
  '的黎波里': { zh: '的黎波里', en: 'Tripoli', cc: 'LY', country: '利比亚', lat: 32.8872, lon: 13.1913, tz: 'Africa/Tripoli' },
  tripoli: { zh: '的黎波里', en: 'Tripoli', cc: 'LY', country: '利比亚', lat: 32.8872, lon: 13.1913, tz: 'Africa/Tripoli' },
  '摩加迪沙': { zh: '摩加迪沙', en: 'Mogadishu', cc: 'SO', country: '索马里', lat: 2.0469, lon: 45.3182, tz: 'Africa/Mogadishu' },
  mogadishu: { zh: '摩加迪沙', en: 'Mogadishu', cc: 'SO', country: '索马里', lat: 2.0469, lon: 45.3182, tz: 'Africa/Mogadishu' },
  '喀布尔': { zh: '喀布尔', en: 'Kabul', cc: 'AF', country: '阿富汗', lat: 34.5553, lon: 69.2075, tz: 'Asia/Kabul' },
  kabul: { zh: '喀布尔', en: 'Kabul', cc: 'AF', country: '阿富汗', lat: 34.5553, lon: 69.2075, tz: 'Asia/Kabul' },
  '平壤': { zh: '平壤', en: 'Pyongyang', cc: 'KP', country: '朝鲜', lat: 39.0392, lon: 125.7625, tz: 'Asia/Pyongyang' },
  pyongyang: { zh: '平壤', en: 'Pyongyang', cc: 'KP', country: '朝鲜', lat: 39.0392, lon: 125.7625, tz: 'Asia/Pyongyang' },
  '仰光': { zh: '仰光', en: 'Yangon', cc: 'MM', country: '缅甸', lat: 16.8409, lon: 96.1735, tz: 'Asia/Yangon' },
  yangon: { zh: '仰光', en: 'Yangon', cc: 'MM', country: '缅甸', lat: 16.8409, lon: 96.1735, tz: 'Asia/Yangon' },
  '太子港': { zh: '太子港', en: 'Port-au-Prince', cc: 'HT', country: '海地', lat: 18.5944, lon: -72.3074, tz: 'America/Port-au-Prince' },
  'portauprince': { zh: '太子港', en: 'Port-au-Prince', cc: 'HT', country: '海地', lat: 18.5944, lon: -72.3074, tz: 'America/Port-au-Prince' },
};

async function geocode(ctx, query) {
  const local = localCity(query);
  if (local) return local;
  const hinted = RISK_CITY_HINTS[normalizeCityName(query)];
  if (hinted) return { ...hinted, source: 'risk-hint' };
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=zh&format=json`;
  const data = await fetchJson(ctx, url, 10000);
  const results = Array.isArray(data?.results) ? data.results : [];
  if (!results.length) return null;
  const scored = results.map((result) => ({
    result,
    score: (result.feature_code === 'PPLC' ? 120 : result.feature_code === 'PPLA' ? 80 : 0)
      + Math.log10((result.population ?? 0) + 10) * 9,
  })).sort((a, b) => b.score - a.score);
  const best = scored[0].result;
  const matched = localCity(best.name);
  return {
    ...(matched ?? {}),
    zh: matched?.zh ?? best.name,
    en: matched?.en ?? best.name,
    cc: best.country_code,
    country: best.country,
    admin: best.admin1,
    lat: best.latitude,
    lon: best.longitude,
    tz: best.timezone,
    population: best.population,
    source: 'geocoding',
  };
}

const RISK = {
  UA: { level: 'red', name: '乌克兰', region: '欧洲', note: '俄乌战争持续，空袭、前线交火与基础设施中断风险高。', avoid: '全境' },
  RU: { level: 'red', name: '俄罗斯', region: '欧洲', note: '俄乌战争、制裁与安全管制叠加，外国旅行者面临较高不确定性。', avoid: '全境' },
  BY: { level: 'red', name: '白俄罗斯', region: '欧洲', note: '受俄乌战争外溢与边境安全影响，建议暂缓旅行。', avoid: '全境' },
  IL: { level: 'red', name: '以色列', region: '中东', note: '加沙战事与北部边境冲突持续，安全局势高度不稳定。', avoid: '全境' },
  PS: { level: 'red', name: '巴勒斯坦', region: '中东', note: '加沙战事与约旦河西岸暴力风险极高，不适合旅行。', avoid: '全境' },
  LB: { level: 'red', name: '黎巴嫩', region: '中东', note: '黎以边境冲突与国内安全风险叠加，建议暂缓。', avoid: '全境' },
  SY: { level: 'red', name: '叙利亚', region: '中东', note: '冲突与武装团体活动持续，基础设施与治安风险高。', avoid: '全境' },
  IR: { level: 'red', name: '伊朗', region: '中东', note: '地区紧张、制裁与安全管制使旅行风险显著上升。', avoid: '全境' },
  YE: { level: 'red', name: '也门', region: '中东', note: '内战与外部军事行动持续，属于高风险冲突地区。', avoid: '全境' },
  SD: { level: 'red', name: '苏丹', region: '非洲', note: '内战造成大规模流离失所与饥荒风险。', avoid: '全境' },
  SS: { level: 'red', name: '南苏丹', region: '非洲', note: '武装冲突、治安与人道风险高。', avoid: '全境' },
  LY: { level: 'red', name: '利比亚', region: '非洲', note: '政治分裂与武装冲突持续，旅行风险高。', avoid: '全境' },
  SO: { level: 'red', name: '索马里', region: '非洲', note: '武装袭击与海盗风险高，不建议旅行。', avoid: '全境' },
  AF: { level: 'red', name: '阿富汗', region: '亚洲', note: '安全局势与治理风险极高，不建议旅行。', avoid: '全境' },
  KP: { level: 'red', name: '朝鲜', region: '亚洲', note: '旅行限制与安全风险极高，不建议前往。', avoid: '全境' },
  MM: { level: 'red', name: '缅甸', region: '亚洲', note: '内战与武装冲突持续，多个地区处于紧急状态。', avoid: '全境' },
  HT: { level: 'red', name: '海地', region: '美洲', note: '帮派暴力与绑架风险极高，属于应整体回避的目的地。', avoid: '全境' },
  ML: { level: 'red', name: '马里', region: '非洲', note: '萨赫勒武装冲突与绑架风险高。', avoid: '全境' },
  BF: { level: 'red', name: '布基纳法索', region: '非洲', note: '武装叛乱与边境冲突持续。', avoid: '全境' },
  NE: { level: 'red', name: '尼日尔', region: '非洲', note: '政变后安全局势脆弱，边境与农村地区风险高。', avoid: '全境' },
  TD: { level: 'red', name: '乍得', region: '非洲', note: '边境冲突与治安风险高。', avoid: '全境' },
  CF: { level: 'red', name: '中非共和国', region: '非洲', note: '武装团体活动与治理真空，旅行风险高。', avoid: '全境' },
  CD: { level: 'red', name: '刚果（金）', region: '非洲', note: '东部武装冲突持续，全国旅行风险差异大；为安全起见整体回避。', avoid: '全境' },
  IQ: { level: 'amber', name: '伊拉克', region: '中东', note: '整体较前稳定，但民兵活动、爆炸袭击与边境风险仍存。', avoid: '安巴尔、尼尼微、基尔库克争议区及边境' },
  PK: { level: 'amber', name: '巴基斯坦', region: '亚洲', note: '主要城市可旅行，但边境与部分省份安全风险高。', avoid: '俾路支省、开伯尔-普什图省边境、克什米尔控制线' },
  NG: { level: 'amber', name: '尼日利亚', region: '非洲', note: '拉各斯等城市可旅行，东北与西北部武装风险高。', avoid: '博尔诺、约贝、阿达马瓦、扎姆法拉等东北/西北州' },
  CM: { level: 'amber', name: '喀麦隆', region: '非洲', note: '英语区冲突与北部武装活动持续。', avoid: '西北、西南英语区及极北省' },
  ET: { level: 'amber', name: '埃塞俄比亚', region: '非洲', note: '部分地区冲突与治安风险仍高，需严格核对路线。', avoid: '阿姆哈拉、提格雷边境及索马里州部分区域' },
  MZ: { level: 'amber', name: '莫桑比克', region: '非洲', note: '南部与海岸度假区可旅行，北部武装冲突需回避。', avoid: '德尔加杜角省' },
  PH: { level: 'amber', name: '菲律宾', region: '亚洲', note: '多数海岛可旅行，南部部分地区存在武装与绑架风险。', avoid: '棉兰老岛部分地区、苏禄群岛' },
  TH: { level: 'amber', name: '泰国', region: '亚洲', note: '旅游区整体成熟，泰南边境有持续安全事件。', avoid: '也拉、北大年、那拉提瓦、宋卡南部' },
  TR: { level: 'amber', name: '土耳其', region: '欧洲', note: '主要旅游城市可旅行，东南边境需回避。', avoid: '叙利亚/伊拉克边境 30 公里范围' },
  JO: { level: 'amber', name: '约旦', region: '中东', note: '整体安全，但边境地区受地区冲突外溢影响。', avoid: '叙利亚/伊拉克边境' },
  EG: { level: 'amber', name: '埃及', region: '非洲', note: '旅游区可旅行，西奈北部与西部沙漠边境需回避。', avoid: '北西奈、西部沙漠边境' },
  KE: { level: 'amber', name: '肯尼亚', region: '非洲', note: '游猎与海岸可旅行，东北边境有恐怖袭击风险。', avoid: '曼德拉、加里萨、拉穆北部边境' },
  UG: { level: 'amber', name: '乌干达', region: '非洲', note: '多数地区可旅行，西部边境需谨慎。', avoid: '刚果（金）边境地区' },
  BI: { level: 'amber', name: '布隆迪', region: '非洲', note: '政治与治安风险存在，需关注当地局势。', avoid: '刚果（金）边境' },
  DZ: { level: 'amber', name: '阿尔及利亚', region: '非洲', note: '北部城市可旅行，南部沙漠边境风险高。', avoid: '南部撒哈拉边境' },
  IN: { level: 'amber', name: '印度', region: '亚洲', note: '多数旅游区可旅行，克什米尔控制线附近需回避。', avoid: '克什米尔控制线附近' },
  BD: { level: 'amber', name: '孟加拉国', region: '亚洲', note: '主要城市可旅行，东南部山区有安全风险。', avoid: '吉大港山区' },
  CO: { level: 'amber', name: '哥伦比亚', region: '美洲', note: '主要城市与加勒比海岸可旅行，部分农村地区仍有武装团体。', avoid: '部分农村与边境省份' },
  MX: { level: 'amber', name: '墨西哥', region: '美洲', note: '旅游区整体成熟，部分州暴力犯罪风险高。', avoid: '格雷罗、锡那罗亚、塔毛利帕斯等州' },
  VE: { level: 'amber', name: '委内瑞拉', region: '美洲', note: '经济与治安危机叠加，旅行需高度谨慎。', avoid: '边境与部分城市治安高风险区' },
  ZA: { level: 'amber', name: '南非', region: '非洲', note: '旅游区可旅行，但抢劫、盗窃与绑架风险需重视。', avoid: '避免夜间步行与偏远地区' },
  PE: { level: 'amber', name: '秘鲁', region: '美洲', note: '主要旅游区可旅行，社会抗议可能造成交通中断。', avoid: '抗议与偏远矿区' },
  BO: { level: 'amber', name: '玻利维亚', region: '美洲', note: '旅游区可旅行，抗议与道路封锁可能影响行程。', avoid: '抗议热点与偏远边境' },
};

const DEFAULT_RISK = {
  level: 'green',
  name: '目的地',
  region: '全球',
  note: '未列入高风险名单。出行前仍请核对使领馆安全提醒、签证与入境政策。',
  avoid: '无特别整体回避区域',
};

function riskFor(cc, country) {
  const key = String(cc ?? '').toUpperCase();
  if (RISK[key]) return { ...RISK[key], code: key };
  return { ...DEFAULT_RISK, name: country || DEFAULT_RISK.name, code: key };
}

const ALTERNATIVES = {
  '欧洲': [
    ['第比利斯', '格鲁吉亚', '高加索山城、老城与葡萄酒文化'],
    ['埃里温', '亚美尼亚', '苏联现代主义、修道院与咖啡馆'],
    ['贝尔格莱德', '塞尔维亚', '多瑙河夜生活与巴尔干历史'],
    ['波尔图', '葡萄牙', '河谷、瓷砖与慢节奏海岸'],
  ],
  '中东': [
    ['迪拜', '阿联酋', '海湾门户、沙漠与城市天际线'],
    ['马斯喀特', '阿曼', '海湾低调首都、峡湾与老市场'],
    ['多哈', '卡塔尔', '博物馆、滨海大道与沙漠一日游'],
    ['马拉喀什', '摩洛哥', '麦地那、庭院与阿特拉斯山'],
  ],
  '非洲': [
    ['内罗毕', '肯尼亚', '游猎门户与城市国家公园'],
    ['桑给巴尔', '坦桑尼亚', '印度洋海岸、香料与石头城'],
    ['基加利', '卢旺达', '山城秩序、咖啡与大猩猩雨林'],
    ['开普敦', '南非', '桌山、海岸与葡萄酒乡'],
  ],
  '亚洲': [
    ['东京', '日本', '城市密度、饮食与四季景观'],
    ['首尔', '韩国', '宫殿、设计街区与夜间饮食'],
    ['新加坡', '新加坡', '多元文化、花园城市与东南亚门户'],
    ['河内', '越南', '老城、咖啡与下龙湾门户'],
  ],
  '美洲': [
    ['温哥华', '加拿大', '山海城市、雨林与岛屿'],
    ['哥斯达黎加', '哥斯达黎加', '雨林、火山与太平洋海岸'],
    ['圣地亚哥', '智利', '安第斯山、葡萄酒谷与海岸'],
    ['布宜诺斯艾利斯', '阿根廷', '探戈、牛排与欧洲式街区'],
  ],
  '大洋洲': [
    ['悉尼', '澳大利亚', '海港、歌剧院与海岸步道'],
    ['皇后镇', '新西兰', '湖山、徒步与冒险活动'],
    ['墨尔本', '澳大利亚', '咖啡、艺术与海岸公路'],
    ['斐济', '斐济', '珊瑚礁、岛屿与慢节奏度假'],
  ],
};

const BUDGETS = {
  value: { label: '经济', hotel: [25, 55], food: [12, 28], transport: [4, 10], tickets: [6, 18] },
  comfort: { label: '舒适', hotel: [70, 140], food: [30, 65], transport: [10, 25], tickets: [15, 35] },
  luxury: { label: '奢华', hotel: [180, 420], food: [70, 160], transport: [30, 80], tickets: [30, 70] },
};

const PACE_LABELS = { relaxed: '轻松', balanced: '均衡', packed: '紧凑' };
const TYPE_LABELS = {
  culture: '人文', nature: '自然', food: '美食', shopping: '购物',
  family: '亲子', nightlife: '夜生活', landmark: '地标',
};

function genericPois(cityName) {
  return [
    [`${cityName}老城 / 历史中心`, '市中心', 'culture', '从城市起源地开始，步行看老建筑、广场与本地生活。', 2],
    [`${cityName}城市博物馆`, '文化区', 'culture', '先建立城市历史脉络，再决定后续路线。', 2],
    ['中央市场 / 本地市集', '老城', 'food', '找当地食材、小吃与咖啡，避开正午高峰。', 1.5],
    ['城市公园 / 河畔', '绿地', 'nature', '放慢节奏，观察本地人的日常。', 1.5],
    ['观景台 / 天际线', '高处', 'landmark', '傍晚看城市亮灯，提前查开放时间。', 1.5],
    ['设计街区 / 独立小店', '创意区', 'shopping', '逛独立品牌、书店与咖啡馆。', 2],
    ['本地餐馆一条街', '夜生活区', 'food', '选一家本地人多的店，尝试当季菜。', 2],
  ];
}

function attachPois(city) {
  if (Array.isArray(city.pois) && city.pois.length) return city;
  return { ...city, pois: genericPois(city.zh || city.en || '目的地') };
}

const WEATHER_CODES = {
  0: '晴', 1: '大致晴朗', 2: '局部多云', 3: '阴', 45: '雾', 48: '雾凇',
  51: '小毛毛雨', 53: '毛毛雨', 55: '强毛毛雨', 56: '冻毛毛雨', 57: '强冻毛毛雨',
  61: '小雨', 63: '中雨', 65: '大雨', 66: '冻雨', 67: '强冻雨',
  71: '小雪', 73: '中雪', 75: '大雪', 77: '雪粒',
  80: '阵雨', 81: '强阵雨', 82: '暴雨', 85: '阵雪', 86: '强阵雪',
  95: '雷暴', 96: '雷暴伴冰雹', 99: '强雷暴伴冰雹',
};

async function getWeather(ctx, city) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}`
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max'
    + '&timezone=auto&forecast_days=7';
  const data = await fetchJson(ctx, url, 10000);
  const daily = data?.daily;
  if (!daily?.time?.length) return { days: [], summary: '天气服务暂不可用，出发前请再查一次预报。' };
  const days = daily.time.map((date, index) => ({
    date,
    code: daily.weather_code?.[index] ?? 0,
    text: WEATHER_CODES[daily.weather_code?.[index] ?? 0] ?? '多云',
    tmax: daily.temperature_2m_max?.[index] ?? null,
    tmin: daily.temperature_2m_min?.[index] ?? null,
    rain: daily.precipitation_probability_max?.[index] ?? null,
    wind: daily.wind_speed_10m_max?.[index] ?? null,
  }));
  const tmax = Math.max(...days.map((day) => Number(day.tmax ?? 0)));
  const tmin = Math.min(...days.map((day) => Number(day.tmin ?? 0)));
  const rainy = days.filter((day) => Number(day.rain ?? 0) >= 50).length;
  const summary = `未来 7 天约 ${Math.round(tmin)}–${Math.round(tmax)}°C，${rainy ? `${rainy} 天降雨概率较高` : '降雨概率总体不高'}。`;
  return { days, summary };
}

function packingList(weather, city) {
  const tips = [
    '舒适的步行鞋（老城与博物馆日步行量大）',
    '可重复使用的水杯与轻便雨具',
    '转换插头与充电宝',
    '护照、签证/入境材料与保险单的电子备份',
  ];
  const tmax = weather?.days?.length ? Math.max(...weather.days.map((day) => Number(day.tmax ?? 0))) : 22;
  const tmin = weather?.days?.length ? Math.min(...weather.days.map((day) => Number(day.tmin ?? 0))) : 12;
  const rainy = weather?.days?.some((day) => Number(day.rain ?? 0) >= 50);
  if (tmax >= 30) tips.push('透气速干衣物、防晒霜与遮阳帽');
  if (tmin <= 8) tips.push('保暖中层、外套与围巾');
  if (rainy) tips.push('折叠伞或轻便防水外套');
  if (city?.cc === 'JP') tips.push('少量现金（部分小店不收卡）与 Suica/PASMO');
  if (city?.cc === 'CN') tips.push('身份证件、移动支付与常用出行 App');
  return [...new Set(tips)];
}

function pickInterests(raw) {
  const allowed = new Set(['culture', 'nature', 'food', 'shopping', 'family', 'nightlife']);
  return String(raw ?? '').split(',').map((item) => item.trim()).filter((item) => allowed.has(item));
}

function sortPois(pois, interests) {
  const weight = (poi) => {
    const index = interests.indexOf(poi[2]);
    return index === -1 ? 50 : index;
  };
  return [...pois].sort((a, b) => weight(a) - weight(b));
}

function makeActivity(poi, time) {
  return {
    time,
    title: poi[0],
    area: poi[1],
    type: poi[2],
    typeLabel: TYPE_LABELS[poi[2]] ?? poi[2],
    detail: poi[3],
    duration: poi[4],
  };
}

function buildItinerary(city, days, pace, interests, weather) {
  const pois = sortPois(attachPois(city).pois, interests);
  const perDay = pace === 'relaxed' ? 2 : pace === 'packed' ? 4 : 3;
  const itinerary = [];
  const themes = ['初识城市', '历史与地标', '博物馆与艺术', '自然与城市绿洲', '街区与市集', '近郊与在地生活', '美食与慢游', '自由探索'];
  let cursor = 0;
  const nextPoi = () => {
    if (!pois.length) return null;
    const poi = pois[cursor % pois.length];
    cursor += 1;
    return poi;
  };

  for (let index = 0; index < days; index += 1) {
    const day = index + 1;
    const isFirst = day === 1;
    const isLast = day === days && days > 1;
    const activities = [];
    if (isFirst) {
      activities.push({
        time: '上午', title: '抵达与入住', area: '住宿区', type: 'arrival', typeLabel: '抵达',
        detail: `抵达${city.zh || city.en}后先入住、寄存行李，熟悉周边交通与便利店；不要在第一程安排硬性预约。`, duration: 1.5,
      });
    }
    const slots = isLast ? ['上午', '下午'] : ['上午', '下午', '傍晚'];
    const wanted = isLast ? Math.min(2, perDay) : Math.min(perDay, 4);
    for (let i = 0; i < wanted; i += 1) {
      const poi = nextPoi();
      if (poi) activities.push(makeActivity(poi, slots[i % slots.length]));
    }
    if (isLast) {
      activities.push({
        time: '傍晚', title: '收尾与返程', area: '住宿区/机场', type: 'departure', typeLabel: '返程',
        detail: '预留退税、取行李与前往机场/车站的时间；国际航班建议提前 3 小时到达。', duration: 2,
      });
    } else if (activities.length < 3) {
      const poi = nextPoi();
      if (poi) activities.push(makeActivity(poi, '傍晚'));
    }
    const weatherTip = weather?.days?.[index]
      ? `当日参考：${weather.days[index].text}，${Math.round(weather.days[index].tmin ?? 0)}–${Math.round(weather.days[index].tmax ?? 0)}°C。`
      : '';
    const theme = isFirst ? '抵达与城市初印象' : isLast ? '收尾与返程' : themes[(day - 2) % themes.length];
    itinerary.push({
      day,
      theme,
      activities,
      transport: city.transit
        ? `以${city.transit}为主；跨区移动优先地铁/轨道，晚间回程使用正规网约车或出租车。`
        : '以地铁/公交 + 步行为主；跨区移动尽量在白天完成，晚间使用正规网约车。',
      tip: `${weatherTip}${isFirst ? '第一天的重点是适应时差与节奏。' : '热门景点建议提前在官方渠道预约；把最想去的点放在上午。'}`,
    });
  }
  return itinerary;
}

function buildBudget(days, budgetKey) {
  const budget = BUDGETS[budgetKey] ?? BUDGETS.comfort;
  const dailyLow = budget.hotel[0] + budget.food[0] + budget.transport[0] + budget.tickets[0];
  const dailyHigh = budget.hotel[1] + budget.food[1] + budget.transport[1] + budget.tickets[1];
  return {
    tier: budgetKey,
    label: budget.label,
    currency: 'USD',
    perDay: { low: dailyLow, high: dailyHigh },
    total: { low: dailyLow * days, high: dailyHigh * days },
    note: '按每人每天估算，含住宿、餐饮、市内交通与门票，不含国际机票、签证、保险与购物。实际价格随季节与城市差异较大。',
  };
}

/* ------------------------------------------------------------------ */
/* Flights, stays, platforms and ground transport                      */
/* ------------------------------------------------------------------ */

const ORIGIN_HUBS = [
  { name: '上海', code: 'SHA/PVG', short: 'SHA', lat: 31.2304, lon: 121.4737, aliases: ['上海', 'shanghai', 'sha', 'pvg'] },
  { name: '北京', code: 'PEK/PKX', short: 'BJS', lat: 39.9042, lon: 116.4074, aliases: ['北京', 'beijing', 'bjs', 'pek', 'pkx'] },
  { name: '广州', code: 'CAN', short: 'CAN', lat: 23.1291, lon: 113.2644, aliases: ['广州', 'guangzhou', 'can'] },
  { name: '深圳', code: 'SZX', short: 'SZX', lat: 22.5431, lon: 114.0579, aliases: ['深圳', 'shenzhen', 'szx'] },
  { name: '成都', code: 'CTU/TFU', short: 'CTU', lat: 30.5728, lon: 104.0668, aliases: ['成都', 'chengdu', 'ctu', 'tfu'] },
  { name: '杭州', code: 'HGH', short: 'HGH', lat: 30.2741, lon: 120.1551, aliases: ['杭州', 'hangzhou', 'hgh'] },
  { name: '南京', code: 'NKG', short: 'NKG', lat: 32.0603, lon: 118.7969, aliases: ['南京', 'nanjing', 'nkg'] },
  { name: '武汉', code: 'WUH', short: 'WUH', lat: 30.5928, lon: 114.3055, aliases: ['武汉', 'wuhan', 'wuh'] },
  { name: '西安', code: 'XIY', short: 'XIY', lat: 34.3416, lon: 108.9398, aliases: ['西安', "xi'an", 'xian', 'xiy'] },
  { name: '重庆', code: 'CKG', short: 'CKG', lat: 29.563, lon: 106.5516, aliases: ['重庆', 'chongqing', 'ckg'] },
  { name: '香港', code: 'HKG', short: 'HKG', lat: 22.3193, lon: 114.1694, aliases: ['香港', 'hongkong', 'hong kong', 'hkg'] },
  { name: '台北', code: 'TPE/TSA', short: 'TPE', lat: 25.033, lon: 121.5654, aliases: ['台北', 'taipei', 'tpe', 'tsa'] },
  { name: '厦门', code: 'XMN', short: 'XMN', lat: 24.4798, lon: 118.0894, aliases: ['厦门', 'xiamen', 'xmn'] },
  { name: '青岛', code: 'TAO', short: 'TAO', lat: 36.0671, lon: 120.3826, aliases: ['青岛', 'qingdao', 'tao'] },
  { name: '昆明', code: 'KMG', short: 'KMG', lat: 25.0389, lon: 102.7183, aliases: ['昆明', 'kunming', 'kmg'] },
  { name: '乌鲁木齐', code: 'URC', short: 'URC', lat: 43.8256, lon: 87.6168, aliases: ['乌鲁木齐', 'urumqi', 'urc'] },
];

const AIRPORT_INFO = {
  tokyo: { code: 'TYO', label: '成田 NRT / 羽田 HND' },
  kyoto: { code: 'KIX', label: '关西 KIX' },
  seoul: { code: 'SEL', label: '仁川 ICN / 金浦 GMP' },
  beijing: { code: 'BJS', label: '首都 PEK / 大兴 PKX' },
  shanghai: { code: 'SHA', label: '浦东 PVG / 虹桥 SHA' },
  chengdu: { code: 'CTU', label: '天府 TFU / 双流 CTU' },
  hongkong: { code: 'HKG', label: '香港 HKG' },
  singapore: { code: 'SIN', label: '樟宜 SIN' },
  bangkok: { code: 'BKK', label: '素万那普 BKK / 廊曼 DMK' },
  bali: { code: 'DPS', label: '伍拉·赖 DPS' },
  paris: { code: 'PAR', label: '戴高乐 CDG / 奥利 ORY' },
  london: { code: 'LON', label: '希思罗 LHR / 盖特威克 LGW' },
  rome: { code: 'ROM', label: '菲乌米奇诺 FCO / 钱皮诺 CIA' },
  barcelona: { code: 'BCN', label: '巴塞罗那 BCN' },
  istanbul: { code: 'IST', label: '伊斯坦布尔 IST / 萨比哈 SAW' },
  newyork: { code: 'NYC', label: '肯尼迪 JFK / 纽瓦克 EWR' },
  sanfrancisco: { code: 'SFO', label: '旧金山 SFO' },
  sydney: { code: 'SYD', label: '悉尼 SYD' },
  dubai: { code: 'DXB', label: '迪拜 DXB / 阿勒马克图姆 DWC' },
  cairo: { code: 'CAI', label: '开罗 CAI' },
  capetown: { code: 'CPT', label: '开普敦 CPT' },
  rio: { code: 'RIO', label: '加利昂 GIG / 桑托斯杜蒙特 SDU' },
  mexicocity: { code: 'MEX', label: '墨西哥城 MEX' },
  vancouver: { code: 'YVR', label: '温哥华 YVR' },
};

const STAY_AREAS = {
  tokyo: [
    ['新宿', '交通枢纽 / 夜生活', '第一次到东京、购物与夜生活', 'JR 山手线换乘方便，去箱根/河口湖也顺路', '选离歌舞伎町稍远的街区，晚上更安静', 1.15],
    ['涩谷', '年轻街区 / 潮流', '购物、夜生活、去横滨', '地铁银座线、半藏门线与 JR 多线', '十字路口周边很吵，可选代官山/南平台一侧', 1.2],
    ['上野', '博物馆 / 性价比', '亲子、预算有限、成田进出', '京成 Skyliner 直达成田，JR 多线', '晚间相对安静，餐饮选择略少', 0.9],
  ],
  kyoto: [
    ['京都站', '交通枢纽', '首访、短途与关西进出', 'JR、新干线、巴士总站都在站前', '方便但古都氛围弱，适合以交通为先', 1.0],
    ['祇园 / 东山', '古都体验', '人文、摄影、慢游', '巴士可达清水寺、八坂神社', '尊重居民与艺伎，部分小巷禁止拍摄', 1.3],
    ['河原町 / 乌丸', '餐饮 / 购物', '美食、夜生活、购物', '阪急与地铁乌丸线，步行到锦市场', '热闹方便，周末房价较高', 1.1],
  ],
  seoul: [
    ['明洞', '购物 / 首访', '购物、美食、第一次到首尔', '地铁 4 号线，机场巴士直达', '人流大，晚上较吵', 1.1],
    ['弘大', '年轻 / 夜生活', '夜生活、预算有限', '地铁 2 号线与机场线', '周末夜间热闹，睡眠浅的人慎选', 0.95],
    ['江南', '商务 / 品质', '商务、购物、品质酒店', '地铁 2/9 号线', '价格高，离传统景点稍远', 1.3],
  ],
  beijing: [
    ['东城 / 王府井', '老城 / 首访', '人文、购物、第一次到北京', '地铁 1/8 号线，步行到故宫', '景区周边人多，提前预约', 1.2],
    ['朝阳 / 三里屯', '现代 / 夜生活', '美食、购物、夜生活', '地铁 10 号线，打车方便', '高峰堵车，选靠地铁的酒店', 1.15],
    ['西城 / 什刹海', '胡同 / 慢游', '人文、摄影、慢节奏', '地铁 6/8 号线，胡同内步行', '晚上安静，部分民宿隔音一般', 1.0],
  ],
  shanghai: [
    ['人民广场 / 南京路', '首访 / 交通', '购物、人文、第一次到上海', '地铁 1/2/8 号线，去外滩步行可达', '人多，选离主街一条街的酒店', 1.15],
    ['静安', '品质 / 餐饮', '美食、购物、品质酒店', '地铁 2/7 号线，去机场方便', '价格高，商务客多', 1.25],
    ['徐汇 / 衡复', '街区 / 慢游', '人文、咖啡、步行', '地铁 1/10/11 号线', '梧桐区适合散步，部分老洋房无电梯', 1.1],
  ],
  chengdu: [
    ['春熙路 / 太古里', '市中心 / 购物', '首访、美食、购物', '地铁 2/3 号线', '热闹，晚上人流量大', 1.15],
    ['宽窄巷子', '老城 / 人文', '人文、美食、摄影', '地铁 4 号线', '游客多，选巷子外的酒店更安静', 1.05],
    ['人民公园', '本地生活', '慢游、茶馆、预算有限', '地铁 2 号线', '安静，餐饮选择不如市中心密集', 0.95],
  ],
  hongkong: [
    ['尖沙咀', '维港 / 购物', '首访、夜景、购物', '地铁荃湾线，天星小轮去中环', '酒店房间普遍偏小，选海景需加价', 1.2],
    ['中环 / 金钟', '商务 / 品质', '商务、购物、品质酒店', '地铁港岛线，机场快线直达', '价格高，坡多', 1.4],
    ['铜锣湾', '购物 / 美食', '购物、美食、夜生活', '地铁港岛线', '人多吵杂，适合喜欢热闹的人', 1.15],
  ],
  singapore: [
    ['滨海湾', '地标 / 品质', '首访、夜景、亲子', '地铁环线/市区线', '价格高，步行到景点方便', 1.35],
    ['乌节路', '购物 / 商务', '购物、商务、品质酒店', '地铁南北线', '方便但缺少老城氛围', 1.25],
    ['牛车水', '美食 / 性价比', '美食、人文、预算有限', '地铁东北线', '热闹，部分老酒店设施较旧', 0.95],
  ],
  bangkok: [
    ['暹罗', '购物 / 交通', '首访、购物、换乘', 'BTS 暹罗站，去机场与商圈方便', '高峰堵车，优先选 BTS 沿线', 1.1],
    ['素坤逸', '餐饮 / 夜生活', '美食、夜生活、长住', 'BTS 阿索克/娜娜，换乘方便', '选靠 BTS 的巷子，避免深巷', 1.05],
    ['老城 / 考山路', '人文 / 背包客', '人文、预算、夜生活', '湄南河船 + 步行', '晚上吵，寺庙区清晨更值得', 0.9],
  ],
  bali: [
    ['乌布', '稻田 / 人文', '人文、自然、瑜伽', '包车或摩托，离海滩较远', '适合住 2–3 晚，夜间餐饮选择少', 0.95],
    ['水明漾', '海滩 / 餐饮', '美食、夜生活、购物', '包车/Grab，堵车常见', '选离主路稍远的别墅更安静', 1.2],
    ['努沙杜瓦', '度假 / 亲子', '亲子、奢华、躺平', '包车为主，出行成本高', '安静但偏，适合度假酒店', 1.35],
  ],
  paris: [
    ['玛黑区', '老城 / 设计', '人文、购物、夜生活', '地铁 1/8 号线，步行到塞纳河', '价格高，部分街道晚上较吵', 1.3],
    ['拉丁区', '学术 / 河畔', '人文、美食、首访', '地铁 4/10 号线', '游客多，选小巷内的酒店', 1.2],
    ['歌剧院区', '交通 / 购物', '首访、购物、商务', '地铁 3/7/8 号线，去机场方便', '方便但精品小店少', 1.25],
  ],
  london: [
    ['西敏 / 维多利亚', '地标 / 交通', '首访、家庭、交通', '地铁环线/维多利亚线', '价格高，游客密集', 1.3],
    ['科文特花园', '剧院 / 餐饮', '美食、购物、剧院', '地铁皮卡迪利线', '晚上热闹，房间偏小', 1.25],
    ['南岸', '河景 / 文化', '人文、家庭、慢游', '地铁 Jubilee 线，沿河步行', '步行体验好，部分区域夜间较空', 1.15],
  ],
  rome: [
    ['历史中心 / 万神殿', '古迹 / 步行', '首访、人文、摄影', '步行 + 公交，景点密集', '价格高、街道吵，选小巷酒店', 1.3],
    ['梵蒂冈 / 普拉蒂', '博物馆 / 安静', '人文、家庭、博物馆', '地铁 A 线，步行到圣彼得', '安静，餐饮偏本地', 1.1],
    ['特拉斯提弗列', '餐饮 / 夜生活', '美食、夜生活、慢游', '公交/步行，过河到老城', '晚上热闹，选离主街稍远', 1.05],
  ],
  barcelona: [
    ['哥特区', '老城 / 历史', '人文、夜生活、首访', '地铁 L3/L4，步行到兰布拉', '巷子窄，夜间注意随身物品', 1.15],
    ['扩展区', '建筑 / 购物', '人文、购物、商务', '地铁 L2/L3/L4', '街区规整，适合步行', 1.2],
    ['格拉西亚', '街区 / 本地生活', '美食、慢游、预算', '地铁 L3，坡多', '本地氛围好，离海边稍远', 1.0],
  ],
  istanbul: [
    ['苏丹艾哈迈德', '古迹 / 首访', '人文、摄影、第一次到伊斯坦布尔', '电车 T1，步行到主要古迹', '游客多，晚上商铺关门后较安静', 1.15],
    ['贝伊奥卢', '餐饮 / 夜生活', '美食、夜生活、购物', '地铁 M2/隧道，坡多', '晚上热闹，选离酒吧街稍远', 1.05],
    ['卡拉柯伊', '设计 / 河景', '人文、咖啡、交通', '电车 T1/渡轮，去老城方便', '交通方便，周末人多', 1.2],
  ],
  newyork: [
    ['曼哈顿中城', '交通 / 地标', '首访、商务、剧院', '地铁多线，去机场方便', '吵、贵，选高层或靠东侧', 1.35],
    ['下城', '金融 / 历史', '商务、人文、首访', '地铁 4/5/R/W，步行到码头', '周末较安静，餐饮选择多', 1.25],
    ['布鲁克林', '街区 / 性价比', '美食、慢游、预算', '地铁 L/A/C，通勤 20–30 分钟', '选靠地铁的街区，夜间注意安全', 0.95],
  ],
  sanfrancisco: [
    ['联合广场', '购物 / 交通', '首访、购物、商务', '缆车/地铁，去机场方便', '市中心流浪者较多，注意随身物品', 1.25],
    ['渔人码头', '海景 / 家庭', '亲子、观光、海鲜', '缆车/公交，游客多', '晚上较冷，选有暖气的酒店', 1.15],
    ['教会区', '美食 / 街区', '美食、夜生活、本地生活', 'BART/公交，坡多', '街区氛围好，部分路段夜间较空', 1.0],
  ],
  sydney: [
    ['CBD / 环形码头', '地标 / 交通', '首访、商务、渡轮', '火车/渡轮，去机场方便', '价格高，周末商务区较安静', 1.3],
    ['岩石区', '历史 / 周末', '人文、美食、市场', '火车/渡轮，步行到歌剧院', '游客多，周末市集热闹', 1.25],
    ['邦迪', '海滩 / 年轻', '自然、夜生活、冲浪', '公交/打车，离市中心 20 分钟', '夏季房价高，注意防晒', 1.1],
  ],
  dubai: [
    ['迪拜市中心', '地标 / 购物', '首访、购物、夜景', '地铁红线，去机场方便', '贵，夏季室外很热', 1.3],
    ['码头区', '海景 / 餐饮', '家庭、夜生活、长住', '地铁/电车，步行道好', '离老城稍远，适合慢住', 1.2],
    ['朱美拉', '海滩 / 度假', '亲子、奢华、海滩', '打车为主，离地铁远', '度假酒店集中，出行成本高', 1.35],
  ],
  cairo: [
    ['扎马雷克', '餐饮 / 河景', '美食、人文、长住', '打车/地铁，过河到市中心', '晚上热闹，选离主路稍远', 1.05],
    ['市中心', '历史 / 交通', '首访、预算、博物馆', '地铁/打车，去解放广场方便', '吵，注意交通安全', 0.9],
    ['吉萨', '金字塔 / 家庭', '亲子、观光、金字塔', '打车为主，离市区较远', '看金字塔方便，夜间选择少', 0.95],
  ],
  capetown: [
    ['市中心 / 公司花园', '交通 / 首访', '首访、商务、预算', '步行/打车，去码头方便', '夜间注意安全，选有安保的酒店', 1.0],
    ['海角滨水区', '海景 / 购物', '家庭、美食、购物', '打车/公交，去桌山方便', '贵，游客多', 1.25],
    ['坎普斯湾', '海滩 / 度假', '自然、奢华、海滩', '打车为主，风大', '度假氛围好，离市区稍远', 1.3],
  ],
  rio: [
    ['科帕卡巴纳', '海滩 / 首访', '首访、夜生活、海滩', '地铁 1 号线，沿海步行', '注意随身物品，夜间选热闹路段', 1.15],
    ['伊帕内玛', '海滩 / 品质', '美食、购物、品质酒店', '地铁 1 号线', '贵，海滩人多', 1.3],
    ['圣特蕾莎', '山城 / 艺术', '人文、慢游、摄影', '打车/缆车，坡多', '街区有特色，夜间出行打车', 0.95],
  ],
  mexicocity: [
    ['罗马区', '餐饮 / 设计', '美食、人文、步行', '地铁/打车，街区适合散步', '选靠主街的酒店，晚上更安全', 1.15],
    ['康德萨', '绿树 / 餐饮', '美食、夜生活、品质', '地铁/打车，公园多', '贵，周末晚上热闹', 1.25],
    ['历史中心', '古迹 / 首访', '人文、预算、首访', '地铁 2 号线，步行到宪法广场', '人多，注意随身物品', 0.95],
  ],
  vancouver: [
    ['市中心', '交通 / 购物', '首访、商务、购物', '天车/步行，去机场方便', '贵，部分街区夜间较空', 1.25],
    ['煤气镇', '历史 / 餐饮', '人文、夜生活、设计', '天车/步行，去码头方便', '晚上较安静，餐饮选择多', 1.15],
    ['基斯兰奴', '海滩 / 本地生活', '自然、慢游、家庭', '公交/骑行，离市中心 15 分钟', '海滩好，停车难', 1.05],
  ],
};

const AIRPORT_TRANSFERS = {
  tokyo: [
    ['京成 Skyliner / N\'EX', '成田→上野/新宿；羽田→品川/滨松町，轨道最稳。', '40–90 分钟', '$15–$30'],
    ['机场利木津巴士', '直达主要酒店，行李多时省心；确认末班时间。', '60–120 分钟', '$10–$25'],
    ['出租车', '深夜或多人多行李时使用，费用较高。', '40–90 分钟', '$60–$200'],
  ],
  kyoto: [
    ['Haruka 特急', '关西机场→京都站，约 80 分钟，指定席更稳。', '75–90 分钟', '$20–$30'],
    ['机场巴士', '关西机场→京都站/部分酒店，行李多时方便。', '90–120 分钟', '$15–$25'],
    ['出租车 / 包车', '多人或深夜抵达时使用，提前确认价格。', '90–120 分钟', '$150–$250'],
  ],
  seoul: [
    ['AREX 机场铁路', '仁川→首尔站，普通车便宜、直达车更快。', '45–60 分钟', '$5–$10'],
    ['机场 limousine 巴士', '直达明洞/江南等主要酒店，适合行李多。', '60–90 分钟', '$10–$18'],
    ['出租车', '夜间或多人时使用；黑色模范车更贵。', '50–80 分钟', '$50–$90'],
  ],
  hongkong: [
    ['机场快线', '机场→香港站/九龙站，最快最稳。', '24–30 分钟', '$15–$20'],
    ['城巴 / 机场巴士', '覆盖港岛、九龙与新界，便宜但时间长。', '45–90 分钟', '$5–$8'],
    ['出租车', '按表收费，过海隧道另计；多人行李合适。', '30–50 分钟', '$40–$70'],
  ],
  singapore: [
    ['MRT 东西线', '樟宜机场→市区，换乘方便、便宜。', '30–45 分钟', '$2–$4'],
    ['机场穿梭巴士', '直达部分酒店，适合行李多。', '30–60 分钟', '$7–$12'],
    ['出租车 / Grab', '24 小时，夜间有附加费。', '20–35 分钟', '$15–$30'],
  ],
  bangkok: [
    ['Airport Rail Link', '素万那普→Phaya Thai，换 BTS 进市区。', '30–45 分钟', '$2–$4'],
    ['机场巴士 / 小巴', '覆盖考山路、暹罗等区域，便宜但看路况。', '45–90 分钟', '$3–$8'],
    ['出租车 / Grab', '走高速另付过路费，先确认打表或一口价。', '30–60 分钟', '$10–$25'],
  ],
  bali: [
    ['Grab / Blue Bird', '机场到水明漾/乌布，提前在 App 看价。', '30–90 分钟', '$8–$30'],
    ['酒店接送', '度假酒店多提供付费接送，最省心。', '30–90 分钟', '$15–$40'],
    ['出租车 / 包车', '认准正规柜台，避免无牌拉客。', '30–90 分钟', '$20–$50'],
  ],
  paris: [
    ['RER B', '戴高乐→巴黎北站/拉丁区，快但注意行李。', '35–50 分钟', '$12–$15'],
    ['Roissybus / 机场巴士', '戴高乐→歌剧院，适合酒店在右岸。', '60–75 分钟', '$15–$18'],
    ['出租车', '固定价区间，按官方指示排队。', '45–70 分钟', '$55–$75'],
  ],
  london: [
    ['Elizabeth line', '希思罗→市中心，速度快、可刷非接触卡。', '30–45 分钟', '$15–$20'],
    ['Heathrow Express', '帕丁顿最快，但价格高。', '15–20 分钟', '$30–$40'],
    ['出租车 / 网约车', '夜间或多人时使用，提前看预估价。', '45–80 分钟', '$60–$120'],
  ],
  rome: [
    ['Leonardo Express', '菲乌米奇诺→Termini，30 分钟直达。', '30–35 分钟', '$15–$18'],
    ['机场巴士', '到 Termini/梵蒂冈方向，便宜但看路况。', '50–70 分钟', '$7–$10'],
    ['出租车', '固定价到市中心，认准官方排队点。', '40–60 分钟', '$50–$60'],
  ],
  istanbul: [
    ['地铁 M11 / HAVABÜS', '新机场→市区，便宜但需换乘。', '45–75 分钟', '$2–$6'],
    ['机场穿梭巴士', '直达塔克西姆/苏丹艾哈迈德等区域。', '60–90 分钟', '$6–$12'],
    ['出租车 / 网约车', '优先用 App 或正规排队点，确认预估。', '45–75 分钟', '$20–$40'],
  ],
  newyork: [
    ['AirTrain + 地铁', 'JFK→曼哈顿，便宜但需换乘。', '60–90 分钟', '$10–$12'],
    ['机场巴士 / 长岛铁路', '看酒店位置选择，LIRR 更快。', '45–75 分钟', '$10–$20'],
    ['出租车 / 网约车', '固定价或按表，晚间加价。', '45–80 分钟', '$50–$90'],
  ],
  dubai: [
    ['地铁红线', '机场→市中心/码头区，干净便宜。', '30–50 分钟', '$2–$4'],
    ['机场巴士', '覆盖主要酒店，班次有限。', '45–75 分钟', '$3–$6'],
    ['出租车 / Careem', '24 小时，起步价与夜间费不同。', '20–40 分钟', '$10–$25'],
  ],
  cairo: [
    ['机场巴士', '到市中心/解放广场，便宜但看路况。', '45–75 分钟', '$2–$4'],
    ['出租车 / Careem', '用 App 看价，避免无牌拉客。', '30–60 分钟', '$5–$12'],
    ['酒店接送', '首访或深夜抵达最省心。', '30–60 分钟', '$15–$30'],
  ],
};

const TRAVEL_APPS = {
  JP: [
    { name: 'Google Maps', use: '地铁换乘、步行导航', url: 'https://maps.google.com/' },
    { name: '乘换案内', use: '日本铁路/地铁精确换乘', url: 'https://www.jorudan.co.jp/' },
    { name: 'Suica', use: '交通卡与便利店支付', url: 'https://www.jreast.co.jp/suica/' },
    { name: 'Tabelog', use: '餐厅评分与预约', url: 'https://tabelog.com/' },
    { name: 'Uber', use: '出租车叫车', url: 'https://www.uber.com/' },
  ],
  KR: [
    { name: 'Naver Map', use: '韩国地图与公交', url: 'https://map.naver.com/' },
    { name: 'KakaoMap', use: '步行/驾车导航', url: 'https://map.kakao.com/' },
    { name: 'Kakao T', use: '出租车叫车', url: 'https://www.kakaomobility.com/' },
    { name: 'T-money', use: '交通卡', url: 'https://www.tmoney.co.kr/' },
    { name: 'Papago', use: '中韩翻译', url: 'https://papago.naver.com/' },
  ],
  CN: [
    { name: '高德地图', use: '公交/地铁/打车', url: 'https://www.amap.com/' },
    { name: '百度地图', use: '步行与实时公交', url: 'https://map.baidu.com/' },
    { name: '滴滴出行', use: '网约车', url: 'https://www.didiglobal.com/' },
    { name: '铁路 12306', use: '高铁/火车票', url: 'https://www.12306.cn/' },
    { name: '大众点评', use: '餐厅与本地生活', url: 'https://www.dianping.com/' },
  ],
  SEA: [
    { name: 'Grab', use: '打车、外卖与支付', url: 'https://www.grab.com/' },
    { name: 'Google Maps', use: '地图与公交', url: 'https://maps.google.com/' },
    { name: 'Klook', use: '门票与一日游', url: 'https://www.klook.com/' },
    { name: 'Airalo', use: 'eSIM 上网', url: 'https://www.airalo.com/' },
    { name: 'Google Translate', use: '离线翻译', url: 'https://translate.google.com/' },
  ],
  EU: [
    { name: 'Google Maps', use: '地图与公交', url: 'https://maps.google.com/' },
    { name: 'Citymapper', use: '大城市公共交通', url: 'https://citymapper.com/' },
    { name: 'Omio', use: '跨国火车/巴士/航班', url: 'https://www.omio.com/' },
    { name: 'Trainline', use: '欧洲铁路票', url: 'https://www.thetrainline.com/' },
    { name: 'Bolt', use: '打车/滑板车', url: 'https://bolt.eu/' },
  ],
  US: [
    { name: 'Google Maps', use: '驾车与公交', url: 'https://maps.google.com/' },
    { name: 'Uber', use: '网约车', url: 'https://www.uber.com/' },
    { name: 'Lyft', use: '网约车备选', url: 'https://www.lyft.com/' },
    { name: 'Transit', use: '实时公交/地铁', url: 'https://transitapp.com/' },
    { name: 'Airalo', use: 'eSIM 上网', url: 'https://www.airalo.com/' },
  ],
  AU: [
    { name: 'Google Maps', use: '公交与驾车', url: 'https://maps.google.com/' },
    { name: 'Uber', use: '网约车', url: 'https://www.uber.com/' },
    { name: 'TripView', use: '悉尼/墨尔本公交', url: 'https://tripview.com.au/' },
    { name: 'Airalo', use: 'eSIM 上网', url: 'https://www.airalo.com/' },
  ],
  ME: [
    { name: 'Google Maps', use: '地图与公交', url: 'https://maps.google.com/' },
    { name: 'Careem', use: '中东打车/外卖', url: 'https://www.careem.com/' },
    { name: 'Uber', use: '网约车备选', url: 'https://www.uber.com/' },
    { name: 'Airalo', use: 'eSIM 上网', url: 'https://www.airalo.com/' },
  ],
  DEFAULT: [
    { name: 'Google Maps', use: '地图与公交', url: 'https://maps.google.com/' },
    { name: 'Uber', use: '网约车', url: 'https://www.uber.com/' },
    { name: 'Google Translate', use: '离线翻译', url: 'https://translate.google.com/' },
    { name: 'Airalo', use: 'eSIM 上网', url: 'https://www.airalo.com/' },
  ],
};

function resolveOrigin(input) {
  const raw = String(input ?? '').trim() || '上海';
  const normalized = normalizeCityName(raw);
  const hub = ORIGIN_HUBS.find((item) => item.aliases.some((alias) => normalizeCityName(alias) === normalized));
  return hub ?? { name: raw, code: '—', short: '', lat: null, lon: null };
}

function cityKeyFor(city) {
  if (city?.key && AIRPORT_INFO[city.key]) return city.key;
  const zh = normalizeCityName(city?.zh);
  const en = normalizeCityName(city?.en);
  for (const key of Object.keys(AIRPORT_INFO)) {
    const candidate = CITIES[key];
    if (!candidate) continue;
    if ((zh && normalizeCityName(candidate.zh) === zh) || (en && normalizeCityName(candidate.en) === en)) return key;
  }
  return null;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((value) => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)))) return null;
  const toRad = (value) => (Number(value) * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatHours(hours) {
  if (!Number.isFinite(hours)) return '视航线而定';
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return minutes >= 20 ? `约 ${whole} 小时 ${minutes} 分` : `约 ${whole} 小时`;
}

function flightPrice(distance, factor = 1) {
  const base = distance ? 60 + distance * 0.12 : 520;
  const low = Math.max(80, Math.round((base * 0.8 * factor) / 10) * 10);
  const high = Math.max(low + 60, Math.round((base * 1.6 * factor) / 10) * 10);
  return { low, high };
}

function carriersFor(cc) {
  const europe = new Set(['FR', 'GB', 'IT', 'ES', 'DE', 'NL', 'PT', 'GR', 'CH', 'AT', 'BE', 'DK', 'SE', 'NO', 'FI', 'IE', 'PL', 'CZ', 'HU']);
  if (cc === 'JP') return '东航/上航、全日空 ANA、日本航空 JAL、春秋航空';
  if (cc === 'KR') return '东航、大韩航空、韩亚航空、春秋航空';
  if (cc === 'TH') return '东航/南航、泰国国际航空、亚航、春秋';
  if (cc === 'SG') return '东航/南航、新加坡航空、酷航、亚航';
  if (cc === 'ID') return '南航/东航、鹰航、亚航、酷航';
  if (cc === 'MY') return '南航/东航、马航、亚航';
  if (cc === 'AE') return '国航/东航、阿联酋航空、卡塔尔航空';
  if (cc === 'TR') return '国航/东航、土耳其航空、阿联酋/卡塔尔中转';
  if (europe.has(cc)) return '国航/东航、汉莎/法航/荷航、卡塔尔/阿联酋中转';
  if (cc === 'US' || cc === 'CA') return '国航/东航、美联航/达美/加航、国泰/大韩中转';
  if (cc === 'AU') return '东航/南航、澳航、新加坡/香港中转';
  return '中国主要航司、目的地载旗航司、中东/香港中转';
}

function buildFlights(origin, city) {
  const from = resolveOrigin(origin);
  const key = cityKeyFor(city);
  const dest = AIRPORT_INFO[key] ?? { code: '—', label: '主要国际机场' };
  const distance = haversineKm(from.lat, from.lon, city.lat, city.lon);
  const directHours = distance ? Math.max(1.5, distance / 850 + 0.6) : null;
  const transferHours = directHours ? directHours + (distance > 8000 ? 4.5 : 3) : null;
  const longHaul = distance != null && distance > 10000;
  const carriers = carriersFor(city.cc);
  const directPrice = flightPrice(distance);
  const transferPrice = flightPrice(distance, 0.72);
  const budgetPrice = flightPrice(distance, 0.62);
  const options = [];

  options.push({
    kind: 'direct',
    title: longHaul ? '直飞（如有）' : '直飞优先',
    carriers,
    duration: formatHours(directHours),
    priceLow: directPrice.low,
    priceHigh: directPrice.high,
    pros: longHaul ? '总耗时最短，适合假期有限或不想折腾的行程。' : '总耗时最短，行李直挂，抵达当天状态更好。',
    cons: longHaul ? '长航线直飞班次少，价格通常明显高于中转。' : '旺季与周末价格高；部分二线城市不是每天有班。',
  });
  options.push({
    kind: 'transfer',
    title: '一次中转',
    carriers: '经香港/首尔/新加坡/多哈/迪拜等枢纽中转，常见组合',
    duration: formatHours(transferHours),
    priceLow: transferPrice.low,
    priceHigh: transferPrice.high,
    pros: '通常更便宜，部分枢纽可顺路停留或购物。',
    cons: '总时长增加 3–7 小时；注意行李是否直挂、转机签证与误机风险。',
  });
  if (distance == null || distance < 6000) {
    options.push({
      kind: 'budget',
      title: '廉航 / 红眼',
      carriers: '春秋、亚航、酷航等低成本航司（视航线）',
      duration: formatHours(directHours ? directHours + 0.3 : null),
      priceLow: budgetPrice.low,
      priceHigh: budgetPrice.high,
      pros: '价格最低，适合轻装短途与日期灵活的人。',
      cons: '行李、选座、餐食另计；红眼航班会影响第一天状态。',
    });
  }

  const fromCode = from.short || '';
  const toCode = (dest.code || '').split('/')[0].trim();
  const destinationName = city.zh || city.en || city.name || '目的地';
  const googleQuery = encodeURIComponent(`Flights from ${from.name} to ${destinationName}`);
  const search = [
    { name: 'Google Flights', url: `https://www.google.com/travel/flights?q=${googleQuery}`, note: '看航线全景与日期价格曲线' },
    {
      name: 'Skyscanner',
      url: fromCode && toCode && toCode !== '—' ? `https://www.skyscanner.net/transport/flights/${fromCode}/${toCode}/` : 'https://www.skyscanner.net/',
      note: '跨平台比价，选择日期后看含税总价',
    },
    {
      name: 'Kayak',
      url: fromCode && toCode && toCode !== '—' ? `https://www.kayak.com/flights/${fromCode}-${toCode}` : 'https://www.kayak.com/flights',
      note: '组合比价，适合查中转方案',
    },
    {
      name: '去哪儿',
      url: `https://flight.qunar.com/site/oneway_list.htm?searchDepartureAirport=${encodeURIComponent(from.name)}&searchArrivalAirport=${encodeURIComponent(destinationName)}`,
      note: '中国出发含税价与退改规则',
    },
    { name: '携程', url: 'https://flights.ctrip.com/', note: '中文客服、发票与行程保障' },
    { name: '飞猪', url: 'https://www.fliggy.com/', note: '平台补贴与酒店打包' },
  ];

  return {
    origin: from.name,
    originCode: from.code,
    destinationCode: dest.code,
    airport: dest.label,
    distanceKm: distance,
    directPossible: distance == null || distance < 15000,
    directDuration: formatHours(directHours),
    options,
    search,
    note: '机票为经济舱含税参考区间，不含行李、选座与改签；实际价格随日期、转机与退改规则变化，以下单页为准。',
  };
}

function buildStays(city, days, budgetKey) {
  const budget = BUDGETS[budgetKey] ?? BUDGETS.comfort;
  const key = cityKeyFor(city);
  const curated = STAY_AREAS[key];
  let areas;
  if (curated?.length) {
    areas = curated.map(([name, vibe, bestFor, commute, tip, factor]) => ({
      name,
      vibe,
      bestFor,
      commute,
      tip,
      priceLow: Math.max(10, Math.round((budget.hotel[0] * factor) / 5) * 5),
      priceHigh: Math.max(15, Math.round((budget.hotel[1] * factor) / 5) * 5),
    }));
  } else {
    const seen = new Set();
    const names = [];
    for (const poi of attachPois(city).pois) {
      const area = String(poi[1] ?? '').trim();
      if (area && !seen.has(area)) { seen.add(area); names.push(area); }
      if (names.length >= 3) break;
    }
    areas = (names.length ? names : ['市中心', '老城/历史区', '安静住宅区']).map((name, index) => {
      const factor = index === 0 ? 1.1 : index === 1 ? 1.0 : 0.92;
      return {
        name,
        vibe: index === 0 ? '市中心 / 交通' : index === 1 ? '老城 / 本地生活' : '安静 / 性价比',
        bestFor: index === 0 ? '首访、交通优先' : index === 1 ? '人文、美食、步行' : '长住、预算控制',
        commute: index === 0 ? '靠近地铁/公交枢纽，去主要景点方便' : index === 1 ? '步行密度高，适合慢慢逛' : '通勤时间略长，换安静与价格',
        tip: '先用地图看酒店到最近地铁站/公交站的步行时间，再看评价中的隔音与热水。',
        priceLow: Math.max(10, Math.round((budget.hotel[0] * factor) / 5) * 5),
        priceHigh: Math.max(15, Math.round((budget.hotel[1] * factor) / 5) * 5),
      };
    });
  }

  const cityName = city.zh || city.en || '目的地';
  const bookingQuery = encodeURIComponent(cityName);
  const search = [
    { name: 'Booking.com', url: `https://www.booking.com/searchresults.html?ss=${bookingQuery}`, note: '国际酒店库存与免费取消筛选' },
    { name: 'Agoda', url: 'https://www.agoda.com/', note: '亚太酒店常有折扣，注意含税价' },
    { name: 'Airbnb', url: `https://www.airbnb.com/s/${bookingQuery}/homes`, note: '民宿/公寓，适合家庭与长住' },
    { name: 'Google Hotels', url: `https://www.google.com/travel/hotels?q=${encodeURIComponent(`Hotels in ${cityName}`)}`, note: '跨平台比价与地图位置' },
    { name: '携程', url: 'https://hotels.ctrip.com/', note: '中文客服、发票与国内支付' },
    { name: '飞猪', url: 'https://www.fliggy.com/hotel/', note: '酒店套餐与会员权益' },
  ];

  return {
    areas,
    types: [
      { name: '交通枢纽型', desc: '地铁/机场线旁，行李多、赶早班机时最省心。', bestFor: '首访、短途、行李多' },
      { name: '街区体验型', desc: '老城或设计街区，步行密度高，适合人文与美食。', bestFor: '人文、美食、摄影' },
      { name: '公寓/民宿型', desc: '适合家庭或 3 晚以上，注意清洁费、押金与入住时间。', bestFor: '家庭、长住、预算控制' },
    ],
    nights: Math.max(1, Number(days) || 1) - 1,
    search,
    note: '住宿为每晚参考区间，按双人标准间估算；不含城市税、度假费、清洁费与早餐。先看取消政策与到店时间。',
  };
}

function appGroupFor(cc) {
  if (cc === 'JP') return 'JP';
  if (cc === 'KR') return 'KR';
  if (cc === 'CN' || cc === 'HK' || cc === 'MO' || cc === 'TW') return 'CN';
  if (['TH', 'SG', 'MY', 'ID', 'PH', 'VN', 'KH', 'LA'].includes(cc)) return 'SEA';
  if (['FR', 'GB', 'IT', 'ES', 'DE', 'NL', 'PT', 'GR', 'CH', 'AT', 'BE', 'DK', 'SE', 'NO', 'FI', 'IE', 'PL', 'CZ', 'HU'].includes(cc)) return 'EU';
  if (['US', 'CA'].includes(cc)) return 'US';
  if (cc === 'AU' || cc === 'NZ') return 'AU';
  if (['AE', 'QA', 'SA', 'TR', 'EG', 'ZA', 'MA', 'KE', 'IL'].includes(cc)) return 'ME';
  return 'DEFAULT';
}

function buildGround(city) {
  const key = cityKeyFor(city);
  const genericAirport = [
    ['机场轨道 / 快线', '优先选择机场快线或地铁，避开高峰堵车。', '30–60 分钟', '$3–$15'],
    ['机场巴士', '适合行李多、酒店在站点附近；确认末班时间。', '45–90 分钟', '$5–$20'],
    ['出租车 / 网约车', '选择正规排队点或 App；夜间加价，先确认预估。', '30–60 分钟', '$20–$60'],
  ];
  const airport = (AIRPORT_TRANSFERS[key] ?? genericAirport).map(([mode, detail, time, price]) => ({ mode, detail, time, price }));
  const apps = TRAVEL_APPS[appGroupFor(city.cc)] ?? TRAVEL_APPS.DEFAULT;
  return {
    airport,
    transitCard: city.transit || '当地交通卡 / 非接触支付',
    apps,
    tips: [
      '机场到市区优先轨道或机场巴士；深夜抵达选正规出租车/网约车。',
      '下载离线地图，保存酒店地址的当地语言写法。',
      '跨城交通提前查班次：欧洲用 Omio/Trainline，日本用乘换案内，中国用 12306。',
      '打车前确认车牌、司机与预估价，避免无牌拉客。',
      '中国公民可保存外交部 12308 热线与当地使领馆联系方式。',
    ],
  };
}

function buildPlatforms(city) {
  const cityName = city.zh || city.en || '目的地';
  const q = encodeURIComponent(cityName);
  return {
    flights: [
      { name: 'Google Flights', url: `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights to ${cityName}`)}`, strength: '航线全景与价格日历', note: '先看直飞/中转，再决定日期' },
      { name: 'Skyscanner', url: 'https://www.skyscanner.net/', strength: '跨平台比价', note: '看含税总价与行李规则' },
      { name: 'Kayak', url: 'https://www.kayak.com/flights', strength: '组合比价', note: '适合查中转与多程' },
      { name: '携程', url: 'https://flights.ctrip.com/', strength: '中文客服与发票', note: '退改签与行程保障' },
      { name: '飞猪', url: 'https://www.fliggy.com/', strength: '平台补贴/套餐', note: '机酒打包时比价' },
      { name: '去哪儿', url: 'https://flight.qunar.com/', strength: '中国出发比价', note: '注意低价舱位限制' },
    ],
    stays: [
      { name: 'Booking.com', url: `https://www.booking.com/searchresults.html?ss=${q}`, strength: '国际酒店库存', note: '免费取消筛选很实用' },
      { name: 'Agoda', url: 'https://www.agoda.com/', strength: '亚太酒店折扣', note: '注意是否含税/含早' },
      { name: 'Airbnb', url: `https://www.airbnb.com/s/${q}/homes`, strength: '民宿/公寓', note: '看清清洁费与入住时间' },
      { name: 'Google Hotels', url: `https://www.google.com/travel/hotels?q=${encodeURIComponent(`Hotels in ${cityName}`)}`, strength: '跨平台比价', note: '地图位置与评价一起看' },
      { name: '携程', url: 'https://hotels.ctrip.com/', strength: '中文客服/发票', note: '国内支付与售后方便' },
      { name: '飞猪', url: 'https://www.fliggy.com/hotel/', strength: '套餐/会员价', note: '适合机酒打包' },
    ],
    transport: [
      { name: 'Google Maps', url: 'https://maps.google.com/', strength: '全球地图/公交', note: '离线地图提前下载' },
      { name: 'Citymapper', url: 'https://citymapper.com/', strength: '大城市公共交通', note: '换乘方案比地图更直观' },
      { name: 'Omio', url: 'https://www.omio.com/', strength: '欧洲跨国交通', note: '火车/巴士/航班一起比' },
      { name: 'Trainline', url: 'https://www.thetrainline.com/', strength: '欧洲铁路票', note: '提前买有便宜票' },
      { name: 'Uber', url: 'https://www.uber.com/', strength: '全球网约车', note: '先看预估与安全功能' },
      { name: 'Grab', url: 'https://www.grab.com/', strength: '东南亚打车/外卖', note: '可绑定支付宝/信用卡' },
      { name: '高德地图', url: 'https://www.amap.com/', strength: '中国公交/打车', note: '实时公交与限行提示' },
      { name: '滴滴出行', url: 'https://www.didiglobal.com/', strength: '中国/部分海外网约车', note: '行程分享与紧急联系人' },
    ],
    verdict: {
      flights: '先用 Google Flights 看航线与日期，再用 Skyscanner/Kayak 比含税价；中国出发在携程/飞猪/去哪儿核对退改与行李。',
      stays: '国际酒店用 Booking + Agoda 比价，民宿用 Airbnb；需要中文客服/发票再看携程/飞猪。',
      transport: '地图用 Google Maps + Citymapper；城际铁路用 Omio/Trainline；打车用 Uber/Grab/Bolt；中国用高德/滴滴。',
    },
    note: '平台链接为公开搜索入口，不含返利；价格为参考区间，以下单页实时报价为准。',
  };
}

async function planTrip(ctx, destination, days, budgetKey, pace, interests, bypass, origin = '上海') {
  const normalizedOrigin = String(origin ?? '').trim() || '上海';
  const cacheKey = `plan:${destination}|${days}|${budgetKey}|${pace}|${interests.join(',')}|${normalizedOrigin}`;
  const cached = recall(cacheKey, bypass);
  if (cached) return { ...cached, cached: true };

  let city;
  try {
    city = await geocode(ctx, destination);
  } catch {
    return {
      ok: false,
      code: 'geocoding_unavailable',
      message: '目的地解析服务暂时不可用，请稍后重试；若你输入的是高风险地区城市，系统仍会在恢复后直接拦截。',
      suggestions: ['东京', '京都', '巴黎', '罗马', '伊斯坦布尔', '新加坡', '纽约', '开普敦'],
    };
  }
  if (!city) {
    return {
      ok: false,
      code: 'not_found',
      message: `没有找到「${destination}」。请尝试输入城市名（如 东京、Paris、Mexico City），或换一个更常见的名称。`,
      suggestions: ['东京', '京都', '巴黎', '罗马', '伊斯坦布尔', '新加坡', '纽约', '开普敦'],
    };
  }
  const withPois = attachPois(city);
  const risk = riskFor(withPois.cc, withPois.country);
  const region = risk.region || '全球';

  if (risk.level === 'red') {
    const alternatives = (ALTERNATIVES[region] ?? ALTERNATIVES['亚洲']).map(([zh, country, reason]) => ({ zh, country, reason }));
    const value = {
      ok: true,
      generatedAt: new Date().toISOString(),
      blocked: true,
      destination: {
        name: withPois.zh || withPois.en,
        country: withPois.country || risk.name,
        cc: withPois.cc,
        lat: withPois.lat,
        lon: withPois.lon,
        timezone: withPois.tz,
      },
      risk,
      message: `${withPois.zh || withPois.en} 目前属于高风险的战乱/冲突地区，已停止生成旅行路线，以安全为先。`,
      alternatives,
      note: '风险分级是保守的旅行安全筛查，不构成政治判断；如果你有当地长期生活经验或特殊任务，请以官方安全评估与专业安保建议为准。',
    };
    remember(cacheKey, value, PLAN_TTL);
    return { ...value, cached: false };
  }

  let weather = { days: [], summary: '天气服务暂不可用，出发前请再查一次预报。' };
  try {
    weather = await getWeather(ctx, withPois);
  } catch {
    // Weather is optional; the route is still useful without it.
  }

  const itinerary = buildItinerary(withPois, days, pace, interests, weather);
  const flights = buildFlights(normalizedOrigin, withPois);
  const stays = buildStays(withPois, days, budgetKey);
  const ground = buildGround(withPois);
  const platforms = buildPlatforms(withPois);
  const value = {
    ok: true,
    generatedAt: new Date().toISOString(),
    blocked: false,
    origin: normalizedOrigin,
    destination: {
      name: withPois.zh || withPois.en,
      country: withPois.country || risk.name,
      cc: withPois.cc,
      lat: withPois.lat,
      lon: withPois.lon,
      timezone: withPois.tz,
      population: withPois.population,
      source: withPois.source,
    },
    risk,
    weather,
    itinerary,
    budget: buildBudget(days, budgetKey),
    flights,
    stays,
    ground,
    platforms,
    packing: packingList(weather, withPois),
    transport: withPois.transit
      ? `市内以${withPois.transit}为主；机场/车站到市区优先轨道或正规机场巴士，避免无牌拉客。`
      : '市内以地铁/公交 + 步行为主；机场/车站到市区优先轨道或正规机场巴士。',
    entry: '签证、入境与健康申报政策可能随时变化，请以目的地驻华使领馆、航空公司与官方入境网站的最新说明为准。',
    safety: {
      level: risk.level,
      note: risk.note,
      avoid: risk.avoid,
      emergency: '中国公民可拨打外交部全球领事保护与服务应急热线 +86-10-12308；当地报警/急救号码请以官方公布为准。',
      links: [
        ['中国领事服务网', 'https://cs.mfa.gov.cn/'],
        ['目的地使领馆安全提醒', 'https://cs.mfa.gov.cn/zggmcg/ljmdd/'],
      ],
    },
    note: '路线为基于城市节奏、兴趣与天气的通用建议，不包含实时票价、营业时间与预约库存；出发前请逐项核对官方信息。',
  };
  remember(cacheKey, value, PLAN_TTL);
  return { ...value, cached: false };
}

/* ------------------------------------------------------------------ */
/* HTTP API                                                            */
/* ------------------------------------------------------------------ */

function route(handler) {
  return async (req, res) => {
    if (req.method !== 'GET') {
      res.writeHead(405, { allow: 'GET' });
      res.end();
      return;
    }
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      await handler(url, res);
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        message: 'WorldPulse 数据服务暂时出错，请稍后重试。',
        detail: String(error?.message ?? error ?? 'unknown'),
      });
    }
  };
}

export function apply(ctx) {
  ctx.inject(['web', 'webServer'], (host) => {
    const disposers = [];
    const register = (path, handler) => {
      disposers.push(host.webServer.register({
        kind: 'exact',
        path: `${API}/${path}`,
        handler: route(handler),
      }));
    };

    register('health', async (_url, res) => {
      sendJson(res, 200, {
        ok: true,
        service: NS,
        version: '1.1.0',
        now: new Date().toISOString(),
        web: typeof host.web?.search === 'function' && typeof host.web?.fetch === 'function',
      });
    });

    register('news', async (url, res) => {
      const region = url.searchParams.get('region') || '全球';
      const news = await getNews(host, region, boolParam(url.searchParams.get('refresh')));
      sendJson(res, 200, news);
    });

    register('briefing', async (url, res) => {
      const region = url.searchParams.get('region') || '全球';
      const news = await getNews(host, region, boolParam(url.searchParams.get('refresh')));
      const briefing = buildBriefing(news, news.region ?? region);
      sendJson(res, 200, {
        ...briefing,
        cached: news.cached === true,
        degraded: briefing.degraded || news.degraded === true,
        live: news.live === true,
        errors: news.errors ?? [],
      });
    });

    register('plan', async (url, res) => {
      const destination = clean(url.searchParams.get('destination') ?? '', 80);
      if (!destination) {
        sendJson(res, 400, { ok: false, code: 'missing_destination', message: '请先输入目的地城市。' });
        return;
      }
      const days = intParam(url.searchParams.get('days'), 4, 1, 14);
      const budget = ['value', 'comfort', 'luxury'].includes(url.searchParams.get('budget') ?? '')
        ? url.searchParams.get('budget')
        : 'comfort';
      const pace = ['relaxed', 'balanced', 'packed'].includes(url.searchParams.get('pace') ?? '')
        ? url.searchParams.get('pace')
        : 'balanced';
      const interests = pickInterests(url.searchParams.get('interests'));
      const origin = clean(url.searchParams.get('origin') ?? '上海', 40) || '上海';
      const plan = await planTrip(host, destination, days, budget, pace, interests, boolParam(url.searchParams.get('refresh')), origin);
      const status = plan.ok ? 200 : plan.code === 'not_found' ? 404 : 502;
      sendJson(res, status, plan);
    });

    host.effect(() => () => {
      for (const dispose of disposers) {
        try { dispose(); } catch { /* already gone */ }
      }
    }, 'worldpulse: JSON API routes');
  });
}
