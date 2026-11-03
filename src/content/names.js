// Royal names of the New Kingdom. When a pool runs dry, names repeat with an
// epithet ("the Younger") rather than turning into placeholders.
export const SON_NAMES = [
  'Seti', 'Amenmose', 'Meryatum', 'Paser', 'Nebseni', 'Huy', 'Sethnakht', 'Montuhirkhopshef', 'Iuny', 'Penre',
  'Amenhirkhopshef', 'Prehirwenemef', 'Khaemwaset', 'Merenptah', 'Sethherkhepeshef', 'Meryre', 'Thutmose', 'Amenemope',
  'Wadjmose', 'Ahmose', 'Siamun', 'Amenhotep', 'Rahotep', 'Montuemhat', 'Nebmaat', 'Senakhtenre', 'Userhat', 'Djehutyemheb',
  'Ramessu', 'Pareherwenemef', 'Simontu', 'Meryamun', 'Nebenkharu', 'Sethemwia',
];
export const DAUGHTER_NAMES = [
  'Nebettawy', 'Meritamun', 'Baketmut', 'Henutmire', 'Isetnofret', 'Takhat', 'Bintanath', 'Nefertari', 'Tiye', 'Sitamun',
  'Henuttawy', 'Meritre', 'Nebetiunet', 'Ahmose-Nefertari', 'Mutnodjmet', 'Ankhesenpaaten', 'Neferure', 'Hatshepsut',
  'Sitre', 'Mutemwia', 'Iset', 'Henutsen', 'Nubkhesbed', 'Tyti', 'Duatentopet', 'Merytptah', 'Wernuro', 'Nedjemmut',
  'Baketwernel', 'Pypuy', 'Henutiunu', 'Nefertiry',
];
const EPITHETS = ['the Younger', 'the Lesser', 'the Third', 'the Fourth', 'the Fifth'];

/** An unused royal name: first from the pool, then the pool again with an epithet. */
export function freshName(pool, used) {
  const free = pool.find((n) => !used.has(n));
  if (free) return free;
  for (const ep of EPITHETS) {
    const n = pool.find((x) => !used.has(`${x} ${ep}`));
    if (n) return `${n} ${ep}`;
  }
  return `${pool[used.size % pool.length]} ${used.size}`;
}

const PLACEHOLDER = /^(Son|Daughter) of Year \d+$/;

/** Older saves named children "Daughter of Year 4": give them real names. */
export function renamePlaceholders(state) {
  const used = new Set([...state.sons, ...(state.daughters || [])].map((c) => c.name));
  for (const c of [...state.sons, ...(state.daughters || [])]) {
    if (!PLACEHOLDER.test(c.name)) continue;
    used.delete(c.name);
    c.name = freshName(c.sex === 'f' ? DAUGHTER_NAMES : SON_NAMES, used);
    used.add(c.name);
  }
}
