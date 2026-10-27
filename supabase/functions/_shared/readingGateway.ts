const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
export class GatewayError extends Error {
  status: number;
  retryable: boolean;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.retryable = status === 429 || status >= 500;
  }
}

export function flattenCardContent(card: Record<string, unknown>): string {
  const parts: string[] = [];
  const append = (label: string, value: unknown) => {
    if (!value) return;
    parts.push(`${label}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
  };
  append("Title", card.card_title);
  append("Details", card.card_details);
  if (card.content_sections && typeof card.content_sections === "object") {
    for (const [key, value] of Object.entries(card.content_sections)) append(key, value);
  }
  for (const key of [
    "opening_invocation_content", "spiral_of_inquiry_content", "acknowledgement_content",
    "spiral_of_seeing_content", "living_inquiry_content", "embodiment_ritual_content",
    "benediction_content",
  ]) append(key, card[key]);
  return parts.join("\n\n").slice(0, 4000);
}

function gatewayMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string") return record.message;
  if (record.error && typeof record.error === "object") {
    const message = (record.error as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

async function delayForRetry(response: Response, attempt: number) {
  const retryAfter = Number(response.headers.get("Retry-After"));
  const milliseconds = Number.isFinite(retryAfter) && retryAfter > 0
    ? retryAfter * 1000
    : Math.min(1000 * 2 ** attempt + Math.random() * 500, 5000);
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function callGateway(apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model,
        stream: true,
        instructions: systemPrompt,
        input: userPrompt,
        reasoning: { effort: "medium", summary: "auto" },
        include: ["reasoning.encrypted_content"],
      }),
    });

    if (!response.ok) {
      const raw = await response.text();
      let payload: unknown;
      try { payload = JSON.parse(raw); } catch { payload = null; }
      const error = new GatewayError(response.status, gatewayMessage(payload, raw || "The reading could not be written."));
      if (error.retryable && attempt < 2) {
        await delayForRetry(response, attempt);
        continue;
      }
      throw error;
    }

    if (!response.body) throw new GatewayError(500, "The reading returned no content.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    const consume = (line: string) => {
      if (!line.startsWith("data: ")) return;
      const data = line.slice(6).trim();
      if (!data || data === "[DONE]") return;
      try {
        const event = JSON.parse(data);
        if (event.type === "response.output_text.delta") text += event.delta ?? "";
      } catch { /* Provider metadata does not contain answer text. */ }
    };
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) consume(line);
    }
    consume(buffer + decoder.decode());
    if (text.trim().length < 160) throw new GatewayError(500, "The reading returned no usable content.");
    return text.trim();
  }
  throw new GatewayError(500, "The reading could not be written.");
}

