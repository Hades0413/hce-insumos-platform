'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type ProductoDto } from '@hce/api-client';
import { queryKeys } from '@hce/api-client/react';
import { ProductoCombobox, useDebouncedValue } from '@hce/ui';

export interface ProductoPickerProps {
  mode: 'compra' | 'venta';
  label: string;
  excludeIds: ReadonlyArray<number>;
  onSelect: (producto: ProductoDto) => void;
  hotkey?: boolean;
}

const PAGE = { page: 1, pageSize: 10 } as const;

export function ProductoPicker({ mode, label, excludeIds, onSelect, hotkey }: ProductoPickerProps) {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const search = useDebouncedValue(term.trim(), 250);
  const query = { ...PAGE, search };

  const { data, isFetching, isError } = useQuery({
    queryKey: queryKeys.productos.list(query),
    queryFn: () => api.productos.listar(query),
    enabled: open,
    staleTime: 10_000,
  });

  const options = data?.items ?? [];
  return (
    <ProductoCombobox
      label={label}
      mode={mode}
      term={term}
      onTermChange={setTerm}
      open={open}
      onOpenChange={setOpen}
      options={options}
      loading={isFetching}
      error={isError}
      excludeIds={excludeIds}
      hotkey={hotkey}
      onSelect={(p) => {
        const producto = options.find((o) => o.id === p.id);
        if (producto) onSelect(producto);
      }}
    />
  );
}
