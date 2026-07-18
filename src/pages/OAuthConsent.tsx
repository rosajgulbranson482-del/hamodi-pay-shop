import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Minimal typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthResult = { data?: { redirect_url?: string; redirect_to?: string; client?: { name?: string }; [k: string]: unknown } | null; error?: { message: string } | null };
interface OAuthApi {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
}
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthResult["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate as string;
        return;
      }
      setDetails(data ?? null);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target as string;
  }

  if (error)
    return (
      <main className="min-h-screen flex items-center justify-center p-6" dir="rtl">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">تعذّر تحميل طلب التفويض</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </main>
    );

  if (!details)
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );

  const clientName = (details.client as { name?: string } | undefined)?.name ?? "التطبيق";

  return (
    <main className="min-h-screen flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-md bg-card border rounded-2xl p-6 shadow-lg">
        <h1 className="text-xl font-bold mb-2">ربط {clientName} بحسابك</h1>
        <p className="text-muted-foreground mb-6">
          سيتمكن {clientName} من استخدام حمودي ستور بالنيابة عنك.
        </p>
        <div className="flex gap-3">
          <Button disabled={busy} onClick={() => decide(true)} className="flex-1">
            {busy && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            موافق
          </Button>
          <Button disabled={busy} onClick={() => decide(false)} variant="outline" className="flex-1">
            رفض
          </Button>
        </div>
      </div>
    </main>
  );
}
