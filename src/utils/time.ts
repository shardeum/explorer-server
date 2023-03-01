import moment from 'moment'

export function toReadableDateFromMillis(timeInMillis: number): string {
  return moment(timeInMillis).format('MMMM Do YYYY, h:mm:ss a')
}
