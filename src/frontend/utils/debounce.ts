export function debounce(func, wait): (...args: any[]) => void {
  let timeout
  return function executedFunction(...args): void {
    const later = (): void => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
