# AnyMind Full-Stack Developer Test 2025

A quick note on how we got here: I have completed many take-home
assignments with the same care and effort you'll see in this one,
yet every single submission has been rejected—always _without_ constructive feedback.

I am therefore asking one clear favor: **_PLEASE_** open a PR and leave an
honest, thoughtful review. Whether you judge my work to be
hire-worthy or not, _your_ candid insights will be invaluable.

I pour my heart into these challenges because I truly love coding, but
facing silence after investing so much is definitely discouraging. This may be my very last take-home attempt, as I always try to give these projects my utmost dedication — not just for opportunities, but for my genuine passion for the craft.

To make things easy, I have already [deployed the app](https://anymind-challenges.vercel.app) on Vercel, so you can evaluate it immediately without wasting setup time.

If no feedback is forthcoming, I will chalk this up as lost time and respectfully redirect my energy toward opportunities that offer mutual engagement and learning. Your perspective truly matters, and I appreciate you considering this request.

## App features

I used AI to help me with this test, so if that rubs you the wrong way, then please also explicitly say so in your PR.

Also checkout the comments in my code if you're _truly_ reviewing ;)

### Backend

- Satisfied all requirements, see the [index.ts](./backend/src/index.ts) for more detail.
- Used [Bun](https://bun.sh) as a package manager and runtime.
- Used Express as the backend framework and Zod for schema validation.
- Used PostgreSQL with [Neon](https://neon.com).
- Implemented Rate Limiting with a simple In-memory storage.
- Database seeding with `bun seed` command.

### Frontend

- Responsive layout using [ShadCN components](https://ui.shadcn.com/docs/components).
- Fixed first column on horizontal scrolling for `<Table/>` components on mobile screens.
- Used React with Vite as the starting template.
- Implemented [`recharts`](https://www.npmjs.com/package/recharts) for better visual in the [`<CryptoSection>`](./frontend/src/components/layout/CryptoSection.tsx) table.
- Maintainable files and folders structure.
