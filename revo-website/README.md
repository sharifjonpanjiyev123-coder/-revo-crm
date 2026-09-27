# REVO Agency — rasmiy website

REVO Agency'ning rasmiy sayti. Hozircha bu papkada faqat **reja** bor — kod keyingi bosqichda yoziladi.

> Eslatma: bu papka mavjud CRM ilovasidan (repozitoriy ildizidagi `index.html`, `app.js`, `styles.css`) alohida. CRM — ichki ish uchun, bu esa mijozlar ko‘radigan ochiq sayt.

## Tanlangan texnologiyalar

| Nima | Tanlov | Sodda qilib |
|---|---|---|
| Sayt quruvchi | **Astro** | Sahifalarni bo‘laklardan (sarlavha, xizmatlar bloki, footer) yig‘adi va tayyor, juda tez yuklanadigan HTML sahifalarga aylantiradi. |
| Dizayn | **Tailwind CSS** | Tayyor "dizayn g‘ishtchalari". Telefon/planshet/kompyuterga moslashish (responsive) juda oson. |
| Kichik animatsiyalar | Sof CSS / kerak bo‘lsa ozgina JavaScript | Sayt og‘irlashmasligi uchun. |
| Aloqa formasi | **Telegram bot** yoki Formspree | Saytdagi ariza to‘g‘ridan-to‘g‘ri Telegram'ingizga keladi. |
| Joylash (hosting) | **Vercel** yoki **Netlify** (bepul) | GitHub'ga yangilik yuborilsa, sayt o‘zi yangilanadi. HTTPS bepul. |
| Domen | `revo.uz` / `revoagency.uz` kabi | Keyinroq sotib olinib, hostingga ulanadi. |

### Nega aynan shular?
- **Tezlik:** Astro keraksiz JavaScript yubormaydi → sayt telefonda ham bir zumda ochiladi.
- **Google'da topilish (SEO):** har bir sahifa tayyor HTML bo‘lib chiqadi, qidiruv tizimlari yaxshi o‘qiydi.
- **Oson tahrirlash:** matnlar alohida fayllarda saqlanadi — kod bilmasdan ham matn/rasmni almashtirish mumkin.
- **Bepul va ishonchli:** hosting va HTTPS pul talab qilmaydi.
- **O‘sish imkoni:** keyinchalik blog, portfolio, bir necha til (UZ / RU / EN) qo‘shish oson.

## Sayt tuzilmasi (taklif)

1. **Bosh sahifa** — shior, qisqa tanishtiruv, xizmatlar, natijalar, mijozlar fikri, "Ariza qoldirish" tugmasi
2. **Xizmatlar** — SMM, target reklama, brending, sayt yaratish va h.k.
3. **Portfolio / Keyslar** — bajarilgan ishlar
4. **Biz haqimizda** — jamoa, qadriyatlar
5. **Aloqa** — forma, telefon, Telegram, Instagram, xarita

## Ish bosqichlari

1. ✅ Papka yaratish va texnologiyalarni tanlash
2. ⬜ Kontent yig‘ish: logo, ranglar, matnlar, xizmatlar ro‘yxati, portfolio rasmlari
3. ⬜ Loyihani o‘rnatish (Astro + Tailwind) va sahifa skeletini qurish
4. ⬜ Dizayn: bosh sahifa → qolgan sahifalar
5. ⬜ Telefon va kompyuterda sinash
6. ⬜ Internetga joylash (Vercel/Netlify) va domen ulash
