import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Faq } from "@/lib/types";

export function FaqAccordion({ faqs, title }: { faqs: Faq[]; title?: string }) {
  if (!faqs.length) return null;
  return (
    <section>
      {title && <h2 className="mb-4 text-xl font-semibold tracking-tight">{title}</h2>}
      <Accordion multiple={false} className="w-full">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-left text-sm font-medium">{f.q}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
