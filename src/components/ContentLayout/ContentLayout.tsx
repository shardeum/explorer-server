import { ReactNode } from "react";
import { useRouter } from "next/router";
import cx from "classnames";

import { Button } from "../Button";
import { Icon } from "../Icon";
import { Spacer } from "../Spacer";

import styles from "./ContentLayout.module.scss";
import { Breadcrumb } from "../Breadcrumb";
import { breadcrumbsList } from "../../types";

interface ContentLayoutProps {
  className?: string;
  title: string | ReactNode;
  titleRight?: ReactNode;
  showBackButton?: boolean;
  breadcrumbItems?: { to: string; label: string }[];
  children: ReactNode;
}

export const ContentLayout: React.FC<ContentLayoutProps> = ({
  className,
  title,
  titleRight,
  showBackButton,
  breadcrumbItems,
  children,
}) => {
  const router = useRouter();

  const goBack = () => router.back();

  return (
    <div className={cx(styles.ContentLayout, className)}>
      <div className={styles.header}>
        {showBackButton && (
          <Button
            apperance="outlined"
            size="medium"
            onClick={goBack}
            className={styles.button}
          >
            <Icon name="arrow_left" size="medium" color="black" />
          </Button>
        )}
        {breadcrumbItems && breadcrumbItems.length > 0 && (
          <Breadcrumb items={breadcrumbItems || []} />
        )}
      </div>
      <div className={styles.titleWrapper}>
        {typeof title === "string" ? (
          <div className={styles.title}>{title}</div>
        ) : (
          title
        )}
        {titleRight && titleRight}
      </div>
      <hr />
      <Spacer space="16" />
      {children}
    </div>
  );
};
