'use client';

import { useRef, useState } from 'react';
import { api, type UsuarioAdminDto } from '@hce/api-client';
import { queryKeys, usePaginatedQuery } from '@hce/api-client/react';
import { ROL_LABEL } from '@hce/domain';
import { errorMessage } from '@hce/features';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  DataTable,
  Input,
  Kbd,
  Pagination,
  useDebouncedValue,
  useSearchHotkey,
} from '@hce/ui';
import { PermisosDrawer } from './PermisosDrawer';

const PAGE_SIZE = 20;

export function UsuariosView() {
  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const search = useDebouncedValue(term.trim(), 250);
  useSearchHotkey(() => searchRef.current?.focus());

  const list = usePaginatedQuery({
    queryKey: (page) => queryKeys.admin.usuarios({ search, page, pageSize: PAGE_SIZE }),
    queryFn: (page) => api.admin.usuarios({ search, page, pageSize: PAGE_SIZE }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-3">
        <Input
          ref={searchRef}
          type="search"
          label="Buscar usuario"
          placeholder="Nombre o correo"
          maxLength={100}
          value={term}
          aria-keyshortcuts="/ Control+K Meta+K"
          onChange={(e) => {
            setTerm(e.target.value);
            list.resetPage();
          }}
          containerClassName="w-full max-w-md"
        />
        <p className="mb-3 hidden items-center gap-1.5 text-sm text-muted md:flex">
          <Kbd>/</Kbd> para buscar
        </p>
      </div>
      {list.error && <Alert title="No se pudo cargar la lista de usuarios">{errorMessage(list.error)}</Alert>}
      {!(list.error && !list.data) && (
        <DataTable<UsuarioAdminDto>
          caption="Usuarios"
          rows={list.data?.items}
          loading={list.isFetching}
          rowKey={(u) => u.id}
          empty={search ? 'Ningún usuario coincide con la búsqueda.' : 'No hay usuarios registrados.'}
          columns={[
            {
              key: 'usuario',
              header: 'Usuario',
              cell: (u) => (
                <span className="flex items-center gap-3">
                  <Avatar name={u.nombreCompleto} seed={u.email} />
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">{u.nombreCompleto}</span>
                    <span className="block truncate text-sm text-muted">{u.email}</span>
                  </span>
                </span>
              ),
            },
            {
              key: 'rol',
              header: 'Rol',
              hideBelow: 'sm',
              cell: (u) => ROL_LABEL[u.rol],
            },
            {
              key: 'estado',
              header: 'Estado',
              hideBelow: 'md',
              cell: (u) => <Badge tone={u.activo ? 'ok' : 'neutral'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>,
            },
            {
              key: 'exc',
              header: 'Excepciones',
              align: 'right',
              cell: (u) =>
                u.excepciones > 0 ? (
                  <Badge tone="warn">{u.excepciones}</Badge>
                ) : (
                  <span className="text-muted">Ninguna</span>
                ),
            },
            {
              key: 'acc',
              header: <span className="sr-only">Acciones</span>,
              align: 'right',
              cell: (u) => (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSelected(u.id)}
                  aria-label={`Gestionar permisos de ${u.nombreCompleto}`}
                >
                  Gestionar permisos
                </Button>
              ),
            },
          ]}
        />
      )}
      {list.data && list.data.total > 0 && (
        <Pagination page={list.page} pageSize={PAGE_SIZE} total={list.data.total} onPageChange={list.setPage} />
      )}
      <PermisosDrawer usuarioId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
