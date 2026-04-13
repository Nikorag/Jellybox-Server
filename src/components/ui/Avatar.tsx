import Image from 'next/image'
import { cn, getInitials } from '@/lib/utils'

export interface AvatarProps {
  name?: string | null
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

export default function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const initials = getInitials(name)

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden bg-jf-primary flex items-center justify-center font-semibold text-white select-none flex-shrink-0',
        sizeClasses[size],
        className,
      )}
      aria-label={name ?? 'User avatar'}
    >
      {src ? (
        <Image src={src} alt={name ?? 'Avatar'} fill className="object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  )
}
