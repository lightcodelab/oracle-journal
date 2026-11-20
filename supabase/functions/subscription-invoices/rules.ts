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

export function canPayInvoice(invoice: Parameters<typeof ownsInvoice>[0] & { status: string | null; amount_remaining: number }, owned: string[]): boolean {
  return ownsInvoice(invoice, owned) && invoice.status === "open" && invoice.amount_remaining > 0;
}