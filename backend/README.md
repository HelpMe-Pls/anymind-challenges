# Why SQLite over PostgreSQL for this specific test

- SQLite is file-based and single-process—great for quick tests, but lacks concurrency/scalability (we'd switch to PostgreSQL for real apps).
- See the table below for a detailed evaluation.

| Criterion                        | SQLite                                                                                   | PostgreSQL                                                              | Verdict for this test                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Setup time**                   | Zero—just `npm i sqlite3` and you’re done.                                               | Requires a running server, user/role creation, and a connection string. | **SQLite wins**—keeps you inside the 1–2-hour window.                                          |
| **Schema & SQL features**        | 95 % of standard SQL, but no `JSONB`, no real arrays, limited `ALTER TABLE`.             | Full SQL:2016, `JSONB`, arrays, CTEs, window functions, etc.            | **PostgreSQL wins** if you need advanced features, but the test only needs three small tables. |
| **Concurrency**                  | One writer at a time; good enough for a single developer hitting the API.                | MVCC, thousands of concurrent readers/writers.                          | **SQLite is fine** for a demo; PostgreSQL is required for production load.                     |
| **Tooling & migrations**         | Lightweight ORMs (Prisma, Sequelize, TypeORM) all support SQLite.                        | Same ORMs + mature migration tools (Flyway, Liquibase).                 | Tie for this scope.                                                                            |
| **Deployment story**             | File-based DB—just copy the `.db` file.                                                  | Needs a container or managed service (RDS, Supabase, Neon, etc.).       | **SQLite wins** for a quick GitHub repo submission.                                            |
| **Data size & growth**           | Good up to a few GB; after that, WAL mode tuning is needed.                              | Terabyte-scale out of the box.                                          | Test data is tiny; **SQLite is enough**.                                                       |
| **Rate-limiting store (Part 3)** | You’d still use Redis or in-memory for rate-limit counters; the DB choice is orthogonal. | Same.                                                                   | Tie.                                                                                           |

# Why I'm using Bun

- Bun as the runtime is favorable for its speed, built-in TypeScript support, built-in fetch for HTTP requests (no need for `Axios`), and built-in SQLite via `bun:sqlite` (no extra deps for DB) to keep it lightweight this scope with the tradeoff being less scalable for complex schemas.
- In production, the traditional Node.js might be more stable/ecosystem-rich.
