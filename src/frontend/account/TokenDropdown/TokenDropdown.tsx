import { useRef, useState } from "react";

import styles from "./TokenDropdown.module.scss";
import { Button, Icon, Menu, MenuItem } from "../../components";
import { SortButton } from "../../components/Button";
import ReactTooltip from "react-tooltip";
import { Token } from "../../types";

interface TokenDropdownProps {
  tokens: Token[];
}

export const TokenDropdown: React.FC<TokenDropdownProps> = (props) => {
  const { tokens } = props;
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [isSortUp, setIsSortUp] = useState<boolean>(true);

  const inputRef = useRef<HTMLInputElement>(null);

  const open = () => {
    setIsFilterOpen(true);
    inputRef?.current?.focus();
  };

  const close = () => setIsFilterOpen(false);

  return (
    <div className={styles.TokenDropdown}>
      <Menu
        anchor={
          <Button
            apperance="outlined"
            size="medium"
            onClick={open}
            className={styles.button}
            data-active={isFilterOpen}
          >
            <div>
              <span>{ tokens.length }&nbsp;Tokens</span>
            </div>
            {isFilterOpen ? (
              <Icon name="arrow_up" color="black" className={styles.icon} />
            ) : (
              <Icon name="arrow_down" color="black" className={styles.icon} />
            )}
          </Button>
        }
        horizontalPosition="left"
        isMenuOpen={isFilterOpen}
        onClose={close}
        onOpen={open}
        onMouseDown={(e) => {
          e.preventDefault();
          open();
        }}
        top={0}
        left={0}
      >
        <input
          placeholder="Search for Token Name"
          className={styles.search}
          ref={inputRef}
        />
        <div className={styles.item}>
          <div className={styles.label}>
            ERC-20 Tokens <span>(1)</span>
          </div>
          <SortButton isUp={isSortUp} onSort={() => setIsSortUp(!isSortUp)} />
        </div>
        {
          tokens && tokens.length > 0 ? (
            tokens?.map((row, index) => (
              <MenuItem
                key={index}
                label={row.balance}
                label2={row?.contractInfo.name}
                className={styles.menuItem}
              />
            ))
          ) : (
            <div className={styles.empty}>No Tokens Found!</div>
          ) // TODO: add some margin/padding style
        }
      </Menu>
      <Button
        apperance="outlined"
        className={styles.walletButton}
        size="medium"
        data-tip="View token holdings in more detail"
        data-for="tdd"
      >
        <Icon name="wallet" color="black" />
      </Button>
      <ReactTooltip effect="solid" backgroundColor="#3498db" id="tdd" />
    </div>
  );
};
