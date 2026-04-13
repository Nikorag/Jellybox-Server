import * as React from 'react'

// Minimal next/image stub for Storybook
interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
}

const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  ({ src, alt, width, height, fill: _fill, priority: _priority, ...rest }, ref) => (
    <img ref={ref} src={src} alt={alt} width={width} height={height} {...rest} />
  ),
)
Image.displayName = 'Image'

export default Image
