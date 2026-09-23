import {describe,it,expect} from 'vitest';
import {createSeed,id} from '../../src/lib/seed';
import {compareSuppliers,offerProblem,optimizeBasket,selectedQuotes,canMoveOrder} from '../../src/lib/domain';
import {executeDemo} from '../../src/lib/demo';
import {requestSchema} from '../../src/lib/validation';

describe('supplier comparisons',()=>{
  it('includes delivery and minimums; incomplete low totals cannot win',()=>{
    const d=createSeed();const quotes=compareSuppliers(d.basket_items,d,'cost');
    expect(quotes[0].supplier.id).toBe(id(201));expect(quotes[0].total).toBe(2702000);
    expect(quotes.find(q=>q.supplier.id===id(202))!.eligible).toBe(false);
    expect(quotes.every(q=>q.total===q.subtotal+q.shipping)).toBe(true);
  });
  it('offers a faster alternative and marks stale prices',()=>{
    const d=createSeed();const qs=compareSuppliers(d.basket_items,d,'speed');
    expect(qs[0].supplier.id).toBe(id(203));expect(qs[0].stale).toBe(true);
  });
  it('refuses missing offers, mismatched units, package rounding and below-minimum quantities',()=>{
    const d=createSeed(),i=d.basket_items[0],o=d.supplier_offers[0];
    expect(offerProblem(i,undefined,d)).toBeTruthy();expect(offerProblem(i,{...o,unit:'لیتر'},d)).toBeTruthy();
    expect(offerProblem(i,{...o,package_size:3},d)).toBeTruthy();expect(offerProblem(i,{...o,minimum_quantity:5},d)).toBeTruthy();
    expect(offerProblem(i,{...o,updated_at:''},d)).toBeTruthy();
  });
  it('optimizes split baskets including separate delivery and minimum orders',()=>{
    const d=createSeed();d.basket_items=d.basket_items.slice(0,2);d.suppliers.forEach(s=>{s.minimum_order=0;s.delivery_fee=20000});
    d.supplier_offers.forEach(o=>{o.available=false});
    const a=d.supplier_offers.find(o=>o.supplier_id===id(200)&&o.product_id===id(100))!;a.available=true;a.price=100000;
    const b=d.supplier_offers.find(o=>o.supplier_id===id(201)&&o.product_id===id(101))!;b.available=true;b.price=10000;
    const opt=optimizeBasket(d.basket_items,d);
    expect(opt.feasible).toBe(true);expect(opt.quotes).toHaveLength(2);expect(opt.quotes.reduce((sum,q)=>sum+q.total,0)).toBe(360000);
    b.available=false;expect(optimizeBasket(d.basket_items,d).missing).toHaveLength(1);
  });
  it('labels bounded searches honestly and rejects duplicate line selections',()=>{
    const d=createSeed();expect(optimizeBasket(d.basket_items,d,'cost',1).complete).toBe(false);
    expect(()=>selectedQuotes(d.basket_items,d.basket_items.map(()=>({basket_item_id:d.basket_items[0].id,offer_id:d.supplier_offers[0].id})),d)).toThrow();
  });
});
describe('request and order lifecycle',()=>{
  it('creates, edits, approves, baskets and purchases an auditable request',()=>{
    let d=createSeed();d.basket_items=[];
    const draft={items:[{product_id:id(100),quantity:2,note:'۷۰/۳۰'},{product_id:id(101),quantity:12,note:''}],urgency:'normal',note:'تست'};
    const created=executeDemo(d,id(3),'create_material_request',{business_id:id(10),data:draft});d=created.data;const requestId=created.result as string;
    d=executeDemo(d,id(3),'edit_material_request',{id:requestId,data:{...draft,items:[{...draft.items[0],quantity:3},draft.items[1]]}}).data;
    expect(d.material_request_items.filter(i=>i.request_id===requestId)[0].quantity).toBe(3);
    expect(()=>executeDemo(d,id(3),'review_request',{id:requestId,status:'approved'})).toThrow();
    d=executeDemo(d,id(1),'review_request',{id:requestId,status:'approved'}).data;
    expect(()=>executeDemo(d,id(3),'edit_material_request',{id:requestId,data:draft})).toThrow();
    d=executeDemo(d,id(1),'add_request_to_basket',{id:requestId}).data;
    const before=d.basket_items.length;d=executeDemo(d,id(1),'add_request_to_basket',{id:requestId}).data;expect(d.basket_items).toHaveLength(before);
    const selections=optimizeBasket(d.basket_items,d).selections.map(s=>({...s,updated_at:d.supplier_offers.find(o=>o.id===s.offer_id)!.updated_at}));
    const total=selectedQuotes(d.basket_items,selections,d).reduce((s,q)=>s+q.total,0);
    const args={business_id:id(10),selections,expected_total:total,basket_updated_at:d.procurement_baskets[0].updated_at,checkout_id:crypto.randomUUID(),note:'',address:'کرمان، کافه تست'};
    const placed=executeDemo(d,id(1),'checkout',args);d=placed.data;const orderIds=placed.result as string[];
    expect(d.basket_items).toHaveLength(0);expect(d.material_requests.find(r=>r.id===requestId)!.status).toBe('purchased');
    expect(executeDemo(d,id(1),'checkout',args).result).toEqual(orderIds);
    const orderId=orderIds[0];expect(d.order_status_history.some(h=>h.order_id===orderId&&h.actor===id(1))).toBe(true);
    expect(()=>executeDemo(d,id(1),'change_order_status',{id:orderId,status:'reviewing'})).toThrow();
    d=executeDemo(d,id(4),'change_order_status',{id:orderId,status:'reviewing',note:'بررسی شد'}).data;
    expect(d.orders.find(o=>o.id===orderId)!.status).toBe('reviewing');
  });
  it('rejects stale prices and invalid totals atomically',()=>{
    const d=createSeed();const q=compareSuppliers(d.basket_items,d,'cost')[0];const selections=q.items.map(l=>({basket_item_id:l.item.id,offer_id:l.offer!.id,updated_at:l.offer!.updated_at}));
    const args={business_id:id(10),selections,expected_total:q.total-1,basket_updated_at:d.procurement_baskets[0].updated_at,checkout_id:crypto.randomUUID(),address:'نشانی تست'};
    const before=JSON.stringify(d);expect(()=>executeDemo(d,id(1),'checkout',args)).toThrow();expect(JSON.stringify(d)).toBe(before);
    args.expected_total=q.total;args.selections[0].updated_at='2000-01-01';expect(()=>executeDemo(d,id(1),'checkout',args)).toThrow();
  });
  it('validates quantity and status transitions',()=>{
    expect(requestSchema.safeParse({items:[{product_id:id(100),quantity:0,note:''}],urgency:'normal',note:''}).success).toBe(false);
    expect(canMoveOrder('shipped','cancelled')).toBe(false);expect(canMoveOrder('submitted','delivered')).toBe(false);expect(canMoveOrder('preparing','shipped')).toBe(true);
  });
});
