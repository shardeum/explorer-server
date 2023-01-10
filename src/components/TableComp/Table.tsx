import styles from "./Table.module.scss";

interface HeaderProps {
  headers: HeadingProps[];
}

interface HeadingProps {
  name: string;
  value: any;
}

export const Table: React.FC<HeaderProps> = ({ headers }) => {
  return (
    <div className={styles.Table}>
      <table>
        <thead>
          <tr>
            {headers.map((item, index) => (
              <TableHeadingItem key={`${item.name}-${index}`} item={item} />
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>hi</td>
            <td>hi</td>
            <td>hi</td>
            <td>hi</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

interface TableHeadingItemProps {
  item: HeadingProps;
}

export const TableHeadingItem: React.FC<TableHeadingItemProps> = ({ item }) => (
  <th>{item.name}</th>
);

export const TableRowItem: React.FC = ({}) => {
  return <tr></tr>;
};
