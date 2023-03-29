import styles from './Table.module.scss'
import get from 'lodash/get'

export interface ITableProps<T> {
  columns: IColumnProps<T>[]
  data: T[]
}

export interface IColumnProps<T> {
  key: string
  value: any
  maxChar?: number
  render?: (value: unknown, item: any) => void
}

interface ITableBody<T> {
  col: IColumnProps<T>
  row: any
}

export function Table<T>({ columns, data }: ITableProps<T>) {
  return (
    <div className={styles.Table}>
      <table>
        <thead>
          <tr>
            {columns.map((item) => (
              <TableHeaderItem key={item.key} value={item.value} />
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              {columns.map((col) => (
                <TableBodyItem col={col} row={row} key={col.key} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TableHeaderItem({ value }: { value: string | any }) {
  return <th>{typeof value === 'string' ? <span>{value}</span> : value}</th>
}

export function TableBodyItem<T>({ col, row }: ITableBody<T>) {
  const value = get(row, col.key)

  return (
    <td style={col.maxChar ? { maxWidth: col.maxChar } : {}}>
      {col?.render ? col.render(value, row) : value}
    </td>
  )
}
