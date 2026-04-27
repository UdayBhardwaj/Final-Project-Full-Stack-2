import React, { useEffect, useState } from "react";
import "./styles.css";
import { enqueueOrder } from './idb-queue';

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);



  // ✅ Load persisted data
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
        const res = await fetch("http://localhost:4000/api/products");
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

  // ✅ Persist cart
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  // ✅ Persist user
  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
  }, [user]);

  // ✅ Login
  async function loginDemo() {
    const name = prompt("Enter your name to log in:", user?.name || "Uday");
    if (!name) return;
    try {
      const res = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name }),
      });
      if (!res.ok) throw new Error("Login failed");
      const data = await res.json();
      localStorage.setItem("token", data.token);
      setUser(data.user);
      showToast(`Welcome, ${data.user.name}! 🎉`);
    } catch (err) {
      console.error("Login error:", err);
      alert("Login failed — check if API is running.");
    }
  }

  // ✅ Logout
  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    showToast("You’ve been logged out 👋");
  }

  // ✅ Cart management
  function addToCart(p) {
    setCart((prev) => [...prev, p]);
    showToast(`${p.name} added to cart 🛒`);
  }

  function removeFromCart(index) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  async function checkout() {
  const token = localStorage.getItem('token');
  if (!token) { showToast('Please log in first!'); return; }

  const order = {
    items: cart.map(p => ({ sku: p.sku, quantity: 1, price: p.price })),
    totalAmount: cart.reduce((a,b)=>a+b.price,0),
    clientOrderId: 'co-' + Date.now()
  };

  try {
    const res = await fetch('http://localhost:4000/api/orders', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(order)
    });
    if (res.ok) {
      showToast('🎉 Checkout successful!');
      setCart([]);
      localStorage.removeItem('cart');
      return;
    }
    throw new Error('Server rejected');
  } catch (err) {
    await enqueueOrder(order, token);
    showToast('Offline — order saved for later sync.');
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      try { await reg.sync.register('sync-orders'); } catch(e){ console.warn('Sync registration failed', e); }
    }
  }
}

  // Toast popup
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
          <h1>☀️ OfflineStore</h1>
          <p>Offline-first shopping with a smile 😄</p>
        </div>
        <div className="controls">
          <span className={online ? "status online" : "status offline"}>
            {online ? "🟢 Online" : "🔴 Offline"}
          </span>

          {!user ? (
            <button onClick={loginDemo} className="btn login">
              Login
            </button>
          ) : (
            <>
              <button onClick={logout} className="btn logout">
                Logout
              </button>
              <span className="user-tag">👋 {user.name}</span>
            </>
          )}

          <button onClick={() => setShowCart((v) => !v)} className="btn cart">
            🛒 Cart ({cart.length})
          </button>
        </div>
      </header>

      <main>
        {loading ? (
          <div className="loading">Loading products...</div>
        ) : (
          <div className="grid">
            {products.map((p) => (
              <div key={p._id} className="card">
                <img
                  src={`http://localhost:4000${p.images?.[0]}`}
                  alt={p.name}
                  className="card-img"
                />
                <div className="card-info">
                  <h3>{p.name}</h3>
                  <p className="desc">{p.description}</p>
                  <div className="price-line">
                    <span className="price">₹{p.price}</span>
                    <span className="stock">Stock: {p.stock}</span>
                  </div>
                  <button className="btn add" onClick={() => addToCart(p)}>
                    Add to cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 🛒 CART PANEL */}
      {showCart && (
        <div className="cart-panel">
          <div className="cart-header">
            <h2>🛍️ Your Cart</h2>
            <button className="close-btn" onClick={() => setShowCart(false)}>
              ✖
            </button>
          </div>
          {cart.length === 0 ? (
            <p className="empty-cart">Your cart is empty!</p>
          ) : (
            <>
              <ul className="cart-list">
                {cart.map((item, i) => (
                  <li key={i}>
                    <span>{item.name}</span>
                    <span>₹{item.price}</span>
                    <button
                      className="remove-btn"
                      onClick={() => removeFromCart(i)}
                    >
                      ❌
                    </button>
                  </li>
                ))}
              </ul>
              <div className="cart-footer">
                <p>
                  <strong>
                    Total: ₹{cart.reduce((a, b) => a + b.price, 0)}
                  </strong>
                </p>
                <button className="btn checkout" onClick={checkout}>
                  ✅ Checkout
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <footer className="footer">
        <p>Made with ❤️• Offline-ready • PWA demo</p>
      </footer>
    </div>
  );
}
