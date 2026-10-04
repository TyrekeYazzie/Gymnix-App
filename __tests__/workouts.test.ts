import { parseSetRows, parseDecimalInput, setDisplayWeight, topSetWeight, KG_PER_LB } from '@/lib/workouts';

describe('parseDecimalInput', () => {
  it('accepts dots and commas as the decimal separator', () => {
    expect(parseDecimalInput('22.5')).toBe(22.5);
    expect(parseDecimalInput('22,5')).toBe(22.5);
    expect(parseDecimalInput(' 100 ')).toBe(100);
    expect(parseDecimalInput('.5')).toBe(0.5);
  });

  it('returns NaN for anything else', () => {
    for (const bad of ['', 'abc', '1.2.3', '-5', '1e3', '12kg']) {
      expect(parseDecimalInput(bad)).toBeNaN();
    }
  });
});

describe('parseSetRows', () => {
  it('stores weights in kg, tagged, from pounds', () => {
    expect(parseSetRows([{ reps: '10', weight: '225' }], true)).toEqual({
      sets: [{ reps: 10, weight: 102.058, unit: 'kg' }],
    });
  });

  it('keeps kg as typed', () => {
    expect(parseSetRows([{ reps: '5', weight: '22,5' }], false)).toEqual({
      sets: [{ reps: 5, weight: 22.5, unit: 'kg' }],
    });
  });

  it('saves a blank weight as bodyweight (0) and skips empty rows', () => {
    expect(parseSetRows([{ reps: '12', weight: '' }, { reps: '', weight: '' }], false)).toEqual({
      sets: [{ reps: 12, weight: 0, unit: 'kg' }],
    });
  });

  it('names the set when something is wrong instead of dropping it', () => {
    expect(parseSetRows([{ reps: '8', weight: '60' }, { reps: '', weight: '60' }], false))
      .toEqual({ error: 'Set 2: add the number of reps.' });
    expect(parseSetRows([{ reps: '10.5', weight: '60' }], false)).toHaveProperty('error');
    expect(parseSetRows([{ reps: '0', weight: '60' }], false)).toHaveProperty('error');
    expect(parseSetRows([{ reps: '201', weight: '60' }], false)).toHaveProperty('error');
    expect(parseSetRows([{ reps: '8', weight: 'abc' }], false)).toHaveProperty('error');
    expect(parseSetRows([{ reps: '8', weight: '1001' }], false)).toHaveProperty('error');
    expect(parseSetRows([{ reps: '8', weight: '2205' }], true)).toHaveProperty('error');
  });
});

describe('display weights', () => {
  it('round-trips pounds through kg without drift', () => {
    const parsed = parseSetRows([{ reps: '5', weight: '225' }], true);
    if (!('sets' in parsed)) throw new Error(parsed.error);
    expect(setDisplayWeight(parsed.sets[0], true)).toBe(225);
  });

  it('reads untagged legacy sets in the account units', () => {
    expect(setDisplayWeight({ reps: 5, weight: 225 }, true)).toBe(225);
    expect(setDisplayWeight({ reps: 5, weight: 100 }, false)).toBe(100);
  });

  it('shows tagged kg sets in pounds for imperial accounts', () => {
    expect(setDisplayWeight({ reps: 5, weight: 100, unit: 'kg' }, true)).toBe(Math.round((100 / KG_PER_LB) * 10) / 10);
  });

  it('picks the heaviest set as the top set', () => {
    expect(topSetWeight([{ reps: 5, weight: 60, unit: 'kg' }, { reps: 3, weight: 80, unit: 'kg' }], false)).toBe(80);
    expect(topSetWeight([], false)).toBe(0);
    expect(topSetWeight(null, false)).toBe(0);
  });
});
