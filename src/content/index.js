import { CRISES } from './crises.js';
import { OPPORTUNITIES } from './opportunities.js';

/** Every event in the game, keyed by id. */
export const EVENTS = Object.fromEntries([...CRISES, ...OPPORTUNITIES].map((e) => [e.id, e]));
