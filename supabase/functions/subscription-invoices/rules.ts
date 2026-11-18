export function subscriptionId(invoice: { subscription?: unknown; parent?: { subscription_details?: { subscription?: unknown } } | null }): string | null {
  const value = invoice.subscription ?? invoice.parent?.subscription_details?.subscription;
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") return value.id;
  return null;
}

export function ownsInvoice(invoice: Parameters<typeof subscriptionId>[0] & { livemode: boolean }, owned: string[]): boolean {
  const id = subscriptionId(invoice);
  return invoice.livemode && id !== null && owned.includes(id);
}