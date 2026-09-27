# REVO Academy — rasmiy website

REVO Academy uchun zamonaviy, premium va responsive rasmiy sayt.
Bu papka hozircha **reja** bosqichida: kod hali yozilmagan.

---

## 1. Maqsad

- Academy haqida ishonchli, professional taassurot qoldirish
- Kurslarni tushunarli ko‘rsatish
- Tashrif buyuruvchini **kursga ariza qoldirishga** olib kelish (asosiy maqsad)
- Telefon va kompyuterda birdek mukammal ishlash
- Google’da yaxshi topilish (SEO) va tez ochilish

## 2. Taklif etilayotgan texnologiyalar

| Vazifa | Texnologiya | Nega aynan shu (sodda tilda) |
|---|---|---|
| Sayt “karkasi” | **Astro** | Tayyor HTML sahifalar chiqaradi → sayt juda tez ochiladi va Google uni yaxshi ko‘radi. Ta’lim/landing saytlar uchun eng mos vosita. |
| Dizayn (stil) | **Tailwind CSS** | Ranglar, shriftlar, oraliqlar bir joyda belgilanadi. Telefon/kompyuter uchun moslashuv (responsive) juda oson. |
| Kontent | **Markdown / JSON fayllar** | Kurslar, mentorlar, FAQ oddiy matn fayllarda turadi. Yangi kurs qo‘shish uchun dasturlash bilish shart emas — faylni tahrirlaysiz. |
| Animatsiyalar | CSS + yengil JS | Premium his beradigan silliq effektlar, saytni sekinlashtirmasdan. |
| Shrift | **Inter** / **Manrope** | Zamonaviy, o‘qilishi oson, o‘zbek lotin harflarini (o‘, g‘) to‘liq qo‘llaydi. |
| Ariza formasi | **Telegram bot** (server funksiyasi orqali) | Ariza qoldirilganda sizga darhol Telegram’da xabar keladi. Keyinchalik REVO CRM’ga ham ulash mumkin. |
| Joylash (hosting) | **Vercel** yoki **Netlify** | Bepul, tez, HTTPS avtomatik. GitHub’ga o‘zgarish yuborilsa, sayt o‘zi yangilanadi. |
| Domen | masalan `revoacademy.uz` | .uz domen yillik to‘lov asosida sotib olinadi va hostingga ulanadi. |
| Statistika | Google Analytics / Yandex Metrika | Saytga kim, qayerdan kelayotganini ko‘rish (Instagram, Telegram, Google). |

### Nega oddiy HTML emas?
Oddiy HTML (REVO CRM’dagi kabi) kichik loyiha uchun yaxshi. Lekin rasmiy saytda sahifa va bo‘limlar ko‘p bo‘ladi:
Astro bilan **header, footer, tugmalar, kurs kartochkalari bir marta yoziladi** va hamma joyda qayta ishlatiladi.
Natijada o‘zgartirish kiritish oson va xato kam.

### Nega Next.js yoki WordPress emas?
- **Next.js** — kuchli, lekin murakkabroq; bizning sayt uchun ortiqcha.
- **WordPress** — oylik server to‘lovi, plaginlar xavfsizligi va sekinlik muammolari bor.
- **Tilda/Wix** — tez, lekin dizayn va imkoniyatlar cheklangan, oylik to‘lov bor, sayt sizniki emas.

## 3. Brend va dizayn yo‘nalishi

- **Asosiy ranglar:** qizil `#E10600` (REVO CRM bilan bir xil brend rangi), oq `#FFFFFF`, qora `#0B0B0C`
- Qizil — faqat muhim joylarda (tugmalar, urg‘ular), aks holda ko‘zni charchatadi
- Qora — hero bo‘lim, footer va kontrast bloklar uchun (premium ko‘rinish)
- Ko‘p “bo‘sh joy”, katta sarlavhalar, toza tipografiya
- **Mobile-first:** avval telefon uchun loyihalanadi, keyin kompyuterga kengaytiriladi

## 4. Sayt tuzilmasi (reja)

Bosh sahifa (bitta uzun sahifa, menyudan bo‘limlarga o‘tish):

1. **Hero** — shior, qisqa tavsif, “Kursga yozilish” tugmasi
2. **Kurslar** — kartochkalar (nomi, davomiyligi, formati, narxi)
3. **Academy haqida** — nega REVO, raqamlarda Academy
4. **O‘quv dasturi** — modullar bo‘yicha reja
5. **Mentorlar** — rasm, tajriba, yo‘nalish
6. **O‘quvchilar natijalari** — portfolio, fikrlar, ishga joylashganlar
7. **FAQ** — ko‘p beriladigan savollar (ochiladigan ro‘yxat)
8. **Ariza qoldirish** — ism, telefon, kurs tanlash → Telegram’ga yuboriladi
9. **Footer** — manzil, xarita, ijtimoiy tarmoqlar

Keyinchalik har bir kurs uchun alohida sahifa (`/kurslar/smm` kabi) qo‘shish mumkin.

## 5. Bosqichlar

1. ✅ Papka yaratish va texnologiyalarni tanlash (hozirgi bosqich)
2. ⬜ Loyihani o‘rnatish (Astro + Tailwind), brend ranglari va shriftlarni sozlash
3. ⬜ Umumiy qismlar: header, footer, tugmalar, mobil menyu
4. ⬜ Bo‘limlarni birma-bir yaratish (Hero → Kurslar → ... → Ariza)
5. ⬜ Ariza formasini Telegram botga ulash
6. ⬜ SEO, tezlik, telefonlarda test
7. ⬜ Internetga joylash (Vercel/Netlify) va domen ulash

## 6. Sizdan keyinroq kerak bo‘ladigan ma’lumotlar

- REVO logotipi (iloji bo‘lsa SVG yoki sifatli PNG)
- Kurslar ro‘yxati: nomi, davomiyligi, narxi, formati (oflayn/onlayn)
- Mentorlar: rasm, ism, tajriba
- O‘quvchilar natijalari va fikrlari
- Aloqa: telefon, manzil, Instagram, Telegram
- Sayt tili: faqat o‘zbekcha yoki o‘zbekcha + ruscha?
