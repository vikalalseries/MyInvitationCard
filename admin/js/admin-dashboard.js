// Admin Dashboard Handler
const BACKEND_URL = "http://localhost:5000";

// Toast Notification helper
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast-admin ${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

// 1. Session check & validation
const sessionData = localStorage.getItem("mic_admin_session");
if (!sessionData) {
  window.location.href = "login.html";
}

const adminUser = JSON.parse(sessionData);

// Set Admin Sidebar details
document.getElementById("adminUsernameBadge").textContent = adminUser.username;
document.getElementById("adminRoleBadge").textContent = adminUser.role;
document.getElementById("adminUserAvatar").textContent = adminUser.username.substring(0, 2).toUpperCase();

// Helper: check permission
function hasPermission(permission) {
  if (adminUser.role === "Master Owner") return true;
  return adminUser.permissions && adminUser.permissions.includes(permission);
}

// Mapping of tabs/navigation to required permissions
const tabPermissions = {
  "nav-overview": ["orders.view", "payment.view"],
  "nav-users": ["users.view", "users.delete"],
  "nav-admins": ["admins.create", "admins.delete"],
  "nav-templates": ["template.create", "template.edit", "template.delete", "template.publish"],
  "nav-orders": ["orders.view", "orders.update"],
  "nav-payments": ["payment.view", "payment.refund"],
  "nav-pricing": ["pricing.view", "pricing.edit"],
  "nav-audit": ["audit.view"]
};

// Filter sidebar nav items based on roles and permissions
let firstActiveTab = null;
Object.keys(tabPermissions).forEach(navId => {
  const button = document.getElementById(navId);
  if (button) {
    const requiredPermissions = tabPermissions[navId];
    const userHasAccess = requiredPermissions.some(perm => hasPermission(perm));
    
    if (!userHasAccess) {
      button.remove(); // Remove tab item from sidebar
      const targetPanelId = button.getAttribute("data-target");
      const panel = document.getElementById(targetPanelId);
      if (panel) panel.remove(); // Remove section from DOM
    } else {
      if (!firstActiveTab) {
        firstActiveTab = button;
      }
    }
  }
});

// Setup active tab on load
if (firstActiveTab) {
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));
  
  firstActiveTab.classList.add("active");
  const targetId = firstActiveTab.getAttribute("data-target");
  document.getElementById(targetId).classList.add("active");
  document.getElementById("currentTabTitle").textContent = firstActiveTab.textContent.trim();
  
  // Load data for the active tab
  loadTabData(targetId);
} else {
  // No tabs available
  document.querySelector(".main-content-admin").innerHTML = `
    <div class="card-admin" style="margin: 40px auto; max-width: 600px; text-align: center;">
      <i class="fa-solid fa-ban" style="font-size: 48px; color: var(--danger-color); margin-bottom: 20px;"></i>
      <h2>Access Denied</h2>
      <p>Your account does not have permissions to view any dashboard features. Please contact the Master Owner.</p>
    </div>
  `;
}

// Tab Switching
document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    
    btn.classList.add("active");
    const targetId = btn.getAttribute("data-target");
    document.getElementById(targetId).classList.add("active");
    document.getElementById("currentTabTitle").textContent = btn.textContent.trim();
    
    loadTabData(targetId);
  });
});

// Logout Button
document.getElementById("adminLogoutBtn").addEventListener("click", () => {
  localStorage.removeItem("mic_admin_session");
  showToast("Logging out...", "success");
  setTimeout(() => {
    window.location.href = "login.html";
  }, 800);
});

// System Clock
function updateClock() {
  const clockEl = document.getElementById("currentSystemTime");
  if (clockEl) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    clockEl.textContent = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  }
}
setInterval(updateClock, 1000);
updateClock();

// Central Data Loader based on tab selection
function loadTabData(tabId) {
  switch (tabId) {
    case "overviewTab":
      fetchOverviewStats();
      break;
    case "usersTab":
      fetchUsers();
      break;
    case "adminsTab":
      fetchAdmins();
      break;
    case "templatesTab":
      fetchTemplates();
      break;
    case "ordersTab":
      fetchOrders();
      break;
    case "paymentsTab":
      fetchPayments();
      break;
    case "pricingTab":
      fetchPricing();
      break;
    case "auditTab":
      fetchAuditLogs();
      break;
  }
}

// --- TAB DATA FETCHERS & ACTION HANDLERS ---

// 1. Overview stats
async function fetchOverviewStats() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/dashboard-stats`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    
    document.getElementById("statRevenue").textContent = `₹${data.stats.totalRevenue}`;
    document.getElementById("statOrders").textContent = data.stats.totalOrders;
    document.getElementById("statUsers").textContent = data.stats.totalUsers;
    document.getElementById("statTemplates").textContent = data.stats.templatesCount;
    document.getElementById("statPopularTemplate").textContent = data.stats.popularTemplate;
    document.getElementById("statConversionRate").textContent = data.stats.conversionRate;
  } catch (err) {
    console.error("Failed to load dashboard stats", err);
  }
}

// 2. Users management
async function fetchUsers() {
  const tableBody = document.getElementById("usersTableBody");
  if (!tableBody) return;
  tableBody.innerHTML = `<tr><td colspan="7" class="loading-cell"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>`;

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/users`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    tableBody.innerHTML = "";
    if (data.users.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No users registered yet.</td></tr>`;
      return;
    }

    data.users.forEach(user => {
      const tr = document.createElement("tr");
      const avatarUrl = user.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || user.email)}`;
      const dateJoined = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A";
      
      tr.innerHTML = `
        <td><img src="${avatarUrl}" alt="avatar" class="customer-avatar-img"></td>
        <td><strong>${user.name || 'Not filled'}</strong></td>
        <td>${user.email || 'N/A'}</td>
        <td>${user.phone || 'N/A'}</td>
        <td>${user.gender || 'N/A'}</td>
        <td>${dateJoined}</td>
        <td>
          ${hasPermission("users.delete") ? `<button class="table-action-btn delete" onclick="deleteUser('${user.uid}')"><i class="fa-regular fa-trash-can"></i> Delete</button>` : `<span class="badge info-badge">No Permission</span>`}
        </td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, "error");
  }
}

window.deleteUser = async function(uid) {
  if (!confirm("Are you sure you want to permanently delete this customer profile?")) return;
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/users/${uid}?adminUser=${adminUser.username}`, {
      method: "DELETE"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    showToast(data.message, "success");
    fetchUsers();
  } catch (err) {
    showToast(err.message, "error");
  }
};

// 3. Admins management
async function fetchAdmins() {
  const tableBody = document.getElementById("adminsTableBody");
  if (!tableBody) return;
  tableBody.innerHTML = `<tr><td colspan="7" class="loading-cell"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>`;

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/accounts`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    tableBody.innerHTML = "";
    data.accounts.forEach(acc => {
      const tr = document.createElement("tr");
      const lastLoginDate = acc.lastLogin ? new Date(acc.lastLogin).toLocaleString() : "Never";
      const isSelf = acc.username === adminUser.username;
      const isMaster = acc.username === "admin";

      let actionButtons = "";

      // Edit option is always available (allows own profile edit and other admins edit)
      actionButtons += `<button class="table-action-btn edit" style="border-color: rgba(99, 102, 241, 0.2); color: var(--primary-color);" onclick="openEditAdminModal('${acc.username}', '${acc.email}', '${acc.phone}', '${acc.role}')"><i class="fa-regular fa-pen-to-square"></i> Edit</button>`;

      // Status Toggle (Deactivate / Activate)
      if (!isSelf && !isMaster) {
        if (acc.status === "active") {
          actionButtons += `<button class="table-action-btn warning" style="border-color: rgba(245, 158, 11, 0.2); color: var(--warning-color);" onclick="toggleAdminStatus('${acc.username}', 'inactive')"><i class="fa-solid fa-ban"></i> Deactivate</button>`;
        } else {
          actionButtons += `<button class="table-action-btn success" style="border-color: rgba(16, 185, 129, 0.2); color: var(--success-color);" onclick="toggleAdminStatus('${acc.username}', 'active')"><i class="fa-solid fa-circle-check"></i> Activate</button>`;
        }
      }

      // Delete (Remove)
      if (!isSelf && !isMaster && hasPermission("admins.delete")) {
        actionButtons += `<button class="table-action-btn delete" onclick="deleteAdmin('${acc.username}')"><i class="fa-regular fa-trash-can"></i> Remove</button>`;
      }

      tr.innerHTML = `
        <td><strong>${acc.username}</strong></td>
        <td>${acc.email}</td>
        <td>${acc.phone}</td>
        <td><span class="badge role-badge">${acc.role}</span></td>
        <td><span class="badge ${acc.status === 'active' ? 'success-badge' : 'danger-badge'}">${acc.status}</span></td>
        <td>${lastLoginDate}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${actionButtons}
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, "error");
  }
}

window.deleteAdmin = async function(username) {
  if (!confirm(`Are you sure you want to delete admin account '${username}'?`)) return;
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/accounts/${username}?adminUser=${adminUser.username}`, {
      method: "DELETE"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    showToast(data.message, "success");
    fetchAdmins();
  } catch (err) {
    showToast(err.message, "error");
  }
};

window.openEditAdminModal = function(username, email, phone, role) {
  const modal = document.getElementById("editAdminModal");
  if (!modal) return;
  
  document.getElementById("editAdminOldUsername").value = username;
  document.getElementById("editAdminOldRole").value = role;
  document.getElementById("editAdminUsernameDisplay").value = username;
  document.getElementById("editAdminEmail").value = email;
  document.getElementById("editAdminPhone").value = phone;
  
  const roleGroup = document.getElementById("editAdminRoleGroup");
  const roleSelect = document.getElementById("editAdminRole");
  const isMaster = role === "Master Owner" || username === "admin";
  
  // Master admin cannot change role
  if (isMaster) {
    roleGroup.style.display = "none";
    roleSelect.removeAttribute("required");
  } else {
    roleGroup.style.display = "block";
    roleSelect.setAttribute("required", "required");
    roleSelect.value = role;
  }
  
  document.getElementById("editAdminPassword").value = "";
  modal.classList.remove("hidden");
};

window.toggleAdminStatus = async function(username, status) {
  const actionText = status === "active" ? "activate" : "deactivate";
  if (!confirm(`Are you sure you want to ${actionText} admin account '${username}'?`)) return;
  
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/accounts/${username}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status,
        adminUser: adminUser.username
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    showToast(data.message, "success");
    fetchAdmins();
  } catch (err) {
    showToast(err.message, "error");
  }
};

// Create admin account
const createAdminForm = document.getElementById("createAdminForm");
if (createAdminForm) {
  createAdminForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!hasPermission("admins.create")) {
      showToast("You do not have permission to create admin accounts", "error");
      return;
    }
    
    const username = document.getElementById("newAdminUser").value.trim();
    const email = document.getElementById("newAdminEmail").value.trim();
    const phone = document.getElementById("newAdminPhone").value.trim();
    const password = document.getElementById("newAdminPassword").value;
    const role = document.getElementById("newAdminRole").value;

    // Define permissions mapping based on role selection
    let permissions = [];
    if (role === "Template Manager") {
      permissions = ["template.create", "template.edit", "template.delete", "template.publish"];
    } else if (role === "Pricing Manager") {
      permissions = ["pricing.edit", "pricing.view"];
    } else if (role === "Order Manager") {
      permissions = ["orders.update", "orders.view"];
    } else if (role === "Payment Manager") {
      permissions = ["payment.view", "payment.refund"];
    } else if (role === "Customer Support") {
      permissions = ["users.view", "orders.view"];
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username, email, phone, password, role, permissions,
          adminUser: adminUser.username
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      showToast(data.message, "success");
      createAdminForm.reset();
      fetchAdmins();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

// Edit admin account form submission
const editAdminForm = document.getElementById("editAdminForm");
if (editAdminForm) {
  editAdminForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const oldUsername = document.getElementById("editAdminOldUsername").value;
    const oldRole = document.getElementById("editAdminOldRole").value;
    const newUsername = document.getElementById("editAdminUsernameDisplay").value.trim();
    const email = document.getElementById("editAdminEmail").value.trim();
    const phone = document.getElementById("editAdminPhone").value.trim();
    const password = document.getElementById("editAdminPassword").value;
    const role = document.getElementById("editAdminRole").value;

    // Define permissions mapping based on role selection
    let permissions = [];
    if (role === "Template Manager") {
      permissions = ["template.create", "template.edit", "template.delete", "template.publish"];
    } else if (role === "Pricing Manager") {
      permissions = ["pricing.edit", "pricing.view"];
    } else if (role === "Order Manager") {
      permissions = ["orders.update", "orders.view"];
    } else if (role === "Payment Manager") {
      permissions = ["payment.view", "payment.refund"];
    } else if (role === "Customer Support") {
      permissions = ["users.view", "orders.view"];
    }

    try {
      const payload = {
        newUsername,
        email,
        phone,
        adminUser: adminUser.username
      };
      if (password) payload.password = password;
      
      const isMaster = oldRole === "Master Owner" || oldUsername === "admin";
      if (!isMaster) {
        payload.role = role;
        payload.permissions = permissions;
      }

      const res = await fetch(`${BACKEND_URL}/api/admin/accounts/${oldUsername}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      showToast(data.message, "success");
      document.getElementById("editAdminModal").classList.add("hidden");

      // If editing my own profile, update local storage session and badge info
      if (oldUsername === adminUser.username) {
        localStorage.setItem("mic_admin_session", JSON.stringify(data.admin));
        
        // Update in-memory values
        adminUser.username = data.admin.username;
        adminUser.email = data.admin.email;
        adminUser.phone = data.admin.phone;
        adminUser.role = data.admin.role;
        adminUser.permissions = data.admin.permissions;

        // Update badges
        document.getElementById("adminUsernameBadge").textContent = data.admin.username;
        document.getElementById("adminUserAvatar").textContent = data.admin.username.substring(0, 2).toUpperCase();
      }

      fetchAdmins();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

// Close Edit Admin Modal
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
if (closeEditModalBtn) {
  closeEditModalBtn.addEventListener("click", () => {
    document.getElementById("editAdminModal").classList.add("hidden");
  });
}

// 4. Templates (CMS) management
async function fetchTemplates() {
  const grid = document.getElementById("templatesGrid");
  if (!grid) return;
  grid.innerHTML = `<div class="loading-cell" style="grid-column: 1/-1;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>`;

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/templates`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    grid.innerHTML = "";
    if (data.templates.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted)">No card templates uploaded yet. Use the upload panel on the right.</div>`;
      return;
    }

    data.templates.forEach(t => {
      const card = document.createElement("div");
      card.className = "template-cms-card";
      
      // Compute correct thumbnail path
      let thumbUrl = t.thumbnail;
      if (!thumbUrl.startsWith("http") && !thumbUrl.startsWith("assets")) {
        thumbUrl = `${BACKEND_URL}/${thumbUrl}`;
      } else if (thumbUrl.startsWith("assets")) {
        thumbUrl = `../${thumbUrl}`;
      }

      card.innerHTML = `
        <div class="template-cms-thumb" style="background-image: url('${thumbUrl}')">
          <span class="template-cms-category">${t.category.toUpperCase()}</span>
        </div>
        <div class="template-cms-details">
          <h4>${t.name}</h4>
          <div class="template-cms-meta">
            <span class="price-lbl">₹${t.price}</span>
            <span class="id-lbl">ID: ${t.templateId}</span>
          </div>
          <div class="template-cms-actions">
            ${hasPermission("template.delete") ? `<button class="table-action-btn delete btn-block" onclick="deleteTemplate('${t.templateId}')"><i class="fa-regular fa-trash-can"></i> Delete Template</button>` : `<span class="badge info-badge">No delete permission</span>`}
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    showToast(err.message, "error");
  }
}

window.deleteTemplate = async function(templateId) {
  if (!confirm(`Are you sure you want to delete template ${templateId}? This will remove extracted code files.`)) return;
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/templates/${templateId}?adminUser=${adminUser.username}`, {
      method: "DELETE"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    showToast(data.message, "success");
    fetchTemplates();
  } catch (err) {
    showToast(err.message, "error");
  }
};

// ZIP Template Upload drag-and-drop & AJAX logic
const dropzone = document.getElementById("dropzoneAdmin");
const fileInput = document.getElementById("templateZipFile");
const filenameIndicator = document.getElementById("uploadFilename");

if (dropzone && fileInput) {
  // Click dropzone to trigger input
  dropzone.addEventListener("click", () => fileInput.click());

  // Drag over effects
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".zip")) {
        fileInput.files = e.dataTransfer.files;
        filenameIndicator.textContent = file.name;
        filenameIndicator.classList.add("selected");
      } else {
        showToast("Please drop a valid .zip file only", "error");
      }
    }
  });

  // Change input handler
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      filenameIndicator.textContent = fileInput.files[0].name;
      filenameIndicator.classList.add("selected");
    } else {
      filenameIndicator.textContent = "No ZIP selected";
      filenameIndicator.classList.remove("selected");
    }
  });
}

// Upload Form Submission via XHR for progress bar tracking
const templateUploadForm = document.getElementById("templateUploadForm");
if (templateUploadForm) {
  templateUploadForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!hasPermission("template.create")) {
      showToast("You do not have permission to upload templates", "error");
      return;
    }

    const templateId = document.getElementById("templateIdInput").value.trim();
    const name = document.getElementById("templateNameInput").value.trim();
    const category = document.getElementById("templateCategoryInput").value;
    const price = document.getElementById("templatePriceInput").value;
    const file = fileInput.files[0];

    if (!file) {
      showToast("Please select a template ZIP file", "error");
      return;
    }

    const formData = new FormData();
    formData.append("templateId", templateId);
    formData.append("name", name);
    formData.append("category", category);
    formData.append("price", price);
    formData.append("templateZip", file);
    formData.append("adminUser", adminUser.username);

    // Setup Progress UI
    const progressWrapper = document.getElementById("uploadProgressWrapper");
    const progressBar = document.getElementById("uploadProgressBar");
    const progressPercent = document.getElementById("uploadProgressPercent");
    const submitBtn = document.getElementById("uploadSubmitBtn");

    progressWrapper.classList.remove("hidden");
    progressBar.style.width = "0%";
    progressPercent.textContent = "0%";
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading Package...';

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BACKEND_URL}/api/admin/templates/upload`, true);

    // Track upload progress
    xhr.upload.addEventListener("progress", (evt) => {
      if (evt.lengthComputable) {
        const percentComplete = Math.round((evt.loaded / evt.total) * 100);
        progressBar.style.width = percentComplete + "%";
        progressPercent.textContent = percentComplete + "%";
      }
    });

    xhr.onload = function() {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Upload & Extract';
      progressWrapper.classList.add("hidden");

      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          showToast(data.message || "Template loaded successfully", "success");
          templateUploadForm.reset();
          filenameIndicator.textContent = "No ZIP selected";
          filenameIndicator.classList.remove("selected");
          fetchTemplates();
        } else {
          throw new Error(data.message || "Error occurred during upload");
        }
      } catch (err) {
        showToast(err.message, "error");
      }
    };

    xhr.onerror = function() {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Upload & Extract';
      progressWrapper.classList.add("hidden");
      showToast("Network error during upload", "error");
    };

    xhr.send(formData);
  });
}

// 5. Orders management
async function fetchOrders() {
  const tableBody = document.getElementById("ordersTableBody");
  if (!tableBody) return;
  tableBody.innerHTML = `<tr><td colspan="5" class="loading-cell"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>`;

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/orders`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    tableBody.innerHTML = "";
    if (data.orders.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No orders placed yet.</td></tr>`;
      return;
    }

    data.orders.forEach(order => {
      const tr = document.createElement("tr");
      let badgeClass = "info-badge";
      if (order.status === "Printing") badgeClass = "progress-badge";
      else if (order.status === "Dispatched") badgeClass = "warning-badge";
      else if (order.status === "Delivered") badgeClass = "success-badge";

      const canUpdate = hasPermission("orders.update");
      
      tr.innerHTML = `
        <td><strong>#${order.orderId}</strong></td>
        <td><code>${order.uid}</code></td>
        <td>${order.templateName}</td>
        <td><span class="badge ${badgeClass}">${order.status}</span></td>
        <td>
          <select class="order-status-select" onchange="updateOrderStatus('${order.orderId}', this.value)" ${!canUpdate ? 'disabled' : ''}>
            <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Printing" ${order.status === 'Printing' ? 'selected' : ''}>Printing</option>
            <option value="Dispatched" ${order.status === 'Dispatched' ? 'selected' : ''}>Dispatched</option>
            <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          </select>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, "error");
  }
}

window.updateOrderStatus = async function(orderId, status) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/orders/${orderId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminUser: adminUser.username })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    showToast(data.message, "success");
    fetchOrders();
  } catch (err) {
    showToast(err.message, "error");
  }
};

// 6. Payments transactions
async function fetchPayments() {
  const tableBody = document.getElementById("paymentsTableBody");
  if (!tableBody) return;
  tableBody.innerHTML = `<tr><td colspan="6" class="loading-cell"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>`;

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/payments`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    tableBody.innerHTML = "";
    if (data.payments.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No payment transactions recorded yet.</td></tr>`;
      return;
    }

    data.payments.forEach(pay => {
      const tr = document.createElement("tr");
      const isPaid = pay.status === "Paid";
      const badgeClass = isPaid ? "success-badge" : "danger-badge";
      const canRefund = hasPermission("payment.refund") && isPaid;

      tr.innerHTML = `
        <td><strong>#${pay.transactionId}</strong></td>
        <td><code>${pay.razorpayPaymentId}</code></td>
        <td><code>${pay.uid}</code></td>
        <td>₹${pay.amount.toFixed(2)}</td>
        <td><span class="badge ${badgeClass}">${pay.status}</span></td>
        <td>
          ${canRefund ? `<button class="table-action-btn delete" onclick="triggerRefund('${pay.razorpayPaymentId}', ${pay.amount})"><i class="fa-solid fa-rotate-left"></i> Refund</button>` : 
            (pay.status === 'Refunded' ? `<span class="badge danger-badge">Refunded</span>` : `<span class="badge info-badge">No Permission</span>`)}
        </td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, "error");
  }
}

window.triggerRefund = async function(razorpayPaymentId, amount) {
  if (!confirm(`Are you sure you want to refund payment of ₹${amount} (${razorpayPaymentId})? This will mark the transaction as Refunded.`)) return;
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/payments/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ razorpayPaymentId, adminUser: adminUser.username })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    showToast(data.message, "success");
    fetchPayments();
  } catch (err) {
    showToast(err.message, "error");
  }
};

// 7. Pricing & Site settings
async function fetchPricing() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/pricing`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    const config = data.config;
    document.getElementById("weddingPriceInput").value = config.wedding_price || 149;
    document.getElementById("birthdayPriceInput").value = config.birthday_price || 79;
    document.getElementById("nikahPriceInput").value = config.nikah_price || 99;
    document.getElementById("premiumExportInput").value = config.premium_export_price || 49;
    document.getElementById("printingPriceInput").value = config.printing_price_per_page || 20;
    document.getElementById("taxRateInput").value = config.tax_rate || 18;
    document.getElementById("shippingBaseInput").value = config.shipping_base || 40;
  } catch (err) {
    showToast("Failed to load pricing values", "error");
  }
}

const pricingSettingsForm = document.getElementById("pricingSettingsForm");
if (pricingSettingsForm) {
  pricingSettingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!hasPermission("pricing.edit")) {
      showToast("You do not have permission to modify pricing configuration", "error");
      return;
    }

    const config = {
      wedding_price: Number(document.getElementById("weddingPriceInput").value),
      birthday_price: Number(document.getElementById("birthdayPriceInput").value),
      nikah_price: Number(document.getElementById("nikahPriceInput").value),
      premium_export_price: Number(document.getElementById("premiumExportInput").value),
      printing_price_per_page: Number(document.getElementById("printingPriceInput").value),
      tax_rate: Number(document.getElementById("taxRateInput").value),
      shipping_base: Number(document.getElementById("shippingBaseInput").value)
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, adminUser: adminUser.username })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(data.message, "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

// 8. Audit Logs
async function fetchAuditLogs() {
  const tableBody = document.getElementById("auditTableBody");
  if (!tableBody) return;
  tableBody.innerHTML = `<tr><td colspan="4" class="loading-cell"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>`;

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/audit-logs`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    tableBody.innerHTML = "";
    if (data.logs.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No activity logs recorded.</td></tr>`;
      return;
    }

    data.logs.forEach(log => {
      const tr = document.createElement("tr");
      const timestamp = new Date(log.timestamp).toLocaleString();
      
      tr.innerHTML = `
        <td><code>${timestamp}</code></td>
        <td><strong>${log.username}</strong></td>
        <td><span class="badge code-badge">${log.action}</span></td>
        <td>${log.details}</td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, "error");
  }
}
