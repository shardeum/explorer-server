import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { useLayoutBreakpoint } from "../../utils/useLayoutBreakpoint";

import { Icon, Menu, MenuItem, Button, Dropdown } from "../index";

import styles from "./Header.module.scss";

interface HeaderProps {}

const navLinks = [
  { key: "/", value: "Home" },
  // {
  //   key: "/blockchain",
  //   value: "Blockchain",
  // },
  {
    key: "/token",
    value: "Tokens",
  },
  {
    key: "/resource",
    value: "Resources",
  },
  {
    key: "/testnet",
    value: "Testnets",
  },
  {
    key: "/",
    value: "More",
  },
  // { key: "/singin", value: "Sign In" },
];

export const Header: React.FC<HeaderProps> = ({}) => {
  const router = useRouter();

  const { isTablet, isMobile } = useLayoutBreakpoint();

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const open = () => setIsMenuOpen(true);
  const close = () => setIsMenuOpen(false);

  const renderMenuButton = () => {
    if (isTablet || isMobile) {
      return (
        <Menu
          anchor={
            <Button
              onMouseEnter={open}
              onClick={open}
              apperance="outlined"
              size="medium"
            >
              <Icon name="menu" size="medium" color="black" />
            </Button>
          }
          isMenuOpen={isMenuOpen}
          onClose={close}
          onOpen={open}
          horizontalPosition="right"
          verticalPosition="bottom"
          top={4}
          left={-30}
          onMouseDown={(e) => e.preventDefault()}
        >
          {navLinks.map((item) => (
            <MenuItem
              key={item.key}
              label={item.value}
              isActive={item.key === router.pathname}
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
            />
          ))}
        </Menu>
      );
    }
    return;
  };

  return (
    <header className={styles.Header}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logoWrapper}>
          <Icon name="logo" className={styles.logo} size="extraLarge" />
          <div className={styles.name}>Shardeum Explorer</div>
        </Link>
        <ul className={styles.list}>
          {navLinks.map((item) => (
            <li key={item.key} className={styles.list_item}>
              <Link href={item.key}>{item.value}</Link>
            </li>
          ))}
        </ul>
        {renderMenuButton()}
      </nav>
    </header>
  );
};
