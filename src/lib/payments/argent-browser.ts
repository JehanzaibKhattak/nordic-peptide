import { z } from "zod";

export const argentBrowserSchema = z.object({
  accept_header: z.string().min(1).max(2000), language: z.string().min(1).max(80),
  color_depth: z.number().int().min(1).max(64),
  screen: z.object({ width: z.string().regex(/^\d{1,6}$/), height: z.string().regex(/^\d{1,6}$/) }).strict(),
  timezone_offset: z.number().int().min(-1440).max(1440), user_agent: z.string().min(1).max(2000),
  java_enabled: z.boolean(), javascript_enabled: z.boolean(),
}).strict();
export type ArgentBrowserInfo = z.infer<typeof argentBrowserSchema>;

/** Same browser fields collected by official PaymentJS for 3DS. */
export function argentBrowserInfo(): ArgentBrowserInfo {
  return { accept_header: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", language: navigator.language,
    color_depth: screen.colorDepth, screen: { width: String(screen.width), height: String(screen.height) },
    timezone_offset: new Date().getTimezoneOffset(), user_agent: navigator.userAgent,
    java_enabled: navigator.javaEnabled(), javascript_enabled: true };
}
