import React, { useEffect, useState } from 'react'
import { getDB, enqueue as enqueueAction, getQueue, removeFromQueue } from '../lib/db'
import { v4 as uuidv4 } from 'uuid'

export default function Cart({ enqueue, token }){
  const [items, setItems] = useState([]);
  const [queue, setQueue] = useState([]);

  useEffect(()=>{ loadItems(); loadQueue(); },[]);

  async function loadItems(){
    const q = await getQueue();
    const adds = q.filter(x=>x.type==='add').map(x=>x.payload);
    const map = {};
    for (const it of adds){
      if (!map[it.sku]) map[it.sku] = {...it};
      else map[it.sku].quantity = (map[it.sku].quantity||0) + (it.quantity||1);
    }
    setItems(Object.values(map));
  }
  async function loadQueue(){ setQueue(await getQueue()) }

  async function checkout(){
    const q = await getQueue();
    const adds = q.filter(x=>x.type==='add');
    if (!adds.length) return alert('Cart empty');
    const itemsPayload = adds.map(a=>({ sku: a.payload.sku, quantity: a.payload.quantity||1 }));
    const total = adds.reduce((s,a)=> s + ((a.payload.price||0)*(a.payload.quantity||1)), 0);
    const clientOrderId = uuidv4();
    const payload = { clientOrderId, items: itemsPayload, totalAmount: total };
    await enqueueAction({ type: 'checkout', payload });
    alert('Checkout queued. It will sync when online.');
    await loadQueue();
  }

  return (
    <section className="cart-panel">
      <h2 style={{marginTop:0}}>Cart</h2>
      {items.length === 0 && <div>Your cart is empty — add something from Products.</div>}
      {items.length > 0 && (
        <div>
          <ul>
            {items.map(it=>(
              <li key={it.sku} style={{marginBottom:8}}>
                <strong>{it.name}</strong> — qty: {it.quantity} — ₹{it.price}
              </li>
            ))}
          </ul>
          <div style={{marginTop:12}}>
            <button className="button" onClick={checkout}>Checkout (enqueue)</button>
          </div>
        </div>
      )}
      <div style={{marginTop:16,fontSize:13,color:'#666'}}>
        <div style={{fontWeight:600,marginBottom:6}}>Queued actions</div>
        <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(queue,null,2)}</pre>
      </div>
    </section>
  )
}
