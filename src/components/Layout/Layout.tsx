import { ReactNode, useEffect, useState } from "react";
import { Header } from "../Header";
import { Footer } from "../Footer";

import styles from "./Layout.module.scss";
import { Button } from "../Button";
import { Icon } from "../Icon";

export interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [showUpButton, setShowUpButton] = useState<boolean>(false);

  useEffect(() => {
    const handleScrollButtonVisibility = () => {
      setShowUpButton(window.pageYOffset > 300 ? true : false);
    };
    window.addEventListener("scroll", handleScrollButtonVisibility);

    return () => {
      window.removeEventListener("scroll", handleScrollButtonVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className={styles.Layout}>
      <Header />
      <main>{children}</main>
      <Footer />
      {showUpButton && (
        <Button
          apperance="outlined"
          className={styles.button}
          onClick={scrollToTop}
        >
          <Icon name="up_arrow" size="large" color="black" />
        </Button>
      )}
    </div>
  );
};
