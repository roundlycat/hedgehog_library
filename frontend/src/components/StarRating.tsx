import { Star } from 'lucide-react'

interface Props {
    rating: number | null
    onChange?: (rating: number) => void
    size?: number
    readonly?: boolean
}

export function StarRating({ rating, onChange, size = 14, readonly = false }: Props) {
    const stars = [1, 2, 3, 4, 5]

    return (
        <div className="flex items-center gap-0.5">
            {stars.map(n => (
                <button
                    key={n}
                    type="button"
                    disabled={readonly}
                    onClick={() => onChange?.(n === rating ? 0 : n)}
                    className={`transition-all duration-100 ${readonly ? 'cursor-default' : 'hover:scale-110 cursor-pointer'
                        }`}
                    title={readonly ? undefined : `Rate ${n} star${n !== 1 ? 's' : ''}`}
                >
                    <Star
                        size={size}
                        className={
                            rating && n <= rating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-bark-300 fill-transparent'
                        }
                    />
                </button>
            ))}
        </div>
    )
}
