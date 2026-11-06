import * as migration_20250929_111647 from './20250929_111647';
import * as migration_20261105_233422 from './20261105_233422';
import * as migration_20261105_233728 from './20261105_233728';
import * as migration_20261105_235352 from './20261105_235352';
import * as migration_20261106_001627 from './20261106_001627';
import * as migration_20261106_033438 from './20261106_033438';

export const migrations = [
  {
    up: migration_20250929_111647.up,
    down: migration_20250929_111647.down,
    name: '20250929_111647',
  },
  {
    up: migration_20261105_233422.up,
    down: migration_20261105_233422.down,
    name: '20261105_233422',
  },
  {
    up: migration_20261105_233728.up,
    down: migration_20261105_233728.down,
    name: '20261105_233728',
  },
  {
    up: migration_20261105_235352.up,
    down: migration_20261105_235352.down,
    name: '20261105_235352',
  },
  {
    up: migration_20261106_001627.up,
    down: migration_20261106_001627.down,
    name: '20261106_001627',
  },
  {
    up: migration_20261106_033438.up,
    down: migration_20261106_033438.down,
    name: '20261106_033438'
  },
];
