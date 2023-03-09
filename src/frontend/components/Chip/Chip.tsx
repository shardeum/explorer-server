import cx from "classnames";

import styles from "./Chip.module.scss";

interface ChipProps {
  className?: string;
  color?: "primary" | "warn" | "success" | "error" | "info";
  size?: "large" | "medium" | "small";
  title: string;
}

export const Chip: React.FC<ChipProps> = ({
  className,
  color = "primary",
  size = "small",
  title,
}) => {
  const style = cx(
    styles.Chip,
    `${styles[color as string]}`,
    `${styles[size as string]}`,
    className
  );

  return <div className={style}>{title}</div>;
};
