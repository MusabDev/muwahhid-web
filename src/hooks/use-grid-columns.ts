import { useEffect, useState } from 'react'

/** Columns of the book shelf grid (2 / sm:3 / md:4 / lg:5) at the current window width. */
export function useGridColumns() {
  const read = () => (window.matchMedia('(min-width: 1024px)').matches ? 5 : window.matchMedia('(min-width: 768px)').matches ? 4 : window.matchMedia('(min-width: 640px)').matches ? 3 : 2)
  const [columns, setColumns] = useState(read)
  useEffect(() => {
    const update = () => setColumns(read())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return columns
}

/** Split items into rows of `size`, so each row can stand on its own shelf plank. */
export function chunk<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size))
}
