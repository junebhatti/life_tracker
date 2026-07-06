// Water intake is stored canonically in milliliters (the ring/target is
// framed in liters). oz is only ever an input convenience, converted here
// before it touches the database.
export const ML_PER_OZ = 29.5735296875;

export function ozToMl(oz: number): number {
  return Math.round(oz * ML_PER_OZ);
}

export function mlToLiters(ml: number): number {
  return ml / 1000;
}
