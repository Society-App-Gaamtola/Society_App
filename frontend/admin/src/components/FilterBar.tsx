'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { useUrlState } from '@/hooks/useUrlState';
import { DateRangePicker } from './common';
import { Button, Input, NativeSelectTrigger, Select, SelectOptions } from './ui/primitives';

const DEBOUNCE_MS = 400;
const ALL = '__all';

export type FilterSelect = { name: string; label: string; options: (string | { value: string; label: string })[] };

/** Search, dropdown filters and a date range, all kept in the URL. `keep` names URL params Reset must not clear (e.g. tabs). */
export function FilterBar({
  searchPlaceholder = 'Search...',
  selects = [],
  dateRange = false,
  keep = [],
}: {
  searchPlaceholder?: string;
  selects?: FilterSelect[];
  dateRange?: boolean;
  keep?: string[];
}) {
  const { search, get, setParams, reset } = useUrlState();
  const [text, setText] = useState(search);
  const setParamsRef = useRef(setParams);
  setParamsRef.current = setParams;

  // Follow outside changes such as Reset or the top bar search.
  useEffect(() => setText(search), [search]);

  useEffect(() => {
    if (text === search) return;
    const timer = setTimeout(() => setParamsRef.current({ search: text }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, search]);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="pl-9"
        />
      </div>
      {dateRange ? <DateRangePicker /> : null}
      {selects.map((select) => (
        <Select
          key={select.name}
          value={get(select.name) || ALL}
          onValueChange={(value) => setParams({ [select.name]: value === ALL ? undefined : value })}
        >
          <NativeSelectTrigger placeholder={select.label} />
          <SelectOptions
            options={[
              { value: ALL, label: `All ${select.label}` },
              ...select.options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)),
            ]}
          />
        </Select>
      ))}
      <Button variant="ghost" className="text-muted-foreground" onClick={() => reset(keep)}>
        <RotateCcw className="h-4 w-4" /> Reset
      </Button>
    </div>
  );
}
