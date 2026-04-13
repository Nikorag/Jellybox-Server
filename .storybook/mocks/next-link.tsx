import * as React from 'react'

// Minimal next/link stub for Storybook (Vite can't use the real Next.js router)
const Link = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
>(({ href, children, ...rest }, ref) => (
  <a ref={ref} href={href} {...rest}>
    {children}
  </a>
))
Link.displayName = 'Link'

export default Link
