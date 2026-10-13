'use strict';
/* =========================================================
   Цех Заявки — демо
   Квиз для клиента → заявка в Telegram → напоминания → отчёт.
   Все данные живут в localStorage этого браузера.
   ========================================================= */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MIN = 60e3, HOUR = 60 * MIN, DAY = 24 * HOUR;
const rub = n => Math.round(n).toLocaleString('ru-RU') + ' ₽';
const fmt1 = n => String(Math.round(n * 10) / 10).replace('.', ',');
const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c; };
function dur(ms) {
  if (ms < MIN) return 'меньше минуты';
  if (ms < HOUR) { const m = Math.floor(ms / MIN); return `${m} мин`; }
  if (ms < DAY) { const h = Math.floor(ms / HOUR); return `${h} ${plural(h, 'час', 'часа', 'часов')}`; }
  const d = Math.floor(ms / DAY); return `${d} ${plural(d, 'день', 'дня', 'дней')}`;
}
const ago = ms => ms < MIN ? 'только что' : dur(ms) + ' назад';
const clock = t => new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const dayLabel = t => new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
const digits = s => String(s).replace(/\D/g, '');

const LS = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* приватный режим — работаем без сохранения */ } },
};

/* ---------- иконки ---------- */
const ICONS = {
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  board: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  forward: '<path d="m13 17 5-5-5-5M6 17l5-5-5-5"/>',
  gift: '<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M12 8v13M3 12h18M12 8S10 3 7.5 4.5 9 8 12 8zM12 8s2-5 4.5-3.5S15 8 12 8z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  rotate: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  clip: '<path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
};
const icon = (n, s = 20) => `<svg class="ic ic-${n}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

/* ---------- каталог Wood&Hands: направления, позиции, цены ----------
   Направления и материалы — с woodhands.ru. Цены — ориентир по открытым ценам рынка
   (демо): после разговора с Дмитрием заменяются на цены цеха. */
const TIERS = {
  eco: { label: 'Эконом', sub: 'ЛДСП, металлокаркас' },
  mid: { label: 'Стандарт', sub: 'шпон, МДФ, фанера + металл' },
  pro: { label: 'Премиум', sub: 'массив дерева, натуральный шпон, стекло' },
};
const TI = { eco: 0, mid: 1, pro: 2 };
/* позиция: название, единица, цена [эконом, стандарт, премиум], количество от масштаба s */
const SEGMENTS = {
  rest: { label: 'Ресторан или кофейня', short: 'Ресторан', scale: { q: 'Сколько посадочных мест?', unit: 'мест', min: 10, max: 150, def: 40 }, items: {
    tables: ['Столы', 'шт', [9000, 16000, 30000], s => Math.ceil(s / 3.5)],
    chairs: ['Стулья', 'шт', [4500, 8500, 16000], s => s],
    sofas: ['Диваны и банкетки', 'мест', [7000, 12000, 20000], s => Math.ceil(s * 0.3)],
    bar: ['Барная стойка, 4 м', 'шт', [120000, 200000, 340000], () => 1],
    racks: ['Стеллажи и полки', 'шт', [25000, 42000, 70000], () => 2],
    host: ['Стойка хостес / ресепшн', 'шт', [45000, 80000, 150000], () => 1],
  }, def: ['tables', 'chairs', 'bar'] },
  hotel: { label: 'Гостиница', short: 'Гостиница', scale: { q: 'Сколько номеров нужно обставить?', unit: 'номеров', min: 1, max: 60, def: 18 }, items: {
    beds: ['Кровати', 'шт', [22000, 38000, 70000], s => s],
    night: ['Прикроватные тумбы', 'шт', [5000, 9000, 16000], s => s * 2],
    wardrobes: ['Шкафы', 'шт', [25000, 40000, 75000], s => s],
    desks: ['Рабочие столы', 'шт', [9000, 15000, 28000], s => s],
    recep: ['Ресепшн', 'шт', [70000, 130000, 250000], () => 1],
    lobby: ['Мебель для лобби', 'компл.', [80000, 150000, 300000], () => 1],
  }, def: ['beds', 'night', 'wardrobes'] },
  office: { label: 'Офис или магазин', short: 'Офис', scale: { q: 'Сколько рабочих мест?', unit: 'мест', min: 2, max: 80, def: 20 }, items: {
    desks: ['Рабочие столы', 'шт', [12000, 20000, 38000], s => s],
    storage: ['Системы хранения', 'шт', [25000, 40000, 70000], s => Math.ceil(s / 4)],
    meet: ['Стол в переговорную', 'шт', [45000, 80000, 160000], () => 1],
    recep: ['Ресепшн', 'шт', [50000, 90000, 180000], () => 1],
    retail: ['Торговые стеллажи и витрины', 'шт', [20000, 35000, 60000], s => Math.ceil(s / 2)],
    kitchen: ['Кухня для персонала', 'шт', [70000, 110000, 180000], () => 1],
  }, def: ['desks', 'storage', 'recep'] },
  barber: { label: 'Барбершоп или салон', short: 'Барбершоп', scale: { q: 'Сколько кресел мастеров?', unit: 'кресел', min: 1, max: 12, def: 4 }, items: {
    places: ['Рабочие места мастеров', 'шт', [25000, 42000, 75000], s => s],
    recep: ['Ресепшн', 'шт', [45000, 80000, 150000], () => 1],
    wait: ['Зона ожидания', 'компл.', [35000, 60000, 110000], () => 1],
    shelf: ['Стеллажи для продукции', 'шт', [18000, 30000, 55000], () => 2],
  }, def: ['places', 'recep'] },
  home: { label: 'Для дома', short: 'Для дома', scale: null, items: {
    dining: ['Обеденный стол', 'шт', [35000, 60000, 120000], () => 1],
    console: ['Консольный или журнальный стол', 'шт', [18000, 32000, 65000], () => 1],
    rack: ['Стеллаж', 'шт', [30000, 50000, 95000], () => 1],
    chest: ['Шкаф или комод', 'шт', [40000, 70000, 140000], () => 1],
    bed: ['Кровать', 'шт', [45000, 80000, 150000], () => 1],
    kitchen: ['Кухня', 'шт', [180000, 280000, 480000], () => 1],
  }, def: ['dining'] },
};
const PROJ = { have: 'есть дизайн-проект', sketch: 'есть эскиз или референсы', none: 'нужен проект с нуля' };
const WHEN = { soon: 'к открытию, в течение месяца', q: 'через 1–3 месяца', look: 'пока считает бюджет' };
const CHANNEL = { whatsapp: 'WhatsApp', telegram: 'Telegram', call: 'звонок' };
const round = n => n >= 300000 ? Math.round(n / 10000) * 10000 : Math.round(n / 1000) * 1000;

/* смета по позициям — то, что клиент видит в результате квиза */
function linesOf(q) {
  const seg = SEGMENTS[q.seg], s = seg.scale ? q.scale : 1;
  return q.items.filter(k => seg.items[k]).map(k => {
    const [label, unit, prices, qtyOf] = seg.items[k];
    const qty = qtyOf(s), sum = qty * prices[TI[q.tier]];
    return { label, unit, qty, lo: round(sum * .85), hi: round(sum * 1.2) };
  });
}
function priceOf(q) {
  const L = linesOf(q);
  return { lo: L.reduce((t, x) => t + x.lo, 0), hi: L.reduce((t, x) => t + x.hi, 0) };
}
function itemOf(q) {
  const seg = SEGMENTS[q.seg];
  return seg.scale ? `${seg.short}, ${q.scale} ${seg.scale.unit}` : `${seg.short}: ${q.items.map(k => seg.items[k][0].toLowerCase()).join(', ')}`;
}
const itemsOf = q => q.items.map(k => SEGMENTS[q.seg].items[k][0]).join(', ');
const range = p => `${rub(p.lo)} – ${rub(p.hi)}`;
const midSum = p => round((p.lo + p.hi) / 2);

/* ---------- этапы проекта Wood&Hands и напоминания ---------- */
const STAGES = [
  { key: 'new', label: 'Новая', col: 'Новые', sla: 15 * MIN, next: 'Созвонились, обсудили задачу', done: 'Обсудили задачу с клиентом' },
  { key: 'contact', label: 'Обсудили задачу', col: 'Обсудили', sla: 2 * DAY, next: 'Проект готов', done: 'Проект в BAZIS готов' },
  { key: 'measure', label: 'Проект', col: 'Проект', sla: 5 * DAY, next: 'Отправил смету', done: 'Клиенту отправили смету' },
  { key: 'quote', label: 'Смета отправлена', col: 'Думают', sla: 3 * DAY, next: 'Подписали договор', done: 'Подписан договор' },
  { key: 'deal', label: 'Договор', col: 'Договор', sla: 0 },
];
const SI = Object.fromEntries(STAGES.map((s, i) => [s.key, { ...s, i }]));
const LOST = ['Дорого', 'Ушёл к другим', 'Передумал', 'Не отвечает', 'Перенесли открытие'];
const LATE2 = 7 * DAY; // второе напоминание по смете

function alertOf(l, now) {
  if (l.lost || l.stage === 'deal') return null;
  const wait = now - l.stageAt, st = SI[l.stage];
  if (wait < st.sla) return null;
  const level = l.stage === 'quote' && wait >= LATE2 ? 2 : 1;
  const text = {
    new: `Ждёт звонка уже ${dur(wait)}. Чем дольше ждёт, тем выше шанс, что уйдёт к другому производству.`,
    contact: `Задачу обсудили ${ago(wait)}, а проект ещё не начат.`,
    measure: `Проект делается уже ${dur(wait)}. Клиент ждёт смету.`,
    quote: level === 2 ? `Молчит уже ${dur(wait)} после сметы. Последняя попытка, потом отметьте результат.` : `Смету отправили ${ago(wait)}, клиент молчит. Самое время написать.`,
  }[l.stage];
  return { level, wait, text, key: `${l.id}:${l.stage}:${level}`, at: l.stageAt + (level === 2 ? LATE2 : st.sla) };
}

function templateFor(l, level = 1) {
  const item = itemOf(l.q).toLowerCase();
  return {
    new: `Здравствуйте, ${l.name}! Это Дмитрий, Wood&Hands. Получили ваш расчёт: ${item}. Удобно созвониться на 5 минут? Уточню задачу и скажу точнее по бюджету.`,
    contact: `${l.name}, добрый день! Чтобы сделать проект, пришлите, пожалуйста, планировку или замеры помещения. Если удобнее, наш специалист приедет на замер.`,
    measure: `${l.name}, добрый день! Проект мебели почти готов. На этой неделе пришлю его вместе со сметой.`,
    quote: level === 2
      ? `${l.name}, не хочу надоедать. Если проект ещё актуален, закрепим цены и сроки до конца месяца. Если решили иначе, напишите, пожалуйста: нам важно понять почему.`
      : `${l.name}, добрый день! Успели посмотреть смету? Если бюджет не сходится, можем оптимизировать: заменить часть массива на шпон или фанеру, разбить оплату на этапы.`,
  }[l.stage] || '';
}

/* ---------- данные ---------- */
const KEY = 'zayavki.woodhands.v1';

function seed(company, city) {
  const t0 = Date.now();
  const L = [
    { name: 'Ирина', phone: '+7 900 000-12-41', channel: 'whatsapp', source: 'Квиз на сайте', q: { seg: 'rest', items: ['tables', 'chairs', 'bar'], scale: 24, tier: 'mid', proj: 'have', when: 'soon' }, stage: 'new', ago: 9 * MIN, org: 'Кофейня на Кирова' },
    { name: 'Андрей', phone: '+7 900 000-37-15', channel: 'call', source: 'ВКонтакте', q: { seg: 'barber', items: ['places', 'recep'], scale: 4, tier: 'mid', proj: 'sketch', when: 'soon' }, stage: 'new', ago: 47 * MIN, org: 'Барбершоп' },
    { name: 'Виктор', phone: '+7 900 000-58-02', channel: 'telegram', source: 'Рекомендация', q: { seg: 'office', items: ['desks', 'storage', 'meet'], scale: 20, tier: 'eco', proj: 'none', when: 'q' }, stage: 'contact', ago: 6 * HOUR, inStage: 3 * HOUR, replyMin: 12, org: 'IT-компания' },
    { name: 'Ольга', phone: '+7 900 000-71-90', channel: 'whatsapp', source: 'Дизайнер', q: { seg: 'rest', items: ['tables', 'chairs', 'sofas', 'bar', 'host'], scale: 60, tier: 'pro', proj: 'have', when: 'q' }, stage: 'contact', ago: 4 * DAY, inStage: 2 * DAY + 5 * HOUR, replyMin: 25, org: 'дизайнер, ресторан' },
    { name: 'Сергей', phone: '+7 900 000-24-66', channel: 'call', source: 'Квиз на сайте', q: { seg: 'hotel', items: ['beds', 'night', 'wardrobes', 'desks'], scale: 18, tier: 'mid', proj: 'none', when: 'q' }, stage: 'measure', ago: 6 * DAY, inStage: 2 * DAY, replyMin: 8, org: 'Мини-отель' },
    { name: 'Елена', phone: '+7 900 000-83-17', channel: 'whatsapp', source: 'Квиз на сайте', q: { seg: 'home', items: ['dining', 'rack'], scale: 1, tier: 'pro', proj: 'sketch', when: 'q' }, stage: 'quote', ago: 9 * DAY, inStage: DAY, replyMin: 40 },
    { name: 'Наталья', phone: '+7 900 000-45-38', channel: 'whatsapp', source: 'Дизайнер', q: { seg: 'rest', items: ['tables', 'chairs', 'sofas'], scale: 40, tier: 'mid', proj: 'have', when: 'soon' }, stage: 'quote', ago: 10 * DAY, inStage: 3 * DAY + 2 * HOUR, replyMin: 15, org: 'Ресторан' },
    { name: 'Павел', phone: '+7 900 000-90-54', channel: 'telegram', source: 'Авито', q: { seg: 'office', items: ['retail', 'recep'], scale: 12, tier: 'mid', proj: 'sketch', when: 'look' }, stage: 'quote', ago: 13 * DAY, inStage: 8 * DAY, replyMin: 90, org: 'Магазин' },
    { name: 'Максим', phone: '+7 900 000-16-73', channel: 'call', source: 'Рекомендация', q: { seg: 'rest', items: ['tables', 'chairs', 'bar'], scale: 30, tier: 'mid', proj: 'have', when: 'soon' }, stage: 'deal', ago: 12 * DAY, inStage: 2 * DAY, replyMin: 10, org: 'Кофейня' },
    { name: 'Татьяна', phone: '+7 900 000-62-29', channel: 'whatsapp', source: 'ВКонтакте', q: { seg: 'barber', items: ['places', 'recep', 'wait'], scale: 6, tier: 'mid', proj: 'sketch', when: 'soon' }, stage: 'deal', ago: 13 * DAY, inStage: 5 * DAY, replyMin: 18, org: 'Салон красоты' },
    { name: 'Алексей', phone: '+7 900 000-38-81', channel: 'whatsapp', source: 'Квиз на сайте', q: { seg: 'hotel', items: ['beds', 'night', 'wardrobes', 'recep'], scale: 30, tier: 'pro', proj: 'none', when: 'q' }, stage: 'quote', ago: 13 * DAY, inStage: 6 * DAY, lostAgo: DAY, lost: 'Дорого', replyMin: 55, org: 'Гостиница' },
    { name: 'Юлия', phone: '+7 900 000-07-48', channel: 'call', source: 'Квиз на сайте', q: { seg: 'home', items: ['bed'], scale: 1, tier: 'mid', proj: 'none', when: 'look' }, stage: 'new', ago: 6 * DAY, inStage: 6 * DAY, lostAgo: 5 * DAY, lost: 'Не отвечает', replyMin: null },
  ];
  const s = { v: 1, company: company || 'Wood&Hands', city: city || 'Челябинск', seq: 2001, shift: 0, tg: [], sent: {}, tgSeen: t0, leads: [] };
  L.reverse().forEach(o => {
    const createdAt = t0 - o.ago, stageAt = t0 - (o.inStage ?? o.ago), k = SI[o.stage].i;
    const price = priceOf(o.q);
    const l = { id: s.seq++, name: o.name, org: o.org || '', phone: o.phone, channel: o.channel, source: o.source, q: o.q, price, stage: o.stage, max: k, createdAt, stageAt, replyMin: o.replyMin ?? null, sum: k >= 3 ? midSum(price) : null, lost: o.lost || null, lostAt: o.lost ? t0 - o.lostAgo : null, file: o.q.proj === 'have' ? 'проект.pdf' : '', history: [] };
    l.history.push({ t: createdAt, text: `Заявка: ${o.source}` });
    for (let i = 1; i <= k; i++) {
      const t = i === k ? stageAt : i === 1 && l.replyMin ? createdAt + l.replyMin * MIN : createdAt + (stageAt - createdAt) * i / k;
      l.history.push({ t, text: STAGES[i - 1].done + (i === 3 ? `: ${rub(l.sum)}` : '') });
    }
    if (l.lost) l.history.push({ t: l.lostAt, text: `Клиент потерян: ${l.lost.toLowerCase()}` });
    s.leads.push(l);
    s.tg.push({ id: s.tg.length + 1, t: createdAt, kind: 'lead', lead: l.id });
  });
  return s;
}

const Store = {
  s: null,
  now() { return Date.now() + (this.s.shift || 0); },
  load() {
    const saved = LS.get(KEY);
    const q = new URLSearchParams(location.search);
    this.s = saved && saved.v === 1 ? saved : seed();
    if (q.get('n')) this.s.company = q.get('n').trim().slice(0, 40) || this.s.company;
    if (q.get('c')) this.s.city = q.get('c').trim().slice(0, 30) || this.s.city;
    this.scan();
    this.save();
  },
  save() { LS.set(KEY, this.s); },
  reset() { this.s = seed(this.s.company, this.s.city); this.scan(); this.save(); },
  lead(id) { return this.s.leads.find(l => l.id === +id); },
  active() { return this.s.leads.filter(l => !l.lost); },
  tgPush(m) { this.s.tg.push({ id: this.s.tg.length + 1, t: this.now(), ...m }); },
  unread() { return this.s.tg.filter(m => m.t > this.s.tgSeen).length; },

  /* новые напоминания в Telegram для просроченных этапов */
  scan() {
    const now = this.now(); let n = 0;
    for (const l of this.s.leads) {
      const a = alertOf(l, now);
      if (!a || this.s.sent[a.key]) continue;
      this.s.sent[a.key] = 1;
      // напоминание приходит в момент просрочки, текст — на этот же момент
      const t = Math.min(now, a.at), then = alertOf(l, t) || a;
      this.s.tg.push({ id: this.s.tg.length + 1, t, kind: 'remind', lead: l.id, level: a.level, stage: l.stage, text: then.text });
      n++;
    }
    this.s.tg.sort((a, b) => a.t - b.t);
    return n;
  },

  setStage(id, key) {
    const l = this.lead(id); if (!l || l.stage === key) return;
    const now = this.now();
    if (key === 'contact' && l.replyMin == null) l.replyMin = Math.max(1, Math.round((now - l.createdAt) / MIN));
    if (key === 'quote' && !l.sum) l.sum = midSum(l.price);
    l.stage = key; l.stageAt = now; l.max = Math.max(l.max, SI[key].i);
    l.history.push({ t: now, text: STAGES[SI[key].i - 1].done + (key === 'quote' ? `: ${rub(l.sum)}` : '') });
    this.scan(); this.save();
  },
  lose(id, reason) {
    const l = this.lead(id); if (!l) return;
    l.lost = reason; l.lostAt = this.now();
    l.history.push({ t: l.lostAt, text: `Клиент потерян: ${reason.toLowerCase()}` });
    this.save();
  },
  restore(id) {
    const l = this.lead(id); if (!l) return;
    l.lost = null; l.lostAt = null; l.stageAt = this.now();
    l.history.push({ t: l.stageAt, text: 'Клиент снова в работе' });
    this.save();
  },
  setSum(id, sum) { const l = this.lead(id); if (l && sum > 0) { l.sum = sum; this.save(); } },
  add(q, c) {
    const now = this.now(), price = priceOf(q);
    const l = { id: this.s.seq++, name: c.name, org: c.org || '', file: c.file || '', phone: c.phone, channel: c.channel, source: 'Квиз на сайте', q, price, stage: 'new', max: 0, createdAt: now, stageAt: now, replyMin: null, sum: null, lost: null, lostAt: null, fresh: true, history: [{ t: now, text: 'Заявка: квиз на сайте' + (c.file ? ` (приложен файл ${c.file})` : '') }] };
    this.s.leads.push(l);
    this.tgPush({ kind: 'lead', lead: l.id });
    this.save();
    return l;
  },
  timeShift(ms) { this.s.shift = (this.s.shift || 0) + ms; const n = this.scan(); this.save(); return n; },
};

/* ---------- тема: как в телефоне, пока человек не выбрал сам ---------- */
const Theme = {
  KEY: 'zayavki.theme',
  mq: window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null,
  saved() { try { const t = localStorage.getItem(this.KEY); return t === 'dark' || t === 'light' ? t : null; } catch (e) { return null; } },
  apply(t) {
    document.documentElement.dataset.theme = t;
    const m = $('meta[name="theme-color"]'); if (m) m.content = t === 'dark' ? '#141c27' : '#0d2440';
  },
  toggle() {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(this.KEY, t); } catch (e) { /* без сохранения */ }
    this.apply(t);
  },
  init() {
    this.apply(this.saved() || (this.mq && this.mq.matches ? 'dark' : 'light'));
    if (this.mq && this.mq.addEventListener) this.mq.addEventListener('change', e => { if (!this.saved()) this.apply(e.matches ? 'dark' : 'light'); });
    document.addEventListener('click', e => { if (e.target.closest('[data-theme-toggle]')) this.toggle(); });
  },
};
const themeBtn = () => `<button class="themebtn" data-theme-toggle aria-label="Светлая или тёмная тема" title="Светлая / тёмная тема">${icon('moon', 18)}${icon('sun', 18)}<span class="t-dark">Тёмная</span><span class="t-light">Светлая</span></button>`;

/* ---------- всплывашки ---------- */
function toast({ title, text = '', act, onAct, tone = '' }) {
  const el = document.createElement('div');
  el.className = 'toast' + (tone ? ' toast--' + tone : '');
  el.innerHTML = `<div><b>${esc(title)}</b>${text ? `<p>${esc(text)}</p>` : ''}</div>${act ? `<button class="btn btn--sm btn--light">${esc(act)}</button>` : ''}`;
  $('#toasts').appendChild(el);
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 250); };
  if (act) $('button', el).onclick = () => { close(); onAct && onAct(); };
  setTimeout(close, 6000);
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast({ title: 'Текст скопирован', text: 'Вставьте его в переписку с клиентом' }); }
  catch (e) { prompt('Скопируйте текст:', t); }
}
const waLink = (phone, text) => `https://wa.me/${digits(phone)}?text=${encodeURIComponent(text)}`;

/* ---------- общие куски разметки ---------- */
const pill = l => l.lost ? '<span class="pill pill--red">Потерян</span>' : `<span class="pill pill--${l.stage}">${SI[l.stage].label}</span>`;
const avatar = name => `<span class="ava">${esc(name[0])}</span>`;

function leadCard(l, now) {
  const a = alertOf(l, now);
  const money = l.sum ? rub(l.sum) : 'от ' + rub(l.price.lo);
  return `<a class="lcard ${a ? 'is-late' : ''} ${l.fresh ? 'is-fresh' : ''}" href="#/lead/${l.id}">
    <div class="lcard__t">${avatar(l.name)}<div><b>${esc(l.name)}</b><small>${esc(itemOf(l.q))}</small></div></div>
    <div class="lcard__b"><span class="money">${money}</span><span class="${a ? 'late' : 'muted'}">${icon(a ? 'alert' : 'clock', 14)}${l.stage === 'deal' ? ago(now - l.stageAt) : dur(now - l.stageAt)}</span></div>
  </a>`;
}

/* =========================================================
   Экраны
   ========================================================= */
const Views = {
  /* --- вводная для Wood&Hands: что это и что докрутим --- */
  intro(v) {
    const s = Store.s;
    const have = [
      'Квиз по вашим направлениям: рестораны и кофейни, гостиницы, офисы, барбершопы, мебель для дома',
      'Смета по позициям: клиент сразу видит структуру бюджета — столы, стулья, стойка, хранение',
      'Этапы как у вас: обсуждение → проект в BAZIS → смета → договор',
      'Клиент прикладывает дизайн-проект или эскиз прямо к заявке',
    ];
    const more = [
      'Ваши позиции и цены вместо примерных — вы говорите, я настраиваю',
      'Уведомления нужному человеку: продажи — Дмитрию, проект — Андрею, снабжение — Антону',
      'Кнопка «Рассчитать мебель» на woodhands.ru',
      'Учёт дизайнеров-партнёров: кто сколько проектов привёл и на какую сумму',
      'Смета в PDF с вашим логотипом — клиенту одной кнопкой',
    ];
    v.innerHTML = `<section class="intro">
      <div class="kicker">Демо для ${esc(s.company)} · ${esc(s.city)}</div>
      <h1>Ни одна заявка<br>не потеряется</h1>
      <p class="lead">Ресторатор или дизайнер прикидывает бюджет на вашем сайте, а вы сразу получаете заявку в Telegram. Дальше система ведёт проект по вашим этапам и напоминает, если смета висит без ответа, — пока клиент не ушёл к другому производству.</p>
      <div class="cta">
        <a class="btn btn--primary btn--lg" href="#/quiz">${icon('calc')}Посмотреть глазами клиента</a>
        <a class="btn btn--outline btn--lg" href="#/board">${icon('board')}Открыть кабинет</a>
      </div>
      <ol class="steps">
        <li><span>1</span><div><b>Клиент считает бюджет за минуту</b><p>Выбирает тип заведения, позиции, количество мест и материалы. Видит смету по позициям, оставив телефон.</p></div></li>
        <li><span>2</span><div><b>Заявка сразу в Telegram</b><p>Кто, какое заведение, что нужно, есть ли проект и на какую сумму. С файлом проекта, если клиент его приложил.</p></div></li>
        <li><span>3</span><div><b>Длинные проекты под контролем</b><p>Проект делается больше 5 дней или смета висит 3 дня без ответа — бот напомнит и даст готовый текст.</p></div></li>
        <li><span>4</span><div><b>Отчёт раз в неделю</b><p>Сколько заявок, откуда (сайт, дизайнеры, рекомендации), сколько договоров и где проекты застревают.</p></div></li>
      </ol>
      <div class="card opts">
        <b>Уже в демо</b>
        <ul>${have.map(t => `<li class="ok">${icon('check', 16)}<span>${t}</span></li>`).join('')}</ul>
        <b>Докрутим под вас</b>
        <ul>${more.map(t => `<li>${icon('plus', 16)}<span>${t}</span></li>`).join('')}</ul>
      </div>
      <p class="foot muted">Цены в демо примерные, по открытым данным рынка — подставим ваши. Клиенты и цифры вымышленные. <button class="link" id="reset">${icon('rotate', 14)}Сбросить демо</button></p>
    </section>`;
    $('#reset', v).onclick = () => { Store.reset(); App.render(); toast({ title: 'Демо-данные восстановлены' }); };
  },

  /* --- доска заявок --- */
  board(v) {
    const now = Store.now(), act = Store.active();
    const late = act.map(l => [l, alertOf(l, now)]).filter(x => x[1]).sort((a, b) => b[1].wait - a[1].wait);
    const inWork = act.filter(l => l.stage !== 'deal');
    const risk = late.reduce((t, [l]) => t + (l.sum || midSum(l.price)), 0);
    const deals = act.filter(l => l.stage === 'deal');
    const lost = Store.s.leads.filter(l => l.lost);
    v.innerHTML = `<div class="page">
      <div class="phead"><h1>Заявки</h1><a class="btn btn--sm btn--outline" href="#/quiz">${icon('calc', 16)}Квиз клиента</a></div>
      <div class="kpis">
        <div class="kpi"><small>В работе</small><b>${inWork.length}</b><span>${rub(inWork.reduce((t, l) => t + (l.sum || midSum(l.price)), 0))}</span></div>
        <div class="kpi kpi--red"><small>Под угрозой</small><b>${late.length}</b><span>${late.length ? rub(risk) : 'всё под контролем'}</span></div>
        <div class="kpi kpi--green"><small>Договоры</small><b>${deals.length}</b><span>${rub(deals.reduce((t, l) => t + l.sum, 0))}</span></div>
      </div>
      ${late.length ? `<section class="attn"><h2>${icon('alert', 18)}Требуют внимания сейчас</h2>${late.map(([l, a]) => `
        <a class="attn__i" href="#/lead/${l.id}">${avatar(l.name)}<div><b>${esc(l.name)} · ${esc(itemOf(l.q))}</b><p>${esc(a.text)}</p></div>${icon('right', 18)}</a>`).join('')}</section>` : `<section class="attn attn--ok"><h2>${icon('check', 18)}Все клиенты под контролем</h2></section>`}
      <div class="kanban">${STAGES.map(st => { const ls = act.filter(l => l.stage === st.key).sort((a, b) => a.stageAt - b.stageAt);
        return `<div class="col"><div class="col__h"><span class="dot dot--${st.key}"></span>${st.col}<em>${ls.length}</em></div>${ls.map(l => leadCard(l, now)).join('') || '<div class="col__empty">пусто</div>'}</div>`; }).join('')}
        <div class="col col--lost"><div class="col__h"><span class="dot dot--lost"></span>Потеряны<em>${lost.length}</em></div>${lost.map(l => `<a class="lcard lcard--lost" href="#/lead/${l.id}"><div class="lcard__t">${avatar(l.name)}<div><b>${esc(l.name)}</b><small>${esc(l.lost)} · на шаге «${SI[l.stage].label}»</small></div></div></a>`).join('') || '<div class="col__empty">пусто</div>'}</div>
      </div>
    </div>`;
  },

  /* --- карточка клиента --- */
  lead(v, id) {
    const l = Store.lead(id);
    if (!l) { v.innerHTML = `<div class="page"><div class="card empty">Заявка не найдена. <a class="link" href="#/board">К заявкам</a></div></div>`; return; }
    if (l.fresh) { l.fresh = false; Store.save(); }
    const now = Store.now(), a = alertOf(l, now), st = SI[l.stage];
    const tpl = !l.lost && l.stage !== 'deal' ? templateFor(l, a ? a.level : 1) : '';
    v.innerHTML = `<div class="page page--narrow">
      <a class="back" href="#/board">${icon('left', 16)}Заявки</a>
      <div class="lhead">${avatar(l.name)}<div><h1>${esc(l.name)}</h1><p class="muted">${l.org ? esc(l.org) + ' · ' : ''}${esc(itemOf(l.q))} · ${esc(l.source)} · ${ago(now - l.createdAt)}</p></div>${pill(l)}</div>
      ${a ? `<div class="banner banner--red">${icon('alert', 18)}<p>${esc(a.text)}</p></div>` : ''}
      ${tpl ? `<div class="card tpl"><div class="card__h"><b>Что написать клиенту</b><small class="muted">готовый текст</small></div>
        <p class="tpl__t" id="tpl">${esc(tpl)}</p>
        <div class="row"><button class="btn btn--outline btn--sm" id="copy">${icon('copy', 16)}Скопировать</button><a class="btn btn--wa btn--sm" target="_blank" rel="noopener" href="${waLink(l.phone, tpl)}">${icon('chat', 16)}Открыть в WhatsApp</a><a class="btn btn--outline btn--sm" href="tel:${digits(l.phone)}">${icon('phone', 16)}Позвонить</a></div></div>` : ''}
      ${!l.lost && st.next ? `<div class="card next"><div><small class="muted">Следующий шаг</small><b>${st.next}</b></div><button class="btn btn--primary" id="next">${icon('check', 18)}Готово</button></div>` : ''}
      ${l.stage === 'deal' && !l.lost ? `<div class="banner banner--green">${icon('check', 18)}<p>Договор подписан ${ago(now - l.stageAt)} на ${rub(l.sum)}.</p></div>` : ''}
      <div class="grid2">
        <div class="card"><div class="card__h"><b>Что хочет клиент</b></div><dl class="dl">
          ${l.org ? `<dt>Заведение</dt><dd>${esc(l.org)}</dd>` : ''}
          <dt>Направление</dt><dd>${esc(itemOf(l.q))}</dd>
          <dt>Позиции</dt><dd>${esc(itemsOf(l.q))}</dd>
          <dt>Материалы</dt><dd>${TIERS[l.q.tier].label} (${TIERS[l.q.tier].sub})</dd>
          <dt>Проект</dt><dd>${PROJ[l.q.proj]}${l.file ? ` · ${icon('clip', 14)} ${esc(l.file)}` : ''}</dd>
          <dt>Когда</dt><dd>${WHEN[l.q.when]}</dd>
          <dt>Ориентир из квиза</dt><dd>${range(l.price)}</dd>
          ${l.sum ? `<dt>Сумма сметы</dt><dd><input class="input input--sum" id="sum" inputmode="numeric" value="${l.sum}"> ₽</dd>` : ''}
        </dl></div>
        <div class="card"><div class="card__h"><b>Контакты</b></div><dl class="dl">
          <dt>Телефон</dt><dd><a class="link" href="tel:${digits(l.phone)}">${esc(l.phone)}</a></dd>
          <dt>Удобнее</dt><dd>${CHANNEL[l.channel]}</dd>
          <dt>Первый звонок</dt><dd>${l.replyMin != null ? `через ${dur(l.replyMin * MIN)}` : 'ещё не звонили'}</dd>
        </dl></div>
      </div>
      <div class="card"><div class="card__h"><b>История</b></div><ul class="hist">${l.history.slice().reverse().map(h => `<li><span>${dayLabel(h.t)}, ${clock(h.t)}</span>${esc(h.text)}</li>`).join('')}</ul></div>
      ${l.lost ? `<div class="card lostbox"><p>Клиент отмечен как потерянный: <b>${esc(l.lost.toLowerCase())}</b>.</p><button class="btn btn--outline btn--sm" id="restore">${icon('rotate', 16)}Вернуть в работу</button></div>`
        : l.stage !== 'deal' ? `<div class="card lostbox"><small class="muted">Клиент отказался? Отметьте причину, она попадёт в отчёт</small><div class="chips">${LOST.map(r => `<button class="chip" data-lost="${r}">${r}</button>`).join('')}</div></div>` : ''}
    </div>`;
    const c = $('#copy', v); if (c) c.onclick = () => copyText(tpl);
    const n = $('#next', v); if (n) n.onclick = () => {
      const key = STAGES[st.i + 1].key; Store.setStage(l.id, key); App.render(true);
      toast({ title: `${l.name}: «${SI[key].label}»`, text: key === 'deal' ? 'Поздравляем с договором!' : `Если следующий шаг затянется, бот напомнит через ${dur(SI[key].sla)}`, tone: key === 'deal' ? 'ok' : '' });
    };
    const sum = $('#sum', v); if (sum) sum.onchange = () => { Store.setSum(l.id, +digits(sum.value)); toast({ title: 'Цена сохранена' }); };
    $$('[data-lost]', v).forEach(b => b.onclick = () => { Store.lose(l.id, b.dataset.lost); App.render(true); });
    const r = $('#restore', v); if (r) r.onclick = () => { Store.restore(l.id); App.render(true); };
  },

  /* --- Telegram владельца --- */
  tg(v) {
    const s = Store.s, now = Store.now();
    s.tgSeen = now; Store.save(); App.badges();
    let lastDay = '';
    const msgs = s.tg.slice(-60).map(m => {
      const l = m.lead ? Store.lead(m.lead) : null;
      const d = dayLabel(m.t), sep = d !== lastDay ? `<div class="tg__day">${d}</div>` : ''; lastDay = d;
      let body = '', btns = '';
      if (m.kind === 'lead' && l) {
        body = `<b>🆕 Новая заявка · ${esc(l.source)}</b><br>${l.org ? esc(l.org) + '<br>' : ''}${esc(itemOf(l.q))}<br>Позиции: ${esc(itemsOf(l.q))}<br>${TIERS[l.q.tier].label}, ${PROJ[l.q.proj]}, ${WHEN[l.q.when]}<br>Ориентир: ${range(l.price)}${l.file ? `<br>📎 ${esc(l.file)}` : ''}<br><br>👤 ${esc(l.name)} · ${esc(l.phone)}<br>Удобнее: ${CHANNEL[l.channel]}`;
        btns = (l.stage === 'new' && !l.lost ? `<button data-call="${l.id}">✅ Позвонил</button>` : '') + `<a href="#/lead/${l.id}">Карточка</a>`;
      } else if (m.kind === 'remind' && l) {
        body = `<b>⏰ ${esc(l.name)} · ${esc(itemOf(l.q))}</b><br>${esc(m.text)}`;
        btns = `<a href="#/lead/${l.id}">✍️ Готовый текст</a>`;
      } else if (m.kind === 'note') body = esc(m.text);
      else if (m.kind === 'report') body = m.html;
      return body ? `${sep}<div class="tg__msg ${m.t > now - 2 * MIN ? 'is-new' : ''}"><div class="tg__b">${body}<time>${clock(m.t)}</time></div>${btns ? `<div class="tg__btns">${btns}</div>` : ''}</div>` : '';
    }).join('');
    v.innerHTML = `<div class="page page--narrow">
      <div class="phead"><h1>Telegram владельца</h1></div>
      <p class="muted small">Так выглядят уведомления в Telegram на телефоне владельца. Чтобы увидеть напоминания, перемотайте время вперёд:</p>
      <div class="chips chips--time"><button class="chip" data-shift="${20 * MIN}">${icon('forward', 14)}+20 минут</button><button class="chip" data-shift="${DAY}">${icon('forward', 14)}+1 день</button><button class="chip" data-shift="${3 * DAY}">${icon('forward', 14)}+3 дня</button><button class="chip" id="weekly">📊 Недельный отчёт</button></div>
      <div class="tg">
        <div class="tg__head"><span class="ava ava--bot">${icon('send', 16)}</span><div><b>${esc(s.company)} · Заявки</b><small>бот</small></div></div>
        <div class="tg__list" id="tglist">${msgs}</div>
      </div>
    </div>`;
    const list = $('#tglist', v); list.scrollTop = list.scrollHeight;
    $$('[data-call]', v).forEach(b => b.onclick = () => {
      const l = Store.lead(b.dataset.call); Store.setStage(l.id, 'contact');
      Store.tgPush({ kind: 'note', text: `✓ ${l.name}: отмечено «Связались». Следующий шаг — назначить замер. Если не назначите за сутки, напомню.` });
      Store.save(); App.render(true);
    });
    $$('[data-shift]', v).forEach(b => b.onclick = () => {
      const n = Store.timeShift(+b.dataset.shift); App.render(true);
      toast({ title: `Прошло ${b.textContent.replace('+', '').trim()}`, text: n ? `Пришло ${n} ${plural(n, 'напоминание', 'напоминания', 'напоминаний')}` : 'Новых напоминаний нет: все клиенты в сроке' });
    });
    $('#weekly', v).onclick = () => { const r = report(); Store.tgPush({ kind: 'report', html: `<b>📊 Отчёт за неделю</b><br>Заявок: ${r.total}<br>Договоров: ${r.deals.length} на ${rub(r.dealSum)}<br>Ждут ответа дольше нормы: ${r.late.length}<br>Средний первый звонок: ${r.avgReply != null ? 'через ' + dur(r.avgReply * MIN) : '—'}${r.worst ? `<br><br>Больше всего клиентов теряется на шаге «${r.worst.from} → ${r.worst.to}»` : ''}<br><a href="#/report">Подробнее</a>` }); Store.save(); App.render(true); };
  },

  /* --- недельный отчёт --- */
  report(v) {
    const r = report();
    const maxN = Math.max(1, r.funnel[0].n);
    v.innerHTML = `<div class="page page--narrow">
      <div class="phead"><h1>Отчёт за 2 недели</h1></div>
      <div class="kpis kpis--4">
        <div class="kpi"><small>Заявок</small><b>${r.total}</b><span>из квиза: ${r.fromQuiz}</span></div>
        <div class="kpi kpi--green"><small>Договоров</small><b>${r.deals.length}</b><span>${rub(r.dealSum)}</span></div>
        <div class="kpi"><small>Конверсия</small><b>${r.conv}%</b><span>заявка → договор</span></div>
        <div class="kpi"><small>Первый звонок</small><b>${r.avgReply != null ? dur(r.avgReply * MIN) : '—'}</b><span>в среднем</span></div>
      </div>
      ${r.worst ? `<div class="banner banner--amber">${icon('alert', 18)}<p>Больше всего клиентов теряется на шаге <b>«${r.worst.from} → ${r.worst.to}»</b>: ${r.worst.n} ${plural(r.worst.n, 'человек', 'человека', 'человек')}. ${r.worst.to === 'Договор' ? 'Помогает напоминание через 3 дня после сметы и вариант с оптимизацией материалов или оплатой по этапам.' : 'Проверьте, не затягивается ли этот шаг.'}</p></div>` : ''}
      <div class="card"><div class="card__h"><b>Воронка: сколько клиентов дошло до каждого шага</b></div>
        <div class="funnel">${r.funnel.map(f => `<div class="funnel__r"><span>${f.label}</span><div class="funnel__bar"><i style="width:${Math.max(4, f.n / maxN * 100)}%"></i></div><b>${f.n}</b></div>`).join('')}</div></div>
      <div class="grid2">
        <div class="card"><div class="card__h"><b>Почему уходят</b></div>${r.reasons.length ? `<ul class="bars">${r.reasons.map(([k, n]) => `<li><span>${esc(k)}</span><b>${n}</b></li>`).join('')}</ul>` : '<p class="muted">Потерянных клиентов нет</p>'}</div>
        <div class="card"><div class="card__h"><b>Откуда заявки</b></div><ul class="bars">${r.sources.map(([k, n]) => `<li><span>${esc(k)}</span><b>${n}</b></li>`).join('')}</ul></div>
      </div>
      <p class="muted small">Такой отчёт каждый понедельник приходит владельцу в Telegram.</p>
    </div>`;
  },
};

function report() {
  const L = Store.s.leads, now = Store.now();
  const count = f => Object.entries(L.reduce((m, l) => { const k = f(l); if (k) m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
  const deals = L.filter(l => !l.lost && l.stage === 'deal');
  const replies = L.filter(l => l.replyMin != null).map(l => l.replyMin);
  const funnel = STAGES.map((s, i) => ({ label: s.label, n: L.filter(l => l.max >= i).length }));
  let worst = null;
  for (let i = 0; i < funnel.length - 1; i++) {
    // ушли = дошли до шага i, но не дальше, и уже отмечены потерянными или висят дольше нормы
    const n = L.filter(l => l.max === i && (l.lost || alertOf(l, now))).length;
    if (n && (!worst || n >= worst.n)) worst = { from: STAGES[i].label, to: STAGES[i + 1].label, n };
  }
  return {
    total: L.length, fromQuiz: L.filter(l => l.source === 'Квиз на сайте').length,
    deals, dealSum: deals.reduce((t, l) => t + l.sum, 0),
    conv: L.length ? Math.round(deals.length / L.length * 100) : 0,
    avgReply: replies.length ? Math.round(replies.reduce((a, b) => a + b, 0) / replies.length) : null,
    late: L.filter(l => alertOf(l, now)), funnel, worst,
    reasons: count(l => l.lost), sources: count(l => l.source),
  };
}

/* =========================================================
   Квиз — так клиент видит расчёт на сайте цеха
   ========================================================= */
const Quiz = {
  st: null,
  reset() { this.st = { step: 0, q: { seg: null, items: [], scale: 0, tier: null, proj: null, when: null }, c: { name: '', phone: '', org: '', file: '', channel: 'whatsapp' }, done: null }; },
  steps() {
    const seg = SEGMENTS[this.st.q.seg];
    return ['seg', 'items', ...(seg && !seg.scale ? [] : ['scale']), 'tier', 'proj', 'when', 'contact'];
  },
  opt(key, val, title, sub = '') {
    return `<button class="qopt ${this.st.q[key] === val ? 'is-on' : ''}" data-k="${key}" data-v="${esc(val)}"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</button>`;
  },
  view(v) {
    if (!this.st) this.reset();
    const st = this.st, q = st.q, steps = this.steps(), cur = steps[st.step], s = Store.s, seg = SEGMENTS[q.seg];
    let body = '';
    if (st.done) body = this.result();
    else if (cur === 'seg') body = `<h2>Для чего нужна мебель?</h2><div class="qgrid qgrid--2">${Object.entries(SEGMENTS).map(([k, g]) => this.opt('seg', k, g.label)).join('')}</div>`;
    else if (cur === 'items') body = `<h2>Что нужно изготовить?</h2><p class="muted">Можно выбрать несколько позиций.</p>
      <div class="qgrid qgrid--chips">${Object.entries(seg.items).map(([k, it]) => `<button class="qchip ${q.items.includes(k) ? 'is-on' : ''}" data-item="${k}">${it[0]}</button>`).join('')}</div>
      <button class="btn btn--primary btn--lg btn--block" id="go" ${q.items.length ? '' : 'disabled'}>Далее${icon('right', 18)}</button>`;
    else if (cur === 'scale') {
      const sc = seg.scale;
      if (!q.scale || q.scale < sc.min || q.scale > sc.max) q.scale = sc.def;
      body = `<h2>${sc.q}</h2><p class="muted">Можно примерно — по нему посчитаем количество позиций.</p>
        <div class="qsize"><output id="sz">${q.scale} ${sc.unit}</output><input type="range" id="range" min="${sc.min}" max="${sc.max}" step="1" value="${q.scale}"><div class="qsize__s"><span>${sc.min}</span><span>${sc.max}</span></div></div>
        <button class="btn btn--primary btn--lg btn--block" id="go">Далее${icon('right', 18)}</button>`;
    } else if (cur === 'tier') body = `<h2>Какие материалы рассматриваете?</h2><div class="qgrid">${Object.entries(TIERS).map(([k, t]) => this.opt('tier', k, t.label, t.sub)).join('')}</div>`;
    else if (cur === 'proj') body = `<h2>Есть ли дизайн-проект?</h2><div class="qgrid">${this.opt('proj', 'have', 'Есть проект', 'от дизайнера или архитектора')}${this.opt('proj', 'sketch', 'Есть эскиз', 'или фото того, что нравится')}${this.opt('proj', 'none', 'Нужен проект', 'сделаем в BAZIS с нуля')}</div>`;
    else if (cur === 'when') body = `<h2>Когда нужна мебель?</h2><div class="qgrid">${this.opt('when', 'soon', 'К открытию', 'в течение месяца')}${this.opt('when', 'q', 'Через 1–3 месяца')}${this.opt('when', 'look', 'Пока считаю бюджет')}</div>`;
    else if (cur === 'contact') body = `<div class="qready">${icon('check', 22)}<div><b>Смета готова!</b><p>Куда отправить расчёт по позициям и примеры наших проектов?</p></div></div>
      <form id="cform" class="cform" novalidate>
        <label>Ваше имя<input class="input" name="name" autocomplete="given-name" value="${esc(st.c.name)}" placeholder="Например, Анна"></label>
        <label>Телефон<input class="input" name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${esc(st.c.phone)}" placeholder="+7 ___ ___-__-__"></label>
        <label>Заведение или компания <span class="muted">— необязательно</span><input class="input" name="org" value="${esc(st.c.org)}" placeholder="Например, кофейня на Кирова"></label>
        <label class="file">${icon('clip', 18)}<span id="fname">${st.c.file ? esc(st.c.file) : 'Прикрепить проект или эскиз — необязательно'}</span><input type="file" name="file" hidden></label>
        <div class="seg">${Object.entries(CHANNEL).map(([k, t]) => `<button type="button" class="${st.c.channel === k ? 'is-on' : ''}" data-ch="${k}">${k === 'call' ? 'Позвонить' : t}</button>`).join('')}</div>
        <p class="err" id="err"></p>
        <button class="btn btn--primary btn--lg btn--block">Получить смету</button>
        <small class="muted">Нажимая кнопку, вы соглашаетесь на обработку персональных данных. Без спама: только расчёт по вашей заявке.</small>
      </form>`;
    v.innerHTML = `<div class="qbar"><span>${icon('user', 16)}Так клиент видит расчёт на вашем сайте</span><div class="qbar__r">${themeBtn()}<a href="#/board" class="link">Выйти ${icon('x', 14)}</a></div></div>
      <div class="quiz">
        <div class="quiz__brand"><b>${esc(s.company)}</b><small>${esc(s.city)} · мебель для бизнеса и дома</small></div>
        ${st.done ? '' : `<div class="quiz__top"><h1>Рассчитайте бюджет на мебель за 1 минуту</h1><div class="prog"><i style="width:${(st.step + 1) / steps.length * 100}%"></i></div><small class="muted">Шаг ${st.step + 1} из ${steps.length}${st.step ? ` · <button class="link" id="back">${icon('left', 14)}назад</button>` : ''}</small></div>`}
        <div class="quiz__card">${body}</div>
        ${st.done ? '' : `<div class="quiz__gift">${icon('gift', 20)}<span>Замер, проект в BAZIS и монтаж своими силами — под ключ</span></div>`}
      </div>`;
    this.bind(v);
  },
  bind(v) {
    const st = this.st, q = st.q;
    $$('[data-k]', v).forEach(b => b.onclick = () => {
      const k = b.dataset.k;
      if (k === 'seg' && q.seg !== b.dataset.v) { q.items = SEGMENTS[b.dataset.v].def.slice(); q.scale = 0; }
      q[k] = b.dataset.v; st.step++; this.view(v);
    });
    $$('[data-item]', v).forEach(b => b.onclick = () => {
      const k = b.dataset.item, i = q.items.indexOf(k);
      if (i >= 0) q.items.splice(i, 1); else q.items.push(k);
      b.classList.toggle('is-on', i < 0);
      $('#go', v).disabled = !q.items.length;
    });
    const rg = $('#range', v); if (rg) rg.oninput = () => { q.scale = +rg.value; $('#sz', v).textContent = q.scale + ' ' + SEGMENTS[q.seg].scale.unit; };
    const go = $('#go', v); if (go) go.onclick = () => { st.step++; this.view(v); };
    const bk = $('#back', v); if (bk) bk.onclick = () => { st.step--; this.view(v); };
    $$('[data-ch]', v).forEach(b => b.onclick = () => { st.c.channel = b.dataset.ch; $$('[data-ch]', v).forEach(x => x.classList.toggle('is-on', x === b)); });
    const f = $('#cform', v);
    if (f) {
      const ph = f.elements.phone;
      ph.oninput = () => { ph.value = maskPhone(ph.value); };
      f.elements.file.onchange = () => { st.c.file = f.elements.file.files[0]?.name.slice(0, 60) || ''; $('#fname', v).textContent = st.c.file || 'Прикрепить проект или эскиз — необязательно'; };
      f.onsubmit = e => {
        e.preventDefault();
        st.c.name = f.elements.name.value.trim(); st.c.phone = ph.value.trim(); st.c.org = f.elements.org.value.trim();
        const err = !st.c.name ? 'Напишите, как к вам обращаться' : digits(st.c.phone).length < 11 ? 'Проверьте номер телефона' : '';
        $('#err', v).textContent = err; if (err) return;
        const l = Store.add({ seg: q.seg, items: q.items.slice(), scale: SEGMENTS[q.seg].scale ? q.scale : 1, tier: q.tier, proj: q.proj, when: q.when },
          { name: st.c.name.slice(0, 30), phone: st.c.phone, channel: st.c.channel, org: st.c.org.slice(0, 60), file: st.c.file });
        st.done = l.id; this.view(v); App.badges();
        setTimeout(() => toast({ title: 'В Telegram пришла заявка', text: `${l.name} · ${itemOf(l.q)}`, act: 'Посмотреть', onAct: () => { location.hash = '#/tg'; }, tone: 'tg' }), 900);
      };
    }
    const again = $('#again', v); if (again) again.onclick = () => { this.reset(); this.view(v); };
  },
  result() {
    const l = Store.lead(this.st.done), L = linesOf(l.q);
    return `<div class="qres"><small class="muted">${esc(itemOf(l.q))} · ${TIERS[l.q.tier].label}</small>
      <h2>Ориентировочно</h2><div class="qres__p">${range(l.price)}</div>
      <table class="smeta"><thead><tr><th>Позиция</th><th>Кол-во</th><th>Ориентир</th></tr></thead><tbody>
        ${L.map(x => `<tr><td>${esc(x.label)}</td><td>${x.qty} ${x.unit}</td><td>${rub(x.lo)} – ${rub(x.hi)}</td></tr>`).join('')}
        <tr class="note"><td colspan="3">${l.q.proj === 'none' ? 'Проект в BAZIS сделаем под ваше помещение' : 'Посчитаем точно по вашему проекту'}, замер и монтаж — нашими силами</td></tr>
      </tbody></table>
      <p>Точную смету подготовим после проекта: она зависит от материалов, фурнитуры и сложности.</p>
      <div class="qres__ok">${icon('clock', 18)}<span>${esc(l.name)}, мы свяжемся с вами в течение 15 минут ${l.channel === 'call' ? 'по телефону' : 'в ' + CHANNEL[l.channel]}.</span></div>
      <div class="row"><a class="btn btn--primary" href="#/tg">${icon('send', 16)}Что увидел владелец</a><button class="btn btn--outline" id="again">Пройти заново</button></div></div>`;
  },
};
function maskPhone(v) {
  let d = digits(v); if (!d) return '';
  if (d[0] === '8') d = '7' + d.slice(1); if (d[0] !== '7') d = '7' + d; d = d.slice(0, 11);
  const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
  return '+7' + (p[0] ? ' ' + p[0] : '') + (p[1] ? ' ' + p[1] : '') + (p[2] ? '-' + p[2] : '') + (p[3] ? '-' + p[3] : '');
}

/* =========================================================
   Каркас и маршрутизация
   ========================================================= */
const NAV = [['board', '#/board', 'board', 'Заявки'], ['tg', '#/tg', 'send', 'Telegram'], ['report', '#/report', 'chart', 'Отчёт'], ['quiz', '#/quiz', 'calc', 'Квиз']];
const App = {
  key: '',
  render(keep) {
    const [path] = (location.hash.slice(1) || '/').split('?');
    const parts = path.split('/').filter(Boolean), page = parts[0] || '';
    const root = $('#root');
    if (location.hash !== App.key && !keep) window.scrollTo(0, 0);
    App.key = location.hash;
    if (page === 'quiz') {
      document.title = `Расчёт мебели — ${Store.s.company}`;
      root.className = 'is-client'; root.innerHTML = '<main id="view"></main>';
      Quiz.view($('#view')); return;
    }
    Quiz.st = null;
    const s = Store.s, on = page === 'lead' ? 'board' : page;
    document.title = `${s.company} · Заявки`;
    root.className = '';
    root.innerHTML = `<header class="top"><a href="#/" class="logo"><span class="logo__m"></span>${esc(s.company)}<small>Заявки</small></a>
      <div class="top__r"><nav class="nav">${NAV.map(([k, h, ic, t]) => `<a href="${h}" class="${on === k ? 'is-on' : ''}">${icon(ic, 20)}<span>${t}</span>${k === 'tg' ? '<em class="badge" id="tgbadge"></em>' : ''}</a>`).join('')}</nav>${themeBtn()}</div></header>
      <main id="view"></main>`;
    const v = $('#view');
    if (page === 'board') Views.board(v);
    else if (page === 'lead') Views.lead(v, parts[1]);
    else if (page === 'tg') Views.tg(v);
    else if (page === 'report') Views.report(v);
    else Views.intro(v);
    App.badges();
  },
  badges() { const b = $('#tgbadge'); if (b) { const n = Store.unread(); b.textContent = n || ''; b.hidden = !n; } },
  start() {
    Theme.init();
    Store.load();
    window.addEventListener('hashchange', () => App.render());
    // время идёт само: раз в 30 секунд проверяем просрочки
    setInterval(() => {
      const n = Store.scan(); if (n) Store.save();
      const [path] = location.hash.slice(1).split('?'), page = path.split('/')[1];
      const busy = document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName);
      if (!busy && ['board', 'report', 'tg'].includes(page)) App.render(true); else App.badges();
    }, 30000);
    App.render();
  },
};

App.start();
