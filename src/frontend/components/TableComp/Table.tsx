import React, { ReactNode } from 'react'
import styles from './Table.module.scss'
import get from 'lodash/get'

export interface ITableProps<T> {
  columns: IColumnProps<T>[]
  data: T[]
}

export interface IColumnProps<T> {
  key: string
  value: string | ReactNode
  maxChar?: number
  render?: (value: T[keyof T], item: T) => JSX.Element | string
}

interface ITableBody<T> {
  col: IColumnProps<T>
  row: T
}


export function Table<T = unknown>({ columns, data }: ITableProps<T>): ReactNode {
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
          {data && data.map((row, index) => (
            <tr key={index}>
              {columns.map((col: IColumnProps<T>) => (
                <TableBodyItem<T> col={col} row={row} key={col.key} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


export function TableHeaderItem({ value }: { value: string | ReactNode }): ReactNode {
  return <th>{typeof value === 'string' ? <span>{value}</span> : value}</th>
}

export function TableBodyItem<T>({ col, row }: ITableBody<T>): ReactNode {
  const value = get(row, col.key)

  return (
    <td style={col.maxChar ? { maxWidth: col.maxChar } : {}}>
      {col?.render ? col.render(value, row) : value}
    </td>
  )
}
