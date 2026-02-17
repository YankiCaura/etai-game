# Multiplayer Architecture

## Overview

2-player co-op over WebSocket. Host runs authoritative game simulation, client renders and receives state corrections every 166ms. Game served from GitHub Pages, relay server on GCP VM.

## Infrastructure

```
                    ┌──────────────────────────────┐
                    │        GITHUB PAGES           │
                    │   (static game files)         │
                    │   etai-game.github.io         │
                    └──────────┬───────────────────┘
                               │  HTTPS (HTML/JS/CSS)
                ┌──────────────┴──────────────┐
                ▼                              ▼
┌───────────────────────┐      ┌───────────────────────┐
│     PLAYER 1 (HOST)   │      │    PLAYER 2 (CLIENT)  │
│     Browser           │      │    Browser             │
└───────────┬───────────┘      └───────────┬───────────┘
            │  wss://                       │  wss://
            │                               │
            ▼                               ▼
        ┌───────────────────────────────────────┐
        │         GCP VM (me-west1)             │
        │         e2-micro · Ubuntu 22.04       │
        │                                       │
        │    ┌───────────────────────────────┐  │
        │    │   Node.js + ws (port 8080)    │  │
        │    │   server.js — relay only      │  │
        │    │   pm2 — process manager       │  │
        │    └───────────────────────────────┘  │
        │                                       │
        │    • Room system (4-char codes)       │
        │    • Pure message forwarding          │
        │    • Zero game logic                  │
        │    • ~10MB RAM, near-zero CPU         │
        └───────────────────────────────────────┘
```

## Game Architecture

```
┌─────────────────────────────────────┐         ┌─────────────────────────────────────┐
│         PLAYER 1 (HOST)             │         │         PLAYER 2 (CLIENT)           │
│                                     │         │                                     │
│  ┌───────────┐  ┌────────────────┐  │         │  ┌────────────────┐  ┌───────────┐  │
│  │  Game      │  │  WaveManager   │  │         │  │  WaveManager   │  │  Game      │  │
│  │  Engine    │  │  (spawns       │  │         │  │  (no spawning, │  │  Engine    │  │
│  │  (autho-   │  │   enemies)     │  │         │  │   timers only) │  │  (render   │  │
│  │  ritative) │  │                │  │         │  │                │  │   only)    │  │
│  └─────┬──────┘  └────────────────┘  │         │  └────────────────┘  └─────┬──────┘  │
│        │                             │         │                            │         │
│  ┌─────┴──────┐  ┌────────────────┐  │         │  ┌────────────────┐  ┌─────┴──────┐  │
│  │  Economy   │  │  EnemyManager  │  │         │  │  EnemyManager  │  │  Economy   │  │
│  │  gold      │  │  (spawns +     │  │         │  │  (from state   │  │  gold      │  │
│  │  partner-  │  │   kills give   │  │         │  │   sync only,   │  │  (from     │  │
│  │  Gold      │  │   gold)        │  │         │  │   no rewards)  │  │   sync)    │  │
│  └────────────┘  └────────────────┘  │         │  └────────────────┘  └────────────┘  │
│        │                             │         │                            │         │
│  ┌─────┴──────────────────────────┐  │         │  ┌─────────────────────────┴──────┐  │
│  │           Net (ws)             │  │         │  │           Net (ws)             │  │
│  └─────────────┬──────────────────┘  │         │  └──────────────┬─────────────────┘  │
└────────────────┼─────────────────────┘         └─────────────────┼─────────────────────┘
                 │              wss://             wss://           │
                 └──────────────────┬──────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │     GCP VM RELAY SERVER        │
                    │     (forward messages only)    │
                    └───────────────────────────────┘
```

## Data Flow

```
  HOST → SERVER → CLIENT                 CLIENT → SERVER → HOST
  ─────────────────────                  ─────────────────────
  State Sync (every 166ms)               Tower Place Request
  ├─ Enemy[] (id,x,y,hp,type,alive)      Tower Sell
  ├─ Gold [host, client]                 Tower Upgrade
  ├─ Lives, Score, Wave                  Wave Start Request
  └─ Spawning flag

  Tower Placed (confirmed)
  Tower Sold / Upgraded
  Wave Definition (groups, modifier)
  Map Select + Game Start
  Speed Change
  Game Over
```

## Tower Placement Flow

```
  ┌────────┐  place request   ┌────────┐  validate + create   ┌────────┐
  │ CLIENT ├─────────────────►│ SERVER ├─────────────────────►│  HOST  │
  │        │                  │(relay) │                      │        │
  │        │  confirmed place │        │  broadcast TP        │        │
  │        │◄─────────────────┤        │◄─────────────────────┤        │
  └────────┘  create tower    └────────┘  (with assigned ID)  └────────┘
              + deduct gold
```

## Economy Split

| Income Source | Host | Client |
|---------------|------|--------|
| Starting gold | 50% | 50% |
| Kill rewards | 50% | 50% |
| Wave bonus | 50% | 50% |
| Interest | on own | on own |
| Tower costs | from own | from own |
| Sell refunds | to owner | to owner |

## Latency & Region Selection

| GCP Region | Location | Latency (IL) | 3x Speed | Cost |
|------------|----------|--------------|----------|------|
| `me-west1` | Tel Aviv | <5ms | Perfect | ~$5/mo |
| `europe-west1` | Belgium | ~60ms | Good | ~$5/mo |
| `us-central1` | Iowa, USA | ~200ms | Choppy | Free tier |

For players in Israel, use `me-west1` for best experience at any game speed.

## GCP VM Setup

### 1. Create VM
- GCP Console → Compute Engine → Create Instance
- Name: `td-relay`
- Region: `me-west1` (Tel Aviv)
- Machine type: `e2-micro`
- OS: Ubuntu 22.04
- Check "Allow HTTP traffic" + "Allow HTTPS traffic"

### 2. Open port 8080
- VPC Network → Firewall → Create Rule
- Name: `allow-ws-8080`
- Direction: Ingress
- Source: `0.0.0.0/0`
- TCP port: `8080`

### 3. SSH in and deploy
```bash
sudo apt update && sudo apt install -y nodejs npm
mkdir ~/relay && cd ~/relay
nano server.js     # paste server.js contents
nano package.json  # paste package.json contents
npm install
sudo npm install -g pm2
pm2 start server.js
pm2 startup        # follow printed command
pm2 save           # survives reboots
```

### 4. Note the External IP
- GCP Console → VM Instances → copy External IP (e.g. `34.56.78.90`)
- Update `RELAY_SERVER_URL` in `js/ui.js` with: `ws://34.56.78.90:8080`
- Push to GitHub — done, players can play

## Player Experience (Zero Config)

1. Both players open the GitHub Pages URL
2. Player 1 clicks **Create Room** → gets 4-char code (e.g. `ABCD`)
3. Player 2 enters code, clicks **Join**
4. Player 1 picks a map → game starts on both screens
5. Both place towers with their own gold (50/50 split)
6. Can only sell/upgrade own towers (P1/P2 badges shown)
7. Hero is disabled in multiplayer

## Key Design Decisions

- **Host-authoritative**: Host runs the real simulation, client gets corrections
- **No seeded RNG**: Host sends wave definitions to client instead
- **Request-based client towers**: Client sends request → host validates → assigns ID → broadcasts
- **State sync every 166ms**: Full enemy reconciliation (create/update/remove)
- **Client skips spawning**: Enemies only appear on client via state sync
- **Client skips rewards/lives**: Host handles all economy, client gets corrected values
- **Relay server is stateless**: Pure message forwarding, no game logic, trivial to deploy

## Files

| File | Where | Role |
|------|-------|------|
| `server.js` | GCP VM | WebSocket relay server |
| `package.json` | GCP VM | Server dependency (ws) |
| `js/net.js` | GitHub Pages | Client networking module |
| `js/game.js` | GitHub Pages | Multiplayer state, sync handlers |
| `js/economy.js` | GitHub Pages | partnerGold tracking |
| `js/enemy.js` | GitHub Pages | spawnFromSync, host-only rewards |
| `js/tower.js` | GitHub Pages | ownerId, assignedId, getTowerById |
| `js/wave.js` | GitHub Pages | Client spawn skip, wave def sync |
| `js/input.js` | GitHub Pages | Ownership checks, network broadcasts |
| `js/ui.js` | GitHub Pages | Lobby, partner gold, owner badges |
| `js/hero.js` | GitHub Pages | Disabled in multiplayer |
| `index.html` | GitHub Pages | Lobby UI elements |
| `css/style.css` | GitHub Pages | Lobby + owner badge styling |
