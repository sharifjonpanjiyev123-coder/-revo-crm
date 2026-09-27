# REVO Lead CRM

REVO Agency uchun oddiy lead CRM (MVP). Instagram, Telegram, telefon va tavsiyalar orqali kelgan potensial mijozlarni bir joyda boshqarish uchun.

## Ishga tushirish

O‘rnatish shart emas — `index.html` faylini brauzerda oching.

Yoki mahalliy server orqali:

```bash
python3 -m http.server 8080
# http://localhost:8080
```

GitHub Pages, Netlify yoki Vercel'ga statik sayt sifatida joylash mumkin (build talab qilinmaydi).

## Imkoniyatlar

- **Dashboard:** jami leadlar, yangi leadlar, jarayondagilar, mijozga aylanganlar, konversiya foizi, potensial daromad
- **Lead:** qo‘shish, tahrirlash, o‘chirish (tasdiqlash bilan)
- **Qidiruv:** nom, telefon, Instagram, xizmat, izoh bo‘yicha
- **Filter:** status (chiplar), manba; saralash: sana, keyingi aloqa, summa, nom
- **Tezkor status o‘zgartirish** — ro‘yxatning o‘zidan
- **Eslatma:** bugun yoki kechikkan "keyingi aloqa" sanasi bor leadlar
- **Eksport:** CSV (Excel uchun), JSON zaxira nusxa va undan tiklash
- Mobil telefonga moslashgan (kartochkalar, pastdan ochiladigan forma, "+" tugmasi)

## Hisoblash qoidalari

- **Jarayonda** = Bog‘landik + Uchrashuv + Taklif yuborildi
- **Konversiya** = Mijoz bo‘ldi / Jami leadlar × 100
- **Potensial daromad** = faol leadlar (Mijoz bo‘ldi va Rad etildidan tashqari) summasi

## Ma'lumotlar

Barcha ma'lumotlar brauzerning `localStorage`'ida saqlanadi — server yo‘q, login yo‘q. Shuning uchun:
- ma'lumotlar faqat shu qurilma va shu brauzerda ko‘rinadi;
- brauzer tarixini tozalash ularni o‘chirib yuborishi mumkin — ⋮ menyudan muntazam **zaxira nusxa (JSON)** oling.

## Texnologiyalar

Sof HTML + CSS + JavaScript, tashqi kutubxonalarsiz.

- `index.html` — sahifa tuzilmasi
- `styles.css` — REVO dizayni (qizil / oq / qora)
- `app.js` — CRM mantiqi
