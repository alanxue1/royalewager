# royale-wager

## Setup

### Ruby
- Ruby: `3.3.x` (this repo was bootstrapped against Homebrew `ruby@3.3`)

### Config
- Copy `docs/env.example` → your env manager / `.env` (don’t commit secrets).
- Required for Clash Royale API:
  - `CLASH_ROYALE_API_TOKEN`
  - Clash Royale Developer Portal must allowlist the **outbound IP** of the machine running `bin/rails` (dev/prod differ).

### DB

```bash
bin/rails db:prepare
```

## Clash Royale API smoke test

```bash
bin/rails "cr:smoke[#P0LYQ2]"
```

