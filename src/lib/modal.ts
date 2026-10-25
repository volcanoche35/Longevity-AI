/** Scroll lock is reference-counted so switching between dialogs cannot leave the page locked. */
let locks = 0
let previous = ''
export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => {}
  if (locks++ === 0) {
    previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  let released = false
  return () => {
    if (released) return
    released = true
    if (--locks === 0) document.body.style.overflow = previous
  }
}
