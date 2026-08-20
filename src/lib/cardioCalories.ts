// Estimates calories burned for a cardio session from MET (Metabolic
// Equivalent of Task) values — standard estimates from the Compendium of
// Physical Activities — instead of a flat manual guess. The formula:
//   calories = MET × body weight (kg) × duration (hours)
// For activities where distance is a meaningful signal, MET is tiered by
// pace (light/moderate/vigorous) rather than a single flat number, since a
// faster session burns more per minute than a slow one of the same length.
// This is still an estimate, not a lab measurement (real energy cost varies
// with terrain, technique, fitness level, etc.) — same "good enough for a
// fitness app" spirit as nutrition.ts's BMR/TDEE math.

// Falls back to this when the profile has no weight set yet.
const DEFAULT_WEIGHT_KG = 70;

interface MetTier { light: number; moderate: number; vigorous: number; }
interface SpeedThresholdKmh { light: number; vigorous: number; }

// Names match CARDIO_TYPES in components/logs/CardioLog.tsx — kept as plain
// string keys here (not imported from there) to avoid a circular import,
// since CardioLog imports this module.
const MET_TIERS: Record<string, MetTier> = {
  Run:  { light: 8,   moderate: 9.8, vigorous: 12.8 },
  Walk: { light: 2.8, moderate: 3.8, vigorous: 5.0 },
  Bike: { light: 4,   moderate: 7.5, vigorous: 10.0 },
  Swim: { light: 5.3, moderate: 7.0, vigorous: 9.8 },
  Row:  { light: 4.8, moderate: 7.0, vigorous: 8.5 },
};

// Speed above which a session counts as "vigorous" / below which "light",
// for the same activity (km/h). Anything in between is "moderate".
const SPEED_THRESHOLDS_KMH: Record<string, SpeedThresholdKmh> = {
  Run:  { light: 8,  vigorous: 11 },
  Walk: { light: 4,  vigorous: 6 },
  Bike: { light: 16, vigorous: 22 },
  Swim: { light: 2,  vigorous: 3 },
  Row:  { light: 8,  vigorous: 12 },
};

// No distance tracked for these in this app, so no pace signal to tier by —
// a single flat moderate-effort MET estimate instead.
const FLAT_MET: Record<string, number> = { HIIT: 8.0 };

// Generic moderate-cardio MET used only if `type` isn't one this app knows
// about (shouldn't happen via the UI, but keeps this safe to call with any
// string).
const FALLBACK_MET = 6;

export function estimateCardioCalories(
  type: string,
  distanceKm: number,
  durationMin: number,
  weightKg: number | null | undefined,
): number {
  if (durationMin <= 0) return 0;
  const weight = weightKg && weightKg > 0 ? weightKg : DEFAULT_WEIGHT_KG;

  let met: number;
  if (type in FLAT_MET) {
    met = FLAT_MET[type];
  } else {
    const tier = MET_TIERS[type];
    const thresholds = SPEED_THRESHOLDS_KMH[type];
    if (!tier || !thresholds) {
      met = FALLBACK_MET;
    } else {
      const speedKmh = distanceKm > 0 ? distanceKm / (durationMin / 60) : 0;
      met = speedKmh <= 0 ? tier.moderate
        : speedKmh < thresholds.light ? tier.light
        : speedKmh > thresholds.vigorous ? tier.vigorous
        : tier.moderate;
    }
  }

  return Math.round(met * weight * (durationMin / 60));
}
