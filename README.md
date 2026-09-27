# REVO Lead CRM

REVO Agency uchun oddiy lead CRM (MVP). Instagram, Telegram, telefon va tavsiyalar orqali kelgan potensial mijozlarni bir joyda boshqarish uchun.

**Onlayn:** https://sharifjonpanjiyev123-coder.github.io/-revo-crm/

## Telefonga o‘rnatish

- **iPhone (Safari):** havolani oching → "Ulashish" tugmasi → "Uy ekraniga qo‘shish" (Add to Home Screen).
- **Android (Chrome):** havolani oching → ⋮ menyu → "Bosh ekranga qo‘shish" / "Ilovani o‘rnatish".

## Ishga tushirish (lokal)

Mahalliy server orqali (Supabase login `file://` bilan emas, `http://` bilan ishlaydi):

```bash
python3 -m http.server 8080
# http://localhost:8080
```

Sayt GitHub Pages orqali `main` branch'idan (root papka) avtomatik joylanadi: `main`'ga har bir push bir-ikki daqiqada saytda paydo bo‘ladi.

## Imkoniyatlar

- **Umumiy bulut baza (Supabase):** barcha jamoa a'zolari bir xil leadlarni ko‘radi, o‘zgarishlar barcha qurilmalarda darhol (realtime) chiqadi
- **Login:** email + parol; faqat jamoa ro‘yxatidagi (`crm_members`) foydalanuvchilar leadlarni ko‘ra oladi
- **Dashboard:** jami leadlar, yangi leadlar, jarayondagilar, mijozga aylanganlar, konversiya foizi, potensial daromad
- **Lead:** qo‘shish, tahrirlash, o‘chirish (tasdiqlash bilan)
- **Qidiruv:** nom, telefon, Instagram, xizmat, izoh bo‘yicha
- **Filter:** status (chiplar), manba; saralash: sana, keyingi aloqa, summa, nom
- **Tezkor status o‘zgartirish** — ro‘yxatning o‘zidan
- **Eslatma:** bugun yoki kechikkan "keyingi aloqa" sanasi bor leadlar
- **Eksport:** CSV (Excel uchun), JSON zaxira nusxa va undan tiklash
- **Eski ma'lumotlarni ko‘chirish:** avvalgi (localStorage) versiyadagi leadlar birinchi kirishda bulutga ko‘chirishni taklif qiladi
- Mobil telefonga moslashgan (kartochkalar, pastdan ochiladigan forma, "+" tugmasi)

## Hisoblash qoidalari

- **Jarayonda** = Bog‘landik + Uchrashuv + Taklif yuborildi
- **Konversiya** = Mijoz bo‘ldi / Jami leadlar × 100
- **Potensial daromad** = faol leadlar (Mijoz bo‘ldi va Rad etildidan tashqari) summasi

## Supabase sozlash (bir martalik)

1. **Loyiha:** [supabase.com](https://supabase.com) → Sign up → **New project** (Free tarif). Region: *Central EU (Frankfurt)*. Database parolini saqlab qo‘ying.
2. **Jadval va xavfsizlik:** chap menyu → **SQL Editor** → **New query** → [`supabase/schema.sql`](supabase/schema.sql) faylini to‘liq joylang → **Run**.
3. **Ochiq ro‘yxatdan o‘tishni o‘chirish:** **Authentication** → **Sign In / Providers** → **Allow new users to sign up** → o‘chiring → **Save**.
4. **Foydalanuvchi yaratish:** **Authentication** → **Users** → **Add user** → **Create new user** → email + parol, **Auto Confirm User** belgilangan bo‘lsin.
5. **Jamoa ro‘yxatiga qo‘shish:** **SQL Editor**'da (har bir xodim uchun):
   ```sql
   insert into public.crm_members (email) values ('xodim@example.com') on conflict do nothing;
   ```
6. **Ulanish ma'lumotlari:** loyiha sahifasining tepasidagi **Connect** tugmasi (yoki **Project Settings → API Keys**) → **Project URL** va **Publishable key** (`sb_publishable_…`, eski nomi *anon public*) → [`config.js`](config.js)'ga yoziladi.

Xodimni o‘chirish: `delete from public.crm_members where email = '...';` va **Authentication → Users**'dan foydalanuvchini o‘chirish.

### Kalitlar xavfsizligi

- `config.js`dagi **Publishable (anon) key** ochiq bo‘lishi uchun mo‘ljallangan — u har qanday veb-ilovada brauzerga yuboriladi. Ma'lumotni login va bazadagi RLS qoidalari himoya qiladi.
- **Secret key / service_role** kalitini **hech qachon** repozitoriyga, `config.js`ga yoki chatga joylamang. Ilova bunday kalitni aniqlasa, ishlashdan bosh tortadi.

## Texnologiyalar

Sof HTML + CSS + JavaScript, build talab qilinmaydi. Supabase JS kutubxonasi `vendor/` papkasida (CDN'ga bog‘liq emas).

- `index.html` — sahifa tuzilmasi
- `styles.css` — REVO dizayni (qizil / oq / qora)
- `app.js` — CRM mantiqi, Supabase bilan ishlash, login, realtime
- `config.js` — Supabase URL va publishable key
- `supabase/schema.sql` — baza jadvallari va RLS qoidalari
