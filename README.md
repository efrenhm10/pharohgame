# Horus in the Flesh

A Bronze Age political simulation. You are Pharaoh, the living Horus, in Regnal
Year 9 of a New Kingdom reign. The Nile has failed, the Libu are marching on the
Delta, your army is unpaid, and your eldest son wants your heir's title. Keep
Ma'at, the granaries and the bloodline intact for as long as you can.

This is not a city-builder, and it is not an "age up" event loop. Every season is
a **Strategic Briefing**: the state of the realm, then one systemic **Crisis** or
one **Opportunity**, and 3–4 decrees with explicit costs, fallout and dynastic
risk. When your reign ends, your heart is weighed against the feather of Ma'at.

## Play

ES modules cannot load from `file://`, so serve the folder (Node 18+, no dependencies):

```bash
npm start
```

Then open http://localhost:8000. Your reign is saved in the browser automatically.
Keys: `1`–`4` seal a decree, `Enter` turns the season.

## Test

```bash
npm test
```

The suite covers the flood odds, grain arithmetic, rotation guardrails and content
contract, plus a fuzz run that plays 300 random reigns to completion.

## Layout

| Path | What it is |
|---|---|
| `DESIGN.md` | The design bible: every rule the game implements |
| `src/engine/` | Pure simulation with no DOM: flood, economy, court, rotation, judgment |
| `src/content/` | Crises, opportunities, omens and bloc demands |
| `src/ui/render.js` | Renders the Strategic Briefing Dashboard |
| `src/main.js` | Browser wiring and save/load |
| `tests/` | `node:test` suite |

## Adding an event

Add an object to `src/content/crises.js` or `src/content/opportunities.js`:

```js
{
  id: 'my_event', type: 'crisis', title: 'A Title',
  when: (s) => s.maat < 60,          // eligible for random selection
  weight: 6,                         // relative likelihood
  brief: (s, ctx) => ['Paragraph with **bold**.'],
  options: [{
    id: 'a', title: '…', cost: '…', fallout: '…', risk: '…',
    apply(s, api) { api.fx({ grain: -50000, maat: 5, approval: { priesthood: 10 } }); api.log('…'); },
  }],
}
```

Every event needs 3–4 options with all three trade-off fields. The test suite enforces this.
