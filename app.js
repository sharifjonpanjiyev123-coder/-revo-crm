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
  let leads = load();
  const ui = { status: 'all', source: '', query: '', sort: 'created' };

  // ---------- Saqlash ----------
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data.map(normalize) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    } catch (e) {
      toast('Saqlab bo‘lmadi: brauzer xotirasi to‘lgan yoki bloklangan');
    }
  }
  function normalize(l) {
    const now = new Date().toISOString();
    return {
      id: String(l.id || uid()),
      name: String(l.name || '').trim(),
      phone: String(l.phone || '').trim(),
      instagram: cleanInsta(l.instagram || ''),
      service: String(l.service || '').trim(),
      source: SOURCES.some(s => s.id === l.source) ? l.source : 'other',
      status: STATUSES.some(s => s.id === l.status) ? l.status : 'new',
      amount: Math.max(0, parseInt(String(l.amount || 0).replace(/\D/g, ''), 10) || 0),
      nextContact: /^\d{4}-\d{2}-\d{2}$/.test(l.nextContact || '') ? l.nextContact : '',
      note: String(l.note || ''),
      createdAt: l.createdAt || now,
      updatedAt: l.updatedAt || now,
    };
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function cleanInsta(v) {
    return String(v).trim()
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/[/?#].*$/, '')
      .replace(/^@+/, '');
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

  form.addEventListener('submit', e => {
    e.preventDefault();
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
    if (id) {
      const i = leads.findIndex(l => l.id === id);
      if (i > -1) leads[i] = normalize({ ...leads[i], ...data, updatedAt: new Date().toISOString() });
      toast('O‘zgarishlar saqlandi');
    } else {
      leads.push(normalize({ ...data, id: uid(), createdAt: new Date().toISOString() }));
      toast('Lead qo‘shildi');
    }
    save();
    el.modal.close();
    render();
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
    leads = leads.filter(l => l.id !== id);
    save();
    render();
    toast('Lead o‘chirildi');
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
  document.addEventListener('change', e => {
    const sel = e.target.closest('select[data-role="status"]');
    if (!sel) return;
    const lead = leads.find(l => l.id === sel.dataset.id);
    if (!lead) return;
    lead.status = sel.value;
    lead.updatedAt = new Date().toISOString();
    save();
    render();
    toast(`Holat: ${statusLabel(lead.status)}`);
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
    download(`revo-crm-zaxira-${todayISO()}.json`, JSON.stringify({ app: 'revo-crm', version: 1, exportedAt: new Date().toISOString(), leads }, null, 2), 'application/json');
    toast('Zaxira nusxa yuklab olindi');
  }

  el.importFile.addEventListener('change', async () => {
    const file = el.importFile.files[0];
    el.importFile.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const arr = Array.isArray(data) ? data : data.leads;
      if (!Array.isArray(arr)) throw new Error('format');
      const incoming = arr.map(normalize).filter(l => l.name);
      const ids = new Set(leads.map(l => l.id));
      const fresh = incoming.filter(l => !ids.has(l.id));
      const ok = await confirmOk('Zaxiradan tiklash', `${incoming.length} ta lead topildi, ulardan ${fresh.length} tasi yangi. Mavjud leadlarga qo‘shilsinmi?`, 'Qo‘shish');
      if (!ok) return;
      leads = leads.concat(fresh);
      save();
      render();
      toast(`${fresh.length} ta lead tiklandi`);
    } catch (e) {
      toast('Faylni o‘qib bo‘lmadi — REVO CRM zaxira fayli ekanini tekshiring');
    }
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
    const ok = await confirmDialog('Barcha leadlarni o‘chirasizmi?', `${leads.length} ta lead butunlay o‘chiriladi. Avval zaxira nusxa olishni tavsiya qilamiz.`);
    if (!ok) return;
    leads = [];
    save();
    resetFilters();
    toast('Barcha leadlar o‘chirildi');
  }

  // ---------- Namuna ma'lumot ----------
  function addDemo() {
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
    demo.forEach(d => leads.push(normalize({ ...d, id: uid() })));
    save();
    render();
    toast('Namuna leadlar qo‘shildi');
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
  }

  // Boshqa tabda o'zgarsa — sinxronlash
  window.addEventListener('storage', e => { if (e.key === STORAGE_KEY) { leads = load(); render(); } });

  init();
})();
