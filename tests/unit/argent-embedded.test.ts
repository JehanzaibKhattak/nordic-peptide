import { expect, it } from "vitest";
import { argentEmbeddedSession } from "@/lib/payments/argent-embedded";

it("continues only an existing server-created Argent intent without browser pricing", () => {
  expect(argentEmbeddedSession("https://pay.argentplatforms.com/?id=pymint_test&token=private_continuation&public_key=pk_test_fixture")).toEqual({ payment_intent_id: "pymint_test", token: "private_continuation", public_key: "pk_test_fixture" });
  for (const url of ["https://evil.example/?id=x&token=y&public_key=pk_live_z", "https://pay.argentplatforms.com/", "https://user:pass@pay.argentplatforms.com/?id=x&token=y&public_key=pk_live_z"]) expect(() => argentEmbeddedSession(url)).toThrow();
});
