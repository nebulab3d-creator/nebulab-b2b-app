// Shim de `server-only` para Vitest: no-op. El paquete real tira en runtime
// para evitar bundle al browser; en tests Node ese chequeo no aplica.
export {};
