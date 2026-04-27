import React, { useEffect, useState } from 'react'

export default function Products({ enqueue, token }){
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    setLoading(true)
    fetch('http://localhost:4000/api/products')
      .then(r=>r.json())
      .then(j=>setProducts(j.data || j))
      .catch(()=>console.warn('Could not fetch products (maybe offline)'))
      .finally(()=>setLoading(false));
  },[])

  const addToCart = async (p) => {
    await enqueue({ type:'add', payload: { sku: p.sku, name: p.name, price: p.price, quantity: 1 }});
    // friendly toast substitute
    alert(`${p.name} added to cart — will sync when online.`)
  }

  return (
    <section>
      <h2 style={{marginTop:0}}>Products</h2>
      {loading && <div>Loading products…</div>}
      <div className="grid">
        {products.map(p=>(
          <div className="card" key={p._id}>
            <img src={p.images && p.images.length ? p.images[0] : '/assets/tshirt.jpg'} alt={p.name} />
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div className="name">{p.name}</div>
                <div className="subtitle" style={{fontSize:12}}>{p.description}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div className="price">₹{p.price}</div>
                <div style={{fontSize:12,color:'#777'}}>Stock: {p.stock}</div>
              </div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <button className="button" onClick={()=>addToCart(p)}>Add to cart</button>
              <a className="ghost" href={`/api/products/${p._id}`} target="_blank" rel="noreferrer">Details</a>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
