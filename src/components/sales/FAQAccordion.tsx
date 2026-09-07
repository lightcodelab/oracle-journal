import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface FaqItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FaqItem[];
  onOpen?: (question: string) => void;
}

export function FAQAccordion({ items, onOpen }: FAQAccordionProps) {
  return (
    <Accordion
      type="single"
      collapsible
      className="w-full"
      onValueChange={(value) => {
        if (value) onOpen?.(value);
      }}
    >
      {items.map((item) => (
        <AccordionItem
          key={item.question}
          value={item.question}
          className="border-border/60"
        >
          <AccordionTrigger className="text-left font-serif text-lg text-foreground hover:no-underline">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="text-base leading-relaxed text-foreground/85">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
