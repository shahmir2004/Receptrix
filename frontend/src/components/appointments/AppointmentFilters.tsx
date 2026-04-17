import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface AppointmentFilterValues {
  date?: string;
  status?: string;
}

interface AppointmentFiltersProps {
  onFilterChange: (filters: AppointmentFilterValues) => void;
  filters: AppointmentFilterValues;
}

const statusOptions = ['all', 'pending', 'confirmed', 'cancelled'] as const;

export function AppointmentFilters({ onFilterChange, filters }: AppointmentFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-date" className="text-white/70">
          Date
        </Label>
        <Input
          id="filter-date"
          type="date"
          value={filters.date ?? ''}
          onChange={(e) =>
            onFilterChange({ ...filters, date: e.target.value || undefined })
          }
          className="w-44 bg-[#111] border-white/10 text-white"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-white/70">Status</Label>
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(val) =>
            onFilterChange({
              ...filters,
              status: val === 'all' ? undefined : val,
            })
          }
        >
          <SelectTrigger className="w-40 bg-[#111] border-white/10 text-white">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="bg-[#111] border-white/10">
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s} className="text-white capitalize">
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
