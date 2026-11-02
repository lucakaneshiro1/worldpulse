window.__ModuleLoader__.load({
  id: '@local/worldpulse',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useRef, useCallback } = React;

    const PANEL_ID = 'worldpulse';
    const NS = 'worldpulse';

    const REGION_KEYS = ['全球', '中东', '欧洲', '亚太', '美洲', '非洲'];
    const REGION_ALIASES = {
      Global: '全球',
      'Middle East': '中东',
      Europe: '欧洲',
      'Asia Pacific': '亚太',
      Americas: '美洲',
      Africa: '非洲',
    };

    function canonicalRegion(value) {
      return REGION_ALIASES[value] ?? (REGION_KEYS.includes(value) ? value : '全球');
    }

    function regionLabel(value, lang) {
      const key = canonicalRegion(value);
      const index = REGION_KEYS.indexOf(key);
      return lang === 'en' ? TEXT.en.regions[index] : TEXT.zh.regions[index];
    }

    /* ---------------------------------------------------------------- */
    /* Copy                                                             */
    /* ---------------------------------------------------------------- */

    const TEXT = {
      zh: {
        brand: '寰球视野',
        brandEn: 'WORLD PULSE',
        tagline: '实时世界新闻 · 国际局势研判 · 安全旅行路线',
        navNews: '全球快讯',
        navBrief: '局势研判',
        navPlan: '行程规划',
        navFlights: '航班查询',
        refresh: '刷新',
        refreshing: '更新中',
        live: '实时聚合',
        cached: '缓存数据',
        offline: '信源入口',
        updated: '更新于',
        justNow: '刚刚',
        minutesAgo: '分钟前',
        hoursAgo: '小时前',
        daysAgo: '天前',
        heroTitle: '看懂世界，再出发。',
        heroText: '把实时新闻、地区风险与旅行节奏放在同一张桌面上。新闻用于判断风向，研判用于识别风险，路线只在安全的地方展开。',
        heroCta: '规划一趟安全的旅行',
        heroCta2: '先看今日局势',
        statSignals: '实时信号',
        statSources: '信源',
        statRisk: '风险温度',
        noData: '暂无数据',
        scan: '扫描中',
        all: '全部',
        regions: ['全球', '中东', '欧洲', '亚太', '美洲', '非洲'],
        filters: [
          ['all', '全部'],
          ['conflict', '冲突安全'],
          ['economy', '经济市场'],
          ['climate', '气候能源'],
          ['china', '中国相关'],
        ],
        categories: {
          world: '全球', conflict: '冲突与安全', economy: '经济与市场', climate: '气候与能源',
          tech: '科技', china: '中国相关', health: '公共卫生', region: '地区',
        },
        feedTitle: '全球快讯',
        feedSub: '来自公开搜索服务的实时标题与摘要；点击回到原始信源。',
        sourceCoverage: '信源覆盖',
        sourceCoverageSub: '本轮聚合到的媒体',
        riskScan: '风险扫描',
        riskScanSub: '地区热度与冲突信号',
        planPromoTitle: '去安全的地方',
        planPromoText: '输入任意城市，获得按天路线、天气、预算与风险提示；战乱地区会被直接拦截。',
        planPromoBtn: '开始规划',
        noNews: '当前筛选下没有条目。试试切换分类或地区。',
        degradedTitle: '实时搜索暂不可达',
        degradedText: '以下为常用信源入口，仍可先阅读局势研判或稍后刷新。',
        loadError: '数据加载失败',
        retry: '重试',
        analysisTitle: '局势研判',
        analysisSub: '把新闻信号折叠成风险温度、热点与观察清单。',
        riskTemperature: '风险温度',
        riskHigh: '高',
        riskMedium: '偏紧',
        riskLow: '温和',
        riskHighNote: '冲突信号集中，建议提高信息核验频率。',
        riskMediumNote: '多点摩擦并存，关注热点是否外溢。',
        riskLowNote: '整体信号温和，仍需关注局部突发事件。',
        overview: '态势总览',
        security: '安全与冲突',
        economy: '经济与市场',
        climate: '气候与能源',
        hotspotTitle: '重点热点',
        hotspotSub: '按本轮信源提及量排序',
        heat: '提及',
        watch: '观察点',
        sample: '相关信源',
        categoryDist: '议题分布',
        watchlist: '未来观察清单',
        headlines: '关键标题',
        analysisDegraded: '实时信源不足，以下为结构性分析框架。',
        analysisNote: '机器辅助研判，不替代专业安全评估。',
        planTitle: '行程规划',
        planSub: '全世界可规划，自动避开战乱与高风险冲突地区。',
        destination: '目的地',
        destinationPlaceholder: '输入城市，如 东京、Paris、Mexico City',
        origin: '出发城市',
        originPlaceholder: '如 上海、北京、广州',
        quickPick: '快速选择',
        days: '天数',
        budget: '预算档位',
        budgetValue: '经济',
        budgetComfort: '舒适',
        budgetLuxury: '奢华',
        pace: '节奏',
        paceRelaxed: '轻松',
        paceBalanced: '均衡',
        pacePacked: '紧凑',
        interests: '兴趣偏好',
        interestCulture: '人文',
        interestNature: '自然',
        interestFood: '美食',
        interestShopping: '购物',
        interestFamily: '亲子',
        interestNightlife: '夜生活',
        generate: '生成路线',
        generating: '正在检索目的地、天气与安全信息…',
        planEmptyTitle: '从一个城市开始',
        planEmptyText: '我们会先核对目的地风险，再结合天气、兴趣和节奏生成按天路线。高风险冲突地区不会生成行程。',
        planEmptyNote: '试试：东京 · 巴黎 · 伊斯坦布尔 · 新加坡 · 纽约 · 开普敦',
        planError: '规划失败',
        blockedTitle: '暂不生成路线',
        blockedText: '该目的地目前属于高风险的战乱/冲突地区。安全优先，建议选择以下替代目的地。',
        alternatives: '安全替代目的地',
        choose: '规划这里',
        daysUnit: '天',
        weather: '天气窗口',
        weatherSub: '未来 7 天预报',
        budgetTitle: '预算估算',
        perDay: '每天',
        total: '合计',
        budgetNote: '每人估算，不含国际机票、签证与购物。',
        packing: '行李清单',
        safety: '安全提示',
        transport: '交通与入境',
        entry: '入境与签证',
        flightTitle: '航班建议',
        flightRoute: '航线',
        flightAirport: '机场',
        flightDistance: '直线距离',
        flightDuration: '飞行时长',
        flightDirect: '直飞',
        flightTransfer: '中转',
        flightTbd: '视航线而定',
        flightBudget: '廉航',
        flightPrice: '参考价',
        flightPros: '优点',
        flightCons: '注意',
        flightSearch: '查票平台',
        flightNote: '机票为经济舱含税参考区间，不含行李、选座与改签；实际价格以下单页为准。',
        stayTitle: '住宿推荐',
        stayAreas: '推荐区域',
        stayTypes: '住宿类型',
        stayBestFor: '适合',
        stayCommute: '通勤',
        stayTip: '预订提示',
        stayNights: '晚',
        staySearch: '订房平台',
        stayNote: '住宿为每晚参考区间，按双人标准间估算；不含城市税、度假费、清洁费与早餐。',
        groundTitle: '地面交通与 App',
        airportTransfer: '机场到市区',
        transitCard: '交通卡',
        appsTitle: '常用 App',
        groundTips: '出行提示',
        platformTitle: '全平台推荐',
        platformFlights: '机票',
        platformStays: '住宿',
        platformTransport: '交通 / 地图',
        platformVerdict: '推荐组合',
        platformNote: '平台链接为公开搜索入口，不含返利；价格为参考区间，以下单页实时报价为准。',
        flightQueryTitle: '全国航班查询',
        flightQuerySub: '大陆 · 香港 · 澳门 · 台湾',
        flightQueryText: '输入任意已收录城市，查看直飞/中转方案、参考票价和查票入口。价格不是实时库存，出票前请在各平台核对。',
        flightFrom: '出发城市',
        flightTo: '到达城市',
        flightDate: '出发日期',
        flightSwap: '交换',
        flightSearchBtn: '查询航班',
        flightSearching: '正在计算航线与查票入口…',
        flightQueryEmpty: '选择出发地和目的地，开始查询。',
        flightQueryNote: '参考价为经济舱单程含税区间，不含行李、选座与改签；实际以出票页为准。',
        flightQueryLive: '实时航班资讯',
        flightQueryNoLive: '实时资讯暂不可用，以下为参考方案与查票入口。',
        flightQueryCities: '城市与机场',
        flightQueryAll: '全部城市',
        flightNonstop: '直飞',
        flightVia: '中转',
        flightBudgetOption: '廉航/早班',
        flightAirlines: '主要航司',
        flightDirectYes: '有直飞',
        flightDirectNo: '通常需中转',
        flightQueryPopular: '热门查询',
        flightQueryCn: '中国大陆',
        flightQueryHk: '香港',
        flightQueryMo: '澳门',
        flightQueryTw: '台湾',
        flightSameCity: '出发城市和到达城市不能相同。',
        flightNotFound: '暂未收录这个城市，请从下拉列表选择。',
        open: '打开',
        km: '公里',
        perNight: '/晚',        emergency: '紧急联系',
        official: '官方信息',
        print: '打印 / 保存 PDF',
        planNote: '路线为通用建议，不含实时票价、营业时间与预约库存；出发前请核对官方信息。',
        riskRed: '高风险 · 暂不前往',
        riskAmber: '谨慎前往',
        riskGreen: '可规划',
        avoid: '避开',
        day: '第',
        dayUnit: '天',
        morning: '上午',
        afternoon: '下午',
        evening: '傍晚',
        hours: '小时',
        riskWord: '风险',
        sourceWord: '信源',
        itemsWord: '条',
        scoreWord: '分',
        printHint: '提示：打印时会自动隐藏表单与导航。',
        langNote: 'English labels are available; live analysis text is generated in Chinese.',
      },
      en: {
        brand: 'WorldPulse',
        brandEn: 'WORLD PULSE',
        tagline: 'Live world news · situation analysis · safe trip planning',
        navNews: 'World feed',
        navBrief: 'Situation',
        navPlan: 'Trip planner',
        navFlights: 'Flights',
        refresh: 'Refresh',
        refreshing: 'Updating',
        live: 'Live aggregation',
        cached: 'Cached',
        offline: 'Source links',
        updated: 'Updated',
        justNow: 'just now',
        minutesAgo: 'm ago',
        hoursAgo: 'h ago',
        daysAgo: 'd ago',
        heroTitle: 'Read the world. Then go.',
        heroText: 'Live headlines, regional risk and travel pace on one desk. News sets the direction, analysis marks the risk, and routes only unfold in safe places.',
        heroCta: 'Plan a safer trip',
        heroCta2: 'Read today\'s situation',
        statSignals: 'Live signals',
        statSources: 'Sources',
        statRisk: 'Risk level',
        noData: 'No data',
        scan: 'Scanning',
        all: 'All',
        regions: ['Global', 'Middle East', 'Europe', 'Asia Pacific', 'Americas', 'Africa'],
        filters: [
          ['all', 'All'],
          ['conflict', 'Conflict'],
          ['economy', 'Economy'],
          ['climate', 'Climate'],
          ['china', 'China'],
        ],
        categories: {
          world: 'World', conflict: 'Conflict & security', economy: 'Economy & markets', climate: 'Climate & energy',
          tech: 'Technology', china: 'China', health: 'Public health', region: 'Region',
        },
        feedTitle: 'World feed',
        feedSub: 'Live titles and snippets from public search providers; click through to the original source.',
        sourceCoverage: 'Source coverage',
        sourceCoverageSub: 'Outlets aggregated in this round',
        riskScan: 'Risk scan',
        riskScanSub: 'Regional heat and conflict signals',
        planPromoTitle: 'Go where it is safe',
        planPromoText: 'Enter any city for a day-by-day route, weather, budget and risk notes. Conflict zones are blocked.',
        planPromoBtn: 'Start planning',
        noNews: 'Nothing matches this filter. Try another category or region.',
        degradedTitle: 'Live search is unavailable',
        degradedText: 'These are direct source entrances. You can still read the situation framework or retry later.',
        loadError: 'Could not load data',
        retry: 'Retry',
        analysisTitle: 'Situation analysis',
        analysisSub: 'Fold news signals into a risk temperature, hotspots and a watch list.',
        riskTemperature: 'Risk temperature',
        riskHigh: 'High',
        riskMedium: 'Elevated',
        riskLow: 'Calm',
        riskHighNote: 'Conflict signals are concentrated. Verify information more often.',
        riskMediumNote: 'Multiple friction points. Watch for spillover.',
        riskLowNote: 'Signals are calm overall, but local shocks can still occur.',
        overview: 'Overview',
        security: 'Security & conflict',
        economy: 'Economy & markets',
        climate: 'Climate & energy',
        hotspotTitle: 'Key hotspots',
        hotspotSub: 'Ranked by mentions in this round',
        heat: 'mentions',
        watch: 'Watch',
        sample: 'Related sources',
        categoryDist: 'Issue mix',
        watchlist: 'Watch list',
        headlines: 'Key headlines',
        analysisDegraded: 'Live sources are insufficient. This is a structural framework.',
        analysisNote: 'Machine-assisted analysis, not a substitute for professional security advice.',
        planTitle: 'Trip planner',
        planSub: 'Plan anywhere in the world, with conflict and high-risk zones excluded.',
        destination: 'Destination',
        destinationPlaceholder: 'City, e.g. Tokyo, Paris, Mexico City',
        origin: 'Departure city',
        originPlaceholder: 'e.g. Shanghai, Beijing, Guangzhou',
        quickPick: 'Quick picks',
        days: 'Days',
        budget: 'Budget',
        budgetValue: 'Value',
        budgetComfort: 'Comfort',
        budgetLuxury: 'Luxury',
        pace: 'Pace',
        paceRelaxed: 'Relaxed',
        paceBalanced: 'Balanced',
        pacePacked: 'Packed',
        interests: 'Interests',
        interestCulture: 'Culture',
        interestNature: 'Nature',
        interestFood: 'Food',
        interestShopping: 'Shopping',
        interestFamily: 'Family',
        interestNightlife: 'Nightlife',
        generate: 'Build route',
        generating: 'Checking destination, weather and safety…',
        planEmptyTitle: 'Start with a city',
        planEmptyText: 'We check destination risk first, then build a day-by-day route around weather, interests and pace. High-risk conflict zones are not planned.',
        planEmptyNote: 'Try: Tokyo · Paris · Istanbul · Singapore · New York · Cape Town',
        planError: 'Planning failed',
        blockedTitle: 'Route not generated',
        blockedText: 'This destination is currently a high-risk war/conflict area. Safety first: choose one of these alternatives.',
        alternatives: 'Safe alternatives',
        choose: 'Plan this',
        daysUnit: 'days',
        weather: 'Weather window',
        weatherSub: '7-day forecast',
        budgetTitle: 'Budget estimate',
        perDay: 'Per day',
        total: 'Total',
        budgetNote: 'Per person; excludes international flights, visas and shopping.',
        packing: 'Packing list',
        safety: 'Safety notes',
        transport: 'Transport & entry',
        entry: 'Entry & visa',
        flightTitle: 'Flight ideas',
        flightRoute: 'Route',
        flightAirport: 'Airports',
        flightDistance: 'Distance',
        flightDuration: 'Flight time',
        flightDirect: 'Direct',
        flightTransfer: 'Transfer',
        flightTbd: 'Route dependent',
        flightBudget: 'Low-cost',
        flightPrice: 'Reference fare',
        flightPros: 'Upside',
        flightCons: 'Watch out',
        flightSearch: 'Search flights',
        flightNote: 'Economy fares are reference ranges, excluding bags, seats and changes; confirm live prices before booking.',
        stayTitle: 'Where to stay',
        stayAreas: 'Recommended areas',
        stayTypes: 'Stay styles',
        stayBestFor: 'Best for',
        stayCommute: 'Getting around',
        stayTip: 'Booking tip',
        stayNights: 'nights',
        staySearch: 'Search stays',
        stayNote: 'Nightly reference ranges for a double room; city tax, resort fees, cleaning fees and breakfast are excluded.',
        groundTitle: 'Ground transport & apps',
        airportTransfer: 'Airport to city',
        transitCard: 'Transit card',
        appsTitle: 'Useful apps',
        groundTips: 'Travel notes',
        platformTitle: 'Compare platforms',
        platformFlights: 'Flights',
        platformStays: 'Stays',
        platformTransport: 'Transit / maps',
        platformVerdict: 'Recommended stack',
        platformNote: 'Public search entrances, no affiliate links; prices are reference ranges, the booking page is authoritative.',
        flightQueryTitle: 'China flight search',
        flightQuerySub: 'Mainland · Hong Kong · Macau · Taiwan',
        flightQueryText: 'Pick any covered city to see nonstop/transfer options, reference fares and booking entrances. Fares are not live inventory; verify on the booking page.',
        flightFrom: 'From',
        flightTo: 'To',
        flightDate: 'Departure date',
        flightSwap: 'Swap',
        flightSearchBtn: 'Search flights',
        flightSearching: 'Calculating route and booking entrances…',
        flightQueryEmpty: 'Choose an origin and destination to start.',
        flightQueryNote: 'Reference economy one-way fare range, excluding bags, seat selection and changes; the booking page is authoritative.',
        flightQueryLive: 'Live flight search',
        flightQueryNoLive: 'Live search is unavailable; showing reference options and booking entrances.',
        flightQueryCities: 'Cities & airports',
        flightQueryAll: 'All cities',
        flightNonstop: 'Nonstop',
        flightVia: 'Transfer',
        flightBudgetOption: 'Budget / early',
        flightAirlines: 'Main airlines',
        flightDirectYes: 'Nonstop available',
        flightDirectNo: 'Usually requires a transfer',
        flightQueryPopular: 'Popular routes',
        flightQueryCn: 'Mainland China',
        flightQueryHk: 'Hong Kong',
        flightQueryMo: 'Macau',
        flightQueryTw: 'Taiwan',
        flightSameCity: 'Origin and destination must differ.',
        flightNotFound: 'City not covered yet; choose from the list.',
        open: 'Open',
        km: 'km',
        perNight: '/night',
        emergency: 'Emergency',
        official: 'Official links',
        print: 'Print / Save PDF',
        planNote: 'A general route, not live ticket prices, opening hours or availability. Verify official information before departure.',
        riskRed: 'High risk · do not travel',
        riskAmber: 'Travel with caution',
        riskGreen: 'Plannable',
        avoid: 'Avoid',
        day: 'Day',
        dayUnit: '',
        morning: 'Morning',
        afternoon: 'Afternoon',
        evening: 'Evening',
        hours: 'h',
        riskWord: 'Risk',
        sourceWord: 'Sources',
        itemsWord: 'items',
        scoreWord: 'score',
        printHint: 'Tip: forms and navigation are hidden when printing.',
        langNote: 'Live analysis text is generated in Chinese.',
      },
    };

    function tx(lang, key) {
      const value = TEXT[lang]?.[key] ?? TEXT.zh[key] ?? key;
      return value;
    }

    /* ---------------------------------------------------------------- */
    /* Small helpers                                                    */
    /* ---------------------------------------------------------------- */

    function cx(...values) {
      return values.filter(Boolean).join(' ');
    }

    function readStored(key, fallback) {
      try {
        const value = window.localStorage.getItem(key);
        return value || fallback;
      } catch {
        return fallback;
      }
    }

    function store(key, value) {
      try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
    }

    function formatRelative(iso, lang) {
      if (!iso) return '';
      const time = Date.parse(iso);
      if (!Number.isFinite(time)) return '';
      const diff = Math.max(0, Date.now() - time);
      const minutes = Math.floor(diff / 60000);
      if (minutes < 2) return tx(lang, 'justNow');
      if (minutes < 60) return `${minutes} ${tx(lang, 'minutesAgo')}`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} ${tx(lang, 'hoursAgo')}`;
      return `${Math.floor(hours / 24)} ${tx(lang, 'daysAgo')}`;
    }

    function formatClock(iso, lang) {
      if (!iso) return '';
      const time = Date.parse(iso);
      if (!Number.isFinite(time)) return '';
      try {
        return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        }).format(time);
      } catch {
        return new Date(time).toLocaleString();
      }
    }

    function formatDate(value, lang) {
      if (!value) return '';
      const time = Date.parse(`${value}T12:00:00`);
      if (!Number.isFinite(time)) return value;
      try {
        return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB', {
          weekday: 'short', month: 'short', day: 'numeric',
        }).format(time);
      } catch {
        return value;
      }
    }

    function money(low, high) {
      const fmt = (value) => `$${Number(value ?? 0).toLocaleString('en-US')}`;
      return low === high ? fmt(low) : `${fmt(low)}–${fmt(high)}`;
    }

    function cny(low, high) {
      const fmt = (value) => `¥${Number(value ?? 0).toLocaleString('zh-CN')}`;
      return low === high ? fmt(low) : `${fmt(low)}–${fmt(high)}`;
    }

    function weatherGlyph(code) {
      const value = Number(code ?? 0);
      if (value === 0 || value === 1) return 'sun';
      if (value === 2 || value === 3) return 'cloud';
      if (value >= 95) return 'storm';
      if (value >= 71 && value <= 86) return 'snow';
      if (value >= 51) return 'rain';
      if (value === 45 || value === 48) return 'fog';
      return 'cloud';
    }

    async function api(path, params, signal) {
      const url = new URL(`worldpulse/api/${path}`, document.baseURI);
      for (const [key, value] of Object.entries(params ?? {})) {
        if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
      }
      const response = await fetch(url, {
        method: 'GET',
        signal,
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      let payload = null;
      try { payload = await response.json(); } catch { /* not JSON */ }
      if (!response.ok) {
        const error = new Error(payload?.message || `HTTP ${response.status}`);
        error.payload = payload;
        throw error;
      }
      return payload;
    }

    /* ---------------------------------------------------------------- */
    /* Icons                                                            */
    /* ---------------------------------------------------------------- */

    function Icon({ name, size = 16, strokeWidth = 1.8 }) {
      const common = {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true, focusable: false,
      };
      if (name === 'globe') {
        return h('svg', common,
          h('circle', { cx: 12, cy: 12, r: 9 }),
          h('path', { d: 'M3.5 9h17M3 15h18' }),
          h('ellipse', { cx: 12, cy: 12, rx: 4, ry: 9 }));
      }
      if (name === 'radio') {
        return h('svg', common,
          h('circle', { cx: 12, cy: 12, r: 2.2, fill: 'currentColor', stroke: 'none' }),
          h('path', { d: 'M7.8 7.8a6 6 0 0 0 0 8.4M16.2 16.2a6 6 0 0 0 0-8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 19.1a10 10 0 0 0 0-14.2' }));
      }
      if (name === 'route') {
        return h('svg', common,
          h('circle', { cx: 6, cy: 18, r: 2 }),
          h('circle', { cx: 18, cy: 6, r: 2 }),
          h('path', { d: 'M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3' }));
      }
      if (name === 'plane') {
        return h('svg', common,
          h('path', { d: 'M3.5 12.5l17-7.5-4 16-4.2-6.2-4 1.9.8-4.4z' }),
          h('path', { d: 'M8.3 12.3L20.5 5' }));
      }
      if (name === 'swap') {
        return h('svg', common,
          h('path', { d: 'M7 7h12l-3-3M17 17H5l3 3' }));
      }
      if (name === 'refresh') {
        return h('svg', common,
          h('path', { d: 'M20 11a8 8 0 1 0-2.34 5.66' }),
          h('path', { d: 'M20 4v7h-7' }));
      }
      if (name === 'external') {
        return h('svg', common,
          h('path', { d: 'M14 4h6v6M20 4l-9 9' }),
          h('path', { d: 'M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5' }));
      }
      if (name === 'shield') {
        return h('svg', common,
          h('path', { d: 'M12 3l7 3v5.5c0 4.4-2.9 7.9-7 9.5-4.1-1.6-7-5.1-7-9.5V6l7-3z' }),
          h('path', { d: 'M9.2 12.2l1.8 1.8 3.8-4' }));
      }
      if (name === 'calendar') {
        return h('svg', common,
          h('rect', { x: 3, y: 5, width: 18, height: 16, rx: 2 }),
          h('path', { d: 'M8 3v4M16 3v4M3 10h18' }));
      }
      if (name === 'wallet') {
        return h('svg', common,
          h('rect', { x: 3, y: 6, width: 18, height: 14, rx: 2 }),
          h('path', { d: 'M3 10h18M16 15h2' }));
      }
      if (name === 'sun') {
        return h('svg', common,
          h('circle', { cx: 12, cy: 12, r: 4 }),
          h('path', { d: 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' }));
      }
      if (name === 'rain') {
        return h('svg', common,
          h('path', { d: 'M7 15a4 4 0 0 1 .5-8 5.5 5.5 0 0 1 10.6 1.5A3.5 3.5 0 0 1 17.5 15' }),
          h('path', { d: 'M8 18l-1 2M12 18l-1 2M16 18l-1 2' }));
      }
      if (name === 'cloud') {
        return h('svg', common, h('path', { d: 'M7 18h10a4 4 0 0 0 .4-8 6 6 0 0 0-11.3-1A3.8 3.8 0 0 0 7 18z' }));
      }
      if (name === 'snow') {
        return h('svg', common,
          h('path', { d: 'M7 14a4 4 0 0 1 .5-8 5.5 5.5 0 0 1 10.6 1.5A3.5 3.5 0 0 1 17.5 14' }),
          h('path', { d: 'M8 18v.01M12 20v.01M16 18v.01' }));
      }
      if (name === 'storm') {
        return h('svg', common,
          h('path', { d: 'M7 14a4 4 0 0 1 .5-8 5.5 5.5 0 0 1 10.6 1.5A3.5 3.5 0 0 1 17.5 14' }),
          h('path', { d: 'M12 11l-2 4h3l-2 4' }));
      }
      if (name === 'fog') {
        return h('svg', common, h('path', { d: 'M4 9h16M6 13h12M4 17h16' }));
      }
      if (name === 'alert') {
        return h('svg', common,
          h('path', { d: 'M12 4l9 16H3L12 4z' }),
          h('path', { d: 'M12 9v4M12 17v.01' }));
      }
      if (name === 'check') {
        return h('svg', common, h('path', { d: 'M5 12.5l4 4L19 6.5' }));
      }
      if (name === 'spark') {
        return h('svg', common, h('path', { d: 'M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z' }));
      }
      if (name === 'search') {
        return h('svg', common,
          h('circle', { cx: 11, cy: 11, r: 6.5 }),
          h('path', { d: 'M16 16l5 5' }));
      }
      if (name === 'arrow') {
        return h('svg', common, h('path', { d: 'M5 12h14M13 6l6 6-6 6' }));
      }
      if (name === 'print') {
        return h('svg', common,
          h('path', { d: 'M7 8V4h10v4' }),
          h('rect', { x: 4, y: 8, width: 16, height: 8, rx: 2 }),
          h('path', { d: 'M7 14h10v6H7z' }));
      }
      if (name === 'clock') {
        return h('svg', common,
          h('circle', { cx: 12, cy: 12, r: 8.5 }),
          h('path', { d: 'M12 7.5V12l3 2' }));
      }
      if (name === 'pin') {
        return h('svg', common,
          h('path', { d: 'M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z' }),
          h('circle', { cx: 12, cy: 10, r: 2.5 }));
      }
      if (name === 'compass') {
        return h('svg', common,
          h('circle', { cx: 12, cy: 12, r: 9 }),
          h('path', { d: 'M15.5 8.5l-2 5-5 2 2-5 5-2z' }));
      }
      return h('svg', common, h('circle', { cx: 12, cy: 12, r: 8 }));
    }

    function BrandIcon({ size = 22, active = false }) {
      return h('svg', {
        viewBox: '0 0 64 64', width: size, height: size,
        'aria-hidden': true, focusable: false,
        style: { display: 'block', color: active ? 'var(--dsw-alias-brand-primary)' : 'currentColor' },
      },
      h('circle', { cx: 32, cy: 32, r: 23, fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, opacity: 0.9 }),
      h('ellipse', { cx: 32, cy: 32, rx: 10.5, ry: 23, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, opacity: 0.65 }),
      h('path', { d: 'M10 25h44M9 39h46', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, opacity: 0.55, strokeLinecap: 'round' }),
      h('path', { d: 'M17 45c5.2-5 7.8-11 10.2-15.4 2.2-4 5-6.2 8.8-6.2 3.6 0 6.2 1.9 9.1 5.1', fill: 'none', stroke: 'currentColor', strokeWidth: 2.6, strokeLinecap: 'round', strokeDasharray: '1 5.2' }),
      h('circle', { cx: 17, cy: 45, r: 3.2, fill: 'currentColor' }),
      h('circle', { cx: 46.2, cy: 27.2, r: 3.6, fill: 'currentColor' }));
    }

    /* ---------------------------------------------------------------- */
    /* Styles                                                           */
    /* ---------------------------------------------------------------- */

    const CSS = `
.wp-page{--wp-brand:var(--dsw-alias-brand-primary,#2b7fff);--wp-teal:#10b7a6;--wp-radius:16px;height:100%;min-height:100%;overflow:auto;background:var(--dsw-alias-bg-base,#f7f8fa);color:var(--dsw-alias-label-primary,#111);font-family:Inter,"PingFang SC","Microsoft YaHei",system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.55}
.wp-page *{box-sizing:border-box}
.wp-shell{max-width:1320px;margin:0 auto;padding:18px 22px 46px}
.wp-header{display:flex;align-items:center;gap:18px;position:sticky;top:0;z-index:30;padding:10px 0 12px;background:var(--dsw-alias-bg-base,#f7f8fa);border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));margin-bottom:18px}
.wp-brand{display:flex;align-items:center;gap:10px;min-width:190px}
.wp-brand-mark{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(145deg,#2b7fff,#10b7a6);color:#fff;box-shadow:0 8px 22px rgba(43,127,255,.25);flex:0 0 auto}
.wp-brand-name{font-weight:750;letter-spacing:.01em;font-size:16px;line-height:1.15}
.wp-brand-en{font-size:9px;letter-spacing:.2em;color:var(--dsw-alias-label-secondary,#697386);font-weight:700;margin-top:2px}
.wp-tabs{display:flex;gap:4px;padding:4px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:14px;background:var(--dsw-alias-bg-layer-1,#fff);min-width:0;overflow:auto;scrollbar-width:none}
.wp-tabs::-webkit-scrollbar{display:none}
.wp-tab{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary,#697386);font:inherit;font-weight:650;padding:7px 13px;border-radius:10px;cursor:pointer;white-space:nowrap;display:flex;gap:6px;align-items:center}
.wp-tab[data-active="true"]{background:var(--dsw-alias-bg-layer-2,#eef1f6);color:var(--dsw-alias-label-primary,#111);box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l1,rgba(0,0,0,.06))}
.wp-tab:hover{color:var(--dsw-alias-label-primary,#111)}
.wp-header-actions{margin-left:auto;display:flex;align-items:center;gap:8px}
.wp-icon-btn{appearance:none;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.1));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#697386);height:34px;min-width:34px;padding:0 11px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;font:inherit;font-size:12px;font-weight:650;transition:.18s ease}
.wp-icon-btn:hover{color:var(--dsw-alias-label-primary,#111);border-color:var(--dsw-alias-border-l2,rgba(0,0,0,.18))}
.wp-icon-btn:disabled{opacity:.5;cursor:default}
.wp-spin{animation:wp-spin 1s linear infinite}
@keyframes wp-spin{to{transform:rotate(360deg)}}
.wp-hero{position:relative;overflow:hidden;border-radius:24px;padding:34px 36px;background:radial-gradient(1100px 380px at 88% -20%,rgba(16,183,166,.35),transparent 58%),linear-gradient(120deg,#09245e 0%,#103d8a 53%,#0a6b89 100%);color:#fff;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);gap:28px;box-shadow:0 22px 60px rgba(9,36,94,.2)}
.wp-hero:after{content:"";position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(rgba(255,255,255,.16) 1px,transparent 1px);background-size:26px 26px;opacity:.25;mask-image:linear-gradient(100deg,transparent 40%,#000)}
.wp-hero>*{position:relative;z-index:1}
.wp-eyebrow{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:rgba(255,255,255,.72)}
.wp-dot{width:7px;height:7px;border-radius:50%;background:#59f2c4;box-shadow:0 0 0 4px rgba(89,242,196,.13)}
.wp-dot[data-state="warn"]{background:#ffcf66;box-shadow:0 0 0 4px rgba(255,207,102,.13)}
.wp-dot[data-state="off"]{background:#ff9a9a;box-shadow:0 0 0 4px rgba(255,154,154,.13)}
.wp-hero h1{font-size:clamp(26px,3.2vw,42px);line-height:1.15;letter-spacing:-.025em;margin:14px 0 12px;font-weight:780;max-width:640px}
.wp-hero p{color:rgba(255,255,255,.78);max-width:650px;font-size:13.5px;line-height:1.7;margin:0}
.wp-hero-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
.wp-btn{appearance:none;border:1px solid transparent;border-radius:11px;padding:10px 15px;font:inherit;font-weight:700;font-size:12.5px;display:inline-flex;align-items:center;gap:7px;cursor:pointer;transition:.18s ease}
.wp-btn-primary{background:#fff;color:#0b2a66}
.wp-btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(0,0,0,.16)}
.wp-btn-ghost{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.2)}
.wp-btn-ghost:hover{background:rgba(255,255,255,.16)}
.wp-btn-brand{background:var(--wp-brand);color:#fff}
.wp-btn-brand:hover{filter:brightness(1.06)}
.wp-btn-soft{background:var(--dsw-alias-bg-layer-2,#eef1f6);color:var(--dsw-alias-label-primary,#111);border-color:var(--dsw-alias-border-l1,rgba(0,0,0,.06))}
.wp-btn-soft:hover{border-color:var(--dsw-alias-border-l2,rgba(0,0,0,.18))}
.wp-btn:disabled{opacity:.55;cursor:default;transform:none}
.wp-hero-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-content:end}
.wp-stat{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);border-radius:15px;padding:13px 15px;backdrop-filter:blur(8px)}
.wp-stat span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.62);font-weight:700}
.wp-stat strong{display:block;font-size:24px;line-height:1.2;letter-spacing:-.02em;margin-top:4px;font-weight:760}
.wp-stat small{font-size:10.5px;color:rgba(255,255,255,.6)}
.wp-stat.wide{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:10px}
.wp-stat.wide strong{font-size:18px;margin:0}
.wp-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:22px 0 12px;flex-wrap:wrap}
.wp-chips{display:flex;gap:6px;flex-wrap:wrap}
.wp-chip{appearance:none;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.1));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#697386);border-radius:999px;padding:6px 11px;font:inherit;font-size:11.5px;font-weight:650;cursor:pointer;transition:.16s}
.wp-chip:hover{color:var(--dsw-alias-label-primary,#111)}
.wp-chip[data-active="true"]{background:var(--wp-brand);border-color:var(--wp-brand);color:#fff}
.wp-chip[data-tone="soft"][data-active="true"]{background:var(--dsw-alias-bg-layer-2,#eef1f6);border-color:var(--dsw-alias-border-l2,rgba(0,0,0,.18));color:var(--dsw-alias-label-primary,#111)}
.wp-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin:20px 0 12px}
.wp-section-head h2{font-size:19px;letter-spacing:-.015em;margin:0;font-weight:750}
.wp-section-head p{margin:4px 0 0;color:var(--dsw-alias-label-secondary,#697386);font-size:12px}
.wp-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(270px,.62fr);gap:16px;align-items:start}
.wp-feed{display:flex;flex-direction:column;gap:9px;min-width:0}
.wp-news{display:block;text-decoration:none;color:inherit;background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:14px;padding:14px 16px;transition:.17s ease;position:relative}
.wp-news:hover{border-color:rgba(43,127,255,.35);transform:translateY(-1px);box-shadow:0 8px 24px rgba(20,35,70,.07)}
.wp-news-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:7px}
.wp-source{font-size:11px;font-weight:750;letter-spacing:.02em;color:var(--wp-brand)}
.wp-pill{display:inline-flex;align-items:center;border-radius:999px;padding:2px 8px;font-size:10px;font-weight:700;background:var(--dsw-alias-bg-layer-2,#eef1f6);color:var(--dsw-alias-label-secondary,#697386)}
.wp-pill[data-cat="conflict"]{background:rgba(239,68,68,.11);color:#d64545}
.wp-pill[data-cat="economy"]{background:rgba(245,158,11,.13);color:#a96a00}
.wp-pill[data-cat="china"]{background:rgba(225,29,72,.1);color:#c22b4b}
.wp-pill[data-cat="climate"]{background:rgba(16,183,166,.13);color:#087f74}
.wp-pill[data-cat="tech"]{background:rgba(99,102,241,.12);color:#5558c9}
.wp-pill[data-cat="health"]{background:rgba(34,197,94,.12);color:#168044}
.wp-time{margin-left:auto;font-size:10.5px;color:var(--dsw-alias-label-secondary,#697386);white-space:nowrap}
.wp-news h3{font-size:14.5px;line-height:1.45;margin:0 0 5px;font-weight:700;letter-spacing:-.005em}
.wp-news p{margin:0;color:var(--dsw-alias-label-secondary,#697386);font-size:12px;line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.wp-news-foot{display:flex;align-items:center;gap:5px;color:var(--wp-brand);font-size:10.5px;font-weight:700;margin-top:8px}
.wp-side{display:flex;flex-direction:column;gap:12px;position:sticky;top:84px}
.wp-card{background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:15px;padding:15px}
.wp-card h3{font-size:12px;letter-spacing:.02em;margin:0 0 3px;font-weight:750}
.wp-card .wp-muted{font-size:10.5px;color:var(--dsw-alias-label-secondary,#697386);margin:0 0 12px}
.wp-muted{color:var(--dsw-alias-label-secondary,#697386)}
.wp-source-list{display:flex;flex-direction:column;gap:0}
.wp-source-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px dashed var(--dsw-alias-border-l1,rgba(0,0,0,.08));font-size:11.5px}
.wp-source-row:last-child{border-bottom:0}
.wp-source-dot{width:6px;height:6px;border-radius:50%;background:var(--wp-teal);flex:0 0 auto}
.wp-source-row b{margin-left:auto;color:var(--dsw-alias-label-secondary,#697386);font-weight:650}
.wp-promo{background:linear-gradient(135deg,rgba(43,127,255,.1),rgba(16,183,166,.09));border-color:rgba(43,127,255,.18)}
.wp-promo h3{font-size:15px;margin-bottom:5px}
.wp-promo p{font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary,#697386);margin:0 0 12px}
.wp-banner{display:flex;gap:10px;align-items:flex-start;border-radius:12px;padding:11px 13px;font-size:12px;line-height:1.55;margin-bottom:12px;border:1px solid rgba(245,158,11,.28);background:rgba(245,158,11,.08);color:var(--dsw-alias-label-primary,#111)}
.wp-banner[data-tone="error"]{border-color:rgba(239,68,68,.25);background:rgba(239,68,68,.07)}
.wp-banner[data-tone="info"]{border-color:rgba(43,127,255,.2);background:rgba(43,127,255,.06)}
.wp-banner svg{flex:0 0 auto;margin-top:1px}
.wp-skeleton{height:108px;border-radius:14px;background:linear-gradient(90deg,var(--dsw-alias-bg-layer-1,#fff) 25%,var(--dsw-alias-bg-layer-2,#eef1f6) 37%,var(--dsw-alias-bg-layer-1,#fff) 63%);background-size:400% 100%;animation:wp-shimmer 1.4s ease infinite;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06))}
@keyframes wp-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
.wp-empty{padding:42px 20px;text-align:center;border:1px dashed var(--dsw-alias-border-l2,rgba(0,0,0,.16));border-radius:16px;color:var(--dsw-alias-label-secondary,#697386)}
.wp-empty strong{display:block;color:var(--dsw-alias-label-primary,#111);font-size:16px;margin:10px 0 5px}
.wp-empty p{max-width:520px;margin:0 auto;font-size:12px;line-height:1.65}
.wp-analysis-top{display:grid;grid-template-columns:190px minmax(0,1fr);gap:14px;margin-top:18px}
.wp-gauge-card,.wp-overview{background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:16px;padding:16px}
.wp-gauge-card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
.wp-gauge{width:118px;height:118px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--wp-risk,#ef4444) calc(var(--wp-score,0)*1%),var(--dsw-alias-bg-layer-2,#eef1f6) 0);position:relative}
.wp-gauge:after{content:"";position:absolute;inset:9px;border-radius:50%;background:var(--dsw-alias-bg-layer-1,#fff)}
.wp-gauge-inner{position:relative;z-index:1;text-align:center}
.wp-gauge-inner strong{display:block;font-size:27px;line-height:1;font-weight:800;letter-spacing:-.04em}
.wp-gauge-inner span{font-size:10px;color:var(--dsw-alias-label-secondary,#697386)}
.wp-gauge-label{font-size:11px;font-weight:750;display:flex;align-items:center;gap:5px}
.wp-overview h2{font-size:17px;margin:0 0 7px;letter-spacing:-.015em}
.wp-overview p{margin:0;color:var(--dsw-alias-label-secondary,#697386);font-size:12.5px;line-height:1.7}
.wp-overview-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
.wp-mini-pill{font-size:10px;font-weight:700;border-radius:999px;padding:4px 9px;background:var(--dsw-alias-bg-layer-2,#eef1f6);color:var(--dsw-alias-label-secondary,#697386)}
.wp-analysis-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(270px,.6fr);gap:16px;margin-top:14px;align-items:start}
.wp-stack{display:flex;flex-direction:column;gap:12px;min-width:0}
.wp-prose{background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:15px;padding:15px 16px}
.wp-prose h3{display:flex;align-items:center;gap:7px;font-size:13px;margin:0 0 7px;font-weight:750}
.wp-prose p{margin:0;font-size:12.2px;line-height:1.75;color:var(--dsw-alias-label-secondary,#697386)}
.wp-hotspots{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.wp-hotspot{border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));background:var(--dsw-alias-bg-layer-1,#fff);border-radius:14px;padding:13px}
.wp-hotspot-top{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.wp-hotspot-top strong{font-size:12.5px}
.wp-hotspot-top span{margin-left:auto;font-size:10px;color:var(--dsw-alias-label-secondary,#697386)}
.wp-level{font-size:9px;font-weight:800;letter-spacing:.04em;border-radius:4px;padding:2px 5px}
.wp-level[data-level="high"]{background:rgba(239,68,68,.1);color:#d64545}
.wp-level[data-level="medium"]{background:rgba(245,158,11,.13);color:#a96a00}
.wp-level[data-level="low"]{background:rgba(34,197,94,.12);color:#168044}
.wp-hotspot p{font-size:11.3px;line-height:1.6;color:var(--dsw-alias-label-secondary,#697386);margin:7px 0 0}
.wp-hotspot .wp-watch{font-size:10.8px;color:var(--dsw-alias-label-primary,#111);background:var(--dsw-alias-bg-layer-2,#eef1f6);border-radius:8px;padding:7px 8px;margin-top:8px}
.wp-samples{display:flex;flex-direction:column;gap:4px;margin-top:8px}
.wp-samples a{font-size:10.5px;color:var(--wp-brand);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wp-samples a:hover{text-decoration:underline}
.wp-bars{display:flex;flex-direction:column;gap:8px}
.wp-bar-row{display:grid;grid-template-columns:72px minmax(0,1fr) 24px;align-items:center;gap:7px;font-size:10.5px;color:var(--dsw-alias-label-secondary,#697386)}
.wp-bar{height:5px;border-radius:99px;background:var(--dsw-alias-bg-layer-2,#eef1f6);overflow:hidden}
.wp-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--wp-brand),var(--wp-teal))}
.wp-bar-row b{text-align:right;font-weight:700}
.wp-watchlist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}
.wp-watchlist li{display:flex;gap:8px;font-size:11.2px;line-height:1.55;color:var(--dsw-alias-label-secondary,#697386)}
.wp-watchlist i{width:18px;height:18px;border-radius:50%;background:var(--dsw-alias-bg-layer-2,#eef1f6);display:grid;place-items:center;flex:0 0 auto;font-style:normal;font-size:9px;font-weight:800;color:var(--wp-brand);margin-top:1px}
.wp-headlines{display:flex;flex-direction:column;gap:0}
.wp-headline{display:flex;gap:7px;padding:7px 0;border-bottom:1px dashed var(--dsw-alias-border-l1,rgba(0,0,0,.08));text-decoration:none;color:inherit}
.wp-headline:last-child{border-bottom:0}
.wp-headline span{font-size:10px;color:var(--wp-brand);font-weight:750;flex:0 0 74px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-top:1px}
.wp-headline p{font-size:11px;line-height:1.45;margin:0;color:var(--dsw-alias-label-secondary,#697386);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.wp-plan-layout{display:grid;grid-template-columns:350px minmax(0,1fr);gap:16px;align-items:start;margin-top:18px}
.wp-planner{background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:16px;padding:17px;position:sticky;top:84px}
.wp-planner h2{font-size:16px;margin:0 0 2px}
.wp-planner .wp-muted{font-size:11px;margin:0 0 15px}
.wp-field{display:flex;flex-direction:column;gap:6px;margin-bottom:13px}
.wp-field>label,.wp-field>span.wp-label{font-size:10.5px;font-weight:750;letter-spacing:.03em;color:var(--dsw-alias-label-secondary,#697386)}
.wp-input{width:100%;height:39px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.14));background:var(--dsw-alias-bg-base,#f7f8fa);color:var(--dsw-alias-label-primary,#111);border-radius:10px;padding:0 11px;font:inherit;font-size:12.5px;outline:none}
.wp-input:focus{border-color:var(--wp-brand);box-shadow:0 0 0 3px rgba(43,127,255,.12)}
.wp-quick{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}
.wp-quick button{appearance:none;border:0;background:transparent;color:var(--wp-brand);font:inherit;font-size:10.5px;font-weight:650;padding:1px 0;cursor:pointer}
.wp-quick button:hover{text-decoration:underline}
.wp-slider{width:100%;accent-color:var(--wp-brand);margin:4px 0}
.wp-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.wp-row b{font-size:12px}
.wp-options{display:flex;gap:5px;flex-wrap:wrap}
.wp-option{appearance:none;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.1));background:var(--dsw-alias-bg-base,#f7f8fa);color:var(--dsw-alias-label-secondary,#697386);border-radius:8px;padding:6px 9px;font:inherit;font-size:11px;font-weight:650;cursor:pointer}
.wp-option[data-active="true"]{background:rgba(43,127,255,.1);border-color:rgba(43,127,255,.4);color:var(--wp-brand)}
.wp-plan-submit{width:100%;justify-content:center;margin-top:4px;padding:11px}
.wp-plan-note{font-size:10px;color:var(--dsw-alias-label-secondary,#697386);line-height:1.5;margin:10px 0 0}
.wp-plan-result{min-width:0;display:flex;flex-direction:column;gap:13px}
.wp-result-head{display:flex;align-items:flex-start;gap:14px;justify-content:space-between;background:linear-gradient(130deg,var(--dsw-alias-bg-layer-1,#fff),rgba(43,127,255,.05));border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:16px;padding:17px}
.wp-result-head h2{font-size:24px;letter-spacing:-.02em;margin:2px 0 4px}
.wp-result-head p{margin:0;font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary,#697386);max-width:650px}
.wp-result-actions{display:flex;flex-direction:column;gap:7px;align-items:flex-end;flex:0 0 auto}
.wp-risk-badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:5px 9px;font-size:10px;font-weight:750;white-space:nowrap}
.wp-risk-badge[data-level="red"]{background:rgba(239,68,68,.1);color:#d64545}
.wp-risk-badge[data-level="amber"]{background:rgba(245,158,11,.13);color:#a96a00}
.wp-risk-badge[data-level="green"]{background:rgba(34,197,94,.12);color:#168044}
.wp-weather{display:flex;gap:7px;overflow:auto;padding-bottom:2px}
.wp-weather-day{flex:0 0 84px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));background:var(--dsw-alias-bg-layer-1,#fff);border-radius:12px;padding:9px 10px;text-align:center}
.wp-weather-day span{display:block;font-size:9.5px;color:var(--dsw-alias-label-secondary,#697386);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wp-weather-day svg{display:block;margin:6px auto 4px;color:var(--wp-brand)}
.wp-weather-day b{display:block;font-size:11px}
.wp-weather-day small{display:block;font-size:9px;color:var(--dsw-alias-label-secondary,#697386)}
.wp-plan-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(245px,.6fr);gap:13px;align-items:start}
.wp-days{display:flex;flex-direction:column;gap:10px;min-width:0}
.wp-day{border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));background:var(--dsw-alias-bg-layer-1,#fff);border-radius:14px;padding:13px 14px}
.wp-day-head{display:flex;align-items:center;gap:9px;margin-bottom:10px}
.wp-day-num{width:30px;height:30px;border-radius:9px;background:rgba(43,127,255,.1);color:var(--wp-brand);display:grid;place-items:center;font-size:11px;font-weight:800;flex:0 0 auto}
.wp-day-head strong{font-size:12.5px}
.wp-day-head span{margin-left:auto;font-size:10px;color:var(--dsw-alias-label-secondary,#697386)}
.wp-activity{display:grid;grid-template-columns:42px minmax(0,1fr);gap:9px;padding:7px 0;border-top:1px dashed var(--dsw-alias-border-l1,rgba(0,0,0,.08))}
.wp-activity:first-of-type{border-top:0}
.wp-activity-time{font-size:9.5px;font-weight:750;color:var(--wp-brand);padding-top:2px}
.wp-activity b{display:block;font-size:11.5px;line-height:1.4}
.wp-activity p{margin:2px 0 0;font-size:10.7px;line-height:1.55;color:var(--dsw-alias-label-secondary,#697386)}
.wp-activity-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;font-size:9.5px;color:var(--dsw-alias-label-secondary,#697386)}
.wp-day-foot{margin-top:9px;padding-top:8px;border-top:1px dashed var(--dsw-alias-border-l1,rgba(0,0,0,.08));font-size:10.2px;color:var(--dsw-alias-label-secondary,#697386);line-height:1.55}
.wp-day-foot b{color:var(--dsw-alias-label-primary,#111)}
.wp-plan-side{display:flex;flex-direction:column;gap:11px;position:sticky;top:84px}
.wp-budget-total{font-size:24px;font-weight:800;letter-spacing:-.03em;margin:2px 0}
.wp-budget-row{display:flex;justify-content:space-between;gap:8px;font-size:11px;padding:5px 0;border-bottom:1px dashed var(--dsw-alias-border-l1,rgba(0,0,0,.08));color:var(--dsw-alias-label-secondary,#697386)}
.wp-budget-row:last-child{border-bottom:0}
.wp-budget-row b{color:var(--dsw-alias-label-primary,#111)}
.wp-checklist{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px}
.wp-checklist li{display:flex;gap:7px;font-size:10.8px;line-height:1.45;color:var(--dsw-alias-label-secondary,#697386)}
.wp-checklist svg{flex:0 0 auto;color:var(--wp-teal);margin-top:1px}
.wp-safety-note{font-size:10.8px;line-height:1.6;color:var(--dsw-alias-label-secondary,#697386);margin:0 0 8px}
.wp-safety-note b{color:var(--dsw-alias-label-primary,#111)}
.wp-official{display:flex;flex-direction:column;gap:4px;margin-top:8px}
.wp-official a{font-size:10.5px;color:var(--wp-brand);text-decoration:none}
.wp-official a:hover{text-decoration:underline}
.wp-blocked{background:linear-gradient(140deg,rgba(239,68,68,.09),rgba(245,158,11,.06));border:1px solid rgba(239,68,68,.24);border-radius:16px;padding:19px}
.wp-blocked h2{font-size:19px;margin:6px 0 6px;color:#c23b3b}
.wp-blocked p{font-size:12px;line-height:1.7;color:var(--dsw-alias-label-secondary,#697386);margin:0}
.wp-alternatives{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
.wp-alt{appearance:none;text-align:left;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.09));background:var(--dsw-alias-bg-layer-1,#fff);border-radius:11px;padding:10px;font:inherit;cursor:pointer;color:var(--dsw-alias-label-primary,#111)}
.wp-alt:hover{border-color:rgba(43,127,255,.4)}
.wp-alt b{display:block;font-size:11.5px}
.wp-alt span{display:block;font-size:9.5px;color:var(--dsw-alias-label-secondary,#697386);margin-top:2px;line-height:1.4}
.wp-alt em{display:block;font-style:normal;font-size:9.5px;color:var(--wp-brand);font-weight:700;margin-top:5px}
.wp-travel-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0}
.wp-span-2{grid-column:1/-1}
.wp-travel-card{padding:13px 14px}
.wp-travel-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:8px}
.wp-travel-head h3{font-size:12.5px;margin:0}
.wp-travel-sub{font-size:10px;color:var(--dsw-alias-label-secondary,#697386);margin:2px 0 0;line-height:1.45}
.wp-travel-meta{display:flex;gap:8px;flex-wrap:wrap;font-size:9.5px;color:var(--dsw-alias-label-secondary,#697386);margin:4px 0}
.wp-travel-meta span{display:inline-flex;align-items:center;gap:3px}
.wp-travel-options{display:flex;flex-direction:column;gap:7px;margin-top:6px}
.wp-travel-option{border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:10px;padding:8px 9px;background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.015))}
.wp-travel-option-head{display:flex;justify-content:space-between;gap:8px;font-size:11px}
.wp-travel-option strong{color:var(--wp-brand);font-size:10.5px;white-space:nowrap}
.wp-travel-option p{font-size:9.8px;color:var(--dsw-alias-label-secondary,#697386);margin:3px 0;line-height:1.45}
.wp-travel-proscons{display:flex;flex-direction:column;gap:2px;font-size:9.3px;color:var(--dsw-alias-label-secondary,#697386);line-height:1.45}
.wp-travel-proscons b{color:var(--dsw-alias-label-primary,#111)}
.wp-travel-label{font-size:9.5px;font-weight:800;letter-spacing:.02em;color:var(--dsw-alias-label-secondary,#697386);text-transform:uppercase;margin:10px 0 5px}
.wp-travel-links{display:flex;flex-wrap:wrap;gap:5px}
.wp-travel-links a{display:flex;flex-direction:column;gap:1px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:8px;padding:5px 7px;text-decoration:none;color:var(--dsw-alias-label-primary,#111);font-size:10px;min-width:0}
.wp-travel-links a span{font-weight:700}
.wp-travel-links a em{font-style:normal;font-size:8.8px;color:var(--dsw-alias-label-secondary,#697386);white-space:normal}
.wp-travel-links a:hover{border-color:rgba(43,127,255,.4)}
.wp-travel-note{font-size:9.3px;line-height:1.5;color:var(--dsw-alias-label-secondary,#697386);margin:8px 0 0}
.wp-stay-areas{display:flex;flex-direction:column;gap:7px}
.wp-stay-area{border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:10px;padding:8px 9px;background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.015))}
.wp-stay-area-head{display:flex;justify-content:space-between;gap:8px;font-size:11px}
.wp-stay-area-head strong{color:var(--wp-brand);font-size:10px;white-space:nowrap}
.wp-stay-vibe{display:inline-block;font-size:9px;color:var(--wp-brand);background:rgba(43,127,255,.08);padding:1px 5px;border-radius:999px;margin:2px 0 4px}
.wp-stay-area p{font-size:9.5px;line-height:1.5;color:var(--dsw-alias-label-secondary,#697386);margin:0 0 2px}
.wp-stay-area p b{color:var(--dsw-alias-label-primary,#111)}
.wp-travel-tip{color:var(--dsw-alias-label-secondary,#697386)}
.wp-stay-types{display:grid;grid-template-columns:1fr;gap:5px;margin-top:8px}
.wp-stay-type{font-size:9.5px;border-left:2px solid rgba(43,127,255,.35);padding-left:7px}
.wp-stay-type b{display:block;font-size:10px}
.wp-stay-type span{color:var(--dsw-alias-label-secondary,#697386);line-height:1.4}
.wp-ground-list{display:flex;flex-direction:column;gap:6px}
.wp-ground-item{border-left:2px solid rgba(43,127,255,.35);padding-left:8px}
.wp-ground-item b{font-size:10.5px}
.wp-ground-item p{font-size:9.5px;line-height:1.5;color:var(--dsw-alias-label-secondary,#697386);margin:2px 0}
.wp-apps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}
.wp-app{border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:8px;padding:6px 7px;text-decoration:none;color:var(--dsw-alias-label-primary,#111);min-width:0}
.wp-app b{display:block;font-size:10px}
.wp-app span{display:block;font-size:8.8px;color:var(--dsw-alias-label-secondary,#697386);line-height:1.35}
.wp-app:hover{border-color:rgba(43,127,255,.4)}
.wp-ground-tips{margin:0;padding-left:14px;font-size:9.5px;line-height:1.55;color:var(--dsw-alias-label-secondary,#697386)}
.wp-ground-tips li{margin:0 0 2px}
.wp-platform-card{margin-top:12px;padding:14px}
.wp-platform-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.wp-platform-col{min-width:0}
.wp-platform-item{display:flex;flex-direction:column;gap:1px;padding:5px 0;border-bottom:1px dashed var(--dsw-alias-border-l1,rgba(0,0,0,.08));text-decoration:none;color:var(--dsw-alias-label-primary,#111)}
.wp-platform-item b{font-size:10.3px}
.wp-platform-item span{font-size:8.8px;color:var(--wp-brand)}
.wp-platform-item em{font-style:normal;font-size:8.5px;color:var(--dsw-alias-label-secondary,#697386);line-height:1.35}
.wp-platform-verdict{margin-top:10px;padding-top:9px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));display:grid;gap:4px}
.wp-platform-verdict p{font-size:9.8px;line-height:1.5;color:var(--dsw-alias-label-secondary,#697386);margin:0}
.wp-platform-verdict b{color:var(--dsw-alias-label-primary,#111)}
.wp-flight-view{display:flex;flex-direction:column;gap:14px}
.wp-flight-search{padding:14px}
.wp-flight-form{display:grid;grid-template-columns:minmax(0,1fr) 34px minmax(0,1fr) 150px auto;gap:8px;align-items:end}
.wp-flight-form .wp-field{margin-bottom:0}
.wp-flight-swap{height:34px;width:34px;align-self:end;justify-content:center}
.wp-flight-swap svg{transform:rotate(90deg)}
.wp-flight-result{display:flex;flex-direction:column;gap:12px}
.wp-flight-result-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
.wp-flight-result-head h2{font-size:20px;margin:3px 0;letter-spacing:-.03em}
.wp-flight-result-head p{font-size:10.5px;color:var(--dsw-alias-label-secondary,#697386);margin:0}
.wp-flight-badges{display:flex;gap:6px;flex-wrap:wrap}
.wp-flight-badge{display:inline-flex;align-items:center;gap:4px;font-size:9.5px;font-weight:700;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.1));border-radius:999px;padding:4px 8px;background:var(--dsw-alias-bg-layer-1,#fff)}
.wp-flight-badge[data-tone="good"]{color:#167a4b;border-color:rgba(22,122,75,.25);background:rgba(22,122,75,.07)}
.wp-flight-badge[data-tone="warn"]{color:#9a6300;border-color:rgba(154,99,0,.25);background:rgba(154,99,0,.07)}
.wp-flight-live{display:flex;flex-direction:column;gap:6px}
.wp-flight-live a{display:block;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:9px;padding:7px 8px;text-decoration:none;color:var(--dsw-alias-label-primary,#111)}
.wp-flight-live a:hover{border-color:rgba(43,127,255,.4)}
.wp-flight-live b{display:block;font-size:10.5px;line-height:1.45}
.wp-flight-live span{display:block;font-size:9px;color:var(--dsw-alias-label-secondary,#697386);margin-top:2px}
.wp-flight-live em{font-style:normal;color:var(--wp-brand);font-weight:700}
.wp-flight-note{font-size:9.5px;line-height:1.55;color:var(--dsw-alias-label-secondary,#697386);margin:0}
.wp-flight-error{margin:0}
.wp-footer{margin-top:28px;padding-top:14px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:10px;color:var(--dsw-alias-label-secondary,#697386)}
.wp-footer a{color:var(--wp-brand);text-decoration:none}
@media(max-width:1000px){.wp-hero{grid-template-columns:1fr}.wp-hero-stats{grid-template-columns:repeat(4,1fr)}.wp-stat.wide{grid-column:auto}.wp-grid,.wp-analysis-grid{grid-template-columns:1fr}.wp-side,.wp-plan-side{position:static}.wp-plan-layout{grid-template-columns:1fr}.wp-planner{position:static}.wp-plan-grid{grid-template-columns:1fr}.wp-travel-grid,.wp-platform-grid{grid-template-columns:1fr}.wp-span-2{grid-column:auto}}
@media(max-width:700px){.wp-shell{padding:12px 12px 34px}.wp-header{flex-wrap:wrap;gap:8px}.wp-brand{min-width:0}.wp-brand-mark{width:34px;height:34px}.wp-tabs{order:3;width:100%}.wp-header-actions{margin-left:auto}.wp-hero{padding:24px 20px;border-radius:18px}.wp-hero-stats{grid-template-columns:1fr 1fr}.wp-stat.wide{grid-column:1/-1}.wp-analysis-top{grid-template-columns:1fr}.wp-gauge-card{flex-direction:row;justify-content:flex-start;gap:16px}.wp-hotspots{grid-template-columns:1fr}.wp-result-head{flex-direction:column}.wp-result-actions{flex-direction:row;align-items:center}.wp-alternatives{grid-template-columns:1fr}.wp-bar-row{grid-template-columns:64px minmax(0,1fr) 22px}.wp-activity{grid-template-columns:38px minmax(0,1fr)}.wp-brand-en{display:none}.wp-apps{grid-template-columns:1fr 1fr}.wp-flight-search .wp-quick{margin-top:7px}.wp-flight-search .wp-quick button{max-width:100%}.wp-flight-form{grid-template-columns:minmax(0,1fr) 34px minmax(0,1fr)}.wp-flight-date{grid-column:1/-1}.wp-flight-submit{grid-column:1/-1;justify-content:center}.wp-flight-swap{display:none}.wp-flight-result-head{flex-direction:column}.wp-travel-head{flex-wrap:wrap}}
@media print{.wp-header,.wp-hero,.wp-planner,.wp-toolbar,.wp-footer,.wp-plan-side .wp-card:last-child{display:none!important}.wp-page{background:#fff}.wp-shell{max-width:none;padding:0}.wp-plan-layout{display:block}.wp-plan-result{margin-top:0}.wp-plan-grid{grid-template-columns:1fr}.wp-day{break-inside:avoid}.wp-result-actions{display:none}.wp-plan-side{position:static}.wp-card,.wp-day,.wp-result-head{border-color:#ddd;box-shadow:none}.wp-travel-card,.wp-platform-card{break-inside:avoid}}
`;
    const CSS_ID = 'worldpulse-style';
    function Style() {
      useEffect(() => {
        let node = document.getElementById(CSS_ID);
        if (!node) {
          node = document.createElement('style');
          node.id = CSS_ID;
          node.textContent = CSS;
          document.head.appendChild(node);
        }
        return () => { /* keep the shared sheet for hot reloads */ };
      }, []);
      return null;
    }

    /* ---------------------------------------------------------------- */
    /* Shared UI                                                        */
    /* ---------------------------------------------------------------- */

    function RiskBadge({ level, lang }) {
      const label = level === 'red' ? tx(lang, 'riskRed') : level === 'amber' ? tx(lang, 'riskAmber') : tx(lang, 'riskGreen');
      return h('span', { className: 'wp-risk-badge', 'data-level': level },
        h(Icon, { name: level === 'red' ? 'alert' : level === 'amber' ? 'shield' : 'check', size: 11 }),
        label);
    }

    function SourceList({ sources, lang }) {
      if (!sources.length) return h('p', { className: 'wp-muted' }, tx(lang, 'noData'));
      return h('div', { className: 'wp-source-list' },
        sources.map((entry) => h('div', { className: 'wp-source-row', key: entry.name },
          h('span', { className: 'wp-source-dot' }),
          h('span', null, entry.name),
          h('b', null, entry.count))));
    }

    function CategoryBars({ categories, lang }) {
      if (!categories?.length) return h('p', { className: 'wp-muted' }, tx(lang, 'noData'));
      const max = Math.max(...categories.map((entry) => entry.count), 1);
      return h('div', { className: 'wp-bars' },
        categories.map((entry) => h('div', { className: 'wp-bar-row', key: entry.key },
          h('span', null, tx(lang, 'categories')[entry.key] ?? entry.label),
          h('div', { className: 'wp-bar' }, h('i', { style: { width: `${Math.max(6, (entry.count / max) * 100)}%` } })),
          h('b', null, entry.count))));
    }

    /* ---------------------------------------------------------------- */
    /* News                                                             */
    /* ---------------------------------------------------------------- */

    function NewsCard({ item, lang }) {
      const cat = tx(lang, 'categories')[item.category] ?? item.categoryLabel ?? tx(lang, 'all');
      return h('a', {
        className: 'wp-news',
        href: item.url,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      h('div', { className: 'wp-news-top' },
        h('span', { className: 'wp-source' }, item.source),
        h('span', { className: 'wp-pill', 'data-cat': item.category }, item.fallback ? tx(lang, 'offline') : cat),
        h('span', { className: 'wp-time' }, item.publishedAt ? formatRelative(item.publishedAt, lang) : (item.fallback ? '' : tx(lang, 'justNow')))),
      h('h3', null, item.title),
      h('p', null, item.snippet),
      h('div', { className: 'wp-news-foot' },
        h('span', null, lang === 'zh' ? '查看原文' : 'Read source'),
        h(Icon, { name: 'external', size: 11 })));
    }

    function NewsView({ lang, region, setRegion, news, brief, reload }) {
      const [filter, setFilter] = useState('all');
      const sourceCounts = React.useMemo(() => {
        const map = new Map();
        for (const item of news.data?.sources ?? []) map.set(item.source, (map.get(item.source) ?? 0) + 1);
        return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 9);
      }, [news.data]);
      const items = (news.data?.sources ?? []).filter((item) => {
        if (filter === 'all') return true;
        if (filter === 'china') return item.category === 'china' || /中国|china|beijing|北京/i.test(`${item.title} ${item.snippet}`);
        return item.category === filter;
      });
      const regions = REGION_KEYS;
      return h('div', null,
        h('div', { className: 'wp-toolbar' },
          h('div', { className: 'wp-chips' },
            regions.map((key) => h('button', {
              type: 'button', className: 'wp-chip', key,
              'data-active': String(region === key),
              onClick: () => setRegion(key),
            }, regionLabel(key, lang)))),
          h('div', { className: 'wp-chips' },
            tx(lang, 'filters').map(([id, label]) => h('button', {
              type: 'button', key: id, className: 'wp-chip', 'data-tone': 'soft',
              'data-active': String(filter === id), onClick: () => setFilter(id),
            }, label)))),
        news.error ? h('div', { className: 'wp-banner', 'data-tone': 'error' },
          h(Icon, { name: 'alert', size: 15 }),
          h('div', null,
            h('b', null, `${tx(lang, 'loadError')}: `), news.error,
            h('div', null, h('button', { type: 'button', className: 'wp-quick', style: { padding: 0, marginTop: 4 }, onClick: () => reload() }, tx(lang, 'retry'))))) : null,
        news.data?.degraded ? h('div', { className: 'wp-banner' },
          h(Icon, { name: 'alert', size: 15 }),
          h('div', null, h('b', null, `${tx(lang, 'degradedTitle')} · `), tx(lang, 'degradedText'))) : null,
        h('div', { className: 'wp-section-head' },
          h('div', null,
            h('h2', null, tx(lang, 'feedTitle')),
            h('p', null, tx(lang, 'feedSub'))),
          h('span', { className: 'wp-muted', style: { fontSize: 10.5 } },
            news.data ? `${news.data.itemCount ?? 0} ${tx(lang, 'itemsWord')} · ${news.data.sourceCount ?? 0} ${tx(lang, 'sourceWord')}` : '')),
        h('div', { className: 'wp-grid' },
          h('div', { className: 'wp-feed' },
            news.loading && !news.data
              ? [0, 1, 2, 3].map((index) => h('div', { className: 'wp-skeleton', key: index }))
              : items.length
                ? items.map((item) => h(NewsCard, { item, lang, key: item.id }))
                : h('div', { className: 'wp-empty' },
                  h(Icon, { name: 'globe', size: 26 }),
                  h('strong', null, tx(lang, 'noNews')))),
          h('aside', { className: 'wp-side' },
            h('div', { className: 'wp-card' },
              h('h3', null, tx(lang, 'sourceCoverage')),
              h('p', { className: 'wp-muted' }, tx(lang, 'sourceCoverageSub')),
              h(SourceList, { sources: sourceCounts, lang })),
            brief.data ? h('div', { className: 'wp-card' },
              h('h3', null, tx(lang, 'riskScan')),
              h('p', { className: 'wp-muted' }, tx(lang, 'riskScanSub')),
              h('div', { className: 'wp-row', style: { marginBottom: 8 } },
                h('span', { className: 'wp-risk-badge', 'data-level': brief.data.riskTone === 'high' ? 'red' : brief.data.riskTone === 'medium' ? 'amber' : 'green' },
                  h(Icon, { name: 'shield', size: 11 }),
                  `${tx(lang, 'riskTemperature')} ${brief.data.riskScore}`),
                h('span', { className: 'wp-muted', style: { fontSize: 10 } }, `${brief.data.hotspots?.length ?? 0} ${lang === 'zh' ? '个热点' : 'hotspots'}`)),
              h('div', { className: 'wp-bars' },
                (brief.data.hotspots ?? []).slice(0, 4).map((hotspot) => h('div', { className: 'wp-bar-row', key: hotspot.id },
                  h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, hotspot.name),
                  h('div', { className: 'wp-bar' }, h('i', { style: { width: `${Math.min(100, Math.max(8, hotspot.count * 14))}%` } })),
                  h('b', null, hotspot.count))))) : null,
            h('div', { className: 'wp-card wp-promo' },
              h(Icon, { name: 'route', size: 20 }),
              h('h3', { style: { marginTop: 8 } }, tx(lang, 'planPromoTitle')),
              h('p', null, tx(lang, 'planPromoText')),
              h('button', {
                type: 'button', className: 'wp-btn wp-btn-brand', style: { width: '100%', justifyContent: 'center' },
                onClick: () => window.dispatchEvent(new CustomEvent('worldpulse:tab', { detail: 'plan' })),
              }, tx(lang, 'planPromoBtn'), h(Icon, { name: 'arrow', size: 12 }))))));
    }

    /* ---------------------------------------------------------------- */
    /* Analysis                                                         */
    /* ---------------------------------------------------------------- */

    function BriefView({ lang, region, brief, reload }) {
      if (brief.loading && !brief.data) {
        return h('div', { className: 'wp-stack', style: { marginTop: 18 } },
          h('div', { className: 'wp-skeleton', style: { height: 180 } }),
          h('div', { className: 'wp-skeleton', style: { height: 320 } }));
      }
      if (brief.error && !brief.data) {
        return h('div', { className: 'wp-banner', 'data-tone': 'error', style: { marginTop: 18 } },
          h(Icon, { name: 'alert', size: 15 }),
          h('div', null, h('b', null, `${tx(lang, 'loadError')}: `), brief.error),
          h('button', { type: 'button', className: 'wp-btn wp-btn-soft', style: { marginTop: 8 }, onClick: () => reload() }, tx(lang, 'retry')));
      }
      const data = brief.data;
      if (!data) return null;
      const riskColor = data.riskTone === 'high' ? 'var(--dsw-alias-state-error-primary,#ef4444)' : data.riskTone === 'medium' ? 'var(--dsw-alias-state-warn-primary,#f59e0b)' : 'var(--dsw-alias-state-success-primary,#22c55e)';
      const riskLabel = data.riskTone === 'high' ? tx(lang, 'riskHigh') : data.riskTone === 'medium' ? tx(lang, 'riskMedium') : tx(lang, 'riskLow');
      const riskNote = data.riskTone === 'high' ? tx(lang, 'riskHighNote') : data.riskTone === 'medium' ? tx(lang, 'riskMediumNote') : tx(lang, 'riskLowNote');
      return h('div', null,
        data.degraded ? h('div', { className: 'wp-banner', style: { marginTop: 18 } },
          h(Icon, { name: 'alert', size: 15 }), h('div', null, tx(lang, 'analysisDegraded'))) : null,
        h('div', { className: 'wp-analysis-top' },
          h('div', { className: 'wp-gauge-card' },
            h('div', { className: 'wp-gauge', style: { '--wp-score': String(data.riskScore ?? 0), '--wp-risk': riskColor } },
              h('div', { className: 'wp-gauge-inner' },
                h('strong', null, data.riskScore ?? '—'),
                h('span', null, `${tx(lang, 'riskTemperature')} / 100`))),
            h('div', { className: 'wp-gauge-label', style: { color: riskColor } },
              h(Icon, { name: 'shield', size: 12 }), riskLabel),
            h('span', { className: 'wp-muted', style: { fontSize: 10, textAlign: 'center', lineHeight: 1.45 } }, riskNote)),
          h('div', { className: 'wp-overview' },
            h('h2', null, tx(lang, 'overview')),
            h('p', null, data.overview),
            h('div', { className: 'wp-overview-meta' },
              h('span', { className: 'wp-mini-pill' }, `${data.itemCount ?? 0} ${tx(lang, 'itemsWord')}`),
              h('span', { className: 'wp-mini-pill' }, `${data.sourceCount ?? 0} ${tx(lang, 'sourceWord')}`),
              h('span', { className: 'wp-mini-pill' }, regionLabel(region, lang)),
              h('span', { className: 'wp-mini-pill' }, formatClock(data.generatedAt, lang))))),
        h('div', { className: 'wp-analysis-grid' },
          h('div', { className: 'wp-stack' },
            h('div', { className: 'wp-prose' },
              h('h3', null, h(Icon, { name: 'shield', size: 14 }), tx(lang, 'security')),
              h('p', null, data.security)),
            h('div', { className: 'wp-prose' },
              h('h3', null, h(Icon, { name: 'wallet', size: 14 }), tx(lang, 'economy')),
              h('p', null, data.economy)),
            h('div', { className: 'wp-prose' },
              h('h3', null, h(Icon, { name: 'sun', size: 14 }), tx(lang, 'climate')),
              h('p', null, data.climate)),
            h('div', null,
              h('div', { className: 'wp-section-head' },
                h('div', null,

                  h('h2', null, tx(lang, 'hotspotTitle')),
                  h('p', null, tx(lang, 'hotspotSub')))),
              h('div', { className: 'wp-hotspots' },
                (data.hotspots ?? []).map((hotspot) => h('div', { className: 'wp-hotspot', key: hotspot.id },
                  h('div', { className: 'wp-hotspot-top' },
                    h('span', { className: 'wp-level', 'data-level': hotspot.level },
                      hotspot.level === 'high' ? 'HIGH' : hotspot.level === 'medium' ? 'MED' : 'LOW'),
                    h('strong', null, hotspot.name),
                    h('span', null, `${hotspot.count} ${tx(lang, 'heat')}`)),
                  h('p', null, hotspot.context),
                  h('div', { className: 'wp-watch' }, h('b', null, `${tx(lang, 'watch')}: `), hotspot.watch),
                  (hotspot.samples ?? []).length ? h('div', { className: 'wp-samples' },
                    hotspot.samples.map((sample) => h('a', { key: sample.url, href: sample.url, target: '_blank', rel: 'noopener noreferrer' }, `${sample.source} · ${sample.title}`))) : null))))),
          h('aside', { className: 'wp-side' },
            h('div', { className: 'wp-card' },
              h('h3', null, tx(lang, 'categoryDist')),
              h('p', { className: 'wp-muted' }, tx(lang, 'riskScanSub')),
              h(CategoryBars, { categories: data.categoryCounts ?? [], lang })),
            h('div', { className: 'wp-card' },
              h('h3', null, tx(lang, 'watchlist')),
              h('p', { className: 'wp-muted' }, tx(lang, 'analysisNote')),
              h('ul', { className: 'wp-watchlist' },
                (data.watchlist ?? []).map((entry, index) => h('li', { key: index },
                  h('i', null, String(index + 1).padStart(2, '0')),
                  h('span', null, entry))))),
            h('div', { className: 'wp-card' },
              h('h3', null, tx(lang, 'headlines')),
              h('p', { className: 'wp-muted' }, tx(lang, 'feedSub')),
              h('div', { className: 'wp-headlines' },
                (data.headlines ?? []).map((entry) => h('a', { className: 'wp-headline', key: entry.url, href: entry.url, target: '_blank', rel: 'noopener noreferrer' },
                  h('span', null, entry.source),
                  h('p', null, entry.title))))))));
    }

    /* ---------------------------------------------------------------- */
    /* Plan                                                             */
    /* ---------------------------------------------------------------- */

    function WeatherStrip({ weather, lang }) {
      if (!weather?.days?.length) {
        return h('div', { className: 'wp-banner', 'data-tone': 'info' },
          h(Icon, { name: 'alert', size: 14 }),
          h('div', null, weather?.summary ?? (lang === 'zh' ? '天气服务暂不可用。' : 'Weather service unavailable.')));
      }
      return h('div', { className: 'wp-card' },
        h('div', { className: 'wp-row', style: { marginBottom: 8 } },
          h('h3', null, tx(lang, 'weather')),
          h('span', { className: 'wp-muted', style: { fontSize: 10 } }, tx(lang, 'weatherSub'))),
        h('p', { className: 'wp-muted', style: { fontSize: 10.5, marginBottom: 9 } }, weather.summary),
        h('div', { className: 'wp-weather' },
          weather.days.map((day) => h('div', { className: 'wp-weather-day', key: day.date },
            h('span', null, formatDate(day.date, lang)),
            h(Icon, { name: weatherGlyph(day.code), size: 20 }),
            h('b', null, `${Math.round(day.tmin ?? 0)}–${Math.round(day.tmax ?? 0)}°C`),
            h('small', null, `${day.rain ?? 0}%`)))));
    }

    function DayCard({ day, lang }) {
      return h('div', { className: 'wp-day' },
        h('div', { className: 'wp-day-head' },
          h('div', { className: 'wp-day-num' }, String(day.day).padStart(2, '0')),
          h('strong', null, `${tx(lang, 'day')} ${day.day}${tx(lang, 'dayUnit')} · ${day.theme}`),
          h('span', null, `${day.activities.length} ${lang === 'zh' ? '项安排' : 'stops'}`)),
        day.activities.map((activity, index) => h('div', { className: 'wp-activity', key: index },
          h('div', { className: 'wp-activity-time' }, activity.time),
          h('div', null,
            h('b', null, activity.title),
            h('p', null, activity.detail),
            h('div', { className: 'wp-activity-meta' },
              activity.area ? h('span', null, h(Icon, { name: 'pin', size: 9 }), ` ${activity.area}`) : null,
              activity.typeLabel ? h('span', null, activity.typeLabel) : null,
              activity.duration ? h('span', null, h(Icon, { name: 'clock', size: 9 }), ` ${activity.duration}${tx(lang, 'hours')}`) : null)))),
        h('div', { className: 'wp-day-foot' },
          h('div', null, h('b', null, `${lang === 'zh' ? '交通' : 'Transport'}: `), day.transport),
          h('div', { style: { marginTop: 4 } }, day.tip)));
    }

    function TravelLinks({ links, limit, lang }) {
      const visible = (links ?? []).slice(0, limit ?? 4);
      if (!visible.length) return null;
      return h('div', { className: 'wp-travel-links' },
        visible.map((link) => h('a', {
          key: link.name, href: link.url, target: '_blank', rel: 'noopener noreferrer',
        },
        h('span', null, link.name),
        h('em', null, link.note ?? link.strength ?? tx(lang, 'open')))));
    }

    function FlightPanel({ flights, lang }) {
      if (!flights) return null;
      return h('div', { className: 'wp-card wp-travel-card' },
        h('div', { className: 'wp-travel-head' },
          h('div', null,
            h('h3', null, tx(lang, 'flightTitle')),
            h('p', { className: 'wp-travel-sub' }, `${flights.origin} → ${flights.destinationCode ?? ''}`)),
          h('span', { className: 'wp-mini-pill' }, flights.distanceKm == null ? tx(lang, 'flightTbd') : flights.directPossible ? tx(lang, 'flightDirect') : tx(lang, 'flightTransfer'))),
        h('div', { className: 'wp-travel-meta' },
          flights.distanceKm ? h('span', null, `${tx(lang, 'flightDistance')} ${flights.distanceKm} ${tx(lang, 'km')}`) : null,
          h('span', null, `${tx(lang, 'flightDuration')} ${flights.directDuration}`),
          flights.airport ? h('span', null, `${tx(lang, 'flightAirport')} ${flights.airport}`) : null),
        h('div', { className: 'wp-travel-options' },
          (flights.options ?? []).map((option, index) => h('div', { className: 'wp-travel-option', key: index },
            h('div', { className: 'wp-travel-option-head' },
              h('b', null, option.title),
              h('strong', null, cny(option.priceLow, option.priceHigh))),
            h('p', null, option.carriers),
            h('div', { className: 'wp-travel-meta' },
              h('span', null, h(Icon, { name: 'clock', size: 9 }), ` ${option.duration}`),
              h('span', null, `${option.kind === 'transfer' ? tx(lang, 'flightTransfer') : option.kind === 'budget' ? tx(lang, 'flightBudget') : tx(lang, 'flightDirect')}`)),
            h('div', { className: 'wp-travel-proscons' },
              h('span', null, h('b', null, `${tx(lang, 'flightPros')}: `), option.pros),
              h('span', null, h('b', null, `${tx(lang, 'flightCons')}: `), option.cons)))))
        ,
        h('div', { className: 'wp-travel-label' }, tx(lang, 'flightSearch')),
        h(TravelLinks, { links: flights.search, limit: 4, lang }),
        h('p', { className: 'wp-travel-note' }, flights.note));
    }

    function StayPanel({ stays, lang }) {
      if (!stays) return null;
      return h('div', { className: 'wp-card wp-travel-card' },
        h('div', { className: 'wp-travel-head' },
          h('div', null,
            h('h3', null, tx(lang, 'stayTitle')),
            h('p', { className: 'wp-travel-sub' }, tx(lang, 'stayAreas'))),
          stays.nights ? h('span', { className: 'wp-mini-pill' }, `${stays.nights} ${tx(lang, 'stayNights')}`) : null),
        h('div', { className: 'wp-stay-areas' },
          (stays.areas ?? []).map((area) => h('div', { className: 'wp-stay-area', key: area.name },
            h('div', { className: 'wp-stay-area-head' },
              h('b', null, area.name),
              h('strong', null, `${cny(area.priceLow, area.priceHigh)}${tx(lang, 'perNight')}`)),
            h('span', { className: 'wp-stay-vibe' }, area.vibe),
            h('p', null, h('b', null, `${tx(lang, 'stayBestFor')}: `), area.bestFor),
            h('p', null, h('b', null, `${tx(lang, 'stayCommute')}: `), area.commute),
            h('p', { className: 'wp-travel-tip' }, h('b', null, `${tx(lang, 'stayTip')}: `), area.tip)))),
        h('div', { className: 'wp-stay-types' },
          (stays.types ?? []).map((type) => h('div', { className: 'wp-stay-type', key: type.name },
            h('b', null, type.name), h('span', null, type.desc)))),
        h('div', { className: 'wp-travel-label' }, tx(lang, 'staySearch')),
        h(TravelLinks, { links: stays.search, limit: 4, lang }),
        h('p', { className: 'wp-travel-note' }, stays.note));
    }

    function GroundPanel({ ground, lang }) {
      if (!ground) return null;
      return h('div', { className: 'wp-card wp-travel-card' },
        h('div', { className: 'wp-travel-head' },
          h('div', null,
            h('h3', null, tx(lang, 'groundTitle')),
            h('p', { className: 'wp-travel-sub' }, `${tx(lang, 'transitCard')}: ${ground.transitCard}`))),
        h('div', { className: 'wp-travel-label' }, tx(lang, 'airportTransfer')),
        h('div', { className: 'wp-ground-list' },
          (ground.airport ?? []).map((item, index) => h('div', { className: 'wp-ground-item', key: index },
            h('b', null, item.mode),
            h('p', null, item.detail),
            h('div', { className: 'wp-travel-meta' }, h('span', null, item.time), h('span', null, item.price))))),
        h('div', { className: 'wp-travel-label' }, tx(lang, 'appsTitle')),
        h('div', { className: 'wp-apps' },
          (ground.apps ?? []).map((app) => h('a', {
            key: app.name, href: app.url, target: '_blank', rel: 'noopener noreferrer', className: 'wp-app',
          }, h('b', null, app.name), h('span', null, app.use)))),
        h('div', { className: 'wp-travel-label' }, tx(lang, 'groundTips')),
        h('ul', { className: 'wp-ground-tips' },
          (ground.tips ?? []).slice(0, 4).map((tip, index) => h('li', { key: index }, tip))));
    }

    function PlatformPanel({ platforms, lang }) {
      if (!platforms) return null;
      const groups = [
        ['platformFlights', platforms.flights],
        ['platformStays', platforms.stays],
        ['platformTransport', platforms.transport],
      ];
      return h('div', { className: 'wp-card wp-platform-card' },
        h('div', { className: 'wp-travel-head' },
          h('div', null,
            h('h3', null, tx(lang, 'platformTitle')),
            h('p', { className: 'wp-travel-sub' }, tx(lang, 'platformNote')))),
        h('div', { className: 'wp-platform-grid' },
          groups.map(([label, items]) => h('div', { className: 'wp-platform-col', key: label },
            h('div', { className: 'wp-travel-label' }, tx(lang, label)),
            (items ?? []).slice(0, 4).map((item) => h('a', {
              key: item.name, href: item.url, target: '_blank', rel: 'noopener noreferrer', className: 'wp-platform-item',
            }, h('b', null, item.name), h('span', null, item.strength), h('em', null, item.note)))))),
        h('div', { className: 'wp-platform-verdict' },
          ['flights', 'stays', 'transport'].map((key) => h('p', { key },
            h('b', null, `${tx(lang, key === 'flights' ? 'platformFlights' : key === 'stays' ? 'platformStays' : 'platformTransport')}: `),
            platforms.verdict?.[key] ?? ''))),
        h('p', { className: 'wp-travel-note' }, platforms.note));
    }

    function flightDateValue(offsetDays = 1) {
      return new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
    }

    const FLIGHT_CITY_FALLBACK = [
      { name: '北京', en: 'Beijing', code: 'BJS', region: 'CN' },
      { name: '上海', en: 'Shanghai', code: 'SHA', region: 'CN' },
      { name: '广州', en: 'Guangzhou', code: 'CAN', region: 'CN' },
      { name: '深圳', en: 'Shenzhen', code: 'SZX', region: 'CN' },
      { name: '成都', en: 'Chengdu', code: 'CTU', region: 'CN' },
      { name: '杭州', en: 'Hangzhou', code: 'HGH', region: 'CN' },
      { name: '武汉', en: 'Wuhan', code: 'WUH', region: 'CN' },
      { name: '西安', en: "Xi'an", code: 'XIY', region: 'CN' },
      { name: '厦门', en: 'Xiamen', code: 'XMN', region: 'CN' },
      { name: '昆明', en: 'Kunming', code: 'KMG', region: 'CN' },
      { name: '香港', en: 'Hong Kong', code: 'HKG', region: 'HK' },
      { name: '澳门', en: 'Macau', code: 'MFM', region: 'MO' },
      { name: '台北', en: 'Taipei', code: 'TPE', region: 'TW' },
      { name: '高雄', en: 'Kaohsiung', code: 'KHH', region: 'TW' },
      { name: '台中', en: 'Taichung', code: 'RMQ', region: 'TW' },
    ];

    function flightCityLabel(city, lang) {
      if (!city) return '';
      return lang === 'en' && city.en ? `${city.en} (${city.code})` : `${city.name} ${city.code}`;
    }

    function FlightsView({ lang }) {
      const [cities, setCities] = useState(FLIGHT_CITY_FALLBACK);
      const [from, setFrom] = useState('上海');
      const [to, setTo] = useState('台北');
      const [date, setDate] = useState(flightDateValue(1));
      const [result, setResult] = useState(null);
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState(null);
      const [notice, setNotice] = useState(null);
      const abort = useRef(null);
      const today = flightDateValue(0);
      const maxDate = flightDateValue(365);

      useEffect(() => {
        let alive = true;
        api('airports').then((payload) => {
          if (!alive) return;
          const list = Array.isArray(payload?.cities) && payload.cities.length ? payload.cities : FLIGHT_CITY_FALLBACK;
          setCities(list);
          setFrom((previous) => (list.some((city) => city.name === previous) ? previous : list[0]?.name ?? '上海'));
          setTo((previous) => {
            if (list.some((city) => city.name === previous) && previous !== from) return previous;
            return list.find((city) => city.name !== from)?.name ?? '台北';
          });
          setNotice(null);
        }).catch(() => {
          if (!alive) return;
          setCities(FLIGHT_CITY_FALLBACK);
          setNotice(tx(lang, 'flightQueryNoLive'));
        });
        return () => {
          alive = false;
          if (abort.current) abort.current.abort();
        };
      }, [lang]);

      const run = useCallback(async (override) => {
        const nextFrom = override?.from ?? from;
        const nextTo = override?.to ?? to;
        const nextDate = override?.date ?? date;
        if (!nextFrom || !nextTo) {
          setError(tx(lang, 'flightQueryEmpty'));
          return;
        }
        if (nextFrom === nextTo) {
          setError(tx(lang, 'flightSameCity'));
          return;
        }
        if (abort.current) abort.current.abort();
        const controller = new AbortController();
        abort.current = controller;
        setLoading(true);
        setError(null);
        setResult(null);
        try {
          const data = await api('flights', { from: nextFrom, to: nextTo, date: nextDate }, controller.signal);
          setResult(data);
        } catch (caught) {
          if (caught.name === 'AbortError') return;
          setError(caught.message || tx(lang, 'flightNotFound'));
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      }, [from, to, date, lang]);

      const swap = () => {
        setFrom(to);
        setTo(from);
        setResult(null);
        setError(null);
      };

      const popular = [
        ['上海', '台北'],
        ['北京', '香港'],
        ['广州', '澳门'],
        ['成都', '高雄'],
        ['厦门', '台北'],
      ];

      const regionGroups = [
        ['CN', 'flightQueryCn'],
        ['HK', 'flightQueryHk'],
        ['MO', 'flightQueryMo'],
        ['TW', 'flightQueryTw'],
      ];

      const citySelect = (value, onChange, id) => h('select', {
        id, className: 'wp-input', value, onChange: (event) => onChange(event.target.value),
      }, regionGroups.map(([region, labelKey]) => {
        const group = cities.filter((city) => city.region === region);
        if (!group.length) return null;
        return h('optgroup', { key: region, label: tx(lang, labelKey) },
          group.map((city) => h('option', { key: city.code || city.name, value: city.name }, flightCityLabel(city, lang))));
      }));

      const data = result;

      return h('div', { className: 'wp-flight-view' },
        h('div', { className: 'wp-section-head' },
          h('div', null,
            h('h2', null, tx(lang, 'flightQueryTitle')),
            h('p', null, `${tx(lang, 'flightQuerySub')} · ${cities.length} ${lang === 'zh' ? '个城市' : 'cities'}`))),
        h('form', {
          className: 'wp-card wp-flight-search',
          onSubmit: (event) => { event.preventDefault(); run(); },
        },
        h('div', { className: 'wp-flight-form' },
          h('div', { className: 'wp-field' },
            h('label', { htmlFor: 'wp-flight-from' }, tx(lang, 'flightFrom')),
            citySelect(from, (value) => { setFrom(value); setResult(null); }, 'wp-flight-from')),
          h('button', {
            type: 'button', className: 'wp-icon-btn wp-flight-swap', onClick: swap,
            title: tx(lang, 'flightSwap'), 'aria-label': tx(lang, 'flightSwap'),
          }, h(Icon, { name: 'swap', size: 14 })),
          h('div', { className: 'wp-field' },
            h('label', { htmlFor: 'wp-flight-to' }, tx(lang, 'flightTo')),
            citySelect(to, (value) => { setTo(value); setResult(null); }, 'wp-flight-to')),
          h('div', { className: 'wp-field wp-flight-date' },
            h('label', { htmlFor: 'wp-flight-date' }, tx(lang, 'flightDate')),
            h('input', {
              id: 'wp-flight-date', className: 'wp-input', type: 'date', value: date, min: today, max: maxDate,
              onChange: (event) => setDate(event.target.value),
            })),
          h('button', {
            type: 'submit', className: 'wp-btn wp-btn-brand wp-flight-submit', disabled: loading,
          }, loading ? h(Icon, { name: 'refresh', size: 13 }) : h(Icon, { name: 'search', size: 13 }),
          loading ? tx(lang, 'flightSearching') : tx(lang, 'flightSearchBtn'))),
        h('div', { className: 'wp-quick' },
          h('span', { className: 'wp-muted', style: { fontSize: 10, marginRight: 2 } }, `${tx(lang, 'flightQueryPopular')}:`),
          popular.map(([a, b]) => h('button', {
            key: `${a}-${b}`, type: 'button',
            onClick: () => { setFrom(a); setTo(b); run({ from: a, to: b }); },
          }, `${a} → ${b}`))),
        h('p', { className: 'wp-plan-note' }, tx(lang, 'flightQueryText'))),
        notice ? h('div', { className: 'wp-banner', 'data-tone': 'info' }, h(Icon, { name: 'alert', size: 14 }), h('div', null, notice)) : null,
        error ? h('div', { className: 'wp-banner wp-flight-error', 'data-tone': 'error' },
          h(Icon, { name: 'alert', size: 14 }), h('div', null, error)) : null,
        loading ? h('div', { className: 'wp-card', style: { padding: 20 } },
          h('div', { className: 'wp-row', style: { justifyContent: 'flex-start', gap: 9 } },
            h(Icon, { name: 'refresh', size: 18 }), h('b', null, tx(lang, 'flightSearching')))) : null,
        data ? h('div', { className: 'wp-flight-result' },
          h('div', { className: 'wp-card wp-travel-card' },
            h('div', { className: 'wp-flight-result-head' },
              h('div', null,
                h('div', { className: 'wp-eyebrow' }, `${data.from.regionLabel} → ${data.to.regionLabel}`),
                h('h2', null, `${flightCityLabel(data.from, lang)} → ${flightCityLabel(data.to, lang)}`),
                h('p', null, `${formatDate(data.date, lang)} · ${data.distanceKm} ${tx(lang, 'km')} · ${data.airlines}`)),
              h('div', { className: 'wp-flight-badges' },
                h('span', { className: 'wp-flight-badge', 'data-tone': data.direct ? 'good' : 'warn' },
                  h(Icon, { name: 'plane', size: 11 }), data.direct ? tx(lang, 'flightDirectYes') : tx(lang, 'flightDirectNo')),
                h('span', { className: 'wp-flight-badge' }, h(Icon, { name: 'clock', size: 11 }), data.duration))),
            h('div', { className: 'wp-travel-options' },
              (data.options ?? []).map((option) => h('div', { className: 'wp-travel-option', key: option.kind + option.title },
                h('div', { className: 'wp-travel-option-head' },
                  h('b', null, option.kind === 'direct' ? tx(lang, 'flightNonstop') : option.kind === 'transfer' ? tx(lang, 'flightVia') : tx(lang, 'flightBudgetOption')),
                  h('strong', null, cny(option.priceLow, option.priceHigh))),
                h('p', null, `${option.carriers} · ${option.duration}`),
                h('div', { className: 'wp-travel-proscons' },
                  h('span', null, h('b', null, `${tx(lang, 'flightPros')}: `), option.pros),
                  h('span', null, h('b', null, `${tx(lang, 'flightCons')}: `), option.cons))))),
            h('div', { className: 'wp-travel-label' }, tx(lang, 'flightSearch')),
            h(TravelLinks, { links: data.links, limit: 7, lang }),
            h('p', { className: 'wp-travel-note' }, tx(lang, 'flightQueryNote'))),
          h('div', { className: 'wp-card' },
            h('h3', null, tx(lang, 'flightQueryLive')),
            data.live?.length ? h('div', { className: 'wp-flight-live' },
              data.live.map((item) => h('a', {
                key: item.url, href: item.url, target: '_blank', rel: 'noopener noreferrer',
              },
              h('b', null, item.title),
              h('span', null, h('em', null, item.source), item.snippet ? ` · ${item.snippet}` : '')))) : h('p', { className: 'wp-flight-note' }, tx(lang, 'flightQueryNoLive')))) : null,
        !data ? h('p', { className: 'wp-flight-note' }, tx(lang, 'flightQueryNote')) : null);
    }

    function PlanView({ lang, plan, form, setForm, runPlan, printPlan }) {
      const interests = [
        ['culture', tx(lang, 'interestCulture')],
        ['nature', tx(lang, 'interestNature')],
        ['food', tx(lang, 'interestFood')],
        ['shopping', tx(lang, 'interestShopping')],
        ['family', tx(lang, 'interestFamily')],
        ['nightlife', tx(lang, 'interestNightlife')],
      ];
      const toggleInterest = (value) => {
        setForm((previous) => ({
          ...previous,
          interests: previous.interests.includes(value)
            ? previous.interests.filter((entry) => entry !== value)
            : [...previous.interests, value],
        }));
      };
      const quick = ['东京', '巴黎', '伊斯坦布尔', '新加坡', '纽约', '开普敦'];
      const data = plan.data;
      return h('div', { className: 'wp-plan-layout' },
        h('form', {
          className: 'wp-planner',
          onSubmit: (event) => { event.preventDefault(); runPlan(); },
        },
        h('h2', null, tx(lang, 'planTitle')),
        h('p', { className: 'wp-muted' }, tx(lang, 'planSub')),
        h('div', { className: 'wp-field' },
          h('label', { htmlFor: 'wp-destination' }, tx(lang, 'destination')),
          h('input', {
            id: 'wp-destination', className: 'wp-input', value: form.destination,
            placeholder: tx(lang, 'destinationPlaceholder'),
            onChange: (event) => setForm((previous) => ({ ...previous, destination: event.target.value })),
          }),
          h('div', { className: 'wp-quick' },
            h('span', { className: 'wp-muted', style: { fontSize: 10, marginRight: 2 } }, `${tx(lang, 'quickPick')}:`),
            quick.map((name) => h('button', {
              type: 'button', key: name, onClick: () => setForm((previous) => ({ ...previous, destination: name })),
            }, name)))),
        h('div', { className: 'wp-field' },
          h('label', { htmlFor: 'wp-origin' }, tx(lang, 'origin')),
          h('input', {
            id: 'wp-origin', className: 'wp-input', value: form.origin ?? '上海',
            placeholder: tx(lang, 'originPlaceholder'),
            onChange: (event) => setForm((previous) => ({ ...previous, origin: event.target.value })),
          })),
        h('div', { className: 'wp-field' },
          h('div', { className: 'wp-row' },
            h('span', { className: 'wp-label' }, tx(lang, 'days')),
            h('b', null, `${form.days} ${tx(lang, 'daysUnit')}`)),
          h('input', {
            className: 'wp-slider', type: 'range', min: 1, max: 14, step: 1, value: form.days,
            'aria-label': tx(lang, 'days'),
            onChange: (event) => setForm((previous) => ({ ...previous, days: Number(event.target.value) })),
          })),
        h('div', { className: 'wp-field' },
          h('span', { className: 'wp-label' }, tx(lang, 'budget')),
          h('div', { className: 'wp-options' },
            [['value', tx(lang, 'budgetValue')], ['comfort', tx(lang, 'budgetComfort')], ['luxury', tx(lang, 'budgetLuxury')]].map(([value, label]) => h('button', {
              type: 'button', key: value, className: 'wp-option', 'data-active': String(form.budget === value),
              onClick: () => setForm((previous) => ({ ...previous, budget: value })),
            }, label)))),
        h('div', { className: 'wp-field' },
          h('span', { className: 'wp-label' }, tx(lang, 'pace')),
          h('div', { className: 'wp-options' },
            [['relaxed', tx(lang, 'paceRelaxed')], ['balanced', tx(lang, 'paceBalanced')], ['packed', tx(lang, 'pacePacked')]].map(([value, label]) => h('button', {
              type: 'button', key: value, className: 'wp-option', 'data-active': String(form.pace === value),
              onClick: () => setForm((previous) => ({ ...previous, pace: value })),
            }, label)))),
        h('div', { className: 'wp-field' },
          h('span', { className: 'wp-label' }, tx(lang, 'interests')),
          h('div', { className: 'wp-options' },
            interests.map(([value, label]) => h('button', {
              type: 'button', key: value, className: 'wp-option', 'data-active': String(form.interests.includes(value)),
              onClick: () => toggleInterest(value),
            }, label)))),
        h('button', { type: 'submit', className: 'wp-btn wp-btn-brand wp-plan-submit', disabled: plan.loading },
          plan.loading ? h(Icon, { name: 'refresh', size: 14, strokeWidth: 2 }) : h(Icon, { name: 'spark', size: 14 }),
          plan.loading ? tx(lang, 'generating') : tx(lang, 'generate')),
        h('p', { className: 'wp-plan-note' }, tx(lang, 'planNote')),
        h('p', { className: 'wp-plan-note', style: { color: 'var(--wp-brand)' } }, tx(lang, 'printHint'))),
        h('div', { className: 'wp-plan-result' },
          !data && !plan.loading && !plan.error ? h('div', { className: 'wp-empty' },
            h(Icon, { name: 'compass', size: 30 }),
            h('strong', null, tx(lang, 'planEmptyTitle')),
            h('p', null, tx(lang, 'planEmptyText')),
            h('p', { style: { marginTop: 10, color: 'var(--wp-brand)', fontWeight: 650 } }, tx(lang, 'planEmptyNote'))) : null,
          plan.loading ? h('div', { className: 'wp-card', style: { padding: 22 } },
            h('div', { className: 'wp-row', style: { justifyContent: 'flex-start', gap: 10 } },
              h(Icon, { name: 'refresh', size: 18 }),
              h('b', null, tx(lang, 'generating'))),
            h('p', { className: 'wp-muted', style: { fontSize: 11, marginTop: 6 } }, tx(lang, 'planNote'))) : null,
          plan.error && !plan.loading ? h('div', { className: 'wp-banner', 'data-tone': 'error' },
            h(Icon, { name: 'alert', size: 16 }),
            h('div', null,
              h('b', null, `${tx(lang, 'planError')}: `), plan.error,
              plan.payload?.suggestions?.length ? h('div', { className: 'wp-quick', style: { marginTop: 6 } },
                plan.payload.suggestions.map((name) => h('button', { key: name, type: 'button', onClick: () => { setForm((previous) => ({ ...previous, destination: name })); runPlan(name); } }, name))) : null)) : null,
          data?.blocked ? h('div', { className: 'wp-blocked' },
            h('div', { className: 'wp-eyebrow', style: { color: '#c23b3b' } }, h(Icon, { name: 'alert', size: 12 }), tx(lang, 'riskRed')),
            h('h2', null, `${data.destination?.name ?? ''} · ${tx(lang, 'blockedTitle')}`),
            h('p', null, data.message),
            h('p', { style: { marginTop: 8 } }, h('b', null, `${tx(lang, 'avoid')}: `), data.risk?.avoid ?? ''),
            h('h3', { style: { fontSize: 13, margin: '16px 0 0' } }, tx(lang, 'alternatives')),
            h('div', { className: 'wp-alternatives' },
              (data.alternatives ?? []).map((alternative) => h('button', {
                type: 'button', className: 'wp-alt', key: alternative.zh,
                onClick: () => { setForm((previous) => ({ ...previous, destination: alternative.zh })); runPlan(alternative.zh); },
              },
              h('b', null, `${alternative.zh} · ${alternative.country}`),
              h('span', null, alternative.reason),
              h('em', null, `${tx(lang, 'choose')} →`))))) : null,
          data && !data.blocked ? h(React.Fragment, null,
            h('div', { className: 'wp-result-head' },
              h('div', null,
                h('div', { className: 'wp-eyebrow', style: { color: 'var(--dsw-alias-label-secondary)' } },
                  h(Icon, { name: 'pin', size: 11 }),
                  `${data.destination.country} · ${data.destination.cc}`),
                h('h2', null, data.destination.name),
                h('p', null, data.risk?.note),
                h('div', { className: 'wp-overview-meta' },
                  h('span', { className: 'wp-mini-pill' }, `${data.itinerary?.length ?? 0} ${tx(lang, 'daysUnit')}`),
                  h('span', { className: 'wp-mini-pill' }, data.destination.timezone),
                  h('span', { className: 'wp-mini-pill' }, `${tx(lang, 'origin')}: ${data.origin ?? '上海'}`),
                  h('span', { className: 'wp-mini-pill' }, `${tx(lang, 'budget')}: ${data.budget?.label}`))),
              h('div', { className: 'wp-result-actions' },
                h(RiskBadge, { level: data.risk?.level, lang }),
                h('button', { type: 'button', className: 'wp-btn wp-btn-soft', onClick: printPlan },
                  h(Icon, { name: 'print', size: 12 }), tx(lang, 'print')))),
            h(WeatherStrip, { weather: data.weather, lang }),
            data.risk?.level === 'amber' ? h('div', { className: 'wp-banner' },
              h(Icon, { name: 'alert', size: 15 }),
              h('div', null, h('b', null, `${tx(lang, 'riskAmber')} · `), `${tx(lang, 'avoid')}: ${data.risk.avoid}`)) : null,
            h('div', { className: 'wp-travel-grid' },
              h(FlightPanel, { flights: data.flights, lang }),
              h(StayPanel, { stays: data.stays, lang }),
              h('div', { className: 'wp-span-2' }, h(GroundPanel, { ground: data.ground, lang }))),
            h(PlatformPanel, { platforms: data.platforms, lang }),
            h('div', { className: 'wp-plan-grid' },
              h('div', { className: 'wp-days' },
                (data.itinerary ?? []).map((day) => h(DayCard, { day, lang, key: day.day }))),
              h('aside', { className: 'wp-plan-side' },
                h('div', { className: 'wp-card' },
                  h('h3', null, tx(lang, 'budgetTitle')),
                  h('div', { className: 'wp-budget-total' }, cny(data.budget?.total?.low, data.budget?.total?.high)),
                  h('div', { className: 'wp-budget-row' }, h('span', null, tx(lang, 'perDay')), h('b', null, cny(data.budget?.perDay?.low, data.budget?.perDay?.high))),
                  h('div', { className: 'wp-budget-row' }, h('span', null, tx(lang, 'days')), h('b', null, `${data.itinerary?.length ?? 0} ${tx(lang, 'daysUnit')}`)),
                  h('div', { className: 'wp-budget-row' }, h('span', null, tx(lang, 'budget')), h('b', null, data.budget?.label)),
                  h('p', { className: 'wp-plan-note' }, tx(lang, 'budgetNote'))),
                h('div', { className: 'wp-card' },
                  h('h3', null, tx(lang, 'packing')),
                  h('ul', { className: 'wp-checklist' },
                    (data.packing ?? []).map((entry, index) => h('li', { key: index }, h(Icon, { name: 'check', size: 11 }), h('span', null, entry))))),
                h('div', { className: 'wp-card' },
                  h('h3', null, tx(lang, 'safety')),
                  h('p', { className: 'wp-safety-note' }, h('b', null, `${tx(lang, 'riskWord')}: `), data.risk?.note),
                  h('p', { className: 'wp-safety-note' }, h('b', null, `${tx(lang, 'avoid')}: `), data.risk?.avoid),
                  h('p', { className: 'wp-safety-note' }, h('b', null, `${tx(lang, 'emergency')}: `), data.safety?.emergency),
                  h('div', { className: 'wp-official' },
                    (data.safety?.links ?? []).map(([label, url]) => h('a', { key: url, href: url, target: '_blank', rel: 'noopener noreferrer' }, `↗ ${label}`)))),
                h('div', { className: 'wp-card' },
                  h('h3', null, tx(lang, 'transport')),
                  h('p', { className: 'wp-safety-note' }, data.transport),
                  h('p', { className: 'wp-safety-note', style: { marginTop: 8 } }, h('b', null, `${tx(lang, 'entry')}: `), data.entry)),
                h('p', { className: 'wp-plan-note' }, data.note)))) : null));
    }

    /* ---------------------------------------------------------------- */
    /* Page                                                             */
    /* ---------------------------------------------------------------- */

    function Page() {
      const [lang, setLang] = useState(() => (readStored('worldpulse.lang', 'zh') === 'en' ? 'en' : 'zh'));
      const [tab, setTab] = useState(() => {
        const value = readStored('worldpulse.tab', 'news');
        return ['news', 'brief', 'plan', 'flights'].includes(value) ? value : 'news';
      });
      const [region, setRegion] = useState('全球');
      const [tick, setTick] = useState(0);
      const [news, setNews] = useState({ loading: true, data: null, error: null });
      const [brief, setBrief] = useState({ loading: false, data: null, error: null });
      const [plan, setPlan] = useState({ loading: false, data: null, error: null, payload: null });
      const [form, setForm] = useState({
        origin: '上海', destination: '东京', days: 4, budget: 'comfort', pace: 'balanced', interests: ['culture', 'food'],
      });
      const newsAbort = useRef(null);
      const briefAbort = useRef(null);
      const planAbort = useRef(null);
      const pageRef = useRef(null);

      useEffect(() => { store('worldpulse.lang', lang); }, [lang]);
      useEffect(() => { store('worldpulse.tab', tab); }, [tab]);
      useEffect(() => {
        const handler = (event) => {
          if (event.detail === 'plan' || event.detail === 'news' || event.detail === 'brief' || event.detail === 'flights') setTab(event.detail);
        };
        window.addEventListener('worldpulse:tab', handler);
        return () => window.removeEventListener('worldpulse:tab', handler);
      }, []);

      const loadNews = useCallback(async (force = false) => {
        if (newsAbort.current) newsAbort.current.abort();
        const controller = new AbortController();
        newsAbort.current = controller;
        setNews((previous) => ({ ...previous, loading: true, error: null }));
        try {
          const data = await api('news', { region, refresh: force ? 1 : undefined }, controller.signal);
          setNews({ loading: false, data, error: null });
        } catch (error) {
          if (error.name === 'AbortError') return;
          setNews((previous) => ({ ...previous, loading: false, error: error.message }));
        }
      }, [region]);

      const loadBrief = useCallback(async (force = false) => {
        if (briefAbort.current) briefAbort.current.abort();
        const controller = new AbortController();
        briefAbort.current = controller;
        setBrief((previous) => ({ ...previous, loading: true, error: null }));
        try {
          const data = await api('briefing', { region, refresh: force ? 1 : undefined }, controller.signal);
          setBrief({ loading: false, data, error: null });
        } catch (error) {
          if (error.name === 'AbortError') return;
          setBrief((previous) => ({ ...previous, loading: false, error: error.message }));
        }
      }, [region]);

      useEffect(() => {
        loadNews(false);
        return () => { if (newsAbort.current) newsAbort.current.abort(); };
      }, [loadNews, tick]);

      useEffect(() => {
        if (tab === 'brief') loadBrief(false);
        return () => { if (briefAbort.current) briefAbort.current.abort(); };
      }, [tab, loadBrief, tick]);

      useEffect(() => {
        if (tab === 'news' && news.data && !brief.data && !brief.loading && !brief.error) loadBrief(false);
      }, [tab, news.data, brief.data, brief.loading, brief.error, loadBrief]);

      useEffect(() => {
        const timer = setInterval(() => setTick((value) => value + 1), 5 * 60 * 1000);
        return () => clearInterval(timer);
      }, []);

      const runPlan = useCallback(async (override) => {
        const destination = String(override ?? form.destination ?? '').trim();
        if (!destination) {
          setPlan({ loading: false, data: null, error: lang === 'zh' ? '请输入目的地城市。' : 'Enter a destination city.', payload: null });
          return;
        }
        if (planAbort.current) planAbort.current.abort();
        const controller = new AbortController();
        planAbort.current = controller;
        setPlan({ loading: true, data: null, error: null, payload: null });
        try {
          const data = await api('plan', {
            destination,
            origin: form.origin || '上海',
            days: form.days,
            budget: form.budget,
            pace: form.pace,
            interests: form.interests.join(','),
          }, controller.signal);
          setPlan({ loading: false, data, error: null, payload: null });
          if (pageRef.current) pageRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
          if (error.name === 'AbortError') return;
          setPlan({ loading: false, data: null, error: error.message, payload: error.payload ?? null });
        }
      }, [form, lang]);

      const refreshAll = () => {
        if (tab === 'plan') setTick((value) => value + 1);
        else {
          loadNews(true);
          if (tab === 'brief' || brief.data) loadBrief(true);
        }
      };

      const goPlan = () => {
        setTab('plan');
        if (!plan.data && !plan.loading) runPlan();
      };

      const liveState = news.data?.live === false ? 'off' : news.data?.degraded ? 'warn' : 'on';
      const liveLabel = news.data?.live === false ? tx(lang, 'offline') : news.data?.degraded ? tx(lang, 'degradedTitle') : tx(lang, 'live');
      const riskScore = brief.data?.riskScore;
      const riskTone = brief.data?.riskTone;
      const nav = [
        ['news', tx(lang, 'navNews'), 'radio'],
        ['brief', tx(lang, 'navBrief'), 'globe'],
        ['plan', tx(lang, 'navPlan'), 'route'],
        ['flights', tx(lang, 'navFlights'), 'plane'],
      ];
      return h('div', { className: 'wp-page', ref: pageRef },
        h(Style),
        h('div', { className: 'wp-shell' },
          h('header', { className: 'wp-header' },
            h('div', { className: 'wp-brand' },
              h('div', { className: 'wp-brand-mark' }, h(BrandIcon, { size: 24 })),
              h('div', null,
                h('div', { className: 'wp-brand-name' }, tx(lang, 'brand')),
                h('div', { className: 'wp-brand-en' }, tx(lang, 'brandEn')))),
            h('nav', { className: 'wp-tabs', 'aria-label': 'WorldPulse' },
              nav.map(([id, label, icon]) => h('button', {
                type: 'button', key: id, className: 'wp-tab', 'data-active': String(tab === id),
                onClick: () => setTab(id),
              }, h(Icon, { name: icon, size: 13 }), label))),
            h('div', { className: 'wp-header-actions' },
              h('button', {
                type: 'button', className: 'wp-icon-btn', onClick: refreshAll,
                disabled: news.loading || brief.loading, title: tx(lang, 'refresh'),
              }, h(Icon, { name: 'refresh', size: 14 }), h('span', { className: 'wp-hide-mobile' }, news.loading ? tx(lang, 'refreshing') : tx(lang, 'refresh'))),
              h('button', {
                type: 'button', className: 'wp-icon-btn', onClick: () => setLang(lang === 'zh' ? 'en' : 'zh'),
                title: lang === 'zh' ? 'Switch to English' : '切换到中文',
              }, lang === 'zh' ? 'EN' : '中文'))),
          h('section', { className: 'wp-hero' },
            h('div', null,
              h('div', { className: 'wp-eyebrow' },
                h('span', { className: 'wp-dot', 'data-state': liveState }),
                liveLabel,
                h('span', { style: { opacity: .55 } }, '·'),
                news.data?.generatedAt ? `${tx(lang, 'updated')} ${formatClock(news.data.generatedAt, lang)}` : tx(lang, 'scan')),
              h('h1', null, tx(lang, 'heroTitle')),
              h('p', null, tx(lang, 'heroText')),
              h('div', { className: 'wp-hero-actions' },
                h('button', { type: 'button', className: 'wp-btn wp-btn-primary', onClick: goPlan },
                  h(Icon, { name: 'route', size: 14 }), tx(lang, 'heroCta')),
                h('button', { type: 'button', className: 'wp-btn wp-btn-ghost', onClick: () => setTab('brief') },
                  h(Icon, { name: 'globe', size: 14 }), tx(lang, 'heroCta2')))),
            h('div', { className: 'wp-hero-stats' },
              h('div', { className: 'wp-stat' },
                h('span', null, tx(lang, 'statSignals')),
                h('strong', null, news.data?.itemCount ?? '—'),
                h('small', null, news.data?.live === false ? tx(lang, 'offline') : tx(lang, 'live'))),
              h('div', { className: 'wp-stat' },
                h('span', null, tx(lang, 'statSources')),
                h('strong', null, news.data?.sourceCount ?? '—'),
                h('small', null, news.data?.cached ? tx(lang, 'cached') : tx(lang, 'live'))),
              h('div', { className: 'wp-stat wide' },
                h('div', null,
                  h('span', null, tx(lang, 'statRisk')),
                  h('strong', null, riskScore !== undefined ? `${riskScore} / 100 · ${riskTone === 'high' ? tx(lang, 'riskHigh') : riskTone === 'medium' ? tx(lang, 'riskMedium') : tx(lang, 'riskLow')}` : tx(lang, 'scan'))),
                h(Icon, { name: 'shield', size: 24 })))),
          tab === 'news' ? h(NewsView, { lang, region, setRegion, news, brief, reload: () => loadNews(true) }) : null,
          tab === 'brief' ? h('div', null,
            h('div', { className: 'wp-section-head' },
              h('div', null,
                h('h2', null, tx(lang, 'analysisTitle')),
                h('p', null, tx(lang, 'analysisSub'))),
              news.data ? h('span', { className: 'wp-muted', style: { fontSize: 10.5 } }, `${news.data.itemCount ?? 0} ${tx(lang, 'itemsWord')}`) : null),
            h(BriefView, { lang, region, brief, reload: () => loadBrief(true) })) : null,
          tab === 'plan' ? h('div', null,
            h('div', { className: 'wp-section-head' },
              h('div', null,
                h('h2', null, tx(lang, 'planTitle')),
                h('p', null, tx(lang, 'planSub'))),
              h('span', { className: 'wp-muted', style: { fontSize: 10.5 } }, `1–14 ${tx(lang, 'daysUnit')} · ${tx(lang, 'riskRed')}`)),
            h(PlanView, { lang, plan, form, setForm, runPlan, printPlan: () => window.print() })) : null,
          tab === 'flights' ? h(FlightsView, { lang }) : null,
          h('footer', { className: 'wp-footer' },
            h('span', null, `${tx(lang, 'brand')} · ${tx(lang, 'tagline')}`),
            h('span', null,
              h('a', { href: 'https://cs.mfa.gov.cn/', target: '_blank', rel: 'noopener noreferrer' }, lang === 'zh' ? '中国领事服务网' : 'MFA China travel advice'),
              ' · ',
              h('a', { href: 'https://www.bbc.com/news/world', target: '_blank', rel: 'noopener noreferrer' }, lang === 'zh' ? '公开信源' : 'Public sources'))))) ;
    }

    function SidebarIcon(owner = {}) {
      return h(BrandIcon, { size: owner.size ?? 18, active: owner.active });
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
        }, Page));

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 5,
          label: () => '寰球视野',
        }, SidebarIcon));
      },
    };
  },
});
