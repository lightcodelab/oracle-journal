import { useCallback, useEffect, useState } from "react";
import { CreditCard, Download, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type Invoice = { id: string; number: string | null; created: number; amount: number; currency: string; status: string; downloadable: boolean; payable: boolean };
type Cursors = Record<string, string | null> | null;

export default function SubscriptionInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cursors, setCursors] = useState<Cursors>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [ready, setReady] = useState<{ blob: Blob; filename: string } | null>(null);
  const { toast } = useToast();
  const load = useCallback(async (next: Cursors = null) => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: requestError } = await supabase.functions.invoke("subscription-invoices", { body: next ? { cursors: next } : {} });
      if (requestError || data?.error) throw new Error("Invoice lookup failed");
      setInvoices((previous) => next ? [...previous, ...data.invoices] : data.invoices);
      setCursors(data.cursors);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const refresh = () => { void load(); };
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => { window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, [load]);
  const pay = async (invoice: Invoice) => {
    setPaying(invoice.id);
    try {
      const { data, error: paymentError } = await supabase.functions.invoke("subscription-invoices", { body: { invoiceId: invoice.id, action: "pay" } });
      if (paymentError || !data?.url) throw new Error("Payment unavailable");
      window.location.assign(data.url);
    } catch {
      toast({ title: "Payment page unavailable", description: "This invoice may already be paid. Refresh your invoices or try again shortly.", variant: "destructive" });
      void load();
    } finally { setPaying(null); }
  };

  const save = async (file: { blob: Blob; filename: string }) => {
    const shareFile = new File([file.blob], file.filename, { type: "application/pdf" });
    if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [shareFile] })) {
      try { await navigator.share({ files: [shareFile] }); return; }
      catch (e) { if (e instanceof DOMException && e.name === "AbortError") return; }
    }
    const url = URL.createObjectURL(file.blob);
    const link = document.createElement("a");
    link.href = url; link.download = file.filename;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const prepare = async (invoice: Invoice) => {
    setDownloading(invoice.id); setReady(null);
    try {
      const { data, error: requestError } = await supabase.functions.invoke("subscription-invoices", { body: { invoiceId: invoice.id } });
      if (requestError || !(data instanceof Blob) || !data.size || !data.type.includes("application/pdf")) throw new Error("Download failed");
      // A separate ready button preserves user activation for Safari and iOS.
      setReady({ blob: data, filename: `Temple-invoice-${(invoice.number || invoice.id).replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf` });
    } catch { toast({ title: "Invoice unavailable", description: "Please try again in a moment.", variant: "destructive" }); }
    finally { setDownloading(null); }
  };

  return (
    <section className="my-8" aria-labelledby="subscription-invoices-heading">
      <h2 id="subscription-invoices-heading" className="text-xl font-serif flex items-center gap-2 mb-4"><FileText className="h-5 w-5 text-primary" />Subscription Invoices</h2>
      {loading && <p role="status" className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading invoices…</p>}
      {error && <div role="alert" className="space-y-2"><p className="text-sm text-destructive">Unable to load your invoices.</p><Button variant="outline" size="sm" onClick={() => load(cursors)}>Try again</Button></div>}
      {!loading && !error && !invoices.length && <p className="text-sm text-muted-foreground">No subscription invoices yet.</p>}
      <ul className="divide-y divide-border">
        {invoices.map((invoice) => (
          <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium break-words">{invoice.number || "Subscription invoice"}</p>
              <p className="text-sm text-muted-foreground">{new Date(invoice.created * 1000).toLocaleDateString(undefined, { dateStyle: "medium" })} · {new Intl.NumberFormat(undefined, { style: "currency", currency: invoice.currency.toUpperCase() }).format(invoice.amount / 100)}</p>
              <Badge variant="outline" className="capitalize">{invoice.status === "open" ? "Awaiting payment" : invoice.status}</Badge>
            </div>
            {invoice.payable && <Button size="sm" disabled={paying !== null} onClick={() => pay(invoice)}><CreditCard className="h-4 w-4 mr-2" />{paying === invoice.id ? "Opening…" : "Pay outstanding invoice"}</Button>}
            {ready?.filename === `Temple-invoice-${(invoice.number || invoice.id).replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf` ? (
              <Button size="sm" onClick={() => save(ready)}><Download className="h-4 w-4 mr-2" />Download PDF</Button>
            ) : (
              <Button variant="outline" size="sm" disabled={!invoice.downloadable || downloading !== null} onClick={() => prepare(invoice)}>
                {downloading === invoice.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                {!invoice.downloadable ? "PDF pending" : downloading === invoice.id ? "Preparing…" : "Get invoice"}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {cursors && !loading && !error && <Button variant="outline" size="sm" onClick={() => load(cursors)}>Load older invoices</Button>}
    </section>
  );
}