// Farmex Farmer Dashboard Controller

let currentUser = null;
let myProducts = [];
let receivedOrders = [];
let editMode = false;

const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:5001/api' : '/api';

const categoryPlaceholders = {
  'Fruits': 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?auto=format&fit=crop&w=600&q=80',
  'Vegetables': 'https://images.unsplash.com/photo-1566385278603-605b5d4f4571?auto=format&fit=crop&w=600&q=80',
  'Grains': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80',
  'Organic Fertilizers': 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=600&q=80'
};

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = JSON.parse(userStr);

  // Validate authorized role
  if (currentUser.role !== 'Farmer' && currentUser.role !== 'Admin') {
    alert('Access Denied. Farmers only.');
    window.location.href = 'index.html';
    return;
  }

  // Set UI Header Info
  document.getElementById('farmer-display-name').innerText = currentUser.name;
  document.getElementById('farmer-local-badge').innerHTML = `
    <span class="badge bg-warning text-dark px-3 py-2 fs-6"><i class="bi bi-geo-alt-fill me-1"></i>Location: ${currentUser.city} (${currentUser.pincode})</span>
  `;

  // Set up logout button event listener
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }

  // Fetch initial data
  fetchFarmerProducts();
  fetchFarmerOrders();
});

// LOGOUT function
function handleLogout() {
  alert('Debug: Logging out and clearing localStorage session.');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// ----------------------------------------------------
// PRODUCT CRUD FUNCTIONS
// ----------------------------------------------------

async function fetchFarmerProducts() {
  try {
    const response = await fetch(`${API_BASE}/products/farmer/${currentUser.id}`);
    const data = await response.json();

    if (data.success) {
      myProducts = data.products;
      renderMyProducts();
    }
  } catch (err) {
    console.error('Error fetching farmer products:', err);
  }
}

function renderMyProducts() {
  const container = document.getElementById('my-products-list');
  const countSpan = document.getElementById('my-products-count');

  container.innerHTML = '';
  countSpan.innerText = `${myProducts.length} Listings`;

  if (myProducts.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-muted">
        No active listings. Use the form above to add products.
      </div>
    `;
    return;
  }

  myProducts.forEach(p => {
    const img = p.imageUrl || categoryPlaceholders[p.category] || categoryPlaceholders['Vegetables'];
    
    const div = document.createElement('div');
    div.className = 'list-group-item p-3 d-flex align-items-center gap-3 animate-fade-in';
    div.innerHTML = `
      <img src="${img}" width="60" height="60" class="rounded object-fit-cover shadow-sm">
      <div class="flex-grow-1">
        <h6 class="fw-bold mb-0 text-primary-green">${p.name}</h6>
        <span class="badge bg-light text-success border border-success border-opacity-25 small mt-1">${p.category}</span>
        <div class="small text-muted mt-1">
          Price: <strong>₹${p.price}/${p.unit}</strong> | Stock: <strong>${p.stockQuantity} ${p.unit}</strong>
        </div>
      </div>
      <div class="d-flex flex-column gap-1">
        <button class="btn btn-sm btn-outline-primary py-1 px-2.5" onclick="setupEditProduct('${p._id}')">
          <i class="bi bi-pencil-square"></i> Edit
        </button>
        <button class="btn btn-sm btn-outline-danger py-1 px-2.5" onclick="deleteProduct('${p._id}', '${p.name}')">
          <i class="bi bi-trash"></i> Delete
        </button>
      </div>
    `;
    container.appendChild(div);
  });
}

// Handle Form Submit (Add or Edit Product)
async function handleProductSubmit(event) {
  event.preventDefault();

  const id = document.getElementById('product-id').value;
  const name = document.getElementById('prod-name').value.trim();
  const category = document.getElementById('prod-category').value;
  const unit = document.getElementById('prod-unit').value.trim();
  const price = parseFloat(document.getElementById('prod-price').value);
  const stockQuantity = parseInt(document.getElementById('prod-stock').value);
  const imageUrl = document.getElementById('prod-img').value.trim();

  const token = localStorage.getItem('token');

  const productData = { name, category, unit, price, stockQuantity, imageUrl };

  try {
    let response;
    
    if (editMode && id) {
      // EDIT MODE: PUT Request
      response = await fetch(`${API_BASE}/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      });
    } else {
      // ADD MODE: POST Request
      response = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      });
    }

    const data = await response.json();

    if (data.success) {
      alert(editMode ? 'Listing updated successfully!' : 'Listing published successfully!');
      resetFormState();
      fetchFarmerProducts();
      // If listing was edited/added, maybe stocks changed, refresh stats & orders too
      fetchFarmerOrders();
    } else {
      alert(data.message || 'Error processing product listing.');
    }

  } catch (err) {
    console.error('Submit product error:', err);
    alert('Communication error connecting to server.');
  }
}

// Prepare form fields for edit mode
function setupEditProduct(productId) {
  const product = myProducts.find(p => p._id === productId);
  if (!product) return;

  editMode = true;
  document.getElementById('product-id').value = product._id;
  document.getElementById('prod-name').value = product.name;
  document.getElementById('prod-category').value = product.category;
  document.getElementById('prod-unit').value = product.unit;
  document.getElementById('prod-price').value = product.price;
  document.getElementById('prod-stock').value = product.stockQuantity;
  document.getElementById('prod-img').value = product.imageUrl || '';

  // UI adjustments
  document.getElementById('form-header-title').innerHTML = `<i class="bi bi-pencil-square me-2"></i>Edit Product Listing`;
  document.getElementById('form-submit-btn').innerHTML = `<i class="bi bi-check-circle me-1"></i>Save Changes`;
  document.getElementById('form-cancel-btn').classList.remove('d-none');
  
  // Scroll to form
  document.getElementById('product-form').scrollIntoView({ behavior: 'smooth' });
}

function resetFormState() {
  editMode = false;
  document.getElementById('product-form').reset();
  document.getElementById('product-id').value = '';

  document.getElementById('form-header-title').innerHTML = `<i class="bi bi-plus-circle-fill me-2"></i>Add New Product Listing`;
  document.getElementById('form-submit-btn').innerHTML = `<i class="bi bi-check-circle me-1"></i>Publish Listing`;
  document.getElementById('form-cancel-btn').classList.add('d-none');
}

// Delete product listing
async function deleteProduct(productId, productName) {
  if (!confirm(`Are you sure you want to delete "${productName}" from your marketplace listings?`)) {
    return;
  }

  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_BASE}/products/${productId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (data.success) {
      alert('Listing removed successfully.');
      fetchFarmerProducts();
      fetchFarmerOrders();
    } else {
      alert(data.message || 'Failed to remove listing.');
    }
  } catch (err) {
    console.error('Delete product error:', err);
    alert('Server communication error.');
  }
}

// ----------------------------------------------------
// LIVE ORDER MANAGEMENT PANEL
// ----------------------------------------------------

async function fetchFarmerOrders() {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_BASE}/orders/farmer`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (data.success) {
      receivedOrders = data.orders;
      calculateEarningsAndStats();
      renderReceivedOrders();
    }
  } catch (err) {
    console.error('Error fetching received orders:', err);
  }
}

// Calculate earnings & stat cards
function calculateEarningsAndStats() {
  let totalEarnings = 0;
  let pendingDeliveries = 0;

  receivedOrders.forEach(order => {
    // Sum items belonging to this farmer
    let farmerSubtotal = 0;
    order.items.forEach(item => {
      // In Admin mode, count all items. In Farmer mode, only count items belonging to the farmer
      if (currentUser.role === 'Admin' || item.farmer === currentUser.id) {
        farmerSubtotal += item.price * item.quantity;
      }
    });

    if (order.status === 'Delivered') {
      totalEarnings += farmerSubtotal;
    } else {
      pendingDeliveries += 1;
    }
  });

  document.getElementById('stat-earnings').innerText = `₹${totalEarnings.toFixed(2)}`;
  document.getElementById('stat-total-orders').innerText = receivedOrders.length;
  document.getElementById('stat-pending-orders').innerText = pendingDeliveries;
}

// Render order list accordion
function renderReceivedOrders() {
  const accordion = document.getElementById('ordersAccordion');
  const alertBox = document.getElementById('orders-alert');

  accordion.innerHTML = '';

  if (receivedOrders.length === 0) {
    alertBox.classList.remove('d-none');
    return;
  } else {
    alertBox.classList.add('d-none');
  }

  receivedOrders.forEach((order, index) => {
    // Filter items owned by this farmer
    const farmerItems = order.items.filter(item => currentUser.role === 'Admin' || item.farmer === currentUser.id);

    // Sum farmer total
    const farmerTotal = farmerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const itemsHTML = farmerItems.map(item => `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <strong>${item.product ? item.product.name : 'Unknown Product'}</strong><br>
          <small class="text-muted">Unit Cost: ₹${item.price} / Qty Ordered: ${item.quantity}</small>
        </div>
        <span class="badge bg-success bg-opacity-10 text-success fs-6">₹${item.price * item.quantity}</span>
      </li>
    `).join('');

    const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // Check status
    let selectPending = order.status === 'Pending' ? 'selected' : '';
    let selectDispatched = order.status === 'Dispatched' ? 'selected' : '';
    let selectDelivered = order.status === 'Delivered' ? 'selected' : '';

    const itemDiv = document.createElement('div');
    itemDiv.className = 'accordion-item border mb-3 rounded overflow-hidden shadow-sm';
    itemDiv.innerHTML = `
      <h2 class="accordion-header">
        <button class="accordion-button collapsed bg-light text-dark fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#orderCollapse-${order._id}">
          <div class="d-flex justify-content-between align-items-center w-100 pe-3 flex-wrap gap-2">
            <div>
              <span class="text-primary-green">ID: ${order._id.substring(0, 8)}...</span>
              <small class="text-muted ms-2">${dateStr}</small>
            </div>
            <div>
              <span class="badge bg-success bg-opacity-25 text-success rounded-pill px-2.5">Your Share: ₹${farmerTotal}</span>
              <span class="status-badge ms-2 ${order.status === 'Pending' ? 'status-pending' : order.status === 'Dispatched' ? 'status-dispatched' : 'status-delivered'}">${order.status}</span>
            </div>
          </div>
        </button>
      </h2>
      <div id="orderCollapse-${order._id}" class="accordion-collapse collapse" data-bs-parent="#ordersAccordion">
        <div class="accordion-body">
          <h6 class="fw-bold text-success border-bottom pb-2 mb-3">Customer & Shipping Details</h6>
          <div class="row mb-3 text-muted">
            <div class="col-md-6 mb-2">
              <strong>Name:</strong> ${order.customer ? order.customer.name : 'Unknown User'}<br>
              <strong>Email:</strong> ${order.customer ? order.customer.email : 'N/A'}<br>
              <strong>Phone:</strong> ${order.shippingAddress.phone}
            </div>
            <div class="col-md-6">
              <strong>Address:</strong> ${order.shippingAddress.address}<br>
              <strong>City:</strong> ${order.shippingAddress.city} - ${order.shippingAddress.pincode}
            </div>
          </div>

          <h6 class="fw-bold text-success border-bottom pb-2 mb-3">Items Purchased (Your Products)</h6>
          <ul class="list-group list-group-flush mb-4">
            ${itemsHTML}
          </ul>

          <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center border-top pt-3 bg-light p-3 rounded">
            <div>
              <span class="text-muted">Change Shipping Status:</span>
              <div class="input-group mt-1">
                <span class="input-group-text"><i class="bi bi-arrow-left-right text-success"></i></span>
                <select class="form-select form-select-sm" onchange="updateOrderStatus('${order._id}', this.value)">
                  <option value="Pending" ${selectPending}>Pending (Awaiting Packaging)</option>
                  <option value="Dispatched" ${selectDispatched}>Dispatched (In Transit)</option>
                  <option value="Delivered" ${selectDelivered}>Delivered (Paid & Closed)</option>
                </select>
              </div>
            </div>
            <div class="text-md-end mt-3 mt-md-0">
              <span class="text-muted d-block small">Grand Order Total:</span>
              <h5 class="fw-bold text-success m-0">₹${order.totalAmount} <span class="small text-muted fw-normal">(All Sellers)</span></h5>
            </div>
          </div>

        </div>
      </div>
    `;
    accordion.appendChild(itemDiv);
  });
}

// Update received order status in DB
async function updateOrderStatus(orderId, newStatus) {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await response.json();
    if (data.success) {
      alert(`Order status updated to "${newStatus}"`);
      fetchFarmerOrders();
    } else {
      alert(data.message || 'Failed to update order status.');
    }
  } catch (err) {
    console.error('Update order status error:', err);
    alert('Communication error updating order.');
  }
}
