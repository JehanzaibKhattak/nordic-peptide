import { afterEach, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({find:vi.fn(),event:vi.fn()}));
vi.mock("@/lib/db",()=>({db:{order:{findUniqueOrThrow:mocks.find},orderEvent:{findFirst:mocks.event}}}));
import { queueAvionPostback } from "@/lib/avion";
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.clearAllMocks();});
it("uses the backend queue for a confirmed bank payment and keeps the stable order number",async()=>{
  mocks.find.mockResolvedValue({id:"id",orderNumber:"NPS123",status:"PAID",paymentMethod:"bank_transfer"});
  mocks.event.mockResolvedValue({payload:{orderNumber:"AV-123"}});
  vi.stubEnv("AVION_API_URL","https://backend.example");vi.stubEnv("AVION_API_KEY","private");
  const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({ok:true,status:"queued"})));vi.stubGlobal("fetch",fetch);
  await expect(queueAvionPostback("id","sale")).resolves.toMatchObject({status:"queued"});
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({order_ref:"NPS123",event:"sale"});
  expect(fetch.mock.calls[0][1].redirect).toBe("error");
});
it("never confirms an unpaid order or a refund that has not been recorded",async()=>{
  const fetch=vi.fn();vi.stubGlobal("fetch",fetch);
  for(const status of ["PENDING","CANCELLED","PAID"]){
    mocks.find.mockResolvedValue({status,paymentMethod:"bank_transfer"});
    await expect(queueAvionPostback("id","rejected")).rejects.toThrow("payment_confirmation_required");
  }
  mocks.find.mockResolvedValue({status:"PENDING",paymentMethod:"bank_transfer"});
  await expect(queueAvionPostback("id","sale")).rejects.toThrow("payment_confirmation_required");
  expect(fetch).not.toHaveBeenCalled();
});
