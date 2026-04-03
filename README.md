# kgsticket

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/dev-9192s-projects/v0-kgsticket)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/uYyYapFcxtN)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Database provisioning dengan Drizzle (CLI only)

Project ini menggunakan **Drizzle hanya sebagai alat CLI** untuk provisioning database baru (fork ke server/lembaga lain).
Akses data di kode aplikasi tetap menggunakan mekanisme existing (`lib/neon.ts`).

### Environment variable

Buat file `.env.local` (atau gunakan variannya di server) dengan minimal:

```bash
DATABASE_URL=postgres://user:password@host:port/dbname
SEED_PROFILE=default # atau kreativa / profil lain
```

Contoh template ada di `.env.local.example`.

### Perintah migrasi & seed

- Jalankan migrasi ke database target:

```bash
npm run migrate
```

Ini akan menjalankan file-file SQL di folder `drizzle/` (misalnya `0000_snapshot_initial.sql`)
untuk membuat struktur tabel inti (`events`, `ticket_types`, `tickets`, `orders`, dll.).

- Jalankan seeding data awal:

```bash
npm run seed
```

Perintah ini akan menjalankan `src/db/seed/index.ts` yang mengisi data contoh generik
berdasarkan `SEED_PROFILE`. Script ini hanya dipakai via CLI, tidak dipakai di runtime app.

### Flow saat fork ke lembaga/server baru

1. Clone repo ini ke server/lingkungan baru.
2. Buat database Postgres kosong.
3. Set `DATABASE_URL` (dan `SEED_PROFILE` bila perlu) di `.env.local` atau env server.
4. Jalankan:
   - `npm install`
   - `npm run migrate`
   - `npm run seed`
5. Jalankan app seperti biasa (`npm run dev` atau `npm run start`).

Dengan flow ini, struktur dan data awal database di server baru akan mengikuti
schema existing tanpa mengubah cara aplikasi berinteraksi dengan database.
