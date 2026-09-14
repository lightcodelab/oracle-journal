import { useEffect } from "react";

/**
 * Keyboard-only "skip to content" link.
 * Visually hidden until focused, so keyboard and screen-reader users can jump
 * past the header/navigation straight to the page content.
 */
const SkipToContent = () => {
  // Keep an id on the current page's main region so the link has a real target.
  useEffect(() => {
    const tag = () => {
      const main = document.querySelector<HTMLElement>("main");
      if (main && main.id !== "main-content") {
        main.id = "main-content";
        if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
      }
    };
    tag();
    const observer = new MutationObserver(tag);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const handleSkip = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const target =
      document.querySelector<HTMLElement>("main") ??
      document.querySelector<HTMLElement>("#root > div");
    if (!target) return;
    event.preventDefault();
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus();
    target.scrollIntoView({ block: "start" });
  };

  return (
    <a
      href="#main-content"
      onClick={handleSkip}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Skip to main content
    </a>
  );
};

export default SkipToContent;
