import React from 'react';
import { useSearchHook } from './useSearchHook';
import styles from './SearchBar.module.scss';
import { Icon } from '../Icon';

export const SearchBar: React.FC<Record<string, never>> = () => {
  const { search, setSearch, onSearch } = useSearchHook()

  const handleSearch = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSearch();
    setSearch(''); 
  };

  return (
    <form onSubmit={handleSearch} className={styles.SearchBar}>
      <Icon className={styles.iconWrapper} name="search" size="small" color="black"></Icon>
      <input
        className={styles.input}
        type="text"
        placeholder="Search by Address / Txn Hash / Cycle Number / Cycle Marker / Node ID"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
    </form>
  );
}