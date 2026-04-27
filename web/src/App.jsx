import React, { useEffect, useState } from "react";
import "./styles.css";
import { enqueueOrder } from './idb-queue';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    const storedCart = localStorage.getItem("cart");
    if (storedCart) setCart(JSON.parse(storedCart));

    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));

    const updateStatus = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    async function loadProducts() {
      try {
        const res = await fetch(`${API}/api/products`);
        const data = await res.json();
        setProducts(data.data || []);
      } catch (err) {
        console.warn("Could not fetch products (maybe offline)", err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
  }, [user]);

  async function loginDemo() {
    const name = prompt("Enter your name to log in:", user?.name || "");
    if (!name) return;
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name }),
      });
      if (!res.ok) throw new Error("Login failed");
      const data = await res.json();
      localStorage.setItem("token", data.token);
      setUser(data.user);
      showToast(`Welcome, ${data.user.name}!`);
    } catch (err) {
      console.error("Login error:", err);
      alert("Login failed — check if API is running.");
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    showToast("You've been logged out");
  }

  function addToCart(p) {
    setCart((prev) => {
      const existing = prev.findIndex(i => i.sku === p.sku);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], qty: (updated[existing].qty || 1) + 1 };
        return updated;
      }
      return [...prev, { ...p, qty: 1 }];
    });
    showToast(`${p.name} added to cart`);
  }

  function removeFromCart(sku) {
    setCart((prev) => prev.filter(i => i.sku !== sku));
  }

  function cartTotal() {
    return cart.reduce((a, b) => a + b.price * (b.qty || 1), 0);
  }

  function cartCount() {
    return cart.reduce((a, b) => a + (b.qty || 1), 0);
  }

  async function checkout() {
    const token = localStorage.getItem('token');
    if (!token) { showToast('Please log in first!'); return; }
    if (cart.length === 0) { showToast('Your cart is empty!'); return; }

    const order = {
      items: cart.map(p => ({ sku: p.sku, quantity: p.qty || 1 })),
      totalAmount: cartTotal(),
      clientOrderId: crypto.randomUUID(),
    };

    try {
      const res = await fetch(`${API}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(order),
      });
      if (res.ok) {
        showToast('Order placed successfully!');
        setCart([]);
        localStorage.removeItem('cart');
        setShowCart(false);
        return;
      }
      const err = await res.json();
      if (res.status === 409 && err.conflicts) {
        const msg = err.conflicts.map(c => `${c.sku}: ${c.reason}`).join(', ');
        showToast(`Order issue: ${msg}`);
        return;
      }
      throw new Error('Server rejected order');
    } catch (err) {
      await enqueueOrder(order, token, API);
      showToast('Offline — order saved, will sync when back online');
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        try { await reg.sync.register('sync-orders'); } catch (e) { console.warn('Sync reg failed', e); }
      }
    }
  }

  function showToast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add("show"), 50);
    setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.remove(), 400);
    }, 3000);
  }

  return (
    <div className="app-wrapper">
      <header className="app-header">
        <div className="brand">
          <h1>OfflineStore</h1>
          <p>Offline-first shopping</p>
        </div>
        <div className="controls">
          <span className={online ? "status online" : "status offline"}>
            {online ? "Online" : "Offline"}
          </span>

          {!user ? (
            <button onClick={loginDemo} className="btn login">Login</button>
          ) : (
            <>
              <span className="user-tag">{user.name}</span>
              <button onClick={logout} className="btn logout">Logout</button>
            </>
          )}

          <button onClick={() => setShowCart((v) => !v)} className="btn cart">
            Cart ({cartCount()})
          </button>
        </div>
      </header>

      <main>
        {loading ? (
          <div className="loading">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="loading">No products found. Make sure the API is running and seeded.</div>
        ) : (
          <div className="grid">
            {products.map((p) => (
              <div key={p._id} className="card">
                <img
                  src={p.images?.[0] ? `${API}${p.images[0]}` : `${API}/assets/tshirt.jpg`}
                  alt={p.name}
                  className="card-img"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="card-info">
                  <h3>{p.name}</h3>
                  <p className="desc">{p.description}</p>
                  <div className="price-line">
                    <span className="price">₹{p.price}</span>
                    <span className="stock">{p.stock > 0 ? `Stock: ${p.stock}` : 'Out of stock'}</span>
                  </div>
                  <button
                    className="btn add"
                    onClick={() => addToCart(p)}
                    disabled={p.stock === 0}
                  >
                    {p.stock === 0 ? 'Out of stock' : 'Add to cart'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCart && (
        <div className="cart-panel">
          <div className="cart-header">
            <h2>Your Cart</h2>
            <button className="close-btn" onClick={() => setShowCart(false)}>✖</button>
          </div>
          {cart.length === 0 ? (
            <p className="empty-cart">Your cart is empty!</p>
          ) : (
            <>
              <ul className="cart-list">
                {cart.map((item) => (
                  <li key={item.sku}>
                    <span>{item.name} {item.qty > 1 ? `×${item.qty}` : ''}</span>
                    <span>₹{item.price * (item.qty || 1)}</span>
                    <button className="remove-btn" onClick={() => removeFromCart(item.sku)}>✖</button>
                  </li>
                ))}
              </ul>
              <div className="cart-footer">
                <p><strong>Total: ₹{cartTotal()}</strong></p>
                <button className="btn checkout" onClick={checkout}>Checkout</button>
              </div>
            </>
          )}
        </div>
      )}

      <footer className="footer">
        <p>Offline-ready PWA demo</p>
      </footer>
    </div>
  );
}
