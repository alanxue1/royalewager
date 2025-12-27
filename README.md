# Royale Wager

A Rails application for wagering on head-to-head Clash Royale matches, featuring Solana blockchain integration for escrow and payments.

## Features

- **Clash Royale Integration**: Fetch player data and card information from the Clash Royale API
- **Solana Blockchain**: Escrow system for secure wager handling using Solana smart contracts
- **Privy Authentication**: Web3 wallet authentication and management
- **Clash Royale Themed UI**: Custom Clash font family and Supercell brand styling

## Demo

<video src="app/assets/videos/royalewager_demo.mp4" controls width="100%"></video>

## Tech Stack

- **Backend**: Ruby on Rails 7.2
- **Frontend**: Tailwind CSS v4, React (for Privy widgets), Stimulus, Turbo
- **Database**: SQLite3
- **Blockchain**: Solana (devnet/mainnet)
- **Authentication**: Privy
- **Build Tools**: esbuild, Tailwind CSS CLI

## Setup

### Prerequisites

- Ruby `3.3.x` (this repo was bootstrapped against Homebrew `ruby@3.3`)
- Node.js and Yarn
- SQLite3

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd royale-wager
   ```

2. **Install dependencies**
   ```bash
   bundle install
   yarn install
   ```

3. **Configure environment variables**
   
   Copy `docs/env.example` → your env manager / `.env`
   
   Required environment variables:
   - `CLASH_ROYALE_API_TOKEN` - Token from Clash Royale Developer Portal
   - `PRIVY_APP_ID` - Privy application ID
   - `SOLANA_CLUSTER` - Solana cluster (default: `devnet`)
   - `SOLANA_RPC_URL` - Solana RPC endpoint (default: `https://api.devnet.solana.com`)
   - `ESCROW_PROGRAM_ID` - Solana escrow program ID
   
   **Note**: Clash Royale Developer Portal must allowlist the **outbound IP** of the machine running `bin/rails` (dev/prod differ).

4. **Setup database**
   ```bash
   bin/rails db:prepare
   ```

5. **Build assets**
   ```bash
   yarn build
   yarn build:css
   ```

6. **Start the server**
   ```bash
   bin/rails server
   ```

## Development

### Asset Building

- **JavaScript**: `yarn build` (or `yarn build --watch` for watch mode)
- **CSS**: `yarn build:css` (rebuilds Tailwind CSS)

### Clash Royale API Smoke Test

Test the Clash Royale API integration:

```bash
bin/rails "cr:smoke[#P0LYQ2]"
```

Replace `#P0LYQ2` with a valid Clash Royale player tag.

### Populate Card Catalog

Manually fetch and cache Clash Royale card data:

```bash
bin/rails cr:populate_cards
```

## Design & Styling

The application uses a Clash Royale-themed design:

- **Fonts**: Custom Clash font family (Clash Regular and Clash Bold) located in `app/assets/fonts/`
- **Colors**: Supercell brand colors and Clash Royale-inspired palette
  - Victory: `rgb(34, 133, 208)` (blue)
  - Defeat: `rgb(220, 40, 40)` (red)
  - Gold: `#FFD700`
- **Background**: Custom Clash Royale background image (`background_clash.png`)
- **Styling**: Tailwind CSS v4 with custom utilities and components

## Project Structure

- `app/assets/fonts/` - Custom Clash font files
- `app/assets/images/` - Background images and assets
- `app/assets/stylesheets/` - Tailwind CSS source files
- `app/javascript/react/` - React components (Privy widgets, Toast)
- `app/services/clash_royale/` - Clash Royale API service classes
- `app/services/solana/` - Solana blockchain integration
- `lib/tasks/cr.rake` - Clash Royale-related Rake tasks

## License

Copyright (c) 2016 by Supercell. All rights reserved. Clash is a trademark of Supercell.
