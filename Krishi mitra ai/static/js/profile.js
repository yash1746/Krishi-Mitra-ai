// Edit profile function
const editProfileBtn = document.getElementById('edit-profile');
if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
        const farmerName = document.getElementById('profile-name').textContent;
        const address = document.getElementById('profile-address').textContent;
        const email = document.getElementById('profile-email').textContent;
        // const phoneNumber = document.getElementById('profile-phone').textContent;

        const popup = document.createElement('div');
        popup.className = 'popup-overlay';
        popup.innerHTML = `
            <div class="popup-content1 card">
                <div class="card-header">
                    <h2>Edit Profile</h2>
                </div>
                <div class="card-body">
                    <div class="profile-edit">
                        <label for="edit-farmer-name">Farmer Name:</label>
                        <input type="text" id="edit-profile-name" value="${farmerName}">
                        <label for="edit-address">Address:</label>
                        <input type="text" id="edit-profile-address" value="${address}">
                        <label for="edit-email">Email:</label>
                        <input type="text" id="edit-profile-email" value="${email}">
                    </div>
                    <div class="popup-actions">
                        <button class="btn-primary" id="save-profile">Save</button>
                        <button class="btn-ghost" id="cancel-profile">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(popup);

        const saveBtn = document.getElementById('save-profile');
        const cancelBtn = document.getElementById('cancel-profile');

        saveBtn.addEventListener('click', () => {
            document.getElementById('profile-name').textContent = document.getElementById('edit-profile-name').value;
            document.getElementById('profile-address').textContent = document.getElementById('edit-profile-address').value;
            document.getElementById('profile-email').textContent = document.getElementById('edit-profile-email').value;
            // document.getElementById('profile-phone').textContent = document.getElementById('edit-profile-phone').value;
            document.body.removeChild(popup);
        });

        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(popup);
        });

        // Close popup on overlay click
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                document.body.removeChild(popup);
            }
        });
    });
}

// Toggle button handler
const haveDeviceToggle = document.getElementById('have-device');
if (haveDeviceToggle) {
    haveDeviceToggle.addEventListener('change', (e) => {
        console.log('Have Device?', e.target.checked); // Placeholder for future logic
    });
}