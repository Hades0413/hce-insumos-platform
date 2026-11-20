export { cn } from './cn';
export {
  useDebouncedValue,
  useAnimatedNumber,
  usePrefersReducedMotion,
  useSearchHotkey,
  useModifierKeyLabel,
  useScrolled,
  useExitAnimation,
} from './hooks';
export { runViewTransition, canUseViewTransition } from './view-transition';

export { Button, type ButtonProps } from './primitives/Button';
export {
  Input,
  LineNumberInput,
  parseNumberInput,
  type InputProps,
  type LineNumberInputProps,
} from './primitives/Field';
export { Spinner, PageLoader } from './primitives/Spinner';
export { Kbd } from './primitives/Kbd';
export { Badge, Alert, EmptyState, Card, PageHeader, type Tone } from './primitives/Feedback';
export { AccessDenied } from './primitives/AccessDenied';

export { Modal, type ModalProps } from './overlay/Modal';
export { Drawer, type DrawerProps } from './overlay/Drawer';
export { ConfirmDialog, type ConfirmDialogProps } from './overlay/ConfirmDialog';
export { ToastProvider, useToast, type ToastApi } from './overlay/Toast';
export { useDialogBehavior } from './overlay/useDialogBehavior';

export { DataTable, type Column } from './data/DataTable';
export { Pagination, type PaginationProps } from './data/Pagination';
export { Money, DateTime, formatDateTime } from './data/Money';
export { AnimatedMoney } from './data/AnimatedMoney';
export { SkeletonTable, PageSkeleton } from './data/SkeletonTable';
export { StepChart, type StepPoint } from './data/StepChart';

export { AppShell, type AppShellProps, type ShellNavItem, type ShellUser } from './layout/AppShell';
export { BrandMark, BrandLockup } from './layout/BrandMark';
export { Avatar, initials } from './layout/Avatar';
export { UserMenu, type UserMenuProps } from './layout/UserMenu';
export { SubNav, subNavClass } from './layout/SubNav';

export { LoteStamp } from './domain/LoteStamp';
export { StockMeter, StockLevel, type StockMeterProps } from './domain/StockMeter';
export { Totales } from './domain/Totales';
export { DocumentFooter, type DocumentFooterProps } from './domain/DocumentFooter';
export {
  LineItemsTable,
  LineCell,
  LineAmountsCells,
  RemoveLineButton,
  ProductoCell,
  WIDE_ONLY,
  type LineColumn,
} from './domain/LineItemsTable';
export { ApiErrorAlert, type ApiErrorAlertProps } from './domain/ApiErrorAlert';
export { ProductoCombobox, type ProductoComboboxProps } from './domain/ProductoCombobox';
export { DocumentoDetalle } from './domain/DocumentoDetalle';
export {
  DocumentoHistorialView,
  type DocumentoHistorialViewProps,
  type RangoFechas,
} from './domain/DocumentoHistorialView';
export type { ProductoOption, DocumentoView, DocumentoResumenView, DocumentoLineaView, Importes } from './domain/types';
