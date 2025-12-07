// รอให้ DOM โหลดครบก่อน
document.addEventListener('DOMContentLoaded', () => {
    // ===== Mobile Menu Toggle =====
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('.nav');

    if (mobileMenuBtn && nav) {
        mobileMenuBtn.addEventListener('click', () => {
            nav.classList.toggle('active');

            const bars = mobileMenuBtn.querySelectorAll('.bar');
            if (bars.length === 3) {
                if (nav.classList.contains('active')) {
                    bars[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                    bars[1].style.opacity = '0';
                    bars[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
                } else {
                    bars[0].style.transform = 'none';
                    bars[1].style.opacity = '1';
                    bars[2].style.transform = 'none';
                }
            }
        });
    }

    // (ถ้าอยากทำ header ให้เปลี่ยนตาม login state ก็สามารถอ่าน localStorage('user') ตรงนี้ได้)
});

// ===== Header Scroll Effect =====
const header = document.querySelector('.header');
if (header) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            header.style.height = '70px';
        } else {
            header.style.boxShadow = 'none';
            header.style.height = '80px';
        }
    });
}

// ===== Toast Notification =====
function showToast(message) {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1001;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.innerText = message;
    toast.style.cssText = `
        background-color: #2C241B;
        color: #fff;
        padding: 1rem 2rem;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: 'Lato', sans-serif;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s ease;
    `;

    toastContainer.appendChild(toast);

    // Fade in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    // Fade out + remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// ===== Register Form Handling =====
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullname = document.getElementById('fullname').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            showToast('Passwords do not match');
            return;
        }

        const btn = registerForm.querySelector('button[type="submit"]');
        const originalBtnText = btn.innerText;
        btn.innerText = 'Creating Account...';
        btn.disabled = true;

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fullname, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                showToast('Registration successful! Redirecting...');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                showToast(data.message || 'Registration failed');
                btn.innerText = originalBtnText;
                btn.disabled = false;
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('An error occurred. Please try again.');
            btn.innerText = originalBtnText;
            btn.disabled = false;
        }
    });
}

// ===== Login Form Handling =====
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const btn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = btn.innerText;
        btn.innerText = 'Logging In...';
        btn.disabled = true;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // เก็บ user ไว้ใน localStorage
                localStorage.setItem('user', JSON.stringify(data.user));

                showToast('Login successful! Redirecting...');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                showToast(data.message || 'Login failed');
                btn.innerText = originalBtnText;
                btn.disabled = false;
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('An error occurred. Please try again.');
            btn.innerText = originalBtnText;
            btn.disabled = false;
        }
    });
}

// ===== Add Product Form Handling (addProduct.html) =====
const addProductForm = document.getElementById('addProductForm');
if (addProductForm) {
    const user = JSON.parse(localStorage.getItem('user'));

    // ถ้าไม่ได้ login ให้เด้งไปหน้า login
    if (!user) {
        showToast('Please login to sell items');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    }

    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!user) return;

        const name = document.getElementById('productName').value;
        const description = document.getElementById('productDescription').value;
        const price = document.getElementById('productPrice').value;
        const quantity = document.getElementById('productQuantity').value;
        const imageFile = document.getElementById('productImage').files[0];

        const btn = addProductForm.querySelector('button[type="submit"]');
        const originalBtnText = btn.innerText;
        btn.innerText = 'Listing Item...';
        btn.disabled = true;

        const formData = new FormData();
        formData.append('userId', user.id);
        formData.append('name', name);
        formData.append('description', description);
        formData.append('price', price);
        formData.append('quantity', quantity);
        formData.append('image', imageFile);

        try {
            const response = await fetch('/api/add-product', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                showToast('Product listed successfully!');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                showToast(data.message || 'Failed to list item');
                btn.innerText = originalBtnText;
                btn.disabled = false;
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('An error occurred. Please try again.');
            btn.innerText = originalBtnText;
            btn.disabled = false;
        }
    });
}

// ===== Load Products for Index Page =====
const productList = document.getElementById('product-list');
if (productList) {
    loadProducts();
}

async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();

        productList.innerHTML = ''; // Clear loading state

        if (products.length === 0) {
            productList.innerHTML = '<p class="text-center" style="grid-column: 1/-1;">No products found. Be the first to list one!</p>';
            return;
        }

        products.forEach(product => {
            const card = document.createElement('article');
            card.className = 'product-card';

            // Use placeholder if no image
            const imgSrc = product.imageUrl || 'https://via.placeholder.com/400x400?text=No+Image';

            card.innerHTML = `
                <div class="product-image">
                    <img src="${imgSrc}" alt="${product.name}">
                    <button class="add-to-cart-btn" data-id="${product.id}">Add to Cart</button>
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-price">$${product.price}</p>
                    <p class="product-meta" style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">${product.description.substring(0, 60)}${product.description.length > 60 ? '...' : ''}</p>
                </div>
            `;
            productList.appendChild(card);
        });

        // Re-attach event listeners for new buttons
        attachAddToCartListeners();

    } catch (error) {
        console.error('Error loading products:', error);
        productList.innerHTML = '<p class="text-center" style="grid-column: 1/-1;">Failed to load products.</p>';
    }
}

function attachAddToCartListeners() {
    const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');
    addToCartBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            if (this.disabled) return;
            const productId = this.dataset.id;
            addToCart(productId, this);
        });
    });
}

async function addToCart(productId, btn) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        showToast('Please login to add items to cart');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }

    const originalText = btn.innerText;
    btn.innerText = 'Adding...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, productId })
        });

        if (response.ok) {
            btn.innerText = 'Added!';
            btn.style.backgroundColor = '#2C241B';
            showToast('Item added to cart');
            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.backgroundColor = '';
                btn.disabled = false;
            }, 2000);
        } else {
            showToast('Failed to add to cart');
            btn.innerText = originalText;
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showToast('Error adding to cart');
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// ===== Cart Page Logic (cart.html) =====
const cartItemsContainer = document.getElementById('cart-items');
if (cartItemsContainer) {
    loadCart();
    // Checkout button is now a direct link in HTML
}

async function loadCart() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`/api/cart/${user.id}`);
        const cartItems = await response.json();

        renderCartItems(cartItems);
    } catch (error) {
        console.error('Error loading cart:', error);
        cartItemsContainer.innerHTML = '<p>Error loading cart items.</p>';
    }
}

function renderCartItems(items) {
    if (items.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-basket" style="font-size: 3rem; margin-bottom: 1rem; color: #ddd;"></i><p>Your cart is empty.</p><a href="index.html" style="color: var(--primary-color); font-weight: 600; margin-top: 1rem; display: inline-block;">Start Shopping</a></div>';
        updateCartSummary(0);
        return;
    }

    cartItemsContainer.innerHTML = '';
    let total = 0;

    items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const imgSrc = item.imageUrl || 'https://via.placeholder.com/80x80?text=No+Image';

        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <img src="${imgSrc}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-details">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">$${item.price} x ${item.quantity}</div>
                <div class="cart-item-actions">
                    <button class="remove-btn" onclick="removeFromCart(${item.cart_id})">Remove</button>
                </div>
            </div>
            <div style="font-weight: 700;">$${itemTotal.toFixed(2)}</div>
        `;
        cartItemsContainer.appendChild(itemEl);
    });

    updateCartSummary(total);
}

function updateCartSummary(total) {
    document.getElementById('cart-subtotal').innerText = `$${total.toFixed(2)}`;
    document.getElementById('cart-total').innerText = `$${total.toFixed(2)}`;
}

async function removeFromCart(cartId) {
    if (!confirm('Are you sure you want to remove this item?')) return;

    try {
        const response = await fetch(`/api/cart/${cartId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Item removed');
            loadCart(); // Reload cart
        } else {
            showToast('Failed to remove item');
        }
    } catch (error) {
        console.error('Error removing item:', error);
        showToast('Error removing item');
    }
}

// ===== Checkout Page Logic (checkout.html) =====
const checkoutItemsContainer = document.getElementById('checkout-items');
if (checkoutItemsContainer) {
    loadCheckoutItems();

    document.getElementById('purchase-btn').addEventListener('click', handlePurchase);
}

async function loadCheckoutItems() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`/api/cart/${user.id}`);
        const items = await response.json();

        if (items.length === 0) {
            window.location.href = 'cart.html'; // Go back to cart if empty
            return;
        }

        renderCheckoutItems(items);
    } catch (error) {
        console.error('Error loading checkout:', error);
        checkoutItemsContainer.innerHTML = '<p>Error loading order details.</p>';
    }
}

function renderCheckoutItems(items) {
    checkoutItemsContainer.innerHTML = '';
    let total = 0;

    items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const el = document.createElement('div');
        el.className = 'order-item';
        el.innerHTML = `
            <div>
                <div style="font-weight: 600;">${item.name}</div>
                <div style="font-size: 0.9rem; color: #888;">Qty: ${item.quantity}</div>
            </div>
            <div style="font-weight: 600;">$${itemTotal.toFixed(2)}</div>
        `;
        checkoutItemsContainer.appendChild(el);
    });

    document.getElementById('checkout-subtotal').innerText = `$${total.toFixed(2)}`;
    document.getElementById('checkout-total').innerText = `$${total.toFixed(2)}`;
}

async function handlePurchase() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    const btn = document.getElementById('purchase-btn');
    const originalText = btn.innerText;
    btn.innerText = 'Processing...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                buyerName: user.username // pass username if available
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Show modal
            document.getElementById('modal-order-id').innerText = data.orderId;
            const modal = document.getElementById('successModal');
            modal.style.display = 'flex';
        } else {
            showToast(data.message || 'Purchase failed');
            btn.innerText = originalText;
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Error purchasing:', error);
        showToast('Error processing purchase');
        btn.innerText = originalText;
        btn.disabled = false;
    }
}