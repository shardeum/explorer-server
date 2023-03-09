import React, { useCallback, useState } from "react";
import cx from "classnames";

import { Menu } from "../Menu";
import { Icon } from "../Icon";

import styles from "./NavDropdown.module.scss";

interface INavDropdown<T> {
  items: T[];
  label: string;
  selected?: string;
  onSelect?: (d: string) => void;
}

export function NavDropdown<T>({
  items,
  label,
  selected,
  onSelect,
}: React.PropsWithChildren<INavDropdown<T>>) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = () => setIsOpen(false);

  const handleSelect = (d: string) => {
    close();
    onSelect?.(d);
  };

  return (
    <div className={styles.NavDropdown}>
      <Menu
        anchor={
          <div data-active={isOpen} onMouseEnter={open} className={styles.item}>
            <p className={styles.title} data-active={isOpen}>
              {label}
            </p>
            {isOpen ? (
              <Icon name="arrow_up" color="black" className={styles.icon} />
            ) : (
              <Icon name="arrow_down" color="black" className={styles.icon} />
            )}
          </div>
        }
        horizontalPosition="center"
        isMenuOpen={isOpen}
        onClose={close}
        onOpen={open}
        onMouseDown={(e) => {
          e.preventDefault();
          open();
        }}
        top={18}
        className={styles.menu}
      >
        {items.map((item) => (
          <p
            key={item as string}
            onClick={() => handleSelect(item as string)}
            className={cx(styles.menuItem, selected === item && styles.active)}
          >
            {item as string}
          </p>
        ))}
      </Menu>
    </div>
  );
}
