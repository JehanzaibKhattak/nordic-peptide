import {afterEach,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({queue:vi.fn(),create:vi.fn()}));
vi.mock("@/lib/db",()=>({db:{orderEvent:{create:mocks.create}}}));
vi.mock("@/lib/avion",()=>({avionEnabled:()=>true,queueAvionPostback:mocks.queue}));
import {firePostback} from "@/lib/affiliate/postback";
afterEach(()=>vi.clearAllMocks());
it("delegates to the sole backend sender even without a storefront postback URL",async()=>{
  mocks.queue.mockResolvedValue({ok:true,status:"queued"});
  await expect(firePostback({id:"o1",paymentProvider:"manual"} as never,"sale",18000)).resolves.toMatchObject({ok:true,result:"queued"});
  expect(mocks.queue).toHaveBeenCalledWith("o1","sale");
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({type:"postback.backend"})}));
});
it("records queue errors and returns a failure rather than silently skipping",async()=>{
  mocks.queue.mockRejectedValue(new Error("unavailable"));
  await expect(firePostback({id:"o1",paymentProvider:"manual"} as never,"sale",18000)).resolves.toMatchObject({ok:false,error:"backend_reconciliation_failed"});
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({type:"postback.failed"})}));
});
