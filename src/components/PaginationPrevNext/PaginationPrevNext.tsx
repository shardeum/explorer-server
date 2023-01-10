import { MouseEventHandler } from "react";
import cx from "classnames";

import { Button } from "../Button";
import { Icon } from "../Icon";

import styles from "./PaginationPrevNext.module.scss";

export interface PaginationPrevNextProps {
  page: number | string;
  onPrev: MouseEventHandler;
  onNext: MouseEventHandler;
  className?: string;
}

export const PaginationPrevNext: React.FC<PaginationPrevNextProps> = (
  props
) => {
  const { page, onPrev, onNext, className } = props;

  return (
    <div className={cx(styles.PaginationPrevNext, className)}>
      <Button
        onClick={onPrev}
        apperance="default"
        size="medium"
        className={cx(styles.button, styles.rightborder)}
      >
        <Icon name="arrow_left" size="medium" color="black" />
      </Button>
      <div className={styles.label}>{page}</div>
      <Button
        onClick={onNext}
        apperance="default"
        size="medium"
        className={cx(styles.button, styles.leftborder)}
      >
        <Icon name="arrow_right" size="medium" color="black" />
      </Button>
    </div>
  );
};
