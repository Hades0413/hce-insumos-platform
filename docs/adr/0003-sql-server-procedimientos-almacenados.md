# 0003. SQL Server con acceso solo por procedimientos almacenados

## Contexto

Se exigen SQL Server, procedimientos almacenados y triggers de auditoría. El stock debe calcularse desde
la tabla de movimientos, sin sobreventa bajo concurrencia.

## Decisión

- Toda escritura y lectura pasa por SP con parámetros tipados y TVP (un documento por round-trip). El login de la app
  solo tiene `EXECUTE` sobre una lista blanca de SP (rol de BD).
- Stock en una vista indexada (`vw_StockProducto`), revalidado bajo `UPDLOCK/HOLDLOCK` en orden determinista.
- `READ_COMMITTED_SNAPSHOT`, triggers de auditoría genéricos e inmutabilidad de documentos y kardex.

## Consecuencias

Ventajas:

- La aplicación no arma SQL, así que no hay inyección SQL, y el motor hace cumplir la integridad.

Desventajas:

- Parte de la lógica de integridad vive en T-SQL; las reglas de negocio siguen en el dominio y el SP solo las revalida atómicamente.
