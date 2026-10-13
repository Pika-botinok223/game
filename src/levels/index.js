import * as l1 from './level01_inbound.js';
import * as l2 from './level02_core.js';
import * as l3 from './level03_containment.js';
import * as l4 from './level04_pad39.js';

export const LEVELS = [l1, l2, l3, l4];
export function buildMenuScene(game, b) { return l4.buildShowcase(game, b); }
