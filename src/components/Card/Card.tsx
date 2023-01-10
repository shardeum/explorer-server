import { ReactNode } from "react";
import Link from "next/link";
import cx from "classnames";

import styles from "./Card.module.scss";

interface CardProps {
  className?: string;
  color?:
    | "primary"
    | "secondary"
    | "warn"
    | "success"
    | "error"
    | "info"
    | undefined;
  title: string;
  count: string | number;
  icon: ReactNode;
  href: string;
}

export const Card: React.FC<CardProps> = ({
  className,
  color,
  title,
  count,
  icon: PIcon,
  href,
}) => {
  const style = cx(styles.Card, `${styles[color as string]}`, className);
  const iconStyle = cx(styles.iconWrapper, `${styles[color as string]}`);

  return (
    <Link href={href}>
      <div className={style}>
        <div className={iconStyle}>{PIcon}</div>
        <div className={styles.title}>
          {title} - <span className={styles.count}>{count}</span>
        </div>
      </div>
    </Link>
  );
};
