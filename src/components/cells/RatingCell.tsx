import { Star } from 'lucide-react'

interface Props {
  value: number | null
  onChange: (val: number) => void
}

export function RatingCell({ value, onChange }: Props) {
  const current = value ?? 0
  return (
    <div className="flex items-center justify-center gap-0.5 w-full">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n === current ? 0 : n)}
          className="hover:scale-110 transition-transform"
        >
          <Star
            size={13}
            className={n <= current ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
          />
        </button>
      ))}
    </div>
  )
}
