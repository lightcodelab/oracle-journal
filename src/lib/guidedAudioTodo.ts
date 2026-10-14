// The "Guided Audio Journey" sections in The Sacred Rewrite cards and in every
// lesson of its companion course are still placeholders until the recordings
// exist. Members should not see an empty block, so the placeholder is hidden
// from everyone except admins, who see it flagged in yellow as a reminder to
// drop the audio in. Once real content replaces the placeholder it shows to
// members as normal content again.

const PLACEHOLDER_RE = /replace with the relevant audio file once it is provided/i;
const HEADING_RE = /^\s*guided audio journey\s*$/i;

export const GUIDED_AUDIO_TODO_CLASS = "admin-guided-audio-todo";
export const GUIDED_AUDIO_TODO_LABEL_CLASS = "admin-guided-audio-todo-label";
export const GUIDED_AUDIO_TODO_LABEL = "To do: add the guided audio recording";

/** True when this text is still the not-yet-recorded guided audio note. */
export function isGuidedAudioPlaceholder(text?: string | null): boolean {
  return !!text && PLACEHOLDER_RE.test(text);
}

/**
 * Applied to rendered lesson HTML: drops the placeholder section for members and
 * wraps it in a yellow reminder for admins.
 */
export function applyGuidedAudioTodoToHtml(html: string, isAdmin: boolean): string {
  if (!html || !PLACEHOLDER_RE.test(html)) return html;

  const doc = new DOMParser().parseFromString(
    `<div id="__audio_todo_root">${html}</div>`,
    "text/html",
  );
  const root = doc.getElementById("__audio_todo_root");
  if (!root) return html;

  const block = findPlaceholderBlock(root);
  if (!block) return html;
  const heading = findGuidedAudioHeading(block);

  if (!isAdmin) {
    heading?.remove();
    block.remove();
    return root.innerHTML;
  }

  const wrapper = doc.createElement("div");
  wrapper.className = GUIDED_AUDIO_TODO_CLASS;
  root.insertBefore(wrapper, block);
  if (heading) wrapper.appendChild(heading);
  wrapper.appendChild(block);

  const label = doc.createElement("p");
  label.className = GUIDED_AUDIO_TODO_LABEL_CLASS;
  label.textContent = GUIDED_AUDIO_TODO_LABEL;
  wrapper.appendChild(label);

  return root.innerHTML;
}

/**
 * Same rule for plain-text lesson bodies (rendered with whitespace-pre-wrap, so
 * there are no heading elements to match — the heading is just a line).
 */
export function applyGuidedAudioTodoToText(text: string, isAdmin: boolean): string {
  if (!text || !PLACEHOLDER_RE.test(text)) return text;

  const lines = text.split("\n");
  const at = lines.findIndex((line) => PLACEHOLDER_RE.test(line));
  if (at === -1) return text;

  let start = at;
  for (let i = at - 1; i >= 0; i--) {
    const line = lines[i].trim().replace(/\*/g, "");
    if (!line) continue;
    if (HEADING_RE.test(line)) start = i;
    break;
  }

  if (!isAdmin) return lines.filter((_, i) => i < start || i > at).join("\n");

  const out = [...lines];
  out[start] = `<span class="${GUIDED_AUDIO_TODO_CLASS}">${out[start]}`;
  out[at] = `${out[at]}</span>`;
  return out.join("\n");
}

function findPlaceholderBlock(root: HTMLElement): Element | null {
  const top = Array.from(root.children).find((el) => PLACEHOLDER_RE.test(el.textContent || ""));
  if (top) return top;

  const nested = Array.from(
    root.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, blockquote, div"),
  ).filter((el) => PLACEHOLDER_RE.test(el.textContent || ""));

  return nested.pop() ?? null;
}

function findGuidedAudioHeading(block: Element): Element | null {
  let node = block.previousElementSibling;
  while (node && !(node.textContent || "").trim()) node = node.previousElementSibling;
  return node && HEADING_RE.test((node.textContent || "").trim()) ? node : null;
}
