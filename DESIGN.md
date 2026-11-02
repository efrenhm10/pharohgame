# HORUS IN THE FLESH — Design Bible

A grand strategy political simulation of New Kingdom Egypt (c. 1550–1070 BCE).
The player is Pharaoh: the living Horus, guarantor of Ma'at — and a fragile human
ruler surrounded by temples, generals, governors and wives who all want his power.

This is **not** a city-builder and **not** a chronological "age-up" event loop.
Every turn is a **Strategic Briefing**: the state of the realm, then either one
systemic **Crisis** or one **Opportunity**, and 3–4 decrees, each with an explicit
cost and an explicit consequence for the power blocks and the bloodline. Crises test the
empire; opportunities let the player build it (§8).

---

## 1. Core Loop

The year follows the three Egyptian seasons. Each season is one turn.

| Season | Months | Political meaning |
|---|---|---|
| **Akhet** (Inundation) | Jul–Oct | Flood height read at the Nilometers. Sets the harvest. Fields underwater → peasants free for corvée (monument labor). |
| **Peret** (Growing) | Nov–Feb | Fields planted. Tax assessment by scribes. Campaign season opens in Syria-Canaan. |
| **Shemu** (Harvest) | Mar–Jun | The harvest is cut and the Nubian gold tribute arrives. Tax fraud, skimming and revolts peak. |

Per turn:
1. **Simulate** — grain burn, flood/harvest, power-block drift, plots advance, health ages.
2. **Brief** — pick the briefing type from the rotation rules (§8), then render the Strategic Briefing Dashboard (§7).
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

**Upkeep:** while Ma'at is below 50, every season in which all rations are paid restores +1 (the rites were performed and the people fed). Above 80, Ma'at decays −1 per season: a golden age needs constant maintenance.

Ma'at is a *perception*. The Priesthood controls its interpretation: high Priesthood
approval softens Ma'at losses; hostile priests amplify them.

## 2a. The Flood Table & Grain Math (Cubits at Elephantine)

At the start of every Akhet, a **hidden roll** modified by current Ma'at sets the
Nile flood height. The scribes read it at the Nilometer, and the player learns the
result in that turn's briefing.

| Height (Cubits) | Nile Status | Immediate Grain Impact | Political & Ma'at Fallout |
| :--- | :--- | :--- | :--- |
| **< 12** | *The Famine (Low Flood)* | −50% harvest | **Isfet rises (−15 Ma'at).** Peasant strikes trigger. The Priesthood's demand becomes *emergency grain distribution*. |
| **12 to < 15** | *The Lean Year* | −15% harvest | No immediate Ma'at loss, but granary reserves must be tapped. Nomarchs and vassals grow restless (−5 Bureaucracy approval). |
| **15 to < 17** | *The Blessing (Perfect)* | +25% harvest | **Ma'at upheld (+10 Ma'at).** Monument labor costs −20% this year because morale is high. |
| **17 to 18** | *The High Water* | Normal harvest | Minor canal and dyke damage. It must be repaired with gold or corvée labor, or next year's harvest takes −10%. |
| **> 18** | *The Deluge (Destruction)* | −30% harvest | **Isfet rises (−10 Ma'at).** Towns flooded and sacred temples damaged. Order depends on the military: Military approval counts double this year. |

### The hidden roll

The roll draws a band from the Ma'at-weighted odds below, then a height within that band.

| Current Ma'at | Famine | Lean | Blessing | High Water | Deluge |
|---|---|---|---|---|---|
| 80–100 | 5% | 20% | 45% | 22% | 8% |
| 50–79 | 10% | 30% | 35% | 18% | 7% |
| 25–49 | 15% | 35% | 28% | 15% | 7% |
| 0–24 | 20% | 37% | 22% | 13% | 8% |

- **Feedback dampener.** Ma'at only *tilts* the odds. Even a hated king gets a
  Blessing about one year in five, and a beloved one still suffers Famine. Without
  this, low Ma'at would cause bad floods, which lower Ma'at further, in a spiral
  the player cannot escape.
- **Famine streak cap:** after two Famines in a row, the Famine chance is halved
  until a non-Famine year.
- **The Deluge ignores Ma'at.** The gods' wrath can fall on anyone.
- **Forecasts.** The Elephantine priests can be asked, for a favor or a gift, to
  "read the southern waters" one season early. The answer reveals the likely band
  as an Omen (§8), which lets the player prepare.

### Grain math

```
Seasonal tax intake          = Baseline intake ÷ 3 × flood modifier × (1 − scribal leakage)
Monthly burn                 = army + royal workforce + palace/administration + monument crews
Reserve (months)             = Royal granaries ÷ monthly burn
```

- **Tax arrives in three seasonal installments** by barge, so a bad flood squeezes the whole year
  instead of emptying the granaries for two seasons at a time.
- **Baseline intake** is set per scenario. The Year 9 start uses 3,000,000 khar/year against a
  2,280,000 khar/year burn: a normal year runs a small surplus, a Blessing a large one, a Famine a
  deep deficit. Permanent concessions (temple exemptions, nomarch heredity) eat into that margin.
- **Scribal leakage** runs from 2% to 15%. It is set by the Vizier's Integrity and
  Bureaucracy approval (§4).

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

## 4. The Four Power Blocks

The player must manage four power blocks. Each has an `Approval` rating (0–100%),
an active `Demand`, a `Leader` (a named character with ambitions, not an abstraction),
and escalating `Threat` behavior as approval falls.

### 🏛️ The Amun-Ra Priesthood (The Theban Temples)
- **Controls:** religious legitimacy, the interpretation of Ma'at and omens, and huge tax-exempt temple granaries and estates.
- **Wants:** new temples, preservation of their tax exemptions, hereditary high priesthoods, and a **veto over the chosen heir**.
- **Threat:**
  - **< 50%:** omens are read against the king, Ma'at losses are amplified ×1.5, and temple grain is withheld.
  - **< 30%:** **Divine Oracle.** Amun "declares" that the gods are displeased with Pharaoh and may name a rival claimant. This sparks a **religious civil war** if Ma'at is under 50.

### 🦩 The Nomarchs & Viziers (The Bureaucracy)
- **Controls:** collecting the grain tax during Shemu and drafting peasants for corvée during Akhet. The two Viziers (North at Memphis/Pi-Ramesses, South at Thebes) lead the scribal network. Each is a character with `Competence`, `Integrity` and `Ambition`.
- **Wants:** hereditary rights to their governorships, low tax quotas, and freedom from the Viziers' audits (Nomarchs). The Viziers want more delegated power.
- **Threat:**
  - **< 50%:** scribal leakage rises and harvest reports are under-counted.
  - **< 30%:** grain taxes are pocketed outright and corvée quotas are missed.
  - **< 15% and Ma'at < 50:** nomes declare **independent regional dynasties**, and Egypt slides toward an Intermediate Period.
- **Vizier paradox:** delegating power to a Vizier raises tax efficiency *and* his capacity to plot. High Competence plus high Ambition makes him the most useful and the most dangerous man in Egypt.

### ⚔️ The Chariot Corps & Mercenaries (The Military)
- **Controls:** foreign conquest, border security against the Hittites, Libyans and Sea Peoples, and domestic policing. Includes the Sherden and Nubian Medjay mercenaries.
- **Wants:** aggressive campaigns in Syria-Canaan that bring gold and captives, a high military grain budget, and princes or favorites in command.
- **Threat:**
  - **< 50%:** units refuse to march. Unpaid mercenaries desert or switch sides first.
  - **< 30%:** a charismatic general or a **disaffected royal prince** may march on the palace in a **military coup**. The chance is checked each turn and rises with months of unpaid arrears.

### 🪷 The Harem (The Royal Dynasty)
- **Controls:** palace security, access to Pharaoh's person (food tasters, guards, chamber servants), and the immediate line of succession.
- **Wants:** each mother wants **her own son** named Crown Prince over the sons of rival wives.
- **How approval works:** the bloc's Approval is the influence-weighted average of each wife's satisfaction. **Conspiracies are triggered by individual wives, not by the average.** A harem that is calm overall can still hide one mother with nothing left to lose.
- **Each wife has:** `Origin` (foreign treaty / Nomarch family / priestly family / commoner), `Influence`, `Ambition`, `Allies` (eunuchs, viziers, generals, priests), and her sons.
  - The **Great Royal Wife** has ritual status, and her son has the strongest default claim.
  - **Foreign wives** carry a treaty. Insulting them or their sons strains that alliance.
  - **Nomarch-family wives** tie a nome's grain to their son's prospects.
- **Threat:** when an individual wife's satisfaction drops below 30%, especially if her son has been passed over, she begins a **Harem Conspiracy**. She recruits guards and food tasters to poison Pharaoh, or arranges the death of a rival heir (cf. the conspiracy against Ramesses III). The plot advances silently each turn and surfaces as a crisis, or as a death.

**Rule:** every crisis must force a trade between at least two power blocks. No option pleases everyone.

---

## 5. Succession
There is no automatic law. The heir is whoever Pharaoh **designates** and can make stick.
Each son has `Legitimacy` (birth, mother's rank, Amun's favor, public rites) and `Loyalty` (to the reigning king).
Co-regency, oracle confirmation (the Priesthood's veto), military command and marriage to a royal daughter all shift Legitimacy.
Plots (poisoning, forged decrees, harem conspiracies) progress silently and surface as crises.

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
A Blessing flood cuts monument labor costs by 20% for that year (§2a).
Abandoning a monument costs Ma'at and Priesthood approval.

---

## 7. Output Contract: the Strategic Briefing Dashboard

Every game turn opens with the same **State of the Realm** block. The middle of the
briefing is either a **Crisis Decree** (7a) or an **Opportunity Briefing** (7b).

### 7a. Crisis Decree

```markdown
### 👑 THE STATE OF THE REALM
*   **Ruler Health & Age:** [Name, Status, Age]
*   **The Treasury & Granaries:** [Current wealth / food reserves vs. Burn rate]
*   **The Dynastic Succession:** [Heir, Loyalty/Legitimacy score]
*   **Faction Support:**
    *   *The Priesthood / Church:* [X]% Approval (Current Demands: [...])
    *   *The Military / Nobles:* [X]% Approval (Current Demands: [...])
    *   *The Nomarchs & Viziers / Bureaucracy:* [X]% Approval (Current Demands: [...])
    *   *The Harem / Dynasty:* [X]% Approval (Most dangerous wife: [name, satisfaction %, her son])

### ⚡ CURRENT CRISIS DECREE
[One systemic political standoff: who threatens whom, what is at stake, why it matters to the bloodline.]

### 📜 THE STRATEGIC OPTIONS
*   **Option N: [Action Title]**
    *   *Immediate Cost:* [...]
    *   *Political Fallout:* [who loves it, who plots]
    *   *Long-Term Dynastic Risk:* [succession / marriage / bloodline impact]
```

### 7b. Opportunity Briefing

```markdown
### 👑 THE STATE OF THE REALM
[identical block, plus a **Surplus** line: grain and gold above the safe reserve]

### 🌅 THE GODS SMILE — OPPORTUNITY OF THE SEASON
[One windfall: what arrived, who claims credit for it, and what it could become.
Written as a celebration. The danger here is waste and envy, not survival.]

### 🔭 OMENS ON THE HORIZON
[1–2 hints about pressures building toward a future crisis, e.g. "the Elephantine
priests say the southern rains were thin", "Hatti's envoys are cold". They let the
player decide whether to spend or prepare.]

### 🏛️ THE ROYAL INVESTMENTS
*   **Option N: [Investment Title]**
    *   *Investment:* [grain, gold, labor or seasons committed]
    *   *Political Dividend:* [who is honored, and who resents being left out]
    *   *Long-Term Dynastic Legacy:* [the lasting mark on Ma'at, the heir, alliances or preparedness]
```

### Rules for both types
- 3 or 4 options, never a binary yes/no.
- Every option has a real cost; no dominant choice. In an Opportunity the cost is
  what you *didn't* do with the surplus, and who you didn't reward.
- The player may always issue a custom counter-proposal, which is judged against the same Bronze Age constraints.
- Wait for the decree. Never auto-advance.

---

## 8. Briefing Rotation & Pacing (Avoiding Choice Fatigue)

If every turn is a disaster, the player burns out and the game turns into a
firefighting simulator. Rotation exists so that the player gets real turns of
success, and so that crises land harder because they break a run of prosperity.

### 8.1 What decides the briefing type

The simulation state decides the type, not a coin flip. At the start of each turn,
roll against the **Opportunity chance**:

| Factor | Opportunity chance |
|---|---|
| Base | 30% |
| Ma'at 80+ / 50–79 / 25–49 / <25 | +25% / +10% / −10% / −25% |
| Blessing flood this year | +20% |
| Lean Year | −5% |
| Famine or Deluge this year | Crisis forced |
| A seeded crisis has matured (plot, invasion, unpaid arrears ≥ 3 months) | Crisis forced |
| Previous turn resolved a major crisis | Respite rule (8.2) |

High Ma'at produces more good seasons, which is thematic: a king the gods favor
sees more blessings. A collapsing king sees fewer, so the "Rejected by the Gods"
spiral has to be earned.

### 8.2 Pacing guardrails
- **Respite rule:** after a major crisis is resolved with Ma'at still ≥ 25, the next
  turn is an Opportunity, unless a matured crisis forces otherwise. Survival earns a breath.
- **Hard cap: never more than 4 crises in a row**, whatever Ma'at is, except for existential
  threats (a march on the palace, a poison plot, the Oracle of Amun). Even a collapsing realm
  gets a breath.
- **No more than 2 crises in a row**, unless Ma'at < 25 or the player ignored an omen
  that then matured. A death spiral may come only from the player's own choices.
  Lesser forced crises (famine, deluge, strikes, riots) wait in the queue for a turn
  rather than break this rule.
- **No more than 3 Opportunities in a row.** On the third, an Omen must be close to
  maturing, so prosperity never feels permanent.
- **Target rhythm at healthy Ma'at:** about 1 Opportunity for every 2 Crises.

### 8.3 Surplus
`Surplus` = royal grain above **6 months of burn**, plus gold above the diplomatic
reserve (gold needed for the year's treaty gifts). Opportunities are mostly about how
to spend Surplus. Hoarding it is always one legitimate option.

### 8.4 Opportunity archetypes

| Opportunity | Typical options |
|---|---|
| **The Blessing** (a 15–16 cubit flood and a +25% harvest) | Raise a monument · hold an Opet festival · fill the granaries for the lean years · remit taxes to the nomes |
| **The Punt Expedition returns** (incense, myrrh trees, ebony, electrum, panther skins) | Plant the myrrh terraces at Amun's temple · gift the electrum to foreign courts · reward the expedition's admiral and nome · hold the incense for the Sed festival |
| **A foreign princess arrives** (from Babylon or Mitanni, with a dowry) | Raise her above existing wives · marry her into a prince's household · seclude her and keep her dowry · use her to strengthen a treaty |
| **A son is born** | Name him in a temple rite · foster him with a Nomarch family · promise him to a priesthood · keep him hidden from harem rivals |
| **Victory dividend** (captives, cattle, tribute) | Settle captives as corvée labor · endow a temple with the booty · reward the generals · settle veterans on land |
| **The Sed festival** (Year 30, jubilee renewal) | Spend lavishly for a permanent Ma'at boost · invite foreign envoys to show off · use the festival to formally designate the heir |
| **A new gold seam in the Eastern Desert or Nubia** | Fund a Hittite or Babylonian alliance · buy mercenaries · grant the mine to a temple |

### 8.5 Why Opportunities still have teeth
- **Credit is political.** A perfect flood may be claimed by Karnak ("Amun answered
  our prayers") or by the Nomarchs ("our dykes held"). Whoever you thank gains approval.
  Whoever you don't, sulks.
- **Envy is a seed.** Rewarding one wife, son or general plants a resentment that can
  surface later as a crisis.
- **Preparation pays visibly.** Granaries filled, gold banked, or labor reserved in
  an Opportunity **reduce costs or unlock an extra option** in the next Crisis.
  (E.g. "Open the Hoarded Granaries" appears only if Surplus was stored.) This is
  how the player builds the empire proactively instead of only reacting.
- **Ignored omens mature.** An Omen the player prepared for becomes a manageable Crisis.
  An Omen the player ignored becomes a severe Crisis with harsher options.

---

## 9. Design Pillars (checklist for every mechanic and event)

1. Does it make divinity feel **fragile** — can it cost Ma'at?
2. Does it force a choice **between power blocks**? (In Opportunities: who gets the credit?)
3. Does it touch the **bloodline** — an heir, a wife, a marriage alliance?
4. Is it paid in **grain** (domestic) or **gold** (foreign) — and is that the right one?
5. Does it plant a **delayed consequence** rather than resolving cleanly?
6. Does the **pacing** give the player room to enjoy success before the next fire (§8)?
