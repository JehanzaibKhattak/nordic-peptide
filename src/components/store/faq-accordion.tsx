import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus } from "lucide-react";
import type { Faq } from "@/lib/types";

export function FaqAccordion({ faqs, eyebrow, title }: { faqs: Faq[]; eyebrow?: string; title?: string }) {
  if (!faqs.length) return null;
  return (
    <section className="bg-[#f4f0e9] py-12 md:py-14">
      <div className="mx-auto max-w-[1328px] px-5 md:px-8">
        {eyebrow && <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>}
        {title && <h2 className="mb-8 font-serif text-3xl font-semibold tracking-tight text-primary md:mb-10 md:text-4xl">{title}</h2>}
        <Accordion multiple={false} className="w-full gap-3">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-[#e8e4dc] bg-white px-4 md:px-5">
            <AccordionTrigger className="rounded-xl border-0 py-5 text-left text-base font-semibold text-primary no-underline hover:no-underline md:py-6 md:text-base [&>[data-slot=accordion-trigger-icon]]:hidden">
              <span>{f.q}</span>
              <Plus aria-hidden="true" className="ml-4 size-4 shrink-0 text-primary transition-transform group-aria-expanded/accordion-trigger:rotate-45" />
            </AccordionTrigger>
            <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground md:pb-6">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
        </Accordion>
      </div>
    </section>
  );
}
