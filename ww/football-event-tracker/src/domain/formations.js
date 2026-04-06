export const FORMATION_LAYOUTS = {
  '4-3-3': [
    ['LW', 'ST', 'RW'],
    ['CM-L', 'CM-C', 'CM-R'],
    ['LB', 'CB-L', 'CB-R', 'RB'],
    ['GK'],
  ],
  '4-4-2': [
    ['ST-L', 'ST-R'],
    ['LM', 'CM-L', 'CM-R', 'RM'],
    ['LB', 'CB-L', 'CB-R', 'RB'],
    ['GK'],
  ],
  '3-5-2': [
    ['ST-L', 'ST-R'],
    ['LW', 'CM-L', 'CM-C', 'CM-R', 'RW'],
    ['CB-L', 'CB-C', 'CB-R'],
    ['GK'],
  ],
  '4-2-3-1': [
    ['ST'],
    ['LW', 'CM-C', 'RW'],
    ['CM-L', 'CM-R'],
    ['LB', 'CB-L', 'CB-R', 'RB'],
    ['GK'],
  ],
  '4-1-4-1': [
    ['ST'],
    ['LM', 'CM-L', 'CM-R', 'RM'],
    ['CM-C'],
    ['LB', 'CB-L', 'CB-R', 'RB'],
    ['GK'],
  ],
  '4-5-1': [
    ['ST'],
    ['LM', 'CM-L', 'CM-C', 'CM-R', 'RM'],
    ['LB', 'CB-L', 'CB-R', 'RB'],
    ['GK'],
  ],
  '3-4-3': [
    ['LW', 'ST', 'RW'],
    ['LM', 'CM-L', 'CM-R', 'RM'],
    ['CB-L', 'CB-C', 'CB-R'],
    ['GK'],
  ],
  '3-4-2-1': [
    ['ST'],
    ['LW', 'RW'],
    ['LM', 'CM-L', 'CM-R', 'RM'],
    ['CB-L', 'CB-C', 'CB-R'],
    ['GK'],
  ],
  '3-1-4-2': [
    ['ST-L', 'ST-R'],
    ['LM', 'CM-L', 'CM-R', 'RM'],
    ['CM-C'],
    ['CB-L', 'CB-C', 'CB-R'],
    ['GK'],
  ],
  '3-3-2-2': [
    ['ST-L', 'ST-R'],
    ['LW', 'RW'],
    ['LM', 'CM-C', 'RM'],
    ['CB-L', 'CB-C', 'CB-R'],
    ['GK'],
  ],
  '5-3-2': [
    ['ST-L', 'ST-R'],
    ['CM-L', 'CM-C', 'CM-R'],
    ['LB', 'CB-L', 'CB-C', 'CB-R', 'RB'],
    ['GK'],
  ],
  '5-4-1': [
    ['ST'],
    ['LM', 'CM-L', 'CM-R', 'RM'],
    ['LB', 'CB-L', 'CB-C', 'CB-R', 'RB'],
    ['GK'],
  ],
  '4-2-2-2': [
    ['ST-L', 'ST-R'],
    ['LW', 'RW'],
    ['CM-L', 'CM-R'],
    ['LB', 'CB-L', 'CB-R', 'RB'],
    ['GK'],
  ],
};

export const DEFAULT_FORMATION = '4-3-3';

export function createSlotsForFormation(formationKey, previousSlots = []) {
  const layout = FORMATION_LAYOUTS[formationKey] || FORMATION_LAYOUTS[DEFAULT_FORMATION];
  const previousBySlot = previousSlots.reduce((lookup, slot) => {
    lookup[slot.slot_id] = slot;
    return lookup;
  }, {});

  let order = 1;

  return layout.flatMap((rowSlots, rowIndex) => {
    return rowSlots.map((label, columnIndex) => {
      const slot_id = `${formationKey}_r${rowIndex}_c${columnIndex}`;
      const previous = previousBySlot[slot_id];

      const slot = {
        slot_id,
        slot_label: label,
        slot_order: order,
        row_index: rowIndex,
        column_index: columnIndex,
        player_id: previous?.player_id || '',
      };

      order += 1;
      return slot;
    });
  });
}

export function groupSlotsByRow(slots) {
  const grouped = slots.reduce((lookup, slot) => {
    const key = slot.row_index;

    if (!lookup[key]) {
      lookup[key] = [];
    }

    lookup[key].push(slot);
    return lookup;
  }, {});

  return Object.keys(grouped)
    .map((key) => Number(key))
    .sort((a, b) => a - b)
    .map((rowKey) => grouped[rowKey].sort((a, b) => a.column_index - b.column_index));
}
