// The known world around 1200 BCE: provinces Pharaoh can rule, tax or take.
//
// owner:   'egypt' or a realm id      status: 'province' (direct rule) | 'vassal' (tribute)
// gold:    deben a year at development 50   grain: khar a year when ruled directly
// defense: walls and garrison strength       requires: a province you must hold first
// natural: who takes the province back if it revolts
export const REGIONS = {
  canaan: { name: 'Canaan', front: 'canaan' },
  syria: { name: 'Syria', front: 'canaan' },
  mesopotamia: { name: 'Upper Mesopotamia', front: 'canaan' },
  islands: { name: 'Alashiya', front: 'canaan' },
  sinai: { name: 'Sinai', front: 'canaan' },
  kush: { name: 'Kush', front: 'south' },
  libya: { name: 'Libya', front: 'west' },
};

export const RESOURCES = {
  trade: '⚖️ Trade',
  cedar: '🌲 Cedar',
  horses: '🐎 Horses',
  gold: '🪙 Gold',
  copper: '🟤 Copper',
  turquoise: '💎 Turquoise',
  cattle: '🐄 Cattle',
  dates: '🌴 Dates',
};

export const PROVINCES = [
  // Canaan: Egypt's old empire of vassal city-states.
  { id: 'gaza', name: 'Gaza', region: 'canaan', owner: 'egypt', status: 'province', natural: 'canaan', dev: 50, gold: 80, grain: 60000, defense: 30, resource: 'trade', unrest: 20 },
  { id: 'ashkelon', name: 'Ashkelon', region: 'canaan', owner: 'egypt', status: 'vassal', natural: 'canaan', dev: 45, gold: 70, grain: 40000, defense: 35, unrest: 35 },
  { id: 'gezer', name: 'Gezer', region: 'canaan', owner: 'egypt', status: 'vassal', natural: 'canaan', dev: 35, gold: 50, grain: 40000, defense: 40, unrest: 45 },
  { id: 'megiddo', name: 'Megiddo', region: 'canaan', owner: 'egypt', status: 'vassal', natural: 'canaan', dev: 45, gold: 60, grain: 50000, defense: 45, unrest: 30 },
  { id: 'byblos', name: 'Byblos', region: 'canaan', owner: 'egypt', status: 'vassal', natural: 'canaan', dev: 60, gold: 120, grain: 20000, defense: 40, resource: 'cedar', unrest: 25 },
  // Syria: the Hittite frontier, and Egypt's ancient claims.
  { id: 'kadesh', name: 'Kadesh', region: 'syria', owner: 'hatti', status: 'province', natural: 'hatti', dev: 50, gold: 90, grain: 50000, defense: 60, resource: 'horses', claim: true, requires: ['megiddo', 'byblos'] },
  { id: 'amurru', name: 'Amurru', region: 'syria', owner: 'hatti', status: 'province', natural: 'hatti', dev: 40, gold: 70, grain: 40000, defense: 45, claim: true, requires: ['byblos', 'megiddo'] },
  { id: 'ugarit', name: 'Ugarit', region: 'syria', owner: 'hatti', status: 'province', natural: 'hatti', dev: 70, gold: 160, grain: 40000, defense: 50, resource: 'trade', requires: ['amurru', 'kadesh'] },
  { id: 'carchemish', name: 'Carchemish', region: 'syria', owner: 'hatti', status: 'province', natural: 'hatti', dev: 60, gold: 120, grain: 60000, defense: 75, requires: ['kadesh', 'ugarit'] },
  { id: 'hattusa', name: 'Hattusa', region: 'syria', owner: 'hatti', status: 'province', natural: 'hatti', dev: 70, gold: 150, grain: 80000, defense: 100, capital: true, requires: ['carchemish'] },
  // Upper Mesopotamia: Assyria.
  { id: 'hanigalbat', name: 'Hanigalbat', region: 'mesopotamia', owner: 'assyria', status: 'province', natural: 'assyria', dev: 45, gold: 80, grain: 70000, defense: 55, requires: ['carchemish', 'kadesh'] },
  { id: 'ashur', name: 'Ashur', region: 'mesopotamia', owner: 'assyria', status: 'province', natural: 'assyria', dev: 65, gold: 140, grain: 90000, defense: 95, capital: true, requires: ['hanigalbat'] },
  // Alashiya: copper island, reached by sea.
  { id: 'enkomi', name: 'Enkomi (Alashiya)', region: 'islands', owner: 'alashiya', status: 'province', natural: 'alashiya', dev: 55, gold: 130, grain: 20000, defense: 55, resource: 'copper', capital: true, requires: ['byblos', 'ugarit'] },
  // Sinai: the turquoise and copper mines.
  { id: 'sinai', name: 'Serabit el-Khadim (Sinai)', region: 'sinai', owner: 'egypt', status: 'province', natural: 'canaan', dev: 30, gold: 120, grain: 0, defense: 20, resource: 'turquoise', unrest: 10 },
  // Kush: the gold country.
  { id: 'wawat', name: 'Wawat (Lower Nubia)', region: 'kush', owner: 'egypt', status: 'province', natural: 'kush', dev: 45, gold: 200, grain: 30000, defense: 40, resource: 'gold', unrest: 15 },
  { id: 'irem', name: 'Irem (Upper Kush)', region: 'kush', owner: 'egypt', status: 'vassal', natural: 'kush', dev: 35, gold: 160, grain: 20000, defense: 35, resource: 'gold', unrest: 40 },
  { id: 'napata', name: 'Napata', region: 'kush', owner: 'kush', status: 'province', natural: 'kush', dev: 40, gold: 150, grain: 30000, defense: 50, resource: 'gold', capital: true, requires: ['irem'] },
  // Libya: the desert tribes.
  { id: 'marmarica', name: 'Marmarica (Libyan coast)', region: 'libya', owner: 'libu', status: 'province', natural: 'libu', dev: 25, gold: 40, grain: 20000, defense: 40, resource: 'cattle' },
  { id: 'siwa', name: 'Siwa Oasis', region: 'libya', owner: 'libu', status: 'province', natural: 'libu', dev: 30, gold: 50, grain: 15000, defense: 35, resource: 'dates', capital: true, requires: ['marmarica'] },
];

// Rival armies (men) and how much of it they can bring to a front.
export const REALM_POWER = {
  hatti: { army: 30000, quality: 65, aggression: 0.25, gold: 900 },
  assyria: { army: 24000, quality: 62, aggression: 0.4, gold: 700 },
  babylon: { army: 15000, quality: 50, aggression: 0.05, gold: 800 },
  alashiya: { army: 4000, quality: 55, aggression: 0.05, gold: 300 },
  canaan: { army: 2500, quality: 45, aggression: 0.2, gold: 100 },
  libu: { army: 8000, quality: 45, aggression: 0.6, gold: 60 },
  kush: { army: 6000, quality: 50, aggression: 0.3, gold: 200 },
};

export const NOME_BUILDINGS = {
  workshop: { name: 'Linen and faience workshops', gold: 200, grain: 20000, seasons: 2, income: 60, note: '+60 deben of gold a year from fine linen and faience sold abroad.' },
  harbor: { name: 'River harbor and shipyard', gold: 300, grain: 30000, seasons: 3, income: 80, only: ['memphis', 'delta', 'waset', 'coptos'], note: '+80 deben a year in trade. A harbor at Coptos opens the Red Sea road to Punt.' },
  temple: { name: 'Nome temple', gold: 300, grain: 40000, seasons: 3, note: 'Ma’at +2 and Priesthood +3% when finished; nome loyalty +5.' },
  storehouse: { name: 'Nome storehouses', gold: 100, grain: 30000, seasons: 2, note: 'Nome loyalty +1 every season, and its harvest yield +3%.' },
};

export const PROVINCE_BUILDINGS = {
  fort: { name: 'Egyptian fortress', gold: 250, grain: 30000, seasons: 2, note: 'Defense +30; unrest −2 every season.' },
  temple: { name: 'Temple of Amun-Ra', gold: 300, grain: 20000, seasons: 3, note: 'Unrest −1 every season; Ma’at +1 when finished.' },
  mine: { name: 'Royal mines', gold: 300, grain: 20000, seasons: 3, needs: ['gold', 'copper', 'turquoise'], income: 150, note: '+150 deben of gold a year.' },
  market: { name: 'Trading post', gold: 200, grain: 10000, seasons: 2, needs: ['trade', 'cedar', 'dates', 'cattle'], income: 100, note: '+100 deben of gold a year.' },
  stud: { name: 'Royal stud farm', gold: 200, grain: 20000, seasons: 2, needs: ['horses'], note: 'Chariot Corps quality +10 when finished.' },
};

export const EXPEDITIONS = {
  punt: { name: 'Expedition to Punt', gold: 300, grain: 40000, seasons: 2, note: 'Myrrh, incense, ebony and electrum: about 900 deben and Priesthood +8%. Needs a harbor at Coptos.', risk: 0.15 },
  cedar: { name: 'Cedar fleet to Byblos', gold: 100, grain: 30000, seasons: 1, note: 'Cedar for temples and ships: monuments jump ahead, and 200 deben of resale. Needs Byblos.', risk: 0.05 },
  turquoise: { name: 'Mining expedition to Sinai', gold: 0, grain: 25000, seasons: 1, note: 'Turquoise and copper: about 250 deben. Needs Sinai.', risk: 0.05 },
};
