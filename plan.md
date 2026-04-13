# OPIS — On-Chain Predator Intelligence System
## AVE Claw Hackathon · Complete Application Track · Master Plan

> **Track:** Complete Application (Monitoring Skill + Trading Skill)
> **Target Score:** 91/100 — Innovation 93 · Technical 90 · Real-World 90
> **Chains:** Solana, BSC, ETH, Base
> **Hackathon:** HK Web3 Festival 2026 — AVE Claw Hackathon

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Problem We Are Solving](#2-the-problem-we-are-solving)
3. [System Overview & Architecture](#3-system-overview--architecture)
4. [Monitoring Engine — 4 Quant Signal Modules](#4-monitoring-engine--4-quant-signal-modules)
5. [Trading Engine — 3 Autonomous Strategy Modes](#5-trading-engine--3-autonomous-strategy-modes)
6. [Complete API Reference & Integration Map](#6-complete-api-reference--integration-map)
7. [Data Pipeline Architecture](#7-data-pipeline-architecture)
8. [Signal Detection Logic — Full Quant Formulas](#8-signal-detection-logic--full-quant-formulas)
9. [Database Schema](#9-database-schema)
10. [Tech Stack](#10-tech-stack)
11. [48-Hour Build Plan](#11-48-hour-build-plan)
12. [Demo Strategy for Judges](#12-demo-strategy-for-judges)
13. [Monetization Model](#13-monetization-model)
14. [Risk & Edge Cases](#14-risk--edge-cases)
15. [Post-Hackathon Roadmap](#15-post-hackathon-roadmap)

---

## 1. Executive Summary

OPIS is a real-time quant intelligence engine that does one thing no existing tool does:

**It detects coordinated on-chain manipulation patterns — cabal wallet clusters, DEV slow-drains, smart money conviction stacking, cross-chain narrative rotations — and autonomously executes counter-strategies or early-entry trades before the public market reacts.**

The three core insights that make this possible:

1. **Manipulation is public.** Every coordinated wallet cluster, every developer sell, every smart money DCA is on-chain and readable. The data exists — nobody has unified it into a single scoring system.
2. **Ave.ai already labels everything.** The platform already identifies Cabal wallets, Smart Money, DEV actions, Insiders, Bundles — OPIS reads these labels and turns them into quantitative signals.
3. **The gap between signal and action is the alpha.** Smart money enters 30–90 minutes before retail. DEV drains start hours before price collapse. By automating the signal-to-trade loop, OPIS captures that gap systematically.

**Who pays for this:**
- Retail meme traders who keep getting rugged
- Quant/bot traders who want systematic signal feeds
- Token project teams who want to monitor manipulation against their own token
- Telegram bot developers who want to buy a signal API

---

## 2. The Problem We Are Solving

### 2.1 Coordinated Cabal Manipulation

Cabal wallets share creation timestamps and funding sources. They accumulate silently over hours, then pump together. Retail buys the spike. Cabal exits. Net result: retail holds bags.

**What makes detection hard:** No single wallet buys a suspicious amount. The signal is the *pattern across wallets*, not any individual wallet's behavior.

**How OPIS solves it:** Cross-reference top100 holders at token launch using Ave's Cabal labels. Build a co-occurrence graph. Score coordination probability using shared funding hops, timing, and hold ratios.

### 2.2 DEV Slow-Drain Rugs

Sophisticated rug pulls don't remove all liquidity at once — that triggers existing detection tools. Instead, they drain 2–4% at a time over many hours. By the time any single removal looks suspicious, 60% of liquidity is already gone.

**What makes detection hard:** Each individual event is below alert thresholds. The danger is the cumulative *velocity*, not any single transaction.

**How OPIS solves it:** Compute rolling drain velocity over 1h and 4h windows. Combine with DEV wallet sell events from the transaction stream. Fire alerts when the composite pattern crosses a dynamic threshold.

### 2.3 Smart Money Signal Dilution

Ave's smart wallet leaderboard is public. The problem: raw copy trading is naive. One smart wallet buying a token might be a hedge, a mistake, or a tiny position. But five smart wallets with high conviction scores — multiple DCA entries, holding through drawdowns, sizing up — buying the same token in the same 4-hour window is statistically significant.

**How OPIS solves it:** Build a conviction index per wallet per token. Stack those scores. Only surface tokens where multiple high-conviction wallets are aligned.

### 2.4 Cross-Chain Narrative Rotation Lag

When a narrative (AI, DeSci, meme subculture) starts gaining volume momentum on BSC, the same narrative tokens on Solana and ETH almost always follow within 2–6 hours. This is a systematic, repeatable pattern. Nobody has automated the detection.

**How OPIS solves it:** Monitor trending endpoints across all three chains simultaneously. Compute per-narrative volume acceleration. Surface destination-chain tokens ranked by TVL and conviction score when a rotation is detected.

---

## 3. System Overview & Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        OPIS SYSTEM                              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 AVE DATA LAYER                           │  │
│  │  REST APIs (prod.ave-api.com)  │  WSS (wss.ave-api.xyz) │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              INGESTION & NORMALIZATION LAYER             │  │
│  │  API Poller (30s)  │  WSS Consumer  │  Event Queue       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              MONITORING ENGINE (4 MODULES)               │  │
│  │                                                          │  │
│  │  [M1] Cabal      [M2] DEV Drain  [M3] Conviction        │  │
│  │  Fingerprinter   Velocity        Stack Scorer            │  │
│  │                                                          │  │
│  │  [M4] Cross-Chain Narrative Radar                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         TOS ENGINE (Threat + Opportunity Score)          │  │
│  │  TOS = (Cabal×0.30) + (Drain×0.25) + (Conv×0.30)        │  │
│  │        + (Narrative×0.15)                                │  │
│  │  Range: 0-100 | <30 safe | 30-60 watch | >60 act        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│              ┌─────────────┴──────────────┐                    │
│              ▼                            ▼                    │
│  ┌──────────────────────┐  ┌─────────────────────────────┐    │
│  │   ALERT DISPATCHER   │  │     TRADING ENGINE          │    │
│  │  Telegram · Discord  │  │  Strategy A: Threat Exit    │    │
│  │  Webhook · Dashboard │  │  Strategy B: Conviction Buy │    │
│  └──────────────────────┘  │  Strategy C: Narrative Ride │    │
│                             └─────────────────────────────┘    │
│                                          │                      │
│                                          ▼                      │
│                             ┌─────────────────────────────┐    │
│                             │   AVE BOT/TRADING API       │    │
│                             │  (docs-bot-api.ave.ai)      │    │
│                             │  Quote → Order → Monitor    │    │
│                             └─────────────────────────────┘    │
│                                          │                      │
│                                          ▼                      │
│                             ┌─────────────────────────────┐    │
│                             │   FEEDBACK LOOP             │    │
│                             │   Trade PnL → Strategy      │    │
│                             │   Calibration Database      │    │
│                             └─────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.1 High-Level Component Summary

| Component | Purpose | Key Technology |
|---|---|---|
| Ingestion Layer | Poll REST APIs + consume WSS streams | Node.js, ws library, axios |
| Event Queue | Buffer high-frequency WSS events | Redis Streams or BullMQ |
| Monitoring Engine | Run 4 signal modules on incoming data | Python (numpy, pandas) or Node.js |
| TOS Engine | Compose module scores into single score | Weighted formula engine |
| Alert Dispatcher | Send signals to users | Telegram Bot API, Discord webhooks |
| Trading Engine | Execute trades via Ave Bot API | Node.js, Ave REST client |
| Feedback DB | Log trades, build strategy dataset | PostgreSQL or SQLite |
| Dashboard | Real-time UI for monitoring | Next.js + React, WebSocket to frontend |

---

## 4. Monitoring Engine — 4 Quant Signal Modules

---

### Module 1: Cabal Fingerprinter

**Purpose:** Detect coordinated wallet clusters that are accumulating a token before a pump.

**When it runs:** Triggered on every new token detected (via trending or platform endpoints). Runs once on launch, then re-runs at 1h and 4h after launch.

#### Step-by-Step Detection Logic

**Step 1 — Fetch top 100 holders**
```
GET /v2/tokens/top100/{token-id}
```
- Collect: `holder`, `balance_ratio`, `amount_cur`, `main_coin_balance`
- Filter out: pool addresses, burn addresses (known blackholes)
- Tag holders already labeled as `Cabal` by Ave (from Ave's own wallet intelligence)

**Step 2 — For each holder, fetch their wallet transaction history**
```
GET /v2/address/tx?wallet_address={addr}&chain={chain}&token_address={token}
```
- Extract: first buy timestamp, buy count, cumulative buy amount
- Look for: wallets that bought within the same 10-minute window at launch

**Step 3 — Build co-occurrence graph**
- Nodes = wallet addresses
- Edges = shared funding source OR same-block first buy OR both holding ≥ 1% supply
- To check shared funding: look at `sender` field in early transactions — if multiple wallets received SOL/BNB from the same source address in the 48h before token launch, that is a strong cabal indicator

**Step 4 — Score the cluster**

```
Cabal_Score = (
  (cluster_size / top100_count) × 40           # how much of top100 is coordinated
  + (cluster_supply_pct / 100) × 30            # what % of supply they hold
  + (avg_time_delta_seconds < 600 ? 20 : 0)    # bought within 10 min of each other
  + (shared_funder_count > 0 ? 10 : 0)         # share a common funder
) / 100 × 100                                   # normalize to 0-100
```

**Alert thresholds:**
- `Cabal_Score > 65` + cluster holds `> 15%` supply → **HIGH RISK** alert
- `Cabal_Score > 45` + cluster holds `> 8%` supply → **WATCH** alert

**Ave data fields used:**

| Field | Source | Usage |
|---|---|---|
| `holder` | `/v2/tokens/top100` | Wallet address for graph node |
| `balance_ratio` | `/v2/tokens/top100` | Cluster supply % calculation |
| `sender` | `/v2/address/tx` | Shared funder detection |
| `time` | `/v2/address/tx` | Same-window buy detection |
| `from_amount` | `/v2/address/tx` | Position sizing for coordination score |
| `creator_address` | `/v2/contracts` | Exclude DEV from cabal calc |
| Ave Cabal label | `/v2/contracts` or token data | Pre-labeled cabal addresses as seed |

---

### Module 2: DEV Drain Velocity

**Purpose:** Detect the slow-drain rug pattern — liquidity being removed in small increments over hours.

**When it runs:** Continuously via WSS `liq` subscription on all monitored pairs. Also polls `/v2/txs/liq` every 15 minutes for historical validation.

#### Step-by-Step Detection Logic

**Step 1 — Subscribe to WSS liquidity stream**
```json
{
  "jsonrpc": "2.0",
  "method": "subscribe",
  "params": ["liq", "{pair_address}", "{chain}"],
  "id": 1
}
```
- On every event: record `time`, `type` (addLiquidity / removeLiquidity), `from_amount`, `to_amount`, `sender`

**Step 2 — Identify DEV wallet**
```
GET /v2/contracts/{token-id}
```
- Extract `creator_address` → this is the primary DEV wallet
- Also watch `bundle` addresses from the same call (first-block buyers who may be DEV Team)

**Step 3 — Compute drain velocity**

Maintain a rolling time-series of liquidity events. Every 5 minutes, compute:

```python
def drain_velocity(events, window_hours):
    """
    events: list of {time, type, usd_value, sender}
    window_hours: 1 or 4
    Returns: drain_score 0-100
    """
    cutoff = now() - window_hours * 3600
    window_events = [e for e in events if e['time'] > cutoff]
    
    total_added    = sum(e['usd_value'] for e in window_events if e['type'] == 'addLiquidity')
    total_removed  = sum(e['usd_value'] for e in window_events if e['type'] == 'removeLiquidity')
    dev_removed    = sum(e['usd_value'] for e in window_events 
                         if e['type'] == 'removeLiquidity' and e['sender'] == dev_wallet)
    
    if total_added + total_removed == 0:
        return 0
    
    net_drain_pct  = total_removed / (total_added + total_removed)  # 0-1
    dev_ratio      = dev_removed / (total_removed + 0.001)          # 0-1
    event_freq     = len([e for e in window_events 
                          if e['type'] == 'removeLiquidity'])       # count
    
    # Normalize frequency (>10 small removes in 4h is suspicious)
    freq_score = min(event_freq / 10, 1.0)
    
    drain_score = (
        net_drain_pct * 40    # raw drain percentage
        + dev_ratio * 35      # is the DEV specifically draining?
        + freq_score * 25     # high frequency of small removes
    ) * 100
    
    return min(drain_score, 100)
```

**Step 4 — Combine with WSS multi_tx DEV sell events**

Subscribe to `multi_tx` for the token address. If DEV wallet address appears as `wallet_address` in a sell transaction while drain velocity is elevated, add +15 to the drain score.

**Step 5 — Dynamic threshold calibration**

The threshold is not static — it varies by:
- Token age: new tokens (< 24h) have stricter thresholds (alert at 35)
- TVL: high TVL tokens (> $500k) have looser thresholds (alert at 55, more noise)
- Historical ave risk_score: if `analysis_risk_score > 60` from contracts API, tighten threshold

```python
def dynamic_threshold(token_age_hours, tvl_usd, ave_risk_score):
    base = 50
    if token_age_hours < 24:   base -= 15
    if tvl_usd > 500_000:      base += 10
    if ave_risk_score > 60:    base -= 10
    return max(base, 25)
```

**Ave data fields used:**

| Field | Source | Usage |
|---|---|---|
| `type` (addLiquidity/removeLiquidity) | WSS liq | Classify each event |
| `sender` | WSS liq | Match against DEV wallet |
| `from_amount`, `to_amount` | WSS liq | USD value of each event |
| `creator_address` | `/v2/contracts` | DEV wallet identification |
| `analysis_risk_score` | `/v2/contracts` | Dynamic threshold calibration |
| `lock_amount`, `token_lock_percent` | `/v2/contracts` | Adjust for locked LP |
| `wallet_address` | WSS multi_tx | DEV wallet sell confirmation |

---

### Module 3: Smart Money Conviction Stack Scorer

**Purpose:** Distinguish between a random smart wallet flipping a token and a genuine multi-wallet high-conviction accumulation signal.

**When it runs:** On-demand when a token enters the watchlist. Re-runs every 2 hours.

#### Step-by-Step Detection Logic

**Step 1 — Pull smart wallet leaderboard**
```
GET /v2/address/smart_wallet/list?chain={chain}&sort=total_profit&sort_dir=desc
```
- Take top 50 wallets per chain
- Cache for 6 hours (leaderboard changes slowly)

**Step 2 — For each smart wallet, check their position on target token**
```
GET /v2/address/pnl?wallet_address={addr}&chain={chain}&token_address={token_addr}
GET /v2/address/tx?wallet_address={addr}&chain={chain}&token_address={token_addr}
```
- Extract: buy count, sell count, avg hold time, realized PnL, unrealized PnL, position size

**Step 3 — Score individual wallet conviction**

```python
def wallet_conviction_score(pnl_data, tx_history, kline_data):
    """
    Returns conviction score 0-100 for one wallet on one token
    """
    buys  = [t for t in tx_history if t['tx_swap_type'] == 0]  # 0 = buy
    sells = [t for t in tx_history if t['tx_swap_type'] == 1]  # 1 = sell
    
    if not buys:
        return 0
    
    # 1. Entry frequency — multiple buys = conviction (not one-shot gamble)
    freq_score = min(len(buys) / 5, 1.0) * 25  # max 25 pts at 5+ buys
    
    # 2. Position sizing — large relative to wallet's main coin balance
    avg_buy_usd = sum(float(b['from_price_usd']) * float(b['from_amount']) for b in buys) / len(buys)
    wallet_balance = pnl_data.get('main_coin_balance_usd', 1)
    size_ratio = min(avg_buy_usd / (wallet_balance + 0.001), 1.0)
    size_score = size_ratio * 25  # max 25 pts
    
    # 3. Hold duration — how long have they held through volatility?
    if buys and sells:
        first_buy  = min(b['time'] for b in buys)
        last_sell  = max(s['time'] for s in sells)
        hold_hours = (last_sell - first_buy) / 3600
    elif buys:
        hold_hours = (now() - min(b['time'] for b in buys)) / 3600
    else:
        hold_hours = 0
    
    # Check if they held through a ≥30% drawdown (cross with kline data)
    held_through_drawdown = check_drawdown_hold(buys, kline_data, threshold=0.30)
    hold_score = min(hold_hours / 48, 1.0) * 15 + (10 if held_through_drawdown else 0)
    
    # 4. DCA behavior — bought on dips, not just at launch
    if len(buys) >= 2:
        buy_prices = [float(b.get('from_price_usd', 0)) for b in buys]
        price_variance = std(buy_prices) / (mean(buy_prices) + 0.001)
        dca_score = min(price_variance * 100, 25)  # max 25 pts
    else:
        dca_score = 0
    
    return freq_score + size_score + hold_score + dca_score  # 0-100
```

**Step 4 — Stack conviction scores across wallets**

```python
def conviction_stack_score(target_token, smart_wallets):
    """
    Aggregates individual conviction scores into a composite signal
    """
    scores = []
    for wallet in smart_wallets:
        score = wallet_conviction_score(wallet.pnl, wallet.txs, klines)
        if score > 20:  # filter out noise — only count meaningful positions
            scores.append(score)
    
    if not scores:
        return 0
    
    # Weight: more wallets = higher confidence, but with diminishing returns
    wallet_count_factor = min(len(scores) / 10, 1.0)  # max at 10 wallets
    avg_conviction      = sum(scores) / len(scores)
    
    stack_score = avg_conviction * 0.6 + (wallet_count_factor * 100) * 0.4
    return min(stack_score, 100)
```

**Alert trigger:**
- `conviction_stack_score > 65` AND `cabal_score < 40` → **OPPORTUNITY** signal
- `conviction_stack_score > 80` → **HIGH CONVICTION** entry candidate

**Ave data fields used:**

| Field | Source | Usage |
|---|---|---|
| smart wallet list | `/v2/address/smart_wallet/list` | Source wallets to evaluate |
| `total_profit`, `total_profit_rate` | smart wallet list | Pre-filter for quality wallets |
| PnL breakdown | `/v2/address/pnl` | Realized vs unrealized position |
| `tx_swap_type` | `/v2/address/tx` | Identify buys vs sells |
| `from_price_usd`, `from_amount` | `/v2/address/tx` | Position size calculation |
| `time` | `/v2/address/tx` | Hold duration calculation |
| OHLCV `low`, `high` | `/v2/klines/token` | Detect if they held through drawdowns |

---

### Module 4: Cross-Chain Narrative Radar

**Purpose:** Detect when a narrative theme is gaining momentum on one chain and surface the same-narrative tokens on other chains before the rotation happens.

**When it runs:** Every 5 minutes, polling trending endpoints on all 3 chains simultaneously.

#### Step-by-Step Detection Logic

**Step 1 — Build a narrative taxonomy**

Pre-define narrative clusters (expand over time):

```python
NARRATIVES = {
    "ai_agents":     ["AI", "agent", "AGI", "GPT", "neural", "model"],
    "desci":         ["DeSci", "science", "research", "bio", "genome"],
    "rwa":           ["RWA", "real world", "asset", "property", "gold"],
    "gaming":        ["game", "gaming", "play", "quest", "RPG"],
    "meme_animals":  ["dog", "cat", "frog", "pepe", "doge", "shib"],
    "meme_political":["trump", "MAGA", "political", "president"],
    "depin":         ["DePIN", "network", "node", "infrastructure"],
    "memecoin_meta": ["meme", "pump", "moon", "100x"]
}
```

**Step 2 — Poll trending on all chains**
```
GET /v2/tokens/trending?chain=solana&page_size=100
GET /v2/tokens/trending?chain=bsc&page_size=100
GET /v2/tokens/trending?chain=eth&page_size=100
```

Also pull platform-specific tokens:
```
GET /v2/tokens/platform?tag=pump_out_hot&limit=100   # pump.fun graduates
GET /v2/tokens/platform?tag=meme&limit=100
```

**Step 3 — Tag each token with a narrative**

```python
def tag_token_narrative(token):
    name_lower = (token['name'] + ' ' + token['symbol']).lower()
    for narrative, keywords in NARRATIVES.items():
        if any(kw.lower() in name_lower for kw in keywords):
            return narrative
    return 'other'
```

**Step 4 — Compute per-narrative volume acceleration per chain**

For each chain × narrative combination, compute:
- `V_now` = sum of `tx_volume_u_24h` for all tokens in that narrative on that chain (current poll)
- `V_prev` = same, from 30 minutes ago (stored in rolling buffer)
- `dV_dt` = (V_now - V_prev) / V_prev — volume acceleration rate

```python
def narrative_acceleration(chain, narrative, history_buffer):
    V_now  = sum(t['tx_volume_u_24h'] for t in current_trending
                  if t['chain'] == chain and t['narrative'] == narrative)
    V_prev = history_buffer.get((chain, narrative, timestamp_30min_ago), V_now)
    
    if V_prev == 0:
        return 0
    
    return (V_now - V_prev) / V_prev  # e.g. 0.45 = 45% acceleration
```

**Step 5 — Detect rotation signal**

```python
def detect_rotation(accelerations):
    """
    If a narrative is accelerating on chain A by > 30%,
    and the same narrative on chain B/C is NOT yet accelerating,
    → rotation opportunity: 2-6h window
    """
    opportunities = []
    
    for narrative in NARRATIVES:
        chain_accs = {chain: accelerations.get((chain, narrative), 0)
                      for chain in ['solana', 'bsc', 'eth']}
        
        source_chains = [c for c, v in chain_accs.items() if v > 0.30]
        target_chains = [c for c, v in chain_accs.items() if v < 0.10]
        
        if source_chains and target_chains:
            opportunities.append({
                'narrative':      narrative,
                'source_chains':  source_chains,
                'target_chains':  target_chains,
                'acceleration':   max(chain_accs[c] for c in source_chains),
                'window_hours':   estimate_rotation_window(narrative)
            })
    
    return opportunities
```

**Step 6 — Surface and rank destination tokens**

For each opportunity, fetch tokens on the target chain for that narrative:
```
GET /v2/tokens/search?keyword={narrative_keyword}&chain={target_chain}
```
Rank by: `main_pair_tvl` DESC then filter by `conviction_stack_score > 40`.

**Ave data fields used:**

| Field | Source | Usage |
|---|---|---|
| `name`, `symbol` | `/v2/tokens/trending` | Narrative tagging |
| `tx_volume_u_24h` | `/v2/tokens/trending` | Volume acceleration computation |
| `market_cap`, `holders` | `/v2/tokens/trending` | Destination token ranking |
| `tag` | `/v2/tokens/platform` | Platform-specific narrative signals |
| `main_pair_tvl` | `/v2/tokens/search` | Liquidity quality of destination tokens |
| `current_price_usd`, `price_change_24h` | `/v2/tokens/price` | Context for destination token entry |

---

## 5. Trading Engine — 3 Autonomous Strategy Modes

Each strategy is triggered by the TOS engine crossing user-defined thresholds.

---

### Strategy A: Threat Exit

**Trigger condition:** TOS threat score > user threshold (default 65) on a currently held token.

**Execution flow:**

```
1. Detect TOS threat crossing threshold
2. Check: Is this token in the user's active positions?
3. If YES:
   a. Fetch current quote:
      GET /v2/quote → check price impact
      If price impact > 5%, split into 2 sells to reduce slippage
   b. Execute market sell with MEV protection:
      POST /market-order
        useMev: true
        slippage: auto (from /v2/auto-slippage endpoint)
        amount: full position OR partial (configurable)
   c. Log: token, entry price, exit price, PnL, trigger reason, TOS score at exit
4. If NO active position:
   a. Add token to blacklist (do not enter this token for 24h)
   b. Fire alert to user with TOS breakdown
```

**Parameters:**
- `exit_mode`: `full` (default) or `partial` (exit 50%, keep trailing stop on rest)
- `mev_protection`: always `true` for threat exits
- `min_exit_amount_usd`: skip if position < $10 (avoid dust tx fees)

---

### Strategy B: Conviction Entry

**Trigger condition:**
- `conviction_stack_score > 65`
- `cabal_score < 40` (not a manipulated token)
- `dev_drain_velocity < 20` (DEV not draining)
- `token_age_hours > 4` (not brand new, some price discovery done)
- `tvl_usd > 10,000` (minimum liquidity)

**Execution flow:**

```
1. Validate all trigger conditions
2. Fetch quote to determine real entry cost:
   GET /quote?tokenIn={base}&tokenOut={token}&amount={size}
   → Extract: estimated output, price impact, approval contract address
3. Size the position:
   position_usd = user_capital × risk_per_trade_pct (default 5%)
   If price_impact > 2%: reduce position_usd by 50%
4. Approve contract if needed (BSC/ETH):
   POST /authorization-tx
5. Execute limit order at current ask:
   POST /limit-order
     price: current_ask × 1.002  (tiny premium to ensure fill)
     amount: position_usd
     slippage: auto
     takeProfitPrice: entry × 1.40  (40% TP)
     stopLossPrice:   entry × 0.80  (20% SL)
     trailingStopPct: 15            (trailing stop, tightens on momentum)
6. Register position in feedback DB
7. Start conviction re-monitoring: re-score every 2h
   If conviction_stack_score drops below 35 while in profit → tighten SL
```

**Position sizing formula:**

```python
def size_position(user_capital, risk_pct, price_impact, conviction_score):
    base_size   = user_capital * (risk_pct / 100)
    
    # Scale up with conviction
    conv_multiplier = 1.0 + (conviction_score - 65) / 100  # 1.0 to 1.35
    
    # Scale down with price impact
    impact_adj  = 1.0 - max(0, price_impact - 0.01) * 10
    
    final_size  = base_size * conv_multiplier * impact_adj
    return max(final_size, 0)
```

---

### Strategy C: Narrative Rotation Ride

**Trigger condition:**
- Narrative Radar detects rotation opportunity (source chain acceleration > 30%)
- Target chain top-ranked token passes conviction check (score > 40)
- Historical backtest win rate > 60% (computed from kline data)

**Backtest logic:**

```python
def backtest_narrative_rotation(narrative, source_chain, target_chain, lookback_days=30):
    """
    Checks historical kline data: when narrative pumped on source chain,
    did the same narrative on target chain follow within 2-6 hours?
    Returns: win_rate (0-1), avg_return_pct, avg_window_hours
    """
    # Pull kline data for both chains' top narrative tokens
    # GET /v2/klines/token/{token-id}?interval=60&limit=720 (30 days at 1h)
    
    results = []
    for event in historical_source_pump_events:
        target_price_2h  = get_price_at(target_token, event.time + 7200)
        target_price_6h  = get_price_at(target_token, event.time + 21600)
        target_price_at  = get_price_at(target_token, event.time)
        
        return_2h = (target_price_2h - target_price_at) / target_price_at
        return_6h = (target_price_6h - target_price_at) / target_price_at
        
        results.append({
            'won':        max(return_2h, return_6h) > 0.10,  # won if > 10% return
            'best_return': max(return_2h, return_6h)
        })
    
    win_rate   = sum(1 for r in results if r['won']) / len(results)
    avg_return = sum(r['best_return'] for r in results) / len(results)
    return win_rate, avg_return
```

**Execution flow:**

```
1. Detect rotation opportunity from Module 4
2. Run backtest on kline data for this narrative × chain pair
3. If win_rate > 0.60:
   a. Take top 2 tokens on target chain by TVL × conviction_score
   b. Size position: 3% of capital each (diversify across 2 tokens)
   c. Execute limit orders with:
      takeProfitPrice: entry × 1.30  (30% TP — faster exit, rotation is time-limited)
      stopLossPrice:   entry × 0.85  (15% SL)
      trailingStopPct: 10
      maxHoldTime: 8h (auto-exit if TP/SL not hit within 8 hours)
4. Monitor: if source chain narrative volume decelerates, tighten trailing stop
5. Log everything for future backtest data
```

---

## 6. Complete API Reference & Integration Map

### Ave Data API — REST Endpoints

Base URL: `https://prod.ave-api.com`
Auth: `X-API-KEY: {your_key}` header

| Endpoint | Method | Cost (CU) | Used In | Purpose |
|---|---|---|---|---|
| `/v2/tokens/top100/{token-id}` | GET | 10 CU | M1 Cabal | Holder distribution for cluster analysis |
| `/v2/contracts/{token-id}` | GET | 10 CU | M1, M2 | DEV address, risk score, lock data |
| `/v2/address/tx` | GET | 100 CU | M1, M2, M3 | Full tx history per wallet per token |
| `/v2/address/pnl` | GET | 5 CU | M3 | Wallet PnL on specific token |
| `/v2/address/walletinfo/tokens` | GET | 10 CU | M3 | All holdings in a smart wallet |
| `/v2/address/smart_wallet/list` | GET | 5 CU | M3 | Smart wallet leaderboard |
| `/v2/tokens/trending` | GET | 5 CU | M4 | Multi-chain volume acceleration |
| `/v2/tokens/platform` | GET | 10 CU | M4 | Platform-tagged token discovery |
| `/v2/tokens/search` | GET | 5 CU | M4 | Find destination chain tokens by narrative |
| `/v2/tokens/price` (POST) | POST | 100 CU | All | Batch price check for monitored tokens |
| `/v2/klines/token/{token-id}` | GET | 10 CU | M3, Strategy C | Historical OHLCV for backtest |
| `/v2/klines/pair/{pair-id}` | GET | 10 CU | Strategy C | Pair-level kline for precise backtest |
| `/v2/txs/liq/{pair-id}` | GET | 50 CU | M2 | Historical LP drain data |
| `/v2/txs/swap/{pair-id}` | GET | 50 CU | M1 | Historical swap txs for pattern analysis |
| `/v2/pairs/{pair-id}` | GET | 5 CU | M2 | TVL, reserve data, price change context |

### Ave Data API — WebSocket Streams

Base URL: `wss://wss.ave-api.xyz`

| Topic | Subscribe Params | Used In | Purpose |
|---|---|---|---|
| `liq` | pair_address, chain | M2 | Real-time LP drain events |
| `multi_tx` | token_address, chain | M2 | DEV wallet sells, cabal coordination |
| `tx` | pair_address, chain | M1 | Per-pair swap stream for new token monitoring |
| `price` | array of token-ids or pair-ids | TOS Engine | Real-time price for position P&L tracking |
| `kline` | pair_address, interval, chain | Strategy C | Real-time kline for rotation momentum |

### Ave Bot/Trading API — REST Endpoints

Base URL: (from `docs-bot-api.ave.ai` — get from `cloud.ave.ai` activation)
Auth: `AVE-ACCESS-KEY: {your_key}` header

| Endpoint | Used In | Purpose |
|---|---|---|
| Quote API | Strategy A, B, C | Get price impact + approval contract before any trade |
| Auto-slippage API | Strategy A, B, C | Query optimal slippage per token before order |
| Market Order API | Strategy A (exit) | Fast exit on threat detection |
| Limit Order API | Strategy B, C (entry) | Precision entry with TP/SL configured |
| TP/SL Order API | Strategy B, C | Set take-profit and stop-loss levels |
| Trailing Stop API | Strategy A, B, C | Trailing stop on all open positions |
| Order Record Query | Feedback Loop | Fetch all trades for PnL logging |
| Authorization Tx API | BSC/ETH Strategy B/C | Approve token spend before trade |

---

## 7. Data Pipeline Architecture

### 7.1 Ingestion Layer

```
┌─────────────────────────────────────────────────────┐
│                  INGESTION LAYER                    │
│                                                     │
│  ┌─────────────────┐    ┌──────────────────────┐   │
│  │  REST Poller    │    │  WSS Consumer        │   │
│  │                 │    │                      │   │
│  │  - trending     │    │  - liq stream        │   │
│  │    every 5min   │    │  - multi_tx stream   │   │
│  │                 │    │  - price stream      │   │
│  │  - smart wallet │    │  - kline stream      │   │
│  │    every 6h     │    │                      │   │
│  │                 │    │  Reconnect logic:    │   │
│  │  - token/pair   │    │  exponential backoff │   │
│  │    on-demand    │    │  max 5 retries       │   │
│  └────────┬────────┘    └──────────┬───────────┘   │
│           │                        │               │
│           └───────────┬────────────┘               │
│                       ▼                            │
│            ┌──────────────────────┐                │
│            │   Redis Streams      │                │
│            │   (event queue)      │                │
│            │                      │                │
│            │  stream: liq_events  │                │
│            │  stream: tx_events   │                │
│            │  stream: price_ticks │                │
│            │  stream: rest_polls  │                │
│            └──────────────────────┘                │
└─────────────────────────────────────────────────────┘
```

### 7.2 WSS Connection Manager

```javascript
// wss-manager.js
class WSSManager {
  constructor(apiKey) {
    this.apiKey    = apiKey;
    this.baseUrl   = 'wss://wss.ave-api.xyz';
    this.ws        = null;
    this.subs      = new Map();  // topic → {params, callback}
    this.msgId     = 1;
    this.reconnect_delay = 1000;
  }

  connect() {
    // Note: AVE-ACCESS-KEY must be a query param for WSS (not header)
    this.ws = new WebSocket(`${this.baseUrl}?AVE-ACCESS-KEY=${this.apiKey}`);

    this.ws.on('open', () => {
      this.reconnect_delay = 1000;
      // Re-subscribe to all active subscriptions
      for (const [topic, {params}] of this.subs) {
        this.send('subscribe', [topic, ...params]);
      }
    });

    this.ws.on('message', (data) => {
      const msg = JSON.parse(data);
      const topic = msg.result?.topic;
      if (topic && this.subs.has(topic)) {
        this.subs.get(topic).callback(msg.result);
      }
    });

    this.ws.on('close', () => {
      setTimeout(() => {
        this.reconnect_delay = Math.min(this.reconnect_delay * 2, 30000);
        this.connect();
      }, this.reconnect_delay);
    });

    // Heartbeat every 30s
    setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          jsonrpc: '2.0', method: 'ping', params: [], id: this.msgId++
        }));
      }
    }, 30000);
  }

  subscribe(topic, params, callback) {
    this.subs.set(topic + ':' + params.join(':'), {params, callback});
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send('subscribe', [topic, ...params]);
    }
  }

  send(method, params) {
    this.ws.send(JSON.stringify({
      jsonrpc: '2.0', method, params, id: this.msgId++
    }));
  }
}
```

### 7.3 REST Rate Limiting Strategy

Ave Data API CU budget management:

```
Tier assumption: Standard plan
Estimated CU usage per cycle (every 5 min):

  trending × 3 chains:           15 CU
  platform × 2 tags:             20 CU
  tokens/price batch (50 tokens): 100 CU (1 call)
  ---
  Per 5-min cycle:               135 CU
  Per hour:                    1,620 CU
  Per day:                    38,880 CU

On-demand (per new token detected):
  contracts:                     10 CU
  top100:                        10 CU
  address/tx (3 wallets):       300 CU
  ---
  Per new token:                ~320 CU

Smart wallet refresh (every 6h):
  smart_wallet/list:              5 CU
  pnl (top 50 wallets):         250 CU (50 × 5)
  ---
  Per 6h:                       255 CU
```

**Optimization strategies:**
- Batch token price checks: always use `POST /v2/tokens/price` with up to 200 token_ids per call
- Cache smart wallet list for 6 hours
- Cache contracts data for 24 hours (changes rarely)
- Only call `address/tx` on wallets that appear in top100 AND match smart wallet list

---

## 8. Signal Detection Logic — Full Quant Formulas

### 8.1 TOS (Threat + Opportunity Score) Composition

```python
def compute_TOS(cabal_score, drain_velocity, conviction_stack, narrative_momentum):
    """
    TOS = Threat + Opportunity Score
    Range: 0-100
    
    Interpretation:
      < 20 : Safe, no signal
      20-40: Low signal, monitor
      40-60: Medium signal, user alert
      60-75: High signal, consider action
      > 75 : Critical, auto-action if enabled
    
    Context:
      High cabal + high drain = THREAT (rug)
      High conviction + low cabal + low drain = OPPORTUNITY (buy)
      High narrative = OPPORTUNITY (rotation)
    """
    threat_component      = (cabal_score * 0.55) + (drain_velocity * 0.45)
    opportunity_component = (conviction_stack * 0.65) + (narrative_momentum * 0.35)
    
    # Composite: weight by context
    # If threat > opportunity → TOS represents danger
    # If opportunity > threat → TOS represents chance
    TOS = (threat_component * 0.30) + (opportunity_component * 0.70)
    
    # Signal polarity: attach metadata for action routing
    polarity = 'threat' if threat_component > opportunity_component else 'opportunity'
    
    return {
        'score':       round(TOS, 2),
        'polarity':    polarity,
        'components': {
            'cabal':      round(cabal_score, 2),
            'drain':      round(drain_velocity, 2),
            'conviction': round(conviction_stack, 2),
            'narrative':  round(narrative_momentum, 2),
        }
    }
```

### 8.2 Real-Time Drain Rate Formula

```python
def compute_drain_rate(liq_events, window_seconds=14400):  # 4h default
    """
    Computes annualized drain rate as pct of initial TVL
    """
    cutoff      = time.time() - window_seconds
    recent      = [e for e in liq_events if e['time'] > cutoff]
    
    init_tvl    = get_pair_tvl_at(cutoff)  # TVL at start of window
    total_drained = sum(
        float(e.get('to_price_usd', 0)) * float(e.get('to_amount', 0))
        for e in recent if e.get('type') == 'removeLiquidity'
    )
    
    drain_pct   = (total_drained / (init_tvl + 0.001)) * 100  # % of TVL drained
    hourly_rate = drain_pct / (window_seconds / 3600)          # % per hour
    
    return {
        'drain_pct_window': round(drain_pct, 2),
        'hourly_rate':      round(hourly_rate, 2),
        'event_count':      len(recent),
        'total_drained_usd': round(total_drained, 2)
    }
```

### 8.3 Realized Volatility for Backtest Quality

```python
import numpy as np

def realized_vol(kline_points, window=24):
    """
    Computes 24h realized volatility from 1h kline data
    Used to calibrate TP/SL levels per token's volatility regime
    """
    closes = [float(k['close']) for k in kline_points[-window:]]
    if len(closes) < 2:
        return 0
    
    log_returns = np.diff(np.log(closes))
    vol = np.std(log_returns) * np.sqrt(24)  # annualize to daily vol
    return round(float(vol), 4)

def calibrate_tp_sl(entry_price, realized_vol, strategy='conviction'):
    """
    Dynamic TP/SL based on token's actual volatility
    """
    if strategy == 'conviction':
        tp_multiplier  = 1.0 + max(realized_vol * 2.0, 0.20)  # min 20% TP
        sl_multiplier  = 1.0 - max(realized_vol * 1.0, 0.10)  # min 10% SL
    elif strategy == 'rotation':
        tp_multiplier  = 1.0 + max(realized_vol * 1.5, 0.15)
        sl_multiplier  = 1.0 - max(realized_vol * 0.8, 0.08)
    
    return {
        'tp': round(entry_price * tp_multiplier, 8),
        'sl': round(entry_price * sl_multiplier, 8)
    }
```

---

## 9. Database Schema

### Core Tables (PostgreSQL)

```sql
-- Monitored tokens registry
CREATE TABLE tokens (
    id              SERIAL PRIMARY KEY,
    token_address   VARCHAR(100) NOT NULL,
    chain           VARCHAR(20) NOT NULL,
    symbol          VARCHAR(50),
    name            VARCHAR(200),
    pair_address    VARCHAR(100),
    added_at        TIMESTAMPTZ DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE,
    UNIQUE(token_address, chain)
);

-- TOS score history (1 record per token per 30s update)
CREATE TABLE tos_scores (
    id              SERIAL PRIMARY KEY,
    token_id        INTEGER REFERENCES tokens(id),
    score           NUMERIC(5,2),
    polarity        VARCHAR(15),        -- 'threat' or 'opportunity'
    cabal_score     NUMERIC(5,2),
    drain_score     NUMERIC(5,2),
    conviction_score NUMERIC(5,2),
    narrative_score NUMERIC(5,2),
    computed_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tos_token_time ON tos_scores(token_id, computed_at DESC);

-- Cabal cluster records
CREATE TABLE cabal_clusters (
    id              SERIAL PRIMARY KEY,
    token_id        INTEGER REFERENCES tokens(id),
    wallet_addresses JSONB,             -- array of wallet addresses in cluster
    cluster_score   NUMERIC(5,2),
    supply_held_pct NUMERIC(5,2),
    shared_funders  JSONB,
    detected_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Drain velocity events
CREATE TABLE drain_events (
    id              SERIAL PRIMARY KEY,
    token_id        INTEGER REFERENCES tokens(id),
    pair_address    VARCHAR(100),
    event_type      VARCHAR(30),        -- removeLiquidity / addLiquidity
    usd_value       NUMERIC(20,4),
    sender          VARCHAR(100),
    is_dev_wallet   BOOLEAN,
    drain_velocity  NUMERIC(5,2),      -- computed at time of event
    tx_id           VARCHAR(200),
    occurred_at     TIMESTAMPTZ
);

-- Smart wallet conviction records
CREATE TABLE wallet_convictions (
    id              SERIAL PRIMARY KEY,
    token_id        INTEGER REFERENCES tokens(id),
    wallet_address  VARCHAR(100),
    conviction_score NUMERIC(5,2),
    buy_count       INTEGER,
    avg_hold_hours  NUMERIC(8,2),
    avg_position_usd NUMERIC(20,4),
    held_drawdown   BOOLEAN,
    computed_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Narrative rotation opportunities
CREATE TABLE rotation_signals (
    id              SERIAL PRIMARY KEY,
    narrative       VARCHAR(50),
    source_chains   JSONB,
    target_chains   JSONB,
    acceleration    NUMERIC(8,4),
    backtest_win_rate NUMERIC(5,4),
    window_hours    NUMERIC(4,1),
    detected_at     TIMESTAMPTZ DEFAULT NOW(),
    acted_on        BOOLEAN DEFAULT FALSE
);

-- All executed trades (feedback loop)
CREATE TABLE trades (
    id              SERIAL PRIMARY KEY,
    token_id        INTEGER REFERENCES tokens(id),
    strategy        VARCHAR(20),        -- 'threat_exit', 'conviction_entry', 'rotation'
    direction       VARCHAR(10),        -- 'buy' or 'sell'
    amount_usd      NUMERIC(20,4),
    entry_price     NUMERIC(30,12),
    exit_price      NUMERIC(30,12),
    realized_pnl    NUMERIC(20,4),
    trigger_tos     NUMERIC(5,2),       -- TOS score at time of trade
    trigger_module  VARCHAR(50),        -- which module triggered it
    signal_data     JSONB,              -- full signal snapshot for backtesting
    order_id        VARCHAR(200),       -- Ave Bot API order ID
    opened_at       TIMESTAMPTZ,
    closed_at       TIMESTAMPTZ,
    status          VARCHAR(20)         -- 'open', 'closed', 'cancelled'
);

-- User position tracking
CREATE TABLE positions (
    id              SERIAL PRIMARY KEY,
    token_id        INTEGER REFERENCES tokens(id),
    wallet_address  VARCHAR(100),
    chain           VARCHAR(20),
    amount_tokens   NUMERIC(30,12),
    entry_price_usd NUMERIC(30,12),
    entry_usd       NUMERIC(20,4),
    tp_price        NUMERIC(30,12),
    sl_price        NUMERIC(30,12),
    trailing_pct    NUMERIC(5,2),
    strategy        VARCHAR(20),
    opened_at       TIMESTAMPTZ DEFAULT NOW(),
    status          VARCHAR(20) DEFAULT 'open'
);
```

---

## 10. Tech Stack

### Backend

| Layer | Technology | Why |
|---|---|---|
| Runtime | Node.js 20 (TypeScript) | Ave SDK examples in JS, async event handling |
| REST client | axios + axios-retry | Rate limit retry logic built-in |
| WSS client | `ws` library | Low-level WebSocket for Ave streams |
| Queue | Redis Streams (via ioredis) | High-throughput event buffering, persistent |
| Signal computation | Python 3.11 (numpy, pandas) | Quant formula computation — much cleaner |
| Python bridge | ZeroMQ or HTTP microservice | Node calls Python for heavy computation |
| Database | PostgreSQL 15 | Time-series data, JSONB for flexible fields |
| Cache | Redis | Smart wallet list, token metadata, CU budget tracking |
| Scheduler | node-cron | REST polling schedules |

### Frontend Dashboard

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR for initial load, CSR for real-time |
| Real-time | WebSocket (self-hosted) | Push TOS updates to dashboard |
| Charts | TradingView Lightweight Charts | Professional OHLCV display |
| UI components | shadcn/ui + Tailwind | Fast, professional |
| State | Zustand | Simple real-time state for TOS feed |

### Infrastructure

| Component | Technology |
|---|---|
| Hosting | Railway or Render (backend), Vercel (frontend) |
| Database | Supabase (PostgreSQL + real-time) |
| Redis | Upstash (serverless Redis) |
| Alerts | Telegram Bot API + Discord Webhooks |
| Monitoring | Self-hosted (basic health endpoint) |

### File Structure

```
opis/
├── packages/
│   ├── ingestion/           # Node.js — REST poller + WSS consumer
│   │   ├── rest-poller.ts
│   │   ├── wss-manager.ts
│   │   └── event-emitter.ts
│   │
│   ├── signals/             # Python — quant computation modules
│   │   ├── cabal.py         # Module 1
│   │   ├── drain.py         # Module 2
│   │   ├── conviction.py    # Module 3
│   │   ├── narrative.py     # Module 4
│   │   ├── tos.py           # TOS composition
│   │   └── backtest.py      # Historical kline backtest
│   │
│   ├── trading/             # Node.js — Ave Bot API integration
│   │   ├── quote.ts
│   │   ├── market-order.ts
│   │   ├── limit-order.ts
│   │   └── position-manager.ts
│   │
│   ├── alerts/              # Node.js — notification dispatch
│   │   ├── telegram.ts
│   │   └── discord.ts
│   │
│   └── dashboard/           # Next.js — user-facing UI
│       ├── app/
│       ├── components/
│       └── hooks/
│
├── shared/
│   ├── types.ts
│   ├── ave-client.ts        # Ave API client wrapper
│   └── db.ts                # DB connection + queries
│
└── docker-compose.yml       # Local dev: postgres + redis
```

---

## 11. 48-Hour Build Plan

### Hour 0-2: Environment Setup
- [ ] Clone repo, configure env vars
  - `AVE_DATA_API_KEY=` (from cloud.ave.ai)
  - `AVE_BOT_API_KEY=` (from cloud.ave.ai — trading activation)
  - `DATABASE_URL=`
  - `REDIS_URL=`
  - `TELEGRAM_BOT_TOKEN=`
- [ ] Init database with schema from Section 9
- [ ] Verify Ave Data API connectivity: test `/v2/tokens/trending?chain=solana`
- [ ] Verify Ave Bot API connectivity: test quote endpoint

### Hour 2-6: Ingestion Layer (Priority 1)
- [ ] Build `AveClient` wrapper class with rate limiting + retry logic
- [ ] Build `WSSManager` with reconnect logic (use code from Section 7.2)
- [ ] Build REST poller: trending (5min), smart wallets (6h)
- [ ] Connect to Redis Streams — push all events to queues
- [ ] Test: Subscribe to WSS liq stream on a known Solana pair, verify events arrive

### Hour 6-12: Module 2 — DEV Drain Velocity (Build First, Highest Demo Impact)
- [ ] Implement `drain_velocity()` formula from Section 8.2
- [ ] Subscribe to `liq` WSS for 5 test pairs
- [ ] Implement `creator_address` lookup from `/v2/contracts/{token-id}`
- [ ] Implement dynamic threshold from Section 4 Module 2
- [ ] Wire up Telegram alert when drain_score > 50
- [ ] **TEST:** Find a recently rugged token on Solana, verify retrospective drain detection

### Hour 12-18: Module 3 — Conviction Stack Scorer
- [ ] Pull smart wallet list from `/v2/address/smart_wallet/list`
- [ ] Implement `wallet_conviction_score()` from Section 4 Module 3
- [ ] Implement `conviction_stack_score()` aggregation
- [ ] Wire into TOS engine with partial composition (modules 2 + 3 only for now)
- [ ] **TEST:** Pick a known successful token, verify retrospective conviction detection

### Hour 18-22: Module 1 — Cabal Fingerprinter
- [ ] Build holder graph from `/v2/tokens/top100`
- [ ] Implement co-occurrence detection using `sender` field from `/v2/address/tx`
- [ ] Implement `Cabal_Score` formula from Section 4 Module 1
- [ ] Add to TOS engine
- [ ] **TEST:** Pick a known cabal-manipulated token, verify detection

### Hour 22-26: Module 4 — Narrative Radar
- [ ] Implement multi-chain trending poll
- [ ] Implement `tag_token_narrative()` classification
- [ ] Implement `narrative_acceleration()` computation
- [ ] Implement `detect_rotation()` logic
- [ ] **SKIP backtest for hackathon** — show synthetic demo with real data

### Hour 26-32: Trading Engine — Strategy A + B
- [ ] Build Quote API client
- [ ] Build Market Order executor (Strategy A — exit)
- [ ] Build Limit Order executor with TP/SL (Strategy B — entry)
- [ ] Connect TOS engine → strategy routing
- [ ] Build position tracker in DB
- [ ] **TEST on devnet/small amounts:** Execute one end-to-end Strategy B trade

### Hour 32-38: Dashboard
- [ ] Next.js project setup with shadcn/ui
- [ ] Real-time TOS feed component (WebSocket from backend)
- [ ] Token detail card: TOS breakdown, module scores, alerts timeline
- [ ] Active positions panel: open trades with live PnL
- [ ] Narrative rotation alert banner
- [ ] Mobile-responsive layout

### Hour 38-44: Demo Preparation
- [ ] Select 5–8 real tokens to demonstrate with (mix of risky and safe)
- [ ] Prepare a "live demo scenario": 
  - Show a token entering watchlist
  - Show drain velocity rising in real-time
  - Show alert firing
  - Show auto-exit triggering (or show the order that would fire)
- [ ] Prepare retrospective case studies: tokens where OPIS would have caught the rug/entry
- [ ] Record backup demo video in case live demo fails

### Hour 44-48: Polish + Submission
- [ ] Write README with architecture overview
- [ ] Record 3-minute demo video
- [ ] Deploy frontend to Vercel
- [ ] Deploy backend to Railway
- [ ] Submit with: GitHub link, demo video, live demo URL, documentation

### What to Skip / Fake for Demo
| Feature | Action |
|---|---|
| Strategy C backtest (full) | Show pre-computed results from kline data analysis |
| Authorization TX (BSC) | Demonstrate on Solana only |
| Multi-user SaaS | Single-user mode, show monetization in pitch only |
| Full 50-wallet conviction scan | Scan top 10 wallets, note it scales |
| Module 4 full rotation tracking | Show 2 chains only (Solana + BSC) |

---

## 12. Demo Strategy for Judges

### The Narrative Arc (3 minutes)

**Minute 1 — The Problem (emotional hook)**
> "Every meme trader has been rugged. The signs were always there on-chain. They just couldn't read them fast enough."

Show a real historical rug: pick a token, show the drain velocity on kline data, show the DEV wallet sells — all of which happened 3–4 hours before collapse.

**Minute 2 — The System (technical credibility)**

Live dashboard. Show:
1. Monitored token feed with real TOS scores updating
2. Click into one token → show the full module breakdown (Cabal: 72, Drain: 38, Conviction: 15, Narrative: 20 → TOS: 67 THREAT)
3. Show the Telegram alert that fired
4. Show how the auto-exit would have been triggered

**Minute 3 — The Opportunity (commercial value)**

Switch to a token with high conviction score. Show:
1. 4 smart wallets detected entering with high conviction
2. Narrative radar: same-narrative token pumping on BSC
3. TOS: 71 OPPORTUNITY
4. Show the limit order that was placed with TP/SL configured

End with: "This is the system that reads the signals traders miss. It runs 24/7. It acts in seconds. And every trade it makes makes the next trade smarter."

### Key Metrics to Show Judges
- **Number of Ave APIs integrated:** 14 REST endpoints + 4 WSS topics
- **Latency from signal to action:** < 3 seconds (WSS event → order execution)
- **Retrospective accuracy:** Show 3 historical examples where OPIS would have caught the rug
- **Daily CU efficiency:** < 50,000 CU/day for 50 monitored tokens

---

## 13. Monetization Model

### Tier Structure

| Tier | Price | Features |
|---|---|---|
| **Free** | $0/mo | 10 monitored tokens, manual TOS dashboard, 1 chain, 24h delay on smart wallet data |
| **Pro** | $29/mo | 50 monitored tokens, all 4 modules live, Telegram alerts, all chains |
| **Elite** | $99/mo | 200 tokens, autonomous trading enabled (Strategies A + B), priority WSS |
| **Quant** | $299/mo | Unlimited tokens, all 3 strategies, custom thresholds, signal API access |

### Performance Fee (Elite + Quant)
- 10% of realized profit above high-water mark
- Zero fee on losing trades
- Computed monthly, charged on-chain

### Signal API (Quant tier add-on)
- REST endpoint: `GET /v1/tos/{token-id}` → returns live TOS + all module scores
- $0.01 per API call OR $499/month flat
- Target customers: Telegram bot developers, quant funds, trading dashboards

### White-Label (Enterprise)
- Token projects pay to run OPIS on their own token
- Early warning of manipulation *against* the project
- $999/month per token — includes custom alert destinations and dedicated monitoring

### Revenue Model at Scale
- 1,000 Pro users → $29,000 MRR
- 200 Elite users + avg $50 performance fee → $29,800 MRR
- 50 Signal API customers → $24,950 MRR
- **Total: ~$83,750 MRR at modest scale**

---

## 14. Risk & Edge Cases

### Technical Risks

| Risk | Mitigation |
|---|---|
| WSS disconnection during critical event | Reconnect with exponential backoff; fall back to REST polling at 30s intervals |
| Ave API rate limit hit | CU budget tracker in Redis; shed non-critical calls first (top100, address/tx); cache aggressively |
| DEV wallet misidentification | Confirm with both `creator_address` from contracts AND Ave's DEV label from tx stream |
| False positive on cabal detection | Require BOTH graph score > 65 AND supply % > 15% — two independent conditions |
| Slippage on auto-exit in low liquidity | Always query Quote API first; if price impact > 8%, split into 3 tranches |
| Order fill failure | Retry with market order if limit order unfilled after 60 seconds |

### Signal Quality Risks

| Risk | Mitigation |
|---|---|
| Smart money wallet gaming OPIS | Monitor wallet performance over 30 days; remove wallets with declining win rates |
| Narrative taxonomy miss | Catch-all "other" bucket; user can manually tag tokens |
| Backtest overfitting | Use last 7 days for backtest window, not full history |
| Chain-specific manipulation patterns | Calibrate thresholds per chain — BSC and Solana have very different base vol |

### Operational Risks

| Risk | Mitigation |
|---|---|
| Trading with user funds | Require explicit opt-in per strategy; default is alert-only |
| Regulatory exposure | User controls their own wallet; OPIS generates signals, does not custody funds |
| Ave API downtime | Cache last known TOS scores; display "stale data" warning after 5 min without update |

---

## 15. Post-Hackathon Roadmap

### Month 1-2: Foundation
- Full Strategy C (Narrative Rotation Ride) with production backtest
- Multi-user authentication + wallet connection (Solana wallet adapter)
- Mobile app (React Native) for Telegram-level UX on mobile

### Month 3-4: Intelligence Layer
- ML model trained on OPIS trade history to improve TOS weights
- KOL wallet tracking integration (Ave KOL labels) — when known KOLs enter high-conviction
- On-chain social signal integration (tweet volume correlation with narrative acceleration)

### Month 5-6: Scale
- Expand to all Ave-supported chains (TON, SUI, TRON)
- Public signal API launch with developer documentation
- Partner program: Telegram bot developers integrate OPIS signals
- White-label deal with 2-3 token projects for enterprise revenue

### Long-Term Vision
OPIS evolves from a trading tool into **on-chain market intelligence infrastructure** — the data layer that any DeFi application can plug into for real-time manipulation detection, smart money signals, and narrative momentum data.

---

## Appendix: Key API Endpoints Quick Reference

```bash
# Test Data API connectivity
curl -H "X-API-KEY: YOUR_KEY" \
  "https://prod.ave-api.com/v2/tokens/trending?chain=solana&page_size=5"

# Test contracts endpoint (get DEV address)
curl -H "X-API-KEY: YOUR_KEY" \
  "https://prod.ave-api.com/v2/contracts/6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN-solana"

# Test top100 holders
curl -H "X-API-KEY: YOUR_KEY" \
  "https://prod.ave-api.com/v2/tokens/top100/6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN-solana"

# Test smart wallet list
curl -H "X-API-KEY: YOUR_KEY" \
  "https://prod.ave-api.com/v2/address/smart_wallet/list?chain=solana&sort=total_profit"

# Test klines for backtest
curl -H "X-API-KEY: YOUR_KEY" \
  "https://prod.ave-api.com/v2/klines/token/6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN-solana?interval=60&limit=168"

# WSS connection test (Node.js)
# ws = new WebSocket('wss://wss.ave-api.xyz?AVE-ACCESS-KEY=YOUR_KEY')
# Send: {"jsonrpc":"2.0","method":"ping","params":[],"id":1}
# Expect: {"id":1,"jsonrpc":"2.0","result":"pong"}
```

---

*Document version: 1.0 | Created for AVE Claw Hackathon — HK Web3 Festival 2026*
*Ave Data API: ave-cloud.gitbook.io/data-api | Ave Bot API: docs-bot-api.ave.ai | Platform docs: doc.ave.ai*