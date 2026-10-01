import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function TransformSelect<T extends string>({
  value,
  options,
  label,
  onChange,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  label: string
  onChange: (value: T) => void
}) {
  return (
    <div className="w-full min-w-0">
      <Select value={value} onValueChange={(next) => next && onChange(next as T)}>
        <SelectTrigger aria-label={label} className="w-full min-w-0">
          <SelectValue>{options.find((option) => option.value === value)?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
