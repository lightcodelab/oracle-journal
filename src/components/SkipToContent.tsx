/**
 * Keyboard-only "skip to content" link.
 * Visually hidden until focused, so keyboard and screen-reader users can jump
 * past the header/navigation straight to the page content.
 */
const SkipToContent = () => {
  const handleSkip = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target =
      document.querySelector<HTMLElement>("main") ??
      document.querySelector<HTMLElement>("#root > div");
    if (!target) return;
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
