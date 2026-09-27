(() => {
  'use strict';

  // ---------- Konstantalar ----------
  const STORAGE_KEY = 'revo-crm-leads-v1';

  const STATUSES = [
    { id: 'new',       label: 'Yangi' },
    { id: 'contacted', label: 'Bog‘landik' },
    { id: 'meeting',   label: 'Uchrashuv' },
    { id: 'proposal',  label: 'Taklif yuborildi' },
    { id: 'won',       label: 'Mijoz bo‘ldi' },
    { id: 'lost',      label: 'Rad etildi' },
  ];
  const IN_PROGRESS = ['contacted', 'meeting', 'proposal'];

  const SOURCES = [
    { id: 'instagram', label: 'Instagram' },
    { id: 'telegram',  label: 'Telegram' },
    { id: 'phone',     label: 'Telefon' },
    { id: 'referral',  label: 'Tavsiya' },
    { id: 'other',     label: 'Boshqa' },
  ];

  const SERVICES = ['SMM', 'Target reklama', 'Veb-sayt', 'Brending / logotip', 'Video / Reels', 'Fotosyomka', 'Kompleks marketing'];

  const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'];
  const MONTHS_FULL = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
  const WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];

  const statusLabel = id => (STATUSES.find(s => s.id === id) || STATUSES[0]).label;
  const sourceLabel = id => (SOURCES.find(s => s.id === id) || SOURCES[4]).label;

  // ---------- Holat ----------
  let leads = [];
  let loading = true;
  const ui = { status: 'all', source: '', query: '', sort: 'created' };

  function normalize(l) {
    const now = new Date().toISOString();
    return {
      id: String(l.id || ''),
      name: String(l.name || '').trim().slice(0, 120),
      phone: String(l.phone || '').trim().slice(0, 30),
      instagram: cleanInsta(l.instagram || '').slice(0, 60),
      service: String(l.service || '').trim().slice(0, 120),
      source: SOURCES.some(s => s.id === l.source) ? l.source : 'other',
      status: STATUSES.some(s => s.id === l.status) ? l.status : 'new',
      amount: Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, parseInt(String(l.amount || 0).replace(/\D/g, ''), 10) || 0)),
      nextContact: /^\d{4}-\d{2}-\d{2}$/.test(l.nextContact || '') ? l.nextContact : '',
      note: String(l.note || '').slice(0, 2000),
      createdAt: l.createdAt || now,
      updatedAt: l.updatedAt || now,
    };
  }
  function cleanInsta(v) {
    return String(v).trim()
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/[/?#].*$/, '')
      .replace(/^@+/, '');
  }

  // ---------- Bulut (Supabase) ----------
  const cfg = window.REVO_CONFIG || {};
  let sb = null;
  let channel = null;
  let currentUser = null;

  // Ilova ↔ baza ustunlari
  const fromRow = r => normalize({
    id: r.id, name: r.name, phone: r.phone, instagram: r.instagram, service: r.service,
    source: r.source, status: r.status, amount: r.amount, nextContact: r.next_contact || '',
    note: r.note, createdAt: r.created_at, updatedAt: r.updated_at,
  });
  function toRow(l, withCreated) {
    const n = normalize(l);
    const row = {
      name: n.name, phone: n.phone, instagram: n.instagram, service: n.service,
      source: n.source, status: n.status, amount: n.amount, next_contact: n.nextContact || null, note: n.note,
    };
    if (withCreated && l.createdAt && !isNaN(Date.parse(l.createdAt))) row.created_at = new Date(l.createdAt).toISOString();
    return row;
  }

  function errText(error) {
    const msg = String((error && (error.message || error.error_description)) || error || '');
    if (/fetch|network|Failed to|Load failed/i.test(msg)) return 'Internet aloqasini tekshiring';
    if (/JWT|expired|session/i.test(msg)) return 'Sessiya tugagan — qayta kiring';
    if (/row-level security|permission|42501/i.test(msg)) return 'Ruxsat yo‘q — administratorga murojaat qiling';
    return msg || 'Noma’lum xato';
  }
  function fail(prefix, error) {
    console.error(prefix, error);
    toast(`${prefix}: ${errText(error)}`);
  }

  const db = {
    async all() {
      const out = [];
      const page = 1000;
      for (let from = 0; ; from += page) {
        const { data, error } = await sb.from('leads').select('*')
          .order('created_at', { ascending: false }).range(from, from + page - 1);
        if (error) throw error;
        out.push(...data);
        if (data.length < page) break;
      }
      return out.map(fromRow);
    },
    async insert(list, withCreated) {
      const rows = list.map(l => toRow(l, withCreated));
      const out = [];
      for (let i = 0; i < rows.length; i += 500) {
        const { data, error } = await sb.from('leads').insert(rows.slice(i, i + 500)).select();
        if (error) throw error;
        out.push(...data.map(fromRow));
      }
      return out;
    },
    async update(id, patch) {
      const { data, error } = await sb.from('leads').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return fromRow(data);
    },
    async remove(id) {
      const { error } = await sb.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    async removeAll() {
      const { error } = await sb.from('leads').delete().not('id', 'is', null);
      if (error) throw error;
    },
  };

  // Mahalliy massivni yangilash (takrorlanishsiz)
  function upsertLocal(lead) {
    const i = leads.findIndex(l => l.id === lead.id);
    if (i > -1) leads[i] = lead; else leads.push(lead);
  }
  function removeLocal(id) { leads = leads.filter(l => l.id !== id); }

  let renderTimer;
  const renderSoon = () => { clearTimeout(renderTimer); renderTimer = setTimeout(render, 60); };

  async function refresh() {
    try {
      leads = await db.all();
      loading = false;
      render();
      return true;
    } catch (e) {
      fail('Leadlarni yuklab bo‘lmadi', e);
      return false;
    }
  }

  function setSync(state) {
    const s = document.getElementById('syncStatus');
    s.className = 'sync' + (state === 'online' ? ' is-online' : state === 'offline' ? ' is-offline' : '');
    s.querySelector('span').textContent = state === 'online' ? 'Sinxron' : state === 'offline' ? 'Aloqa yo‘q' : 'Ulanmoqda…';
  }

  function subscribe() {
    unsubscribe();
    setSync('connecting');
    channel = sb.channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, payload => {
        if (payload.eventType === 'DELETE') removeLocal(payload.old && payload.old.id);
        else if (payload.new && payload.new.id) upsertLocal(fromRow(payload.new));
        renderSoon();
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setSync('online');
          refresh(); // uzilish paytida o'tkazib yuborilgan o'zgarishlarni olish
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setSync('offline');
        }
      });
  }
  function unsubscribe() {
    if (channel) { sb.removeChannel(channel); channel = null; }
  }

  // ---------- Ekranlar ----------
  function setView(v) { document.body.dataset.view = v; }

  async function onSession(session) {
    if (!session) {
      currentUser = null;
      unsubscribe();
      leads = []; loading = true;
      setView('login');
      return;
    }
    // Bir xil foydalanuvchi uchun takroriy hodisalar (SIGNED_IN + INITIAL_SESSION) — qayta yuklamaymiz
    if (currentUser && currentUser.id === session.user.id && ['app', 'loading', 'denied'].includes(document.body.dataset.view)) return;
    currentUser = session.user;
    setView('loading');
    try {
      const { data, error } = await sb.from('crm_members').select('email').maybeSingle();
      if (error) throw error;
      if (!data) {
        document.getElementById('deniedEmail').textContent = currentUser.email || '';
        setView('denied');
        return;
      }
      leads = await db.all();
    } catch (e) {
      console.error(e);
      document.getElementById('gateErrorText').textContent = errText(e);
      setView('error');
      return;
    }
    loading = false;
    document.getElementById('menuUser').innerHTML = `Kirgan hisob:<b>${esc(currentUser.email || '')}</b>`;
    setView('app');
    render();
    subscribe();
    offerMigration();
  }

  // ---------- Eski (localStorage) leadlarni ko'chirish ----------
  const MIGRATED_KEY = 'revo-crm-migrated-v1';
  function localLeads() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data.map(normalize).filter(l => l.name) : [];
    } catch (e) { return []; }
  }
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* e'tiborsiz */ } };

  const dedupeKey = l => (l.name.toLowerCase() + '|' + l.phone.replace(/\D/g, ''));
  function onlyNew(list) {
    const seen = new Set(leads.map(dedupeKey));
    return list.filter(l => { const k = dedupeKey(l); if (seen.has(k)) return false; seen.add(k); return true; });
  }

  async function offerMigration() {
    const old = localLeads();
    document.getElementById('migrateMenuItem').hidden = !old.length;
    if (!old.length || lsGet(MIGRATED_KEY)) return;
    const fresh = onlyNew(old);
    if (!fresh.length) { lsSet(MIGRATED_KEY, new Date().toISOString()); return; }
    const ok = await confirmOk('Eski leadlarni bulutga ko‘chirish',
      `Bu qurilmada avvalgi versiyadan ${old.length} ta lead saqlangan (${fresh.length} tasi bulutda yo‘q). Ularni umumiy bazaga ko‘chiraylikmi?`, 'Ko‘chirish');
    lsSet(MIGRATED_KEY, new Date().toISOString());
    if (ok) await migrateLocal();
    else toast('Keyinroq ⋮ menyudan ko‘chirishingiz mumkin');
  }
  async function migrateLocal() {
    const fresh = onlyNew(localLeads());
    if (!fresh.length) return toast('Ko‘chiriladigan yangi lead yo‘q');
    try {
      (await db.insert(fresh, true)).forEach(upsertLocal);
      render();
      toast(`${fresh.length} ta lead bulutga ko‘chirildi`);
    } catch (e) { fail('Ko‘chirib bo‘lmadi', e); }
  }

  // ---------- Formatlash ----------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtNum = n => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const fmtMoney = n => fmtNum(n) + ' so‘m';
  function fmtShortMoney(n) {
    if (n >= 1e9) return trim1(n / 1e9) + ' mlrd';
    if (n >= 1e6) return trim1(n / 1e6) + ' mln';
    if (n >= 1e3) return trim1(n / 1e3) + ' ming';
    return fmtNum(n);
  }
  const trim1 = x => (Math.round(x * 10) / 10).toString().replace('.', ',');

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function fmtDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const thisYear = new Date().getFullYear();
    return `${d}-${MONTHS[m - 1]}${y !== thisYear ? ' ' + y : ''}`;
  }
  function dateInfo(iso) {
    if (!iso) return { text: '—', cls: '' };
    const today = todayISO();
    if (iso < today) return { text: fmtDate(iso) + ' · o‘tib ketdi', cls: 'date--overdue' };
    if (iso === today) return { text: 'Bugun', cls: 'date--today' };
    const t = new Date(); t.setDate(t.getDate() + 1);
    const tomorrow = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    if (iso === tomorrow) return { text: 'Ertaga', cls: '' };
    return { text: fmtDate(iso), cls: '' };
  }
  const telHref = p => 'tel:' + p.replace(/[^\d+]/g, '');
  const needsFollowup = l => l.nextContact && l.nextContact <= todayISO() && l.status !== 'won' && l.status !== 'lost';

  // ---------- DOM ----------
  const $ = sel => document.querySelector(sel);
  const el = {
    stats: $('#stats'),
    chips: $('#statusChips'),
    list: $('#leadList'),
    search: $('#searchInput'),
    sourceFilter: $('#sourceFilter'),
    sort: $('#sortSelect'),
    alert: $('#followupAlert'),
    modal: $('#leadModal'),
    form: $('#leadForm'),
    modalTitle: $('#modalTitle'),
    deleteInForm: $('#deleteInForm'),
    confirm: $('#confirmModal'),
    confirmTitle: $('#confirmTitle'),
    confirmText: $('#confirmText'),
    toast: $('#toast'),
    menuBtn: $('#menuBtn'),
    menuList: $('#menuList'),
    importFile: $('#importFile'),
  };

  // ---------- Dashboard ----------
  function renderStats() {
    const total = leads.length;
    const count = st => leads.filter(l => l.status === st).length;
    const newCount = count('new');
    const inProgress = leads.filter(l => IN_PROGRESS.includes(l.status)).length;
    const won = count('won');
    const lost = count('lost');
    const conversion = total ? (won / total) * 100 : 0;
    const pipeline = leads.filter(l => l.status !== 'won' && l.status !== 'lost').reduce((s, l) => s + l.amount, 0);
    const wonSum = leads.filter(l => l.status === 'won').reduce((s, l) => s + l.amount, 0);

    el.stats.innerHTML = `
      <div class="stat stat--dark">
        <span class="stat__label">Jami leadlar</span>
        <span class="stat__value">${total}</span>
        <span class="stat__hint">${lost ? `${lost} ta rad etilgan` : 'Barcha manbalardan'}</span>
      </div>
      <div class="stat">
        <span class="stat__label">Yangi leadlar</span>
        <span class="stat__value">${newCount}</span>
        <span class="stat__hint">Hali bog‘lanilmagan</span>
      </div>
      <div class="stat">
        <span class="stat__label">Jarayonda</span>
        <span class="stat__value">${inProgress}</span>
        <span class="stat__hint">Bog‘landik · Uchrashuv · Taklif</span>
      </div>
      <div class="stat">
        <span class="stat__label">Mijozga aylangan</span>
        <span class="stat__value">${won}</span>
        <span class="stat__hint">${wonSum ? fmtShortMoney(wonSum) + ' so‘m shartnoma' : 'Yopilgan bitimlar'}</span>
      </div>
      <div class="stat">
        <span class="stat__label">Konversiya</span>
        <span class="stat__value">${trim1(conversion)}%</span>
        <div class="bar"><i style="width:${Math.min(100, conversion).toFixed(1)}%"></i></div>
      </div>
      <div class="stat stat--red stat--wide">
        <span class="stat__label">Potensial daromad</span>
        <span class="stat__value" title="${esc(fmtMoney(pipeline))}">${fmtShortMoney(pipeline)} so‘m</span>
        <span class="stat__hint">Faol leadlar summasi</span>
      </div>`;
  }

  function renderAlert() {
    const due = leads.filter(needsFollowup);
    if (!due.length) { el.alert.hidden = true; return; }
    const overdue = due.filter(l => l.nextContact < todayISO()).length;
    el.alert.hidden = false;
    el.alert.innerHTML = `
      <span>🔔 <strong>${due.length} ta lead</strong> bilan bugun bog‘lanish kerak${overdue ? ` (${overdue} tasi kechikkan)` : ''}.</span>
      <button class="link" data-action="show-due">Ko‘rsatish</button>`;
  }

  function renderChips() {
    const counts = { all: leads.length, due: leads.filter(needsFollowup).length };
    STATUSES.forEach(s => { counts[s.id] = leads.filter(l => l.status === s.id).length; });
    const items = [{ id: 'all', label: 'Barchasi' }, ...STATUSES];
    if (counts.due || ui.status === 'due') items.push({ id: 'due', label: '🔔 Bugun aloqa' });
    el.chips.innerHTML = items.map(s => `
      <button class="chip ${ui.status === s.id ? 'is-active' : ''}" data-status="${s.id}" role="tab" aria-selected="${ui.status === s.id}">
        ${esc(s.label)} <b>${counts[s.id]}</b>
      </button>`).join('');
  }

  // ---------- Ro'yxat ----------
  function filtered() {
    const q = ui.query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    let list = leads.filter(l => {
      if (ui.status === 'due') { if (!needsFollowup(l)) return false; }
      else if (ui.status !== 'all' && l.status !== ui.status) return false;
      if (ui.source && l.source !== ui.source) return false;
      if (!q) return true;
      const hay = [l.name, l.instagram, l.service, l.note, sourceLabel(l.source), statusLabel(l.status)].join(' ').toLowerCase();
      if (hay.includes(q.replace(/^@/, ''))) return true;
      return qDigits.length >= 3 && l.phone.replace(/\D/g, '').includes(qDigits);
    });
    const byCreated = (a, b) => b.createdAt.localeCompare(a.createdAt);
    const sorters = {
      created: byCreated,
      followup: (a, b) => (a.nextContact || '9999').localeCompare(b.nextContact || '9999') || byCreated(a, b),
      amount: (a, b) => b.amount - a.amount || byCreated(a, b),
      name: (a, b) => a.name.localeCompare(b.name, 'uz'),
    };
    return list.sort(sorters[ui.sort] || byCreated);
  }

  const statusOptions = cur => STATUSES.map(s => `<option value="${s.id}" ${s.id === cur ? 'selected' : ''}>${esc(s.label)}</option>`).join('');
  const statusSelect = l => `<select class="status-select st-${l.status}" data-id="${l.id}" data-role="status" aria-label="Holatni o‘zgartirish">${statusOptions(l.status)}</select>`;
  const sourceTag = l => `<span class="src src--${l.source}"><i></i>${esc(sourceLabel(l.source))}</span>`;
  const icons = {
    edit: '<svg viewBox="0 0 24 24" width="17" height="17"><path d="M4 20h4L19 9l-4-4L4 16v4z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/></svg>',
    del: '<svg viewBox="0 0 24 24" width="17" height="17"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  function renderList() {
    const list = filtered();

    if (loading) {
      el.list.innerHTML = '<div class="loading-row"><div class="spinner"></div><span class="muted">Leadlar yuklanmoqda…</span></div>';
      return;
    }
    if (!leads.length) {
      el.list.innerHTML = `
        <div class="empty">
          <div class="empty__icon">R</div>
          <h3>Hozircha leadlar yo‘q</h3>
          <p class="muted">Birinchi potensial mijozni qo‘shing yoki namuna ma'lumot bilan tanishib chiqing.</p>
          <div class="btns">
            <button class="btn btn--primary" data-action="add">+ Yangi lead</button>
            <button class="btn btn--ghost" data-action="demo">Namuna ma'lumot</button>
          </div>
        </div>`;
      return;
    }
    if (!list.length) {
      el.list.innerHTML = `
        <div class="empty">
          <div class="empty__icon">?</div>
          <h3>Hech narsa topilmadi</h3>
          <p class="muted">Qidiruv yoki filtrni o‘zgartirib ko‘ring.</p>
          <div class="btns"><button class="btn btn--ghost" data-action="reset-filters">Filtrlarni tozalash</button></div>
        </div>`;
      return;
    }

    const rows = list.map(l => {
      const d = dateInfo(l.nextContact);
      const contacts = [
        l.phone ? `<a href="${esc(telHref(l.phone))}" data-stop>${esc(l.phone)}</a>` : '',
        l.instagram ? `<a href="https://instagram.com/${encodeURIComponent(l.instagram)}" target="_blank" rel="noopener" data-stop>@${esc(l.instagram)}</a>` : '',
      ].filter(Boolean).join(' · ');
      return `
        <tr data-id="${l.id}">
          <td><span class="cell-name">${esc(l.name)}</span>${contacts ? `<span class="cell-sub">${contacts}</span>` : ''}</td>
          <td>${esc(l.service) || '<span class="muted">—</span>'}</td>
          <td>${sourceTag(l)}</td>
          <td data-stop>${statusSelect(l)}</td>
          <td class="num">${l.amount ? fmtMoney(l.amount) : '<span class="muted">—</span>'}</td>
          <td class="date ${d.cls}">${d.text}</td>
          <td data-stop><div class="row-actions">
            <button class="btn btn--ghost btn--icon" data-action="edit" data-id="${l.id}" aria-label="Tahrirlash">${icons.edit}</button>
            <button class="btn btn--ghost btn--icon del" data-action="delete" data-id="${l.id}" aria-label="O‘chirish">${icons.del}</button>
          </div></td>
        </tr>`;
    }).join('');

    const cards = list.map(l => {
      const d = dateInfo(l.nextContact);
      return `
        <article class="card">
          <div class="card__top">
            <div>
              <div class="card__name">${esc(l.name)}</div>
              ${l.service ? `<div class="card__service">${esc(l.service)}</div>` : ''}
            </div>
            ${statusSelect(l)}
          </div>
          <div class="card__meta">
            ${sourceTag(l)}
            ${l.phone ? `<a href="${esc(telHref(l.phone))}">📞 ${esc(l.phone)}</a>` : ''}
            ${l.instagram ? `<a href="https://instagram.com/${encodeURIComponent(l.instagram)}" target="_blank" rel="noopener">@${esc(l.instagram)}</a>` : ''}
            ${l.nextContact ? `<span class="date ${d.cls}">📅 ${d.text}</span>` : ''}
          </div>
          ${l.note ? `<div class="card__note">${esc(l.note)}</div>` : ''}
          <div class="card__bottom">
            <span class="card__amount">${l.amount ? fmtMoney(l.amount) : '<span class="muted">Summa yo‘q</span>'}</span>
            <div class="card__actions">
              <button class="btn btn--ghost" data-action="edit" data-id="${l.id}">${icons.edit} Tahrirlash</button>
              <button class="btn btn--danger-ghost btn--icon" data-action="delete" data-id="${l.id}" aria-label="O‘chirish">${icons.del}</button>
            </div>
          </div>
        </article>`;
    }).join('');

    el.list.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Mijoz</th><th>Xizmat</th><th>Manba</th><th>Holati</th>
            <th class="num">Summa</th><th>Keyingi aloqa</th><th></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="cards">${cards}</div>`;
  }

  function render() {
    renderStats();
    renderAlert();
    renderChips();
    renderList();
  }

  // ---------- Forma ----------
  const form = el.form;
  const amountInput = form.elements.amount;

  function openForm(lead) {
    form.reset();
    form.querySelectorAll('.field.invalid').forEach(f => f.classList.remove('invalid'));
    const l = lead || {
      id: '', name: '', phone: '', instagram: '', service: '',
      source: ui.source || 'instagram',
      status: STATUSES.some(s => s.id === ui.status) ? ui.status : 'new',
      amount: '', nextContact: '', note: '',
    };
    el.modalTitle.textContent = lead ? 'Leadni tahrirlash' : 'Yangi lead';
    el.deleteInForm.hidden = !lead;
    ['id', 'name', 'phone', 'instagram', 'service', 'source', 'status', 'nextContact', 'note']
      .forEach(k => { form.elements[k].value = l[k] || ''; });
    amountInput.value = l.amount ? fmtNum(l.amount) : '';
    el.modal.showModal();
    if (!matchMedia('(max-width: 600px)').matches) form.elements.name.focus();
  }

  amountInput.addEventListener('input', () => {
    const digits = amountInput.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    amountInput.value = digits ? fmtNum(Number(digits)) : '';
  });

  const submitBtn = form.querySelector('button[type="submit"]');
  function busy(btn, on, text) {
    if (on) { btn.dataset.label = btn.textContent; btn.textContent = text || 'Saqlanmoqda…'; btn.disabled = true; }
    else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (submitBtn.disabled) return;
    const nameField = form.elements.name;
    if (!nameField.value.trim()) {
      nameField.closest('.field').classList.add('invalid');
      nameField.focus();
      return;
    }
    const f = form.elements;
    const data = {
      name: f.name.value, phone: f.phone.value, instagram: f.instagram.value, service: f.service.value,
      source: f.source.value, status: f.status.value, amount: f.amount.value,
      nextContact: f.nextContact.value, note: f.note.value.trim(),
    };
    const id = f.id.value;
    busy(submitBtn, true);
    try {
      if (id) {
        upsertLocal(await db.update(id, toRow(data)));
        toast('O‘zgarishlar saqlandi');
      } else {
        const [created] = await db.insert([data]);
        upsertLocal(created);
        toast('Lead qo‘shildi');
      }
      el.modal.close();
      render();
    } catch (err) {
      if (err && err.code === 'PGRST116') {
        removeLocal(id); render(); el.modal.close();
        toast('Bu lead boshqa foydalanuvchi tomonidan o‘chirilgan');
      } else fail('Saqlab bo‘lmadi', err);
    } finally {
      busy(submitBtn, false);
    }
  });

  form.elements.name.addEventListener('input', e => e.target.closest('.field').classList.remove('invalid'));

  el.deleteInForm.addEventListener('click', async () => {
    const id = form.elements.id.value;
    el.modal.close();
    await deleteLead(id);
  });

  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  // Fon ustiga bosilganda yopish
  document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close('cancel'); }));

  // ---------- O'chirish ----------
  function confirmDialog(title, text) {
    el.confirmTitle.textContent = title;
    el.confirmText.textContent = text;
    el.confirm.returnValue = '';
    el.confirm.showModal();
    return new Promise(resolve => {
      el.confirm.addEventListener('close', () => resolve(el.confirm.returnValue === 'ok'), { once: true });
    });
  }

  async function deleteLead(id) {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    const ok = await confirmDialog('Leadni o‘chirasizmi?', `“${lead.name}” butunlay o‘chiriladi. Bu amalni qaytarib bo‘lmaydi.`);
    if (!ok) return;
    try {
      await db.remove(id);
      removeLocal(id);
      render();
      toast('Lead o‘chirildi');
    } catch (e) { fail('O‘chirib bo‘lmadi', e); }
  }

  // ---------- Hodisalar ----------
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (btn) {
      const { action, id } = btn.dataset;
      closeMenu();
      switch (action) {
        case 'add': return openForm();
        case 'edit': return openForm(leads.find(l => l.id === id));
        case 'delete': return deleteLead(id);
        case 'demo': return addDemo();
        case 'reset-filters': return resetFilters();
        case 'show-due': ui.status = 'due'; render(); el.chips.scrollIntoView({ behavior: 'smooth', block: 'start' }); return;
        case 'export-csv': return exportCSV();
        case 'export-json': return exportJSON();
        case 'import-json': return el.importFile.click();
        case 'clear': return clearAll();
        case 'migrate-local': return migrateLocal();
        case 'change-password': return openPassword();
        case 'logout': return logout();
        case 'reload': return location.reload();
      }
      return;
    }
    // Jadval qatorini bosish = tahrirlash
    const row = e.target.closest('tbody tr[data-id]');
    if (row && !e.target.closest('[data-stop], a, select, button')) {
      openForm(leads.find(l => l.id === row.dataset.id));
    }
    if (!e.target.closest('.menu')) closeMenu();
  });

  // Holatni tezkor o'zgartirish
  document.addEventListener('change', async e => {
    const sel = e.target.closest('select[data-role="status"]');
    if (!sel) return;
    const lead = leads.find(l => l.id === sel.dataset.id);
    if (!lead) return;
    const prev = lead.status;
    lead.status = sel.value; // darhol ko'rsatamiz, xato bo'lsa qaytaramiz
    render();
    try {
      upsertLocal(await db.update(lead.id, { status: lead.status }));
      render();
      toast(`Holat: ${statusLabel(lead.status)}`);
    } catch (err) {
      lead.status = prev;
      render();
      fail('Holatni o‘zgartirib bo‘lmadi', err);
    }
  });

  el.chips.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    ui.status = chip.dataset.status;
    render();
  });

  let searchTimer;
  el.search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { ui.query = el.search.value; renderList(); }, 120);
  });
  el.sourceFilter.addEventListener('change', () => { ui.source = el.sourceFilter.value; renderList(); });
  el.sort.addEventListener('change', () => { ui.sort = el.sort.value; renderList(); });

  $('#addBtn').addEventListener('click', () => openForm());
  $('#fabBtn').addEventListener('click', () => openForm());

  function resetFilters() {
    ui.status = 'all'; ui.source = ''; ui.query = '';
    el.search.value = ''; el.sourceFilter.value = '';
    render();
  }

  // Menyu
  function closeMenu() { el.menuList.hidden = true; el.menuBtn.setAttribute('aria-expanded', 'false'); }
  el.menuBtn.addEventListener('click', e => {
    e.stopPropagation();
    const open = el.menuList.hidden;
    el.menuList.hidden = !open;
    el.menuBtn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  // ---------- Eksport / import ----------
  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function exportCSV() {
    if (!leads.length) return toast('Eksport uchun leadlar yo‘q');
    const head = ['Nomi', 'Telefon', 'Instagram', 'Xizmat', 'Manba', 'Holati', 'Summa (so‘m)', 'Keyingi aloqa', 'Izoh', 'Qo‘shilgan sana'];
    const cell = v => {
      let s = String(v ?? '');
      if (/^[=+\-@]/.test(s)) s = "'" + s; // Excel formula injection oldini olish
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const lines = [head, ...leads.map(l => [
      l.name, l.phone, l.instagram ? '@' + l.instagram : '', l.service, sourceLabel(l.source), statusLabel(l.status),
      l.amount, l.nextContact, l.note, l.createdAt.slice(0, 10),
    ])].map(r => r.map(cell).join(';'));
    download(`revo-leadlar-${todayISO()}.csv`, '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
    toast('CSV fayl yuklab olindi');
  }

  function exportJSON() {
    download(`revo-crm-zaxira-${todayISO()}.json`, JSON.stringify({ app: 'revo-crm', version: 2, exportedAt: new Date().toISOString(), leads }, null, 2), 'application/json');
    toast('Zaxira nusxa yuklab olindi');
  }

  el.importFile.addEventListener('change', async () => {
    const file = el.importFile.files[0];
    el.importFile.value = '';
    if (!file) return;
    let fresh;
    try {
      const data = JSON.parse(await file.text());
      const arr = Array.isArray(data) ? data : data.leads;
      if (!Array.isArray(arr)) throw new Error('format');
      const incoming = arr.map(normalize).filter(l => l.name);
      fresh = onlyNew(incoming);
    } catch (e) {
      return toast('Faylni o‘qib bo‘lmadi — REVO CRM zaxira fayli ekanini tekshiring');
    }
    if (!fresh.length) return toast('Fayldagi barcha leadlar bazada allaqachon bor');
    const ok = await confirmOk('Zaxiradan tiklash', `Faylda bazada yo‘q ${fresh.length} ta lead topildi (bir xil nom va telefonli leadlar o‘tkazib yuboriladi). Qo‘shilsinmi?`, 'Qo‘shish');
    if (!ok) return;
    try {
      (await db.insert(fresh, true)).forEach(upsertLocal);
      render();
      toast(`${fresh.length} ta lead tiklandi`);
    } catch (e) { fail('Tiklab bo‘lmadi', e); }
  });

  async function confirmOk(title, text, okLabel) {
    const okBtn = el.confirm.querySelector('button[value="ok"]');
    const prev = okBtn.textContent;
    okBtn.textContent = okLabel;
    okBtn.classList.replace('btn--danger', 'btn--primary');
    const res = await confirmDialog(title, text);
    okBtn.textContent = prev;
    okBtn.classList.replace('btn--primary', 'btn--danger');
    return res;
  }

  async function clearAll() {
    if (!leads.length) return toast('Ro‘yxat allaqachon bo‘sh');
    const ok = await confirmDialog('Barcha leadlarni o‘chirasizmi?', `${leads.length} ta lead butun jamoa uchun butunlay o‘chiriladi. Avval zaxira nusxa olishni tavsiya qilamiz.`);
    if (!ok) return;
    try {
      await db.removeAll();
      leads = [];
      resetFilters();
      toast('Barcha leadlar o‘chirildi');
    } catch (e) { fail('O‘chirib bo‘lmadi', e); }
  }

  // ---------- Namuna ma'lumot ----------
  async function addDemo() {
    const shift = days => {
      const d = new Date(); d.setDate(d.getDate() + days);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const ago = days => new Date(Date.now() - days * 864e5).toISOString();
    const demo = [
      { name: 'Coffee House Chilonzor', phone: '+998 90 123 45 67', instagram: 'coffeehouse.uz', service: 'SMM', source: 'instagram', status: 'new', amount: 6000000, nextContact: shift(0), note: 'Direct orqali yozishdi, narxlarni so‘rashdi.', createdAt: ago(0) },
      { name: 'Nur Stomatologiya', phone: '+998 93 555 12 34', instagram: 'nur_dental', service: 'Target reklama', source: 'telegram', status: 'contacted', amount: 4500000, nextContact: shift(2), note: 'Oyiga 30+ yangi bemor maqsad.', createdAt: ago(2) },
      { name: 'Grand Mebel', phone: '+998 97 777 00 11', instagram: 'grandmebel', service: 'Veb-sayt', source: 'referral', status: 'meeting', amount: 15000000, nextContact: shift(1), note: 'Uchrashuv ofisda, katalog bilan sayt kerak.', createdAt: ago(5) },
      { name: 'Aziza Beauty Studio', phone: '+998 99 321 65 87', instagram: 'aziza.beauty', service: 'Kompleks marketing', source: 'instagram', status: 'proposal', amount: 9000000, nextContact: shift(-1), note: 'Tijorat taklifi PDF yuborildi, javob kutilmoqda.', createdAt: ago(8) },
      { name: 'Samarqand Travel', phone: '+998 91 234 56 78', instagram: 'samtravel', service: 'Video / Reels', source: 'phone', status: 'won', amount: 12000000, nextContact: '', note: '3 oylik shartnoma imzolandi.', createdAt: ago(14) },
      { name: 'EduPro o‘quv markazi', phone: '+998 88 111 22 33', instagram: 'edupro.uz', service: 'Brending / logotip', source: 'other', status: 'lost', amount: 5000000, nextContact: '', note: 'Byudjet yetmadi, 3 oydan keyin qayta yozish.', createdAt: ago(20) },
    ];
    try {
      (await db.insert(demo, true)).forEach(upsertLocal);
      render();
      toast('Namuna leadlar qo‘shildi');
    } catch (e) { fail('Qo‘shib bo‘lmadi', e); }
  }

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2400);
  }

  // ---------- Boshlash ----------
  function init() {
    const now = new Date();
    $('#todayLabel').textContent = `Bugun: ${now.getDate()}-${MONTHS_FULL[now.getMonth()]}, ${WEEKDAYS[now.getDay()]}`;
    el.sourceFilter.insertAdjacentHTML('beforeend', SOURCES.map(s => `<option value="${s.id}">${esc(s.label)}</option>`).join(''));
    form.elements.source.innerHTML = SOURCES.map(s => `<option value="${s.id}">${esc(s.label)}</option>`).join('');
    form.elements.status.innerHTML = statusOptions('new');
    $('#serviceList').innerHTML = SERVICES.map(s => `<option value="${esc(s)}">`).join('');
    render();
    startAuth();
  }

  // ---------- Login ----------
  function keyProblem() {
    const url = String(cfg.supabaseUrl || '').trim();
    const key = String(cfg.supabaseAnonKey || '').trim();
    if (!url || !key) return 'missing';
    if (/^sb_secret_/.test(key)) return 'secret';
    try { // eski JWT kalit: service_role bo'lsa ishlatmaymiz
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role === 'service_role') return 'secret';
    } catch (e) { /* publishable kalit JWT emas */ }
    return '';
  }

  function startAuth() {
    const problem = keyProblem();
    if (problem || !window.supabase) {
      if (problem === 'secret') {
        $('[data-gate="setup"] p').textContent = 'config.js ichida MAXFIY (secret / service_role) kalit turibdi! Uni darhol olib tashlang va Supabase’da kalitni almashtiring. Bu yerga faqat publishable (anon) kalit yoziladi.';
      }
      setView('setup');
      return;
    }
    sb = window.supabase.createClient(cfg.supabaseUrl.trim(), cfg.supabaseAnonKey.trim(), {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
    // Supabase tavsiyasi: callback ichida to'g'ridan-to'g'ri await qilmaslik
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
      setTimeout(() => onSession(session), 0);
    });
    // Ilovaga qaytganda (telefonda fon rejimidan) yangilash
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && document.body.dataset.view === 'app') refresh();
    });
  }

  const loginForm = $('#loginForm');
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = loginForm.querySelector('button[type="submit"]');
    const errEl = $('#loginError');
    const email = loginForm.elements.email.value.trim();
    const password = loginForm.elements.password.value;
    errEl.textContent = '';
    if (!email || !password) { errEl.textContent = 'Email va parolni kiriting'; return; }
    busy(btn, true, 'Kirilmoqda…');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    busy(btn, false);
    if (error) {
      errEl.textContent = /invalid login credentials/i.test(error.message) ? 'Email yoki parol noto‘g‘ri'
        : /not confirmed/i.test(error.message) ? 'Email tasdiqlanmagan — administratorga murojaat qiling'
        : errText(error);
      return;
    }
    loginForm.reset();
  });

  async function logout() {
    closeMenu();
    if (!sb) return;
    unsubscribe();
    await sb.auth.signOut().catch(() => {});
    currentUser = null;
    setView('login');
  }

  // Parolni o'zgartirish
  const pwModal = $('#passwordModal');
  const pwForm = $('#passwordForm');
  function openPassword() {
    pwForm.reset();
    pwForm.querySelector('.field').classList.remove('invalid');
    pwModal.showModal();
  }
  pwForm.addEventListener('submit', async e => {
    e.preventDefault();
    const input = pwForm.elements.password;
    if (input.value.length < 8) { input.closest('.field').classList.add('invalid'); return; }
    const btn = pwForm.querySelector('button[type="submit"]');
    busy(btn, true);
    const { error } = await sb.auth.updateUser({ password: input.value });
    busy(btn, false);
    if (error) return fail('Parolni o‘zgartirib bo‘lmadi', error);
    pwModal.close();
    toast('Parol o‘zgartirildi');
  });

  init();
})();
