import { Alert } from '../primitives/Feedback';

export interface ApiErrorAlertProps {
  title: string;
  message: string;
  details?: ReadonlyArray<string>;
  reference?: string;
}

export function ApiErrorAlert({ title, message, details = [], reference }: ApiErrorAlertProps) {
  return (
    <Alert title={title}>
      <p>{message}</p>
      {details.length > 0 && (
        <ul className="mt-1.5 list-disc pl-5">
          {details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
      {reference && <p className="mt-1.5 text-sm text-muted">Referencia para soporte: {reference}</p>}
    </Alert>
  );
}
