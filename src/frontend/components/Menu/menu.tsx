// import React, { useCallback, useEffect, useMemo, useRef } from "react";
// import cx from "classnames";

// import styles from "./Menu.module.scss";

// interface MenuProps {
//   onOpen?: () => void;
//   onClose?: () => void;
//   anchor: React.ReactNode;
//   horizontalPosition?: "left" | "right" | "center";
//   verticalPosition?: "top" | "bottom";
//   isMenuOpen: boolean;
//   top?: number;
//   left?: number;
//   className?: string;
//   onMouseDown?: (e: any) => void;
//   children: React.ReactNode;
// }

// export const Menu: React.FC<MenuProps> = (props) => {
//   const {
//     onOpen,
//     onClose,
//     anchor,
//     horizontalPosition = "left",
//     verticalPosition = "bottom",
//     isMenuOpen,
//     top = 0,
//     left = 0,
//     className,
//     onMouseDown,
//     children,
//   } = props;

//   const menuRef = useRef<HTMLDivElement>(null);
//   const anchorRef = useRef<HTMLDivElement>(null);

//   const getPositionFromTop = useCallback(
//     (position: "top" | "bottom", anchor: DOMRect, menu: DOMRect) => {
//       if (position === "top") {
//         return (anchor?.top || 0) - (menu?.height || 0);
//       }

//       return anchor?.bottom || 0;
//     },
//     []
//   );

//   const getPositionFromLeft = useCallback(
//     (position: "left" | "right" | "center", anchor: DOMRect, menu: DOMRect) => {
//       switch (position) {
//         case "center":
//           return (
//             anchor?.left + (anchor?.width || 0) / 2 - (menu?.width || 0) / 2
//           );
//         case "right":
//           return (anchor?.right || 0) - (menu?.width || 0);
//         case "left":
//           return anchor?.left || 0;
//       }
//     },
//     []
//   );

//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   const placeMenu = () => {
//     const menuRect = menuRef.current?.getBoundingClientRect();
//     const anchorRect = anchorRef.current?.getBoundingClientRect();

//     const leftPosition = getPositionFromLeft(
//       horizontalPosition,
//       anchorRect as DOMRect,
//       menuRect as DOMRect
//     );

//     const topPosition = getPositionFromTop(
//       verticalPosition,
//       anchorRect as DOMRect,
//       menuRect as DOMRect
//     );

//     menuRef.current?.style.setProperty("position", "absolute");
//     menuRef.current?.style.setProperty("top", `${topPosition + top}px`);
//     menuRef.current?.style.setProperty("left", `${leftPosition + left}px`);

//     menuRef.current?.focus();
//   };

//   // const placeMenu = useCallback(() => {
//   //   const menuRect = menuRef.current?.getBoundingClientRect();
//   //   const anchorRect = anchorRef.current?.getBoundingClientRect();

//   //   const leftPosition = getPositionFromLeft(
//   //     horizontalPosition,
//   //     anchorRect as DOMRect,
//   //     menuRect as DOMRect
//   //   );

//   //   const topPosition = getPositionFromTop(
//   //     verticalPosition,
//   //     anchorRect as DOMRect,
//   //     menuRect as DOMRect
//   //   );

//   //   console.log(leftPosition + left, topPosition + top);

//   //   menuRef.current?.style.setProperty("position", "absolute");
//   //   menuRef.current?.style.setProperty("top", `${topPosition + top}px`);
//   //   menuRef.current?.style.setProperty("left", `${leftPosition + left}px`);

//   //   menuRef.current?.focus();
//   // }, [
//   //   getPositionFromLeft,
//   //   getPositionFromTop,
//   //   horizontalPosition,
//   //   left,
//   //   top,
//   //   verticalPosition,
//   // ]);

//   const closeMenu = useCallback(() => {
//     onClose?.();
//   }, [onClose]);

//   useEffect(() => {
//     placeMenu();
//     window.addEventListener("resize", closeMenu);
//     window.addEventListener("scroll", closeMenu);

//     return () => {
//       window.removeEventListener("resize", closeMenu);
//       window.addEventListener("scroll", closeMenu);
//     };
//   }, [closeMenu, placeMenu]);

//   return (
//     <>
//       <div ref={anchorRef}>{anchor}</div>
//       {isMenuOpen && (
//         <div
//           ref={menuRef}
//           onClick={onOpen}
//           onFocus={onOpen}
//           onBlur={onClose}
//           tabIndex={0}
//           className={cx(styles.Menu, className)}
//           data-active={isMenuOpen}
//           role="button"
//           onMouseDown={onMouseDown}
//         >
//           {children}
//         </div>
//       )}
//     </>
//   );
// };

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import cx from "classnames";

import styles from "./Menu.module.scss";

interface MenuProps {
  onOpen?: () => void;
  onClose?: () => void;
  anchor: React.ReactNode;
  isMenuOpen: boolean;
  className?: string;
  onMouseDown?: (e: any) => void;
  children: React.ReactNode;
}

export const Menu: React.FC<MenuProps> = (props) => {
  const {
    onOpen,
    onClose,
    anchor,
    isMenuOpen,
    className,
    onMouseDown,
    children,
  } = props;

  const menuRef = useRef(null);

  const handleOutsideClick = useCallback((event: MouseEvent) => {
    // @ts-ignore
    if (menuRef.current && !menuRef.current?.contains(event.target)) {
      onClose?.();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("click", handleOutsideClick, true);

    return () => {
      document.removeEventListener("click", handleOutsideClick, true);
    };
  }, [handleOutsideClick]);

  return (
    <div>
      {anchor}
      {isMenuOpen && (
        <div
          onClick={onOpen}
          onFocus={onOpen}
          onBlur={onClose}
          tabIndex={0}
          className={cx(styles.Menu, className)}
          data-active={isMenuOpen}
          role="button"
          onMouseDown={onMouseDown}
          ref={menuRef}
        >
          {children}
        </div>
      )}
    </div>
  );
};
