// Toggle Buy/Sell forms
function toggleForm(formId) {
  const form = document.getElementById(formId);
  form.classList.toggle('hidden');
  form.classList.toggle('show');
  if (!form.classList.contains('hidden')) {
    document.querySelectorAll('.market-form').forEach(f => {
      if (f.id !== formId) f.classList.add('hidden');
    });
  }
}

// Close Popup
function closePopup(popupId) {
  const popup = document.getElementById(popupId);
  popup.classList.remove('show');
  popup.classList.add('hidden');
}

// Handle Buy Now Popup with Seller Details
document.querySelectorAll('.buy-now').forEach(button => {
  button.addEventListener('click', function() {
    const product = this.getAttribute('data-product');
    const quantity = this.getAttribute('data-quantity');
    const price = this.getAttribute('data-price');

    // Simulated seller details including address
    const sellerDetails = {
      'Fertilizer': { name: 'Ravi Kumar', mobile: '9876543210', address: '123 Farm Road, Delhi' },
      'Seeds (Wheat)': { name: 'Priya Sharma', mobile: '8765432109', address: '456 Village Lane, Punjab' }
    }[product] || { name: 'Unknown Seller', mobile: 'N/A', address: 'Not Available' };

    // Populate popup fields
    document.getElementById('popup-product').textContent = product;
    document.getElementById('popup-quantity').textContent = `${quantity}kg`;
    document.getElementById('popup-price').textContent = `₹${price}`;
    document.getElementById('popup-seller-name').textContent = sellerDetails.name;
    document.getElementById('popup-seller-mobile').textContent = sellerDetails.mobile;
    document.getElementById('popup-seller-address').textContent = sellerDetails.address;

    // Show popup
    const popup = document.getElementById('buy-now-popup');
    popup.classList.remove('hidden');
    popup.classList.add('show');
  });
});

// Handle Buy form submission
document.getElementById('buy-form-submit').addEventListener('submit', function(e) {
  e.preventDefault();
  const product = document.getElementById('buy-product').value;
  const quantity = document.getElementById('buy-quantity').value;
  const price = document.getElementById('buy-price').value;
  if (product && quantity && price) {
    showToast(`Purchased ${quantity} ${product} for ₹${price}`, 'success');
    toggleForm('buy-form');
  } else {
    showToast('Please fill all fields', 'error');
  }
});

// Handle Sell form submission
document.getElementById('sell-form-submit').addEventListener('submit', function(e) {
  e.preventDefault();
  const product = document.getElementById('sell-product').value;
  const quantity = document.getElementById('sell-quantity').value;
  const price = document.getElementById('sell-price').value;
  if (product && quantity && price) {
    // Add to marketplace sell list
    const sellList = document.getElementById('sell-list');
    const newItem = document.createElement('li');
    newItem.className = 'market-item';
    newItem.innerHTML = `${product} - ${quantity}kg - ₹${price} <button class="btn-ghost btn-small">Remove</button>`;
    sellList.appendChild(newItem);

    // Add to profile's My Sell Listings
    const mySellList = document.getElementById('my-sell-list');
    const newProfileItem = document.createElement('li');
    newProfileItem.className = 'market-item';
    newProfileItem.innerHTML = `${product} - ${quantity}kg - ₹${price} <button class="btn-ghost btn-small">Remove</button>`;
    mySellList.appendChild(newProfileItem);

    // Add event listener for Remove button (works for both lists)
    const removeButtons = [newItem.querySelector('button'), newProfileItem.querySelector('button')];
    removeButtons.forEach(button => {
      button.addEventListener('click', function() {
        sellList.removeChild(newItem);
        mySellList.removeChild(newProfileItem);
        showToast(`${product} removed from sale`, 'info');
      });
    });

    showToast(`${quantity} ${product} listed for ₹${price}`, 'success');
    toggleForm('sell-form');
  } else {
    showToast('Please fill all fields', 'error');
  }
});

// Event listeners for Buy/Sell buttons
// document.getElementById('buy-button').addEventListener('click', () => toggleForm('buy-form'));
document.getElementById('sell-button').addEventListener('click', () => toggleForm('sell-form'));