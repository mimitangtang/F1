// F1 2026 数据同步脚本
// 运行：node scripts/sync.mjs
// 输出：data.json（页面读取）；抓取失败时不会覆盖旧文件

import { readFile, writeFile } from "node:fs/promises";

const BASE = "https://api.jolpi.ca/ergast/f1/2026";
const NEWS_FEEDS = [
  { url: "https://www.formula1.com/en/latest/all.xml", source: "Formula 1" },
  { url: "https://www.motorsport.com/rss/f1/news", source: "Motorsport" }
];

const DRIVER_CN = {
  antonelli: "安东内利", russell: "拉塞尔", hamilton: "汉密尔顿", max_verstappen: "维斯塔潘",
  leclerc: "勒克莱尔", norris: "诺里斯", piastri: "皮亚斯特里", hadjar: "哈贾尔",
  lawson: "劳森", gasly: "加斯利", arvid_lindblad: "林德布拉德", colapinto: "科拉平托",
  bearman: "贝尔曼", hulkenberg: "霍肯伯格", bortoleto: "博托莱托", ocon: "奥康",
  alonso: "阿隆索", sainz: "塞恩斯", albon: "阿尔本", tsunoda: "角田裕毅",
  stroll: "斯特罗尔", bottas: "博塔斯", perez: "佩雷兹"
};

const TEAM = {
  mercedes: { cn: "梅赛德斯", color: "#27f4d2" },
  ferrari: { cn: "法拉利", color: "#e8002d" },
  red_bull: { cn: "红牛", color: "#3671c6" },
  mclaren: { cn: "迈凯伦", color: "#ff8000" },
  rb: { cn: "Racing Bulls", color: "#6692ff" },
  alpine: { cn: "Alpine", color: "#ff87bc" },
  haas: { cn: "哈斯", color: "#b6babd" },
  audi: { cn: "奥迪", color: "#f50537" },
  williams: { cn: "威廉姆斯", color: "#64c4ff" },
  aston_martin: { cn: "阿斯顿·马丁", color: "#229971" },
  cadillac: { cn: "凯迪拉克", color: "#c8a24b" }
};

// 赛道静态资料：长度(km)/圈数/弯道/海拔/单圈纪录；未知项留空，页面显示“—”
const CIRCUIT = {
  albert_park: { cn: "澳大利亚", name: "阿尔伯特公园赛道", length: 5.278, laps: 58, turns: 14 },
  shanghai: { cn: "中国", name: "上海国际赛车场", length: 5.451, laps: 56, turns: 16 },
  suzuka: { cn: "日本", name: "铃鹿赛道", length: 5.807, laps: 53, turns: 18 },
  miami: { cn: "迈阿密", name: "迈阿密国际赛车场", length: 5.412, laps: 57, turns: 19 },
  villeneuve: { cn: "加拿大", name: "吉勒·维伦纽夫赛道", length: 4.361, laps: 70, turns: 14 },
  monaco: { cn: "摩纳哥", name: "摩纳哥赛道", length: 3.337, laps: 78, turns: 19 },
  catalunya: { cn: "西班牙", name: "巴塞罗那-加泰罗尼亚赛道", length: 4.657, laps: 66, turns: 14 },
  red_bull_ring: { cn: "奥地利", name: "红牛环", length: 4.318, laps: 71, turns: 10 },
  silverstone: { cn: "英国", name: "银石赛道", length: 5.891, laps: 52, turns: 18 },
  spa: { cn: "比利时", name: "斯帕-弗朗科尔尚赛道", length: 7.004, laps: 44, turns: 20 },
  hungaroring: { cn: "匈牙利", name: "亨格罗林赛道", length: 4.381, laps: 70, turns: 14 },
  zandvoort: { cn: "荷兰", name: "赞德沃特赛道", length: 4.259, laps: 72, turns: 14 },
  monza: { cn: "意大利", name: "蒙扎国家赛车场", length: 5.793, laps: 53, turns: 11 },
  madring: { cn: "西班牙·马德里", name: "马德里赛道", length: null, laps: null, turns: null },
  baku: { cn: "阿塞拜疆", name: "巴库城市赛道", length: 6.003, laps: 51, turns: 20 },
  sepang: { cn: "马来西亚", name: "雪邦国际赛车场", length: 5.543, laps: 56, turns: 15 },
  marina_bay: { cn: "新加坡", name: "滨海湾街道赛道", length: 4.94, laps: 62, turns: 19 },
  americas: { cn: "美国", name: "美洲赛道", length: 5.513, laps: 56, turns: 20 },
  rodriguez: { cn: "墨西哥城", name: "罗德里格斯兄弟赛道", length: 4.304, laps: 71, turns: 17, altitude: 2285, record: "1:17.774" },
  interlagos: { cn: "圣保罗", name: "英特拉格斯赛道", length: 4.309, laps: 71, turns: 15 },
  vegas: { cn: "拉斯维加斯", name: "拉斯维加斯街道赛道", length: 6.201, laps: 50, turns: 17 },
  losail: { cn: "卡塔尔", name: "卢赛尔国际赛车场", length: 5.419, laps: 57, turns: 16 },
  yas_marina: { cn: "阿布扎比", name: "亚斯码头赛道", length: 5.281, laps: 58, turns: 16 }
};

const SESSION_LABEL = {
  FirstPractice: "练习赛一", SecondPractice: "练习赛二", ThirdPractice: "练习赛三",
  SprintQualifying: "冲刺排位", Sprint: "冲刺赛", Qualifying: "排位赛"
};

const pad = (n) => String(n).padStart(2, "0");

function beijing(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const bj = new Date(d.getTime() + 8 * 3600 * 1000);
  return {
    date: `${pad(bj.getUTCMonth() + 1)}.${pad(bj.getUTCDate())}`,
    weekday: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][bj.getUTCDay()],
    time: `${pad(bj.getUTCHours())}:${pad(bj.getUTCMinutes())}`,
    iso: iso
  };
}

async function get(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { "user-agent": "f1-class-project/1.0 (educational)" }
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

async function getJson(url) {
  return JSON.parse(await get(url));
}

async function getAllResults() {
  const pageSize = 100;
  const first = await getJson(`${BASE}/results.json?limit=${pageSize}&offset=0`);
  const total = Number(first.MRData.total);
  const merged = new Map();

  const addPage = (races) => {
    for (const race of races) {
      const round = Number(race.round);
      if (!merged.has(round)) merged.set(round, { ...race, Results: [] });
      merged.get(round).Results.push(...(race.Results || []));
    }
  };

  addPage(first.MRData.RaceTable.Races);
  for (let offset = pageSize; offset < total; offset += pageSize) {
    const page = await getJson(`${BASE}/results.json?limit=${pageSize}&offset=${offset}`);
    addPage(page.MRData.RaceTable.Races);
  }
  return [...merged.values()];
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function plainText(s = "") {
  return decodeEntities(
    s.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
  ).trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : "";
}

function parseFeed(xml, source) {
  const items = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((m) => m[0]);
  return items.map((it) => {
    const pub = tag(it, "pubDate");
    const published = pub ? new Date(pub) : null;
    return {
      title: plainText(tag(it, "title")),
      url: plainText(tag(it, "link")),
      source,
      excerpt: plainText(tag(it, "description")).slice(0, 180),
      publishedAt: published && !Number.isNaN(published.getTime())
        ? published.toISOString()
        : null
    };
  }).filter((n) => n.title && n.url);
}

function driverName(d) {
  return DRIVER_CN[d.Driver.driverId] || `${d.Driver.givenName} ${d.Driver.familyName}`;
}

async function loadQuotes(round) {
  try {
    const all = JSON.parse(await readFile("quotes.json", "utf8"));
    if (Array.isArray(all[String(round)]) && all[String(round)].length) {
      return all[String(round)];
    }
    const keys = Object.keys(all).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    const fallbackKey = keys.filter((k) => k <= round).pop() ?? keys[0];
    return fallbackKey ? all[String(fallbackKey)] || [] : [];
  } catch {
    return [];
  }
}

function teamInfo(c) {
  return TEAM[c.constructorId] || { cn: c.name, color: "#999999" };
}

async function sync() {
  const [racesJson, allResults, driverJson, constructorJson] = await Promise.all([
    getJson(`${BASE}/races.json?limit=100`),
    getAllResults(),
    getJson(`${BASE}/driverstandings.json?limit=100`),
    getJson(`${BASE}/constructorstandings.json?limit=100`)
  ]);

  const schedule = racesJson.MRData.RaceTable.Races;
  const resultsByRound = new Map(
    allResults.map((r) => [Number(r.round), r.Results || []])
  );

  const now = Date.now();
  let next = null;

  const races = schedule.map((race) => {
    const info = CIRCUIT[race.Circuit.circuitId] || {};
    const round = Number(race.round);
    const results = resultsByRound.get(round) || [];
    const enName = race.Circuit.circuitId === "sepang"
      ? "Malaysian Grand Prix"
      : race.Circuit.circuitId === "madring"
        ? "Madrid Grand Prix"
        : race.raceName;
    const podium = results.slice(0, 3).map((r) => ({
      name: driverName(r),
      team: teamInfo(r.Constructor).cn,
      time: r.Time?.time || r.status || ""
    }));
    const winner = podium[0] || null;

    const startIso = `${race.date}T${race.time || "00:00:00Z"}`;
    const startMs = Date.parse(startIso);
    if (!next && startMs + 3 * 3600 * 1000 > now) {
      next = { race, info, round, startIso };
    }

    return {
      r: round,
      gp: info.cn || race.raceName.replace(" Grand Prix", ""),
      en: enName,
      date: race.date.slice(5).replace("-", "."),
      winner: winner?.name || null,
      team: winner?.team || null,
      podium,
      note: "",
      circuitId: race.Circuit.circuitId,
      circuit: info.name || race.Circuit.circuitName,
      country: race.Circuit.Location.country
    };
  });

  if (!next) next = { race: schedule[schedule.length - 1], info: CIRCUIT[schedule[schedule.length - 1]?.Circuit.circuitId] || {}, round: Number(schedule[schedule.length - 1]?.round) };

  const sessionList = [];
  const { race: nextRace, info: nextInfo } = next;
  for (const [key, session] of Object.entries({
    FirstPractice: nextRace.FirstPractice,
    SecondPractice: nextRace.SecondPractice,
    ThirdPractice: nextRace.ThirdPractice,
    SprintQualifying: nextRace.SprintQualifying,
    Sprint: nextRace.Sprint,
    Qualifying: nextRace.Qualifying
  })) {
    if (!session?.date) continue;
    const bj = beijing(`${session.date}T${session.time || "00:00:00Z"}`);
    if (bj) sessionList.push({ key, label: SESSION_LABEL[key], ...bj });
  }
  sessionList.push({ key: "race", label: "正赛", ...beijing(`${nextRace.date}T${nextRace.time || "00:00:00Z"}`) });

  const driverStandings = driverJson.MRData.StandingsTable.StandingsLists[0].DriverStandings.map((d) => ({
    pos: Number(d.position),
    name: DRIVER_CN[d.Driver.driverId] || `${d.Driver.givenName} ${d.Driver.familyName}`,
    team: teamInfo(d.Constructors[0]).cn,
    color: teamInfo(d.Constructors[0]).color,
    points: Number(d.points),
    wins: Number(d.wins)
  }));

  const constructorStandings = constructorJson.MRData.StandingsTable.StandingsLists[0].ConstructorStandings.map((c) => ({
    pos: Number(c.position),
    name: teamInfo(c.Constructor).cn,
    color: teamInfo(c.Constructor).color,
    points: Number(c.points)
  }));

  const perFeed = [];
  for (const feed of NEWS_FEEDS) {
    try {
      const xml = await get(feed.url);
      perFeed.push(parseFeed(xml, feed.source).slice(0, 3));
    } catch (err) {
      console.warn(`新闻源失败 ${feed.source}: ${err.message}`);
      perFeed.push([]);
    }
  }
  const news = [];
  for (let i = 0; i < 3; i++) {
    for (const list of perFeed) {
      if (list[i]) news.push(list[i]);
    }
  }
  const uniqueNews = [...new Map(news.map((n) => [n.title, n])).values()].slice(0, 6);
  const quotes = await loadQuotes(next.round);

  if (races.length < 10) throw new Error("赛程数据异常");
  if (driverStandings.length < 10) throw new Error("车手积分榜数据异常");
  if (!nextRace) throw new Error("无法确定下一站");

  const data = {
    meta: {
      season: 2026,
      generatedAt: new Date().toISOString(),
      sources: ["Jolpica F1 API", "Formula 1 RSS", "Motorsport RSS"]
    },
    season: {
      rounds: races.length,
      completed: resultsByRound.size,
      remaining: races.length - resultsByRound.size,
      nextRound: next.round
    },
    nextRace: {
      round: next.round,
      name: races.find((r) => r.r === next.round)?.gp || nextInfo.cn || "",
      nameEn: nextRace.raceName,
      circuit: nextInfo.name || nextRace.Circuit.circuitName,
      circuitId: nextRace.Circuit.circuitId,
      country: nextRace.Circuit.Location.country,
      date: nextRace.date,
      utc: `${nextRace.date}T${nextRace.time || "00:00:00Z"}`,
      sessions: sessionList,
      track: {
        length: nextInfo.length ?? null,
        laps: nextInfo.laps ?? null,
        turns: nextInfo.turns ?? null,
        altitude: nextInfo.altitude ?? null,
        record: nextInfo.record ?? null
      }
    },
    races,
    standings: { drivers: driverStandings, constructors: constructorStandings },
    news: uniqueNews,
    quotes
  };

  const withoutTimestamp = (obj) => JSON.stringify({ ...obj, meta: { ...obj.meta, generatedAt: null } });
  let previous = null;
  try {
    previous = JSON.parse(await readFile("data.json", "utf8"));
  } catch {
    previous = null;
  }
  if (previous && withoutTimestamp(previous) === withoutTimestamp(data)) {
    console.log("数据无实质变化，保留原 data.json");
    return;
  }

  await writeFile("data.json", JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`data.json 已更新：${races.length} 站 / 已完成 ${resultsByRound.size} 站 / 下一站 ${data.nextRace.name} / 新闻 ${uniqueNews.length} 条`);
}

sync().catch((err) => {
  console.error("同步失败，保留旧 data.json：", err.message);
  process.exitCode = 1;
});
