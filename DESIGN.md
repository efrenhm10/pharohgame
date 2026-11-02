# HORUS IN THE FLESH — Design Bible

A grand strategy political simulation of New Kingdom Egypt (c. 1550–1070 BCE).
The player is Pharaoh: the living Horus, guarantor of Ma'at — and a fragile human
ruler surrounded by temples, generals, governors and wives who all want his power.

This is **not** a city-builder and **not** a chronological "age-up" event loop.
Every turn is a **Strategic Briefing**: the state of the realm, one systemic crisis,
and 3–4 decrees, each with an explicit cost, fallout and dynastic risk.

---

## 1. Core Loop

The year follows the three Egyptian seasons. Each season is one turn.

| Season | Months | Political meaning |
|---|---|---|
| **Akhet** (Inundation) | Jul–Oct | Flood height read at the Nilometers. Sets the harvest. Fields underwater → peasants free for corvée (monument labor). |
| **Peret** (Growing) | Nov–Feb | Fields planted. Tax assessment by scribes. Campaign season opens in Syria-Canaan. |
| **Shemu** (Harvest) | Mar–Jun | Grain collected into granaries. Tax fraud, skimming and revolts peak. |

Per turn:
1. **Simulate** — grain burn, flood/harvest, faction drift, plots advance, health ages.
2. **Brief** — render the Strategic Briefing Dashboard (§7).
3. **Decree** — player picks one option or issues a custom counter-proposal.
4. **Resolve** — apply costs, fallout, and seed future consequences (delayed effects are the norm).

The timeline **never advances without a player decree**.

---

## 2. Ma'at vs. Isfet (Cosmic Legitimacy)

`Ma'at` is a 0–100 meter. It is the Pharaoh's legitimacy as a god, not a generic "stability" stat.

| Ma'at | State | Effects |
|---|---|---|
| 80–100 | Ma'at Upheld | Faction drift toward Pharaoh; vassals pay tribute on time; plots slowed. |
| 50–79 | Order Contested | Normal play. |
| 25–49 | Isfet Rising | Omens, strikes (cf. Deir el-Medina), banditry; Priesthood may question the king's favor. |
| 0–24 | Rejected by the Gods | Revolts; the Amun oracle may "speak" for another claimant; coup checks every turn. |

**Breaks Ma'at:** low or catastrophic flood, plague, lost battle, unpaid laborers, desecrated tombs, a monument abandoned unfinished, a royal heir dying suspiciously.
**Restores Ma'at:** good flood (credited to the king), victory, completed monuments, festivals (Opet, Sed), visible justice against corrupt officials, grain distribution in famine.

Ma'at is a *perception*. The Priesthood controls its interpretation: high Priesthood
approval softens Ma'at losses; hostile priests amplify them.

### Flood table (cubits at Elephantine)

| Reading | Name | Harvest | Ma'at |
|---|---|---|---|
| < 12 | Cubits of Hunger | 40–55% | −15 |
| 12–14 | Low Hapi | 60–80% | −6 |
| 15–16 | Good Hapi | 100% | +4 |
| 17–18 | High Hapi | 110% | +2 |
| > 19 | Destroying Flood | 70% (dykes and villages lost) | −8 |

---

## 3. The Grain Economy

Grain is the domestic currency. Gold is for foreign kings.

- **Unit:** the *khar* (≈ 77 L of grain).
- **Ration benchmark:** a laborer or soldier costs ≈ 5 khar/month (cf. Deir el-Medina: 4 emmer + 1.5 barley).
- **Granaries are separate ledgers.** The Crown does not own temple grain.
  - **Royal Granaries** — spendable directly.
  - **Temple Granaries** — owned by the gods (Amun of Karnak above all). Accessed only by negotiation.
  - **Nome Granaries** — held by Nomarchs; reach the Crown only through tax collected by scribes.
- **Burn rate** each turn = army rations + royal workforce + palace & administration + monument crews.
- **Arrears:** each month a group goes unpaid raises its revolt/strike/coup pressure.

**Gold** (in *deben*, ≈ 91 g) buys foreign treaties, brides, mercenary loyalty and
bribes. It cannot feed Egypt in a famine. Spending gold domestically is possible
but signals weakness to foreign courts.

**Scribes & leakage:** every transfer between ledgers loses a percentage to
skimming, set by the Vizier's integrity and the Nomarch's loyalty.

---

## 4. The Three Factions

Each faction has `Approval` (0–100%), an active `Demand`, a `Leader` (a character
with ambitions, not an abstraction), and a `Threat` behavior when approval falls.

### The Priesthood (Temples)
- **Holds:** temple granaries, land, the oracle, the interpretation of omens and Ma'at.
- **Wants:** tax-exempt estates, monument endowments, hereditary high priesthoods.
- **Threat at low approval:** declares omens against the king, withholds temple grain, uses the oracle to back a rival heir. End state: a Theban theocracy.

### The Military (Chariotry, infantry, Sherden/Nubian/Libyan mercenaries)
- **Holds:** force. Defends against Hittites, Libyans, Sea Peoples, Nubian revolts.
- **Wants:** grain paid on time, campaigns with booty, princes and favorites in command.
- **Threat at low approval:** refuses to march, mutiny, a general-prince seizes the throne. Foreign mercenaries switch sides fastest when unpaid.

### The Nomarchs (Regional Governors)
- **Holds:** local labor, harvests, nome granaries, the corvée.
- **Wants:** heredity of office, tax remission, autonomy from the Vizier's scribes.
- **Threat at low approval:** under-report harvests, hoard grain, refuse corvée; at worst Egypt fragments into nomes (an "Intermediate Period").

**Rule:** every crisis must force a trade between at least two of these factions.
No option pleases everyone.

---

## 5. The Court: Vizier, Harem, Succession

### The Vizier(s)
Two viziers (North at Memphis/Pi-Ramesses, South at Thebes) run the scribes, courts and taxes.
Stats: `Competence`, `Integrity`, `Ambition`. High competence + high ambition = the most useful and most dangerous man in Egypt.
Delegating more power raises tax efficiency and plot capacity simultaneously.

### The Harem
Each wife is a political actor with: `Origin` (foreign treaty / Nomarch family / priestly family / commoner), `Influence`, `Ambition`, `Allies` (eunuchs, viziers, generals, priests), and her sons.
- The **Great Royal Wife** has ritual status; her son has the strongest default claim.
- **Foreign wives** carry a treaty: insulting them or their sons strains that alliance.
- **Nomarch-family wives** tie a nome's grain to their son's prospects.

### Succession
There is no automatic law. The heir is whoever Pharaoh **designates** and can make stick.
Each son has `Legitimacy` (birth, mother's rank, Amun's favor, public rites) and `Loyalty` (to the reigning king).
Co-regency, oracle confirmation, military command and marriage to a royal daughter all shift Legitimacy.
Plots (poisoning, forged decrees, harem conspiracies — cf. the Harem Conspiracy against Ramesses III) progress silently and surface as crises.

---

## 6. Monuments

Monuments are political currency, paid in grain, corvée labor and time.

| Monument | Grain cost | Seasons | On completion |
|---|---|---|---|
| Obelisk pair | 60,000 khar | 3 | +5 Ma'at, Priesthood +8 |
| Temple hall / pylon | 250,000 khar | 8 | +10 Ma'at, Priesthood +15, heir Legitimacy +5 |
| Mortuary temple | 400,000 khar | 12 | Permanent dynasty Legitimacy bonus |
| Royal tomb (Valley of the Kings) | Ongoing crew | Whole reign | Required. Dying with it unfinished: heir starts −15 Legitimacy |

Corvée is cheapest in Akhet (fields flooded). Pulling labor in Shemu cuts the harvest.
Abandoning a monument costs Ma'at and Priesthood approval.

---

## 7. Output Contract: the Strategic Briefing Dashboard

Every game turn renders exactly this structure:

```markdown
### 👑 THE STATE OF THE REALM
*   **Ruler Health & Age:** [Name, Status, Age]
*   **The Treasury & Granaries:** [Current wealth / food reserves vs. Burn rate]
*   **The Dynastic Succession:** [Heir, Loyalty/Legitimacy score]
*   **Faction Support:**
    *   *The Priesthood / Church:* [X]% Approval (Current Demands: [...])
    *   *The Military / Nobles:* [X]% Approval (Current Demands: [...])
    *   *The Nomarchs / Vassals:* [X]% Approval (Current Demands: [...])

### ⚡ CURRENT CRISIS DECREE
[One systemic political standoff: who threatens whom, what is at stake, why it matters to the bloodline.]

### 📜 THE STRATEGIC OPTIONS
*   **Option N: [Action Title]**
    *   *Immediate Cost:* [...]
    *   *Political Fallout:* [who loves it, who plots]
    *   *Long-Term Dynastic Risk:* [succession / marriage / bloodline impact]
```

Rules:
- 3 or 4 options, never a binary yes/no.
- Every option has a real cost; no dominant choice.
- The player may always issue a custom counter-proposal, which is judged against the same Bronze Age constraints.
- Wait for the decree. Never auto-advance.

---

## 8. Design Pillars (checklist for every mechanic and event)

1. Does it make divinity feel **fragile** — can it cost Ma'at?
2. Does it force a choice **between factions**?
3. Does it touch the **bloodline** — an heir, a wife, a marriage alliance?
4. Is it paid in **grain** (domestic) or **gold** (foreign) — and is that the right one?
5. Does it plant a **delayed consequence** rather than resolving cleanly?
