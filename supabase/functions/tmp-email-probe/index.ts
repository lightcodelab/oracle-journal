import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

Deno.serve(async (req) => {
  if (req.headers.get("x-admin-notify-secret") !== Deno.env.get("ADMIN_NOTIFY_SECRET")) {
    return new Response("no", { status: 401 });
  }
  try {
    const result = await sendTemplateEmail("remembrance-letter-ready", "lightcodelab@gmail.com", {
      templateData: {
        name: "Tash",
        monthNumber: 1,
        themeTitle: "The Echo",
        themeQuestion: "The Echo — Who have you been performing?",
        letterUrl: "https://inside.thetempleofsustainment.com/remembrance-letters",
      },
      idempotencyKey: `probe-${Date.now()}`,
    });
    return Response.json({ ok: true, result });
  } catch (e: any) {
    return Response.json({ ok: false, name: e?.name, code: e?.code, status: e?.status, message: String(e?.message ?? e) });
  }
});
