import { expect, it } from "vitest";
import { campaignCart } from "@/lib/campaign-cart";
const item = {productId:"reta",variantId:"20",slug:"retatrutide",name:"Retatrutide Pen",variantLabel:"20mg",image:"/reta.jpg",unitCents:24669,qty:1};
it("updates the campaign selection without accumulating units or discarding unrelated products",()=>{
  const other={...item,productId:"other",variantId:"other"};
  const selection={...item,variantId:"40",qty:3};
  const result=campaignCart([item,other],selection);
  expect(result).toEqual([other,selection]);
  expect(campaignCart(result,selection)).toEqual(result);
});
it("rejects quantities outside checkout limits",()=>{
  for(const qty of [0,-1,11,1.5]) expect(()=>campaignCart([], {...item,qty})).toThrow("invalid_quantity");
});
