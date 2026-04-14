const INVENTORY_VARIANT_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPersistedInventoryVariantId(id: string | undefined | null): boolean {
  return typeof id === 'string' && INVENTORY_VARIANT_UUID_PATTERN.test(id);
}
