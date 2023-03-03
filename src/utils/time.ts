export function toReadableDateFromMillis(timeInMillis: number): string {
  return new Date(timeInMillis).toString()
}
