// Farmex Customer Marketplace & Chatbot Controller

let currentUser = null;
let allProducts = [];
let cart = [];
let activeCategory = 'All';

const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:5001/api' : '/api';

// Default Category Placeholders (Unsplash premium organic images)
const categoryPlaceholders = {
  'Fruits': 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?auto=format&fit=crop&w=600&q=80',
  'Vegetables': 'https://images.unsplash.com/photo-1566385278603-605b5d4f4571?auto=format&fit=crop&w=600&q=80',
  'Grains': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80',
  'Organic Fertilizers': 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=600&q=80'
};

// Check authentication status on load
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    // Redirect to login page if unauthenticated
    window.location.href = 'login.html';
    return;
  }

  currentUser = JSON.parse(userStr);

  // Set UI elements
  document.getElementById('user-display-name').innerText = currentUser.name;
  document.getElementById('user-role-badge').innerText = `Role: ${currentUser.role}`;
  document.getElementById('user-location-info').innerText = `City: ${currentUser.city} (${currentUser.pincode})`;

  // If user is Admin, display Admin toggle link
  if (currentUser.role === 'Admin') {
    document.getElementById('nav-admin-link').classList.remove('d-none');
  }

  // Set up logout button event listener
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }

  // Load products
  fetchProducts();
});

// Fetch all products from API
async function fetchProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`);
    const data = await response.json();

    if (data.success) {
      allProducts = data.products;
      renderProducts(allProducts);

      // If Admin dashboard is open, reload admin listings too
      if (!document.getElementById('admin-panel').classList.contains('d-none')) {
        renderAdminProducts();
      }
    }
  } catch (err) {
    console.error('Error fetching products:', err);
  }
}

// Render products to grid
function renderProducts(products) {
  const grid = document.getElementById('products-grid');
  const alertBox = document.getElementById('products-alert');
  const countSpan = document.getElementById('product-count');

  grid.innerHTML = '';
  countSpan.innerText = `${products.length} products found`;

  if (products.length === 0) {
    alertBox.classList.remove('d-none');
    return;
  } else {
    alertBox.classList.add('d-none');
  }

  products.forEach(p => {
    const cardImg = p.imageUrl || categoryPlaceholders[p.category] || categoryPlaceholders['Vegetables'];

    // Check if in stock
    const isOutOfStock = p.stockQuantity <= 0;

    // Fallback if farmer was deleted
    const farmerName = p.farmer ? p.farmer.name : 'Deleted Seller';
    const farmerCity = p.farmer ? p.farmer.city : 'N/A';

    const col = document.createElement('div');
    col.className = 'col animate-fade-in';
    col.innerHTML = `
      <div class="card product-card h-100 shadow-sm">
        <div class="card-img-container">
          <img src="${cardImg}" class="card-img-top" alt="${p.name}">
          <span class="category-badge">${p.category}</span>
          <span class="location-badge"><i class="bi bi-geo-alt-fill me-1 text-danger"></i>${farmerCity}</span>
        </div>
        <div class="card-body d-flex flex-column">
          <h5 class="card-title mb-1">${p.name}</h5>
          <small class="text-muted mb-2 d-block">Seller: <strong>${farmerName}</strong></small>
          
          <div class="d-flex justify-content-between align-items-center mt-auto pt-2">
            <div>
              <span class="price-tag">₹${p.price}</span>
              <span class="unit-label">/ ${p.unit}</span>
            </div>
            <div class="text-end">
              <small class="text-muted d-block small">Stock: ${p.stockQuantity} ${p.unit}</small>
            </div>
          </div>

          <div class="mt-3">
            ${isOutOfStock
        ? `<button class="btn btn-secondary w-100 py-2" disabled>Out of Stock</button>`
        : `<button class="btn btn-outline-primary w-100 py-2" onclick="addToCart('${p._id}')"><i class="bi bi-plus-circle me-1"></i>Add to Cart</button>`
      }
          </div>
        </div>
      </div>
    `;
    grid.appendChild(col);
  });
}

// Filter products based on search term, category, and location inputs
function filterProducts() {
  const searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
  const locationQuery = document.getElementById('location-input').value.toLowerCase().trim();

  let filtered = allProducts;

  // Category Filter
  if (activeCategory !== 'All') {
    filtered = filtered.filter(p => p.category === activeCategory);
  }

  // Text search (matches name or category or farmer name)
  if (searchQuery) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(searchQuery) ||
      p.category.toLowerCase().includes(searchQuery) ||
      (p.farmer && p.farmer.name.toLowerCase().includes(searchQuery))
    );
  }

  // Location filter (matches farmer's city or pincode)
  if (locationQuery) {
    filtered = filtered.filter(p =>
      (p.farmer && p.farmer.city.toLowerCase().includes(locationQuery)) ||
      (p.farmer && p.farmer.pincode.includes(locationQuery))
    );
  }

  renderProducts(filtered);
}

// Set active category and filter
function setCategory(category, buttonEl) {
  activeCategory = category;

  // Update button active state
  const buttons = document.querySelectorAll('.category-filter-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  buttonEl.classList.add('active');

  filterProducts();
}

// Nearby Search: Use customer's own local registered pincode
function useMyLocalPincode() {
  if (currentUser && currentUser.pincode) {
    const locInput = document.getElementById('location-input');
    locInput.value = currentUser.pincode;
    filterProducts();
  }
}

// LOGOUT function
function handleLogout() {
  alert('Debug: Logging out and clearing localStorage session.');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// SHOPPING CART LOGIC
function addToCart(productId) {
  const product = allProducts.find(p => p._id === productId);
  if (!product) return;

  const existingItem = cart.find(item => item.productId === productId);

  if (existingItem) {
    if (existingItem.quantity >= product.stockQuantity) {
      alert(`Cannot add more. Available stock limit reached (${product.stockQuantity} ${product.unit}).`);
      return;
    }
    existingItem.quantity += 1;
  } else {
    cart.push({
      productId: product._id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      quantity: 1,
      maxStock: product.stockQuantity
    });
  }

  updateCartUI();

  // Visual feedback: show cart badge
  const offcanvasBtn = document.querySelector('[data-bs-target="#cartOffcanvas"]');
  offcanvasBtn.classList.add('btn-warning');
  setTimeout(() => offcanvasBtn.classList.remove('btn-warning'), 300);
}

function updateCartQuantity(productId, newQty) {
  const item = cart.find(i => i.productId === productId);
  if (!item) return;

  if (newQty <= 0) {
    cart = cart.filter(i => i.productId !== productId);
  } else if (newQty > item.maxStock) {
    alert(`Cannot exceed available stock of ${item.maxStock} ${item.unit}.`);
    item.quantity = item.maxStock;
  } else {
    item.quantity = parseInt(newQty);
  }
  updateCartUI();
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.productId !== productId);
  updateCartUI();
}

function updateCartUI() {
  const container = document.getElementById('cart-items-container');
  const badge = document.getElementById('cart-badge');
  const subtotalText = document.getElementById('cart-subtotal');
  const checkoutBtn = document.getElementById('checkout-btn');

  container.innerHTML = '';

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-cart3 fs-1 d-block mb-3"></i>
        Your shopping cart is empty.
      </div>
    `;
    badge.classList.add('d-none');
    badge.innerText = '0';
    subtotalText.innerText = '₹0.00';
    checkoutBtn.disabled = true;
    return;
  }

  let totalItems = 0;
  let subtotal = 0;

  cart.forEach(item => {
    totalItems += item.quantity;
    subtotal += item.price * item.quantity;

    const div = document.createElement('div');
    div.className = 'cart-item d-flex align-items-center justify-content-between';
    div.innerHTML = `
      <div class="flex-grow-1">
        <div class="cart-item-title">${item.name}</div>
        <small class="text-muted">₹${item.price} / ${item.unit}</small>
        <div class="d-flex align-items-center mt-2">
          <button class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="updateCartQuantity('${item.productId}', ${item.quantity - 1})">-</button>
          <span class="mx-3 fw-bold">${item.quantity}</span>
          <button class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="updateCartQuantity('${item.productId}', ${item.quantity + 1})">+</button>
        </div>
      </div>
      <div class="text-end ms-3">
        <strong class="text-success d-block">₹${item.price * item.quantity}</strong>
        <button class="btn btn-sm btn-link text-danger p-0 mt-1" onclick="removeFromCart('${item.productId}')"><i class="bi bi-trash"></i></button>
      </div>
    `;
    container.appendChild(div);
  });

  badge.classList.remove('d-none');
  badge.innerText = totalItems;
  subtotalText.innerText = `₹${subtotal.toFixed(2)}`;
  checkoutBtn.disabled = false;
}

// CHECKOUT & ORDERS FLOW
const checkoutModal = new bootstrap.Modal(document.getElementById('checkoutModal'));
const ordersModal = new bootstrap.Modal(document.getElementById('ordersModal'));

function openCheckoutModal() {
  const summaryList = document.getElementById('checkout-summary-list');
  const totalPriceSpan = document.getElementById('checkout-total-price');

  summaryList.innerHTML = '';
  let subtotal = 0;

  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    const div = document.createElement('div');
    div.className = 'd-flex justify-content-between mb-1';
    div.innerHTML = `
      <span>${item.name} (x${item.quantity})</span>
      <span>₹${itemTotal}</span>
    `;
    summaryList.appendChild(div);
  });

  totalPriceSpan.innerText = `₹${subtotal.toFixed(2)}`;

  // Fill default values from user profile
  document.getElementById('ship-phone').value = currentUser.phoneNumber || '';
  document.getElementById('ship-city').value = currentUser.city || '';
  document.getElementById('ship-pincode').value = currentUser.pincode || '';

  // Close Offcanvas
  const cartCanvas = bootstrap.Offcanvas.getInstance(document.getElementById('cartOffcanvas'));
  if (cartCanvas) cartCanvas.hide();

  checkoutModal.show();
}

async function placeOrder(event) {
  event.preventDefault();

  const phone = document.getElementById('ship-phone').value.trim();
  const address = document.getElementById('ship-address').value.trim();
  const city = document.getElementById('ship-city').value.trim();
  const pincode = document.getElementById('ship-pincode').value.trim();

  const token = localStorage.getItem('token');

  const orderBody = {
    items: cart.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price
    })),
    shippingAddress: {
      phone,
      address,
      city,
      pincode
    }
  };

  try {
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderBody)
    });

    const data = await response.json();

    if (data.success) {
      alert('Order placed successfully! Cash on Delivery confirmed.');
      cart = [];
      updateCartUI();
      checkoutModal.hide();

      // Refresh products showcase (stock updated)
      fetchProducts();

      // Open orders tracking modal
      openOrdersModal();
    } else {
      alert(data.message || 'Error placing order');
    }
  } catch (err) {
    console.error('Submit order error:', err);
    alert('Failed to connect to server to submit order.');
  }
}

async function openOrdersModal() {
  ordersModal.show();
  const container = document.getElementById('orders-list-container');
  container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-success" role="status"></div><p class="mt-2">Fetching order histories...</p></div>';

  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`${API_BASE}/orders/customer`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.success) {
      container.innerHTML = '';
      if (data.orders.length === 0) {
        container.innerHTML = `
          <div class="text-center py-5 text-muted">
            <i class="bi bi-clock-history fs-1 d-block mb-3"></i>
            No orders placed yet.
          </div>
        `;
        return;
      }

      data.orders.forEach(order => {
        const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', {
          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // Determine badge style
        let badgeClass = 'status-pending';
        if (order.status === 'Dispatched') badgeClass = 'status-dispatched';
        if (order.status === 'Delivered') badgeClass = 'status-delivered';

        // Build list of items
        const itemsListHTML = order.items.map(item => `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <strong>${item.product ? item.product.name : 'Unknown Product'}</strong><br>
              <small class="text-muted">Seller: ${item.farmer ? item.farmer.name : 'Unknown Farmer'} (${item.farmer ? item.farmer.city : 'N/A'})</small>
            </div>
            <span class="badge bg-success bg-opacity-25 text-success rounded-pill px-3 py-1">Qty: ${item.quantity} | ₹${item.price * item.quantity}</span>
          </li>
        `).join('');

        const card = document.createElement('div');
        card.className = 'card mb-4 border-light shadow-sm';
        card.innerHTML = `
          <div class="card-header d-flex justify-content-between align-items-center bg-light">
            <div>
              <small class="text-muted d-block">ORDER ID: ${order._id}</small>
              <strong class="text-primary-green">${dateStr}</strong>
            </div>
            <div>
              <span class="status-badge ${badgeClass}"><i class="bi bi-truck me-1"></i>${order.status}</span>
            </div>
          </div>
          <div class="card-body">
            <ul class="list-group list-group-flush mb-3">
              ${itemsListHTML}
            </ul>
            <div class="d-flex justify-content-between align-items-center border-top pt-3 fw-bold">
              <span>Grand Total:</span>
              <span class="fs-5 text-success">₹${order.totalAmount}</span>
            </div>
            
            <!-- Address Summary -->
            <div class="mt-2 p-2 bg-light rounded text-muted small">
              <strong>Delivery Address:</strong> ${order.shippingAddress.address}, ${order.shippingAddress.city} - ${order.shippingAddress.pincode} | Phone: ${order.shippingAddress.phone}
            </div>
          </div>
        `;
        container.appendChild(card);
      });
    } else {
      container.innerHTML = `<div class="alert alert-danger">${data.message || 'Error fetching orders'}</div>`;
    }
  } catch (err) {
    console.error('Fetch customer orders error:', err);
    container.innerHTML = '<div class="alert alert-danger">Connection to server lost. Please retry.</div>';
  }
}


// FLOATING AI CHATBOT SYSTEM (Simulated Intelligence)
function toggleChatbot() {
  const container = document.getElementById('chatContainer');
  const toggleBtn = document.getElementById('chatToggleBtn');
  const toggleIcon = document.getElementById('chatToggleIcon');

  container.classList.toggle('open');
  toggleBtn.classList.toggle('active');

  if (container.classList.contains('open')) {
    toggleIcon.className = 'bi bi-x-lg';
    // Scroll chat to bottom
    const messagesDiv = document.getElementById('chatMessages');
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  } else {
    toggleIcon.className = 'bi bi-chat-dots-fill';
  }
}

// Add a typing dot simulation
function showTypingIndicator() {
  const chatMessages = document.getElementById('chatMessages');
  const indicator = document.createElement('div');
  indicator.className = 'chat-bubble bot typing-indicator-wrapper align-self-start';
  indicator.id = 'typingIndicator';
  indicator.innerHTML = `
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  chatMessages.appendChild(indicator);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) indicator.remove();
}

// Append messages helper
function appendMessage(sender, contentHTML) {
  const chatMessages = document.getElementById('chatMessages');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender === 'user' ? 'user' : 'bot'}`;
  bubble.innerHTML = contentHTML;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle quick options selection
function triggerBotOption(option) {
  // Post user reply bubble
  let userText = '';
  if (option === 'disease') userText = 'I want to check a Crop Disease Diagnosis';
  if (option === 'pesticide') userText = 'Recommend an organic Pesticide Recipe';
  if (option === 'seasonal') userText = 'What crops are recommended for this season?';
  if (option === 'weather') userText = 'Give me Weather-based farming advice';

  appendMessage('user', userText);
  showTypingIndicator();

  setTimeout(() => {
    removeTypingIndicator();
    let replyHTML = '';

    if (option === 'disease') {
      replyHTML = `
        <strong>Organic Disease Diagnosis Guide:</strong><br>
        Please select symptoms you are noticing on your crops:
        <div class="mt-2 d-grid gap-1">
          <button class="btn btn-sm btn-outline-success text-start text-wrap py-1.5" onclick="triggerDiseaseDiagnosis('Tomato Powdery Mildew')">🍂 Tomato leaves: Yellow patches with white powder</button>
          <button class="btn btn-sm btn-outline-success text-start text-wrap py-1.5" onclick="triggerDiseaseDiagnosis('Rice Blast')">🌾 Paddy/Rice leaves: Diamond-shaped gray-center spots</button>
          <button class="btn btn-sm btn-outline-success text-start text-wrap py-1.5" onclick="triggerDiseaseDiagnosis('Potato Late Blight')">🥔 Potato leaves/stem: Water-soaked dark lesions</button>
        </div>
      `;
    }
    else if (option === 'pesticide') {
      replyHTML = `
        <strong>Smart Organic Remedy Recipes:</strong><br>
        Organic pesticides prevent damage without harmful chemicals:
        <div class="mt-2 d-grid gap-1">
          <button class="btn btn-sm btn-outline-success text-start py-1.5" onclick="triggerPesticideRecipe('Neem Oil Spray')">🍃 Neem Oil Emulsion (General Bugs)</button>
          <button class="btn btn-sm btn-outline-success text-start py-1.5" onclick="triggerPesticideRecipe('Garlic Chili Spray')">🌶️ Garlic-Chili Extract (Sucking Pests)</button>
          <button class="btn btn-sm btn-outline-success text-start py-1.5" onclick="triggerPesticideRecipe('Baking Soda Mixture')">🧁 Baking Soda Spray (Fungus control)</button>
        </div>
      `;
    }
    else if (option === 'seasonal') {
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const currentMonth = new Date().getMonth();
      const monthName = monthNames[currentMonth];

      let seasonRecommendation = '';
      if (currentMonth >= 5 && currentMonth <= 8) { // June - Sept
        seasonRecommendation = `We are in the <strong>Kharif (Monsoon)</strong> farming cycle. Since it is <strong>${monthName}</strong>, we suggest sowing:<br>
        • 🌾 <strong>Paddy (Rice)</strong> - Requires standing water.<br>
        • 🌽 <strong>Maize / Corn</strong> - Needs well-drained loamy soil.<br>
        • 🫘 <strong>Soybean / Cotton</strong> - High market value crops.`;
      } else if (currentMonth >= 9 || currentMonth <= 1) { // Oct - Feb
        seasonRecommendation = `We are in the <strong>Rabi (Winter)</strong> farming cycle. Since it is <strong>${monthName}</strong>, we suggest sowing:<br>
        • 🌾 <strong>Wheat</strong> - Main winter cereal crop.<br>
        • 🟡 <strong>Mustard</strong> - Oilseed with moderate water need.<br>
        • 🫛 <strong>Chickpeas / Peas</strong> - Enriches soil nitrogen.`;
      } else { // March - May
        seasonRecommendation = `We are in the <strong>Zaid (Summer)</strong> farming cycle. Since it is <strong>${monthName}</strong>, we suggest planting:<br>
        • 🍉 <strong>Watermelon / Muskmelon</strong> - Drought resistant.<br>
        • 🥒 <strong>Cucumber / Gourd</strong> - Vine crops fetching quick returns.<br>
        • 🥬 <strong>Leafy Amaranth</strong> - Grows rapidly in high heat.`;
      }

      replyHTML = `
        <strong>Seasonal Crop Suggester:</strong><br>
        ${seasonRecommendation}<br>
        <span class="small text-muted mt-1 d-block">Tip: Purchase premium organic compost from the Marketplace for best results!</span>
      `;
    }
    else if (option === 'weather') {
      replyHTML = `
        <strong>Climatic Farm Guidance:</strong><br>
        Based on the current regional weather forecast:
        <div class="diagnostic-result mb-2">
          <strong>☀️ High Temperature & Low Humidity</strong><br>
          We recommend irrigating fields in the early morning (before 7 AM) or late evening to prevent evaporation losses. Apply a layer of organic mulch (dry straw) to trap soil moisture.
        </div>
        <div class="diagnostic-result">
          <strong>🌧️ Rainy Outlook Advice</strong><br>
          Ensure clear field drainage channels. Stagnant rainwater causes root rot in crops like pulses and tomatoes. Postpone fertilizer or pesticide applications.
        </div>
      `;
    }

    appendMessage('bot', replyHTML);
  }, 800);
}

// Sub-actions inside Chatbot
function triggerDiseaseDiagnosis(diseaseName) {
  appendMessage('user', `Symptoms match: ${diseaseName}`);
  showTypingIndicator();

  setTimeout(() => {
    removeTypingIndicator();
    let advice = '';

    if (diseaseName === 'Tomato Powdery Mildew') {
      advice = `
        <strong>Diagnosis: Powdery Mildew (Fungal Infection)</strong><br>
        <div class="diagnostic-result mb-2">
          <strong>🔬 Symptom:</strong> Grayish-white flour-like powder on leaves, causing curling and leaf drop.
        </div>
        <strong>🌱 Organic Remedy Treatment:</strong><br>
        1. Mix <strong>1 tablespoon Baking Soda</strong> and <strong>1 teaspoon liquid dish soap</strong> in <strong>4 Liters of water</strong>.<br>
        2. Spray leaves thoroughly every 7 days.<br>
        3. Remove infected lower leaves to improve airflow.
      `;
    } else if (diseaseName === 'Rice Blast') {
      advice = `
        <strong>Diagnosis: Rice Blast (Magnaporthe oryzae)</strong><br>
        <div class="diagnostic-result mb-2">
          <strong>🔬 Symptom:</strong> Diamond-shaped lesions with gray centers and brown borders on leaves and neck.
        </div>
        <strong>🌱 Organic Remedy Treatment:</strong><br>
        1. Avoid excessive nitrogen fertilizers (high nitrogen increases blast susceptibility).<br>
        2. Spray <strong>Pseudomonas fluorescens</strong> bio-pesticide (mixture of 10g per Liter of water).<br>
        3. Burn or compost left-over infected straw after harvest to prevent spores from overwintering.
      `;
    } else if (diseaseName === 'Potato Late Blight') {
      advice = `
        <strong>Diagnosis: Potato Late Blight (Phytophthora infestans)</strong><br>
        <div class="diagnostic-result mb-2">
          <strong>🔬 Symptom:</strong> Dark, water-soaked spots on leaves. White fuzzy growth appears on leaf undersides in humid weather.
        </div>
        <strong>🌱 Organic Remedy Treatment:</strong><br>
        1. Spray diluted organic <strong>Copper Fungicide</strong> immediately upon symptom detection.<br>
        2. Water the soil directly; avoid wetting foliage.<br>
        3. Ensure planting certified blight-free potato tubers next season.
      `;
    }

    appendMessage('bot', advice);
  }, 800);
}

function triggerPesticideRecipe(recipeName) {
  appendMessage('user', `How do I make ${recipeName}?`);
  showTypingIndicator();

  setTimeout(() => {
    removeTypingIndicator();
    let recipe = '';

    if (recipeName === 'Neem Oil Spray') {
      recipe = `
        <strong>🍃 Neem Oil Spray Recipe (General Pesticide):</strong><br>
        Effective against aphids, whiteflies, and spider mites.<br>
        <br>
        <strong>Ingredients:</strong><br>
        • 2 teaspoons cold-pressed organic Neem Oil<br>
        • 1 teaspoon mild liquid dish soap (emulsifier)<br>
        • 1 Liter warm water<br>
        <br>
        <strong>Directions:</strong><br>
        1. Add soap to the warm water first and shake gently.<br>
        2. Pour in neem oil and shake vigorously until mixed.<br>
        3. Spray foliage (top and bottom) in the evening to avoid leaf burn under sunlight. Repeat every 10 days.
      `;
    } else if (recipeName === 'Garlic Chili Spray') {
      recipe = `
        <strong>🌶️ Garlic Chili Spray (Repels Sucking & Chewing Pests):</strong><br>
        Repels caterpillars, beetles, thrips, and aphids.<br>
        <br>
        <strong>Ingredients:</strong><br>
        • 2 bulbs of Garlic<br>
        • 4-5 hot green/red Chilies<br>
        • 1 Liter water<br>
        • 1 teaspoon liquid dish soap<br>
        <br>
        <strong>Directions:</strong><br>
        1. Blend garlic and chilies with 500ml water into a smooth paste.<br>
        2. Let the mixture sit overnight (12-24 hours).<br>
        3. Strain out pulp, dilute with remaining 500ml water and add dish soap.<br>
        4. Spray directly on affected plants. Wear gloves while spraying!
      `;
    } else if (recipeName === 'Baking Soda Mixture') {
      recipe = `
        <strong>🧁 Baking Soda Fungus Spray:</strong><br>
        Combats black spots, rust, and powdery mildew.<br>
        <br>
        <strong>Ingredients:</strong><br>
        • 1 tablespoon baking soda (Sodium bicarbonate)<br>
        • 1/2 teaspoon non-detergent soap<br>
        • 3 Liters water<br>
        <br>
        <strong>Directions:</strong><br>
        1. Dissolve baking soda in water thoroughly.<br>
        2. Add soap and mix gently.<br>
        3. Spray affected plants weekly. Check a single leaf first to verify the plant doesn't get leaf-burn.
      `;
    }

    appendMessage('bot', recipe);
  }, 800);
}

// User types a text query in Chatbot input
function handleBotMessage(event) {
  event.preventDefault();
  const input = document.getElementById('chatInput');
  const query = input.value.trim();
  if (!query) return;

  // Append user bubble
  appendMessage('user', query);
  input.value = '';

  showTypingIndicator();

  setTimeout(() => {
    removeTypingIndicator();
    let reply = '';
    const qLower = query.toLowerCase();

    // Simulated Smart Keyword matching
    if (qLower.includes('order') || qLower.includes('track') || qLower.includes('where is my')) {
      reply = `You can easily track your purchases! Click the <strong>"My Orders"</strong> tab in the navigation bar to see real-time updates (Pending, Dispatched, or Delivered) on all orders you have placed.`;
    }
    else if (qLower.includes('middlemen') || qLower.includes('commission') || qLower.includes('how it works')) {
      reply = `Farmex functions by enabling direct communication. Farmers publish listings directly from their seller panels. When you buy, your money goes directly to the farmer, ensuring they receive a fair price while you get fresh, organic goods.`;
    }
    else if (qLower.includes('tomato') && qLower.includes('yellow')) {
      triggerDiseaseDiagnosis('Tomato Powdery Mildew');
      return;
    }
    else if (qLower.includes('rice') || qLower.includes('paddy')) {
      triggerDiseaseDiagnosis('Rice Blast');
      return;
    }
    else if (qLower.includes('potato') && (qLower.includes('blight') || qLower.includes('black'))) {
      triggerDiseaseDiagnosis('Potato Late Blight');
      return;
    }
    else if (qLower.includes('neem') || qLower.includes('pesticide')) {
      triggerPesticideRecipe('Neem Oil Spray');
      return;
    }
    else if (qLower.includes('chili') || qLower.includes('garlic')) {
      triggerPesticideRecipe('Garlic Chili Spray');
      return;
    }
    else if (qLower.includes('fertilizer') || qLower.includes('compost')) {
      reply = `Organic compost is vital for crop health. You can find high-quality vermicompost and manure listings directly in the <strong>"Organic Fertilizers"</strong> category on our marketplace page.`;
    }
    else if (qLower.includes('hello') || qLower.includes('hi') || qLower.includes('hey')) {
      reply = `Hi there! I am the Farmex Smart Assistant. I can recommend crop solutions, seasonal planting ideas, organic spray recipes, and weather advice. Choose a prompt or type details about your farm crop issues!`;
    }
    else {
      reply = `Thank you for your inquiry about <em>"${query}"</em>. To help you best, you can use our quick links: click **Crop Diagnosis** for symptoms analysis, **Pesticide Recipes** for organic sprays, or search the marketplace for nearby listings.`;
    }

    appendMessage('bot', reply);
  }, 900);
}


// ADMIN PANEL FUNCTIONS
let isAdminPanelOpen = false;

async function toggleAdminPanel() {
  const panel = document.getElementById('admin-panel');

  if (currentUser.role !== 'Admin') return;

  if (panel.classList.contains('d-none')) {
    // Open
    panel.classList.remove('d-none');
    await fetchAdminStats();
    renderAdminProducts();
    // Scroll to panel
    panel.scrollIntoView({ behavior: 'smooth' });
  } else {
    // Close
    panel.classList.add('d-none');
  }
}

async function fetchAdminStats() {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_BASE}/auth/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) {
      document.getElementById('admin-stat-farmers').innerText = data.stats.totalFarmers;
      document.getElementById('admin-stat-customers').innerText = data.stats.totalCustomers;
      document.getElementById('admin-stat-listings').innerText = data.stats.totalProducts;
      document.getElementById('admin-stat-orders').innerText = data.stats.totalOrders;
    }
  } catch (err) {
    console.error('Error fetching admin statistics:', err);
  }
}

function renderAdminProducts() {
  const tbody = document.getElementById('admin-products-table');
  tbody.innerHTML = '';

  if (allProducts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No active listings available.</td></tr>';
    return;
  }

  allProducts.forEach(p => {
    const tr = document.createElement('tr');
    const farmerName = p.farmer ? p.farmer.name : 'Deleted User';
    const farmerEmail = p.farmer ? p.farmer.email : 'N/A';
    const farmerLoc = p.farmer ? `${p.farmer.city} (${p.farmer.pincode})` : 'N/A';

    tr.innerHTML = `
      <td>
        <div class="d-flex align-items-center gap-2">
          <img src="${p.imageUrl || categoryPlaceholders[p.category]}" width="40" height="40" class="rounded object-fit-cover">
          <strong class="text-primary-green">${p.name}</strong>
        </div>
      </td>
      <td><span class="badge bg-secondary">${p.category}</span></td>
      <td><strong>${farmerName}</strong><br><small class="text-muted">${farmerEmail}</small></td>
      <td>${farmerLoc}</td>
      <td>₹${p.price}/${p.unit} <br><small class="text-muted">Stock: ${p.stockQuantity}</small></td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="adminDeleteProduct('${p._id}', '${p.name}')">
          <i class="bi bi-trash-fill me-1"></i>Delete Listing
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function adminDeleteProduct(productId, productName) {
  if (!confirm(`Are you sure you want to administratively delete the listing for "${productName}"?`)) {
    return;
  }

  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_BASE}/products/${productId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) {
      alert('Listing removed successfully.');
      // Refresh local products array and redraw both grid and admin table
      await fetchProducts();
      await fetchAdminStats(); // refresh stats counter
    } else {
      alert(data.message || 'Failed to delete listing.');
    }
  } catch (err) {
    console.error('Admin delete product error:', err);
    alert('Server communication error.');
  }
}
