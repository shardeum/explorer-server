import { useState, useEffect, useCallback } from 'react'

const LAPTOP_BREAKPOINT = 1280
const TABLET_PRO_BREAKPOINT = 960
const TABLET_BREAKPOINT = 820
const MOBILE_BREAKPOINT = 576

export function useLayoutBreakpoint() {
  const [isDesktop, setIsDesktop] = useState<boolean>()
  const [isLaptop, setIsLaptop] = useState<boolean>()
  const [isTabletPro, setIsTabletPro] = useState<boolean>()
  const [isTablet, setIsTablet] = useState<boolean>()
  const [isMobile, setIsMobile] = useState<boolean>()

  const handleResize = useCallback(() => {
    if (LAPTOP_BREAKPOINT < window.innerWidth) setIsDesktop(true)
    else setIsDesktop(false)

    if (TABLET_PRO_BREAKPOINT < window.innerWidth && window.innerWidth <= LAPTOP_BREAKPOINT) {
      setIsLaptop(true)
    } else setIsLaptop(false)

    if (TABLET_BREAKPOINT < window.innerWidth && window.innerWidth <= TABLET_PRO_BREAKPOINT) {
      setIsTabletPro(true)
    } else setIsTabletPro(false)
    if (MOBILE_BREAKPOINT < window.innerWidth && window.innerWidth <= TABLET_BREAKPOINT) {
      setIsTablet(true)
    } else setIsTablet(false)
    if (window.innerWidth <= MOBILE_BREAKPOINT) setIsMobile(true)
    else setIsMobile(false)
  }, [])

  useEffect(() => {
    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [handleResize])

  return {
    isDesktop,
    isLaptop,
    isTabletPro,
    isTablet,
    isMobile,
  }
}
