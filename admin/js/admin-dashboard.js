// Admin Dashboard Handler
const BACKEND_URL = "http://localhost:5000";
let allUsers = [];
let allCredentials = [];
let allOrders = [];

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

// Filter Credentials DB tab (restricted to Master Owner)
const navCredentialsBtn = document.getElementById("nav-credentials");
if (adminUser.role === "Master Owner") {
  if (navCredentialsBtn) navCredentialsBtn.style.display = "block";
} else {
  if (navCredentialsBtn) navCredentialsBtn.remove();
  const credentialsPanel = document.getElementById("credentialsTab");
  if (credentialsPanel) credentialsPanel.remove();
}

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
    case "credentialsTab":
      fetchCredentials();
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
  tableBody.innerHTML = `<tr><td colspan="9" class="loading-cell"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>`;

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/users`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    allUsers = data.users || [];
    renderUsersTable(allUsers);
  } catch (err) {
    showToast(err.message, "error");
  }
}

function renderUsersTable(users) {
  const tableBody = document.getElementById("usersTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = "";
  if (users.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">No users registered yet.</td></tr>`;
    return;
  }

  users.forEach(user => {
    const tr = document.createElement("tr");
    const avatarUrl = user.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || user.email)}`;
    const dateJoined = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A";
    const statusText = user.status === "disabled" ? "Disabled" : "Active";
    const statusClass = user.status === "disabled" ? "danger-badge" : "success-badge";
    const ordersCount = user.ordersCount || 0;
    
    // Status button toggler
    const isUserDisabled = user.status === "disabled";
    const toggleBtn = isUserDisabled
      ? `<button class="table-action-btn success" onclick="toggleUserStatus('${user.uid}', false)"><i class="fa-solid fa-user-check"></i> Activate</button>`
      : `<button class="table-action-btn warning" onclick="toggleUserStatus('${user.uid}', true)"><i class="fa-solid fa-user-slash"></i> Deactivate</button>`;

    // Delete button
    const deleteBtn = hasPermission("users.delete")
      ? `<button class="table-action-btn delete" onclick="deleteUser('${user.uid}')"><i class="fa-regular fa-trash-can"></i> Delete</button>`
      : "";

    // Impersonate button (Master Owner only)
    const impersonateBtn = adminUser.role === "Master Owner"
      ? `<button class="table-action-btn edit" onclick="impersonateUser('${user.uid}')"><i class="fa-solid fa-right-to-bracket"></i> Access</button>`
      : "";

    tr.innerHTML = `
      <td><img src="${avatarUrl}" alt="avatar" class="customer-avatar-img"></td>
      <td><strong>${user.name || 'Not filled'}</strong></td>
      <td>${user.email || 'N/A'}</td>
      <td>${user.phone || 'N/A'}</td>
      <td>${user.gender || 'N/A'}</td>
      <td>${dateJoined}</td>
      <td><span class="badge ${statusClass}">${statusText}</span></td>
      <td><span class="badge progress-badge">${ordersCount}</span></td>
      <td>
        <div style="display: flex; gap: 5px;">
          ${toggleBtn}
          ${impersonateBtn}
          ${deleteBtn}
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });
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

window.toggleUserStatus = async function(uid, isDisabled) {
  const actionText = isDisabled ? "deactivate" : "activate";
  if (!confirm(`Are you sure you want to ${actionText} this customer account?`)) return;

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/users/${uid}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        disabled: isDisabled,
        adminUser: adminUser.username
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showToast(data.message, "success");
    fetchUsers();
  } catch (err) {
    showToast(err.message, "error");
  }
};

window.exportUsersToCSV = function() {
  if (allUsers.length === 0) {
    showToast("No user data available to export.", "error");
    return;
  }

  const headers = [
    "User ID (UID)",
    "Name",
    "Email",
    "Phone",
    "Gender",
    "Date of Birth (DOB)",
    "Preferred Language",
    "Joined Date",
    "Status",
    "Orders Placed",
    "Saved AddressesCount",
    "Saved Addresses"
  ];

  const csvRows = [headers.join(",")];

  allUsers.forEach(user => {
    const addressStr = (user.addresses || []).map(addr => {
      return `[${addr.fullName}, Phone: ${addr.phone}, Address: ${addr.address}, ${addr.city}, ${addr.state} - ${addr.pincode}]`;
    }).join(" | ");

    const row = [
      user.uid || "",
      user.name || "Not filled",
      user.email || "N/A",
      user.phone || "N/A",
      user.gender || "N/A",
      user.dob || "N/A",
      user.language || "english",
      user.createdAt ? new Date(user.createdAt).toISOString() : "N/A",
      user.status || "active",
      user.ordersCount || 0,
      (user.addresses || []).length,
      addressStr
    ];

    const escapedRow = row.map(val => {
      let stringVal = String(val);
      stringVal = stringVal.replace(/"/g, '""');
      if (stringVal.includes(",") || stringVal.includes("\n") || stringVal.includes('"') || stringVal.includes("|")) {
        stringVal = `"${stringVal}"`;
      }
      return stringVal;
    });

    csvRows.push(escapedRow.join(","));
  });

  const blob = new Blob([csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.setAttribute("href", window.URL.createObjectURL(blob));
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  link.setAttribute("download", `registered_users_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast("CSV exported successfully!", "success");
};

// 2b. Credentials management & Impersonation
async function fetchCredentials() {
  const tableBody = document.getElementById("credentialsTableBody");
  if (!tableBody) return;
  tableBody.innerHTML = `<tr><td colspan="7" class="loading-cell"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>`;

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/users/credentials?adminUser=${encodeURIComponent(adminUser.username)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    allCredentials = data.credentials || [];
    renderCredentialsTable(allCredentials);
  } catch (err) {
    showToast(err.message, "error");
  }
}

function renderCredentialsTable(credentials) {
  const tableBody = document.getElementById("credentialsTableBody");
  if (!tableBody) return;
  
  tableBody.innerHTML = "";
  if (credentials.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No credentials metadata found.</td></tr>`;
    return;
  }

  credentials.forEach(c => {
    const tr = document.createElement("tr");
    const joinedDate = c.createdAt !== "N/A" ? new Date(c.createdAt).toLocaleDateString() : "N/A";
    const statusText = c.disabled ? "Disabled" : "Active";
    const statusClass = c.disabled ? "danger-badge" : "success-badge";
    const hashContent = c.passwordHash && c.passwordHash !== "N/A"
      ? `<span class="badge code-badge" title="${c.passwordHash}">${c.passwordHash.substring(0, 15)}...</span>`
      : `<span class="badge info-badge">Encrypted</span>`;

    tr.innerHTML = `
      <td><strong>${c.name}</strong></td>
      <td>${c.email}</td>
      <td><span class="badge code-badge">${c.uid}</span></td>
      <td>${joinedDate}</td>
      <td>${hashContent}</td>
      <td><span class="badge ${statusClass}">${statusText}</span></td>
      <td>
        <button class="table-action-btn edit" onclick="impersonateUser('${c.uid}')">
          <i class="fa-solid fa-right-to-bracket"></i> Access
        </button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

window.impersonateUser = async function(uid) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/users/${uid}/impersonate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminUser: adminUser.username
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    const token = data.token;
    showToast("Launching user account session...", "success");
    window.open(`../profile.html?token=${encodeURIComponent(token)}`, "_blank");
  } catch (err) {
    showToast(err.message, "error");
  }
};

// Bind search input listeners immediately
const userSearchInputEl = document.getElementById("userSearchInput");
if (userSearchInputEl) {
  userSearchInputEl.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    const filtered = allUsers.filter(u => 
      (u.name && u.name.toLowerCase().includes(query)) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.phone && u.phone.includes(query)) ||
      (u.uid && u.uid.toLowerCase().includes(query))
    );
    renderUsersTable(filtered);
  });
}

const credentialSearchInputEl = document.getElementById("credentialSearchInput");
if (credentialSearchInputEl) {
  credentialSearchInputEl.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    const filtered = allCredentials.filter(c => 
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.uid && c.uid.toLowerCase().includes(query)) ||
      (c.phone && c.phone.includes(query))
    );
    renderCredentialsTable(filtered);
  });
}

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
  tableBody.innerHTML = `<tr><td colspan="7" class="loading-cell"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>`;

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/orders`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    allOrders = data.orders || [];
    filterAndRenderOrders();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Filter and render orders dynamically based on search query and date scope (Day/Week/Month/Year)
function filterAndRenderOrders() {
  const query = document.getElementById("orderSearchInput")?.value.toLowerCase().trim() || "";
  const dateFilter = document.getElementById("orderDateFilter")?.value || "all";
  
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const filtered = allOrders.filter(o => {
    // 1. Date Scope Filter
    if (o.createdAt) {
      const orderDate = new Date(o.createdAt);
      if (dateFilter === "today" && orderDate < startOfToday) return false;
      if (dateFilter === "week" && orderDate < startOfWeek) return false;
      if (dateFilter === "month" && orderDate < startOfMonth) return false;
      if (dateFilter === "year" && orderDate < startOfYear) return false;
    } else if (dateFilter !== "all") {
      return false; // exclude if no timestamp and filtering is active
    }

    // 2. Text Search Query Filter
    const matchesQuery = 
      o.orderId.toLowerCase().includes(query) ||
      (o.customerName && o.customerName.toLowerCase().includes(query)) ||
      (o.customerPhone && o.customerPhone.includes(query)) ||
      (o.templateName && o.templateName.toLowerCase().includes(query)) ||
      (o.templateId && o.templateId.toLowerCase().includes(query)) ||
      (o.uid && o.uid.toLowerCase().includes(query));

    return matchesQuery;
  });

  renderOrdersTable(filtered);
}

function renderOrdersTable(orders) {
  const tableBody = document.getElementById("ordersTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = "";
  if (orders.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No orders match the current filters.</td></tr>`;
    return;
  }

  orders.forEach(order => {
    const tr = document.createElement("tr");
    
    // Status color mapping
    let badgeClass = "info-badge";
    if (order.status === "Pending") badgeClass = "role-badge";
    else if (order.status === "Confirmed") badgeClass = "info-badge";
    else if (order.status === "Processing") badgeClass = "progress-badge";
    else if (order.status === "Dispatched") badgeClass = "warning-badge";
    else if (order.status === "Out for Delivery") badgeClass = "progress-badge";
    else if (order.status === "Delivered") badgeClass = "success-badge";
    else if (order.status === "Cancelled") badgeClass = "danger-badge";

    // Date formatting
    const datePlaced = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "N/A";

    // Payment display
    const paymentText = order.paymentStatus === "Paid" 
      ? `<span class="badge success-badge">Paid (₹${order.amountPaid})</span>` 
      : `<span class="badge danger-badge">Unpaid</span>`;

    // Manage actions (Order Manager and Master Admin can view/edit)
    const canUpdate = hasPermission("orders.update");
    const actionBtn = canUpdate
      ? `<button class="table-action-btn edit" onclick="openDeliveryModal('${order.orderId}')"><i class="fa-solid fa-truck-ramp-box"></i> Manage Delivery</button>`
      : `<button class="table-action-btn" onclick="openDeliveryModal('${order.orderId}')"><i class="fa-regular fa-eye"></i> View Shipment</button>`;

    tr.innerHTML = `
      <td><strong>#${order.orderId}</strong></td>
      <td>
        <strong>${order.customerName}</strong><br>
        <span style="font-size:12px; color:var(--text-muted);">${order.customerPhone}</span>
      </td>
      <td>
        <strong>${order.templateName}</strong><br>
        <span style="font-size:12px; color:var(--text-muted);">${order.templateId}</span>
      </td>
      <td>${paymentText}</td>
      <td><code>${datePlaced}</code></td>
      <td><span class="badge ${badgeClass}">${order.status}</span></td>
      <td>${actionBtn}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// Open Delivery / Shipment Management Modal
window.openDeliveryModal = function(orderId) {
  const order = allOrders.find(o => o.orderId === orderId);
  if (!order) {
    showToast("Order details not found", "error");
    return;
  }

  // Set values in the modal form
  document.getElementById("deliveryOrderId").value = order.orderId;
  document.getElementById("deliveryStatus").value = order.status || "Pending";
  document.getElementById("deliveryCarrier").value = order.carrier || "";
  document.getElementById("deliveryTrackingId").value = order.trackingId || "";
  document.getElementById("deliveryNotes").value = order.notes || "";
  
  // Format Date value (YYYY-MM-DD) for HTML5 input date
  if (order.estimatedDelivery) {
    try {
      const d = new Date(order.estimatedDelivery);
      if (!isNaN(d.getTime())) {
        document.getElementById("deliveryEstDate").value = d.toISOString().split("T")[0];
      } else {
        document.getElementById("deliveryEstDate").value = "";
      }
    } catch (e) {
      document.getElementById("deliveryEstDate").value = "";
    }
  } else {
    document.getElementById("deliveryEstDate").value = "";
  }

  // Populate customer & address section
  document.getElementById("deliveryCustName").textContent = order.customerName || "N/A";
  document.getElementById("deliveryCustPhone").textContent = order.customerPhone || "N/A";
  document.getElementById("deliveryCustEmail").textContent = order.customerEmail || "N/A";

  const addr = order.shippingAddress;
  if (addr) {
    const fullAddress = `${addr.fullName}, Phone: ${addr.phone}${addr.emergencyPhone ? ' (Alt: ' + addr.emergencyPhone + ')' : ''}, Address: ${addr.address}${addr.address2 ? ', ' + addr.address2 : ''}, ${addr.city}, ${addr.state} - ${addr.pincode}`;
    document.getElementById("deliveryAddressText").textContent = fullAddress;
  } else {
    document.getElementById("deliveryAddressText").textContent = "No shipping address saved for this customer profile.";
  }

  // Disable inputs if order.update permission is missing
  const canUpdate = hasPermission("orders.update");
  document.getElementById("deliveryStatus").disabled = !canUpdate;
  document.getElementById("deliveryCarrier").disabled = !canUpdate;
  document.getElementById("deliveryTrackingId").disabled = !canUpdate;
  document.getElementById("deliveryEstDate").disabled = !canUpdate;
  document.getElementById("deliveryNotes").disabled = !canUpdate;
  
  const saveBtn = document.querySelector("#deliveryTrackingForm button[type='submit']");
  if (saveBtn) saveBtn.style.display = canUpdate ? "block" : "none";

  // Update Stepper Journey UI
  updateTimelineUI(order);

  // Show Modal
  const modal = document.getElementById("manageDeliveryModal");
  if (modal) modal.classList.remove("hidden");
};

// Close Delivery Modal
window.closeDeliveryModal = function() {
  const modal = document.getElementById("manageDeliveryModal");
  if (modal) modal.classList.add("hidden");
};

// Copy Address helper
window.copyDeliveryAddress = function() {
  const text = document.getElementById("deliveryAddressText").textContent;
  if (text && text !== "No shipping address saved for this customer profile.") {
    navigator.clipboard.writeText(text)
      .then(() => showToast("Shipping address copied to clipboard!", "success"))
      .catch(() => showToast("Failed to copy address", "error"));
  }
};

// Update interactive Shipment Journey Stepper Timeline UI (Amazon/Flipkart Style)
function updateTimelineUI(order) {
  const statuses = ["Pending", "Confirmed", "Processing", "Dispatched", "Out for Delivery", "Delivered"];
  const currentStatus = order.status;
  
  // Find current index in timeline
  const currentIndex = statuses.indexOf(currentStatus);

  statuses.forEach((status, idx) => {
    const stepEl = document.getElementById(`step-${status.replace(/ /g, "-")}`);
    if (!stepEl) return;

    const dateEl = stepEl.querySelector(".step-date");
    
    // Clear custom class styling
    stepEl.className = "timeline-step";

    if (idx < currentIndex) {
      // Completed steps
      stepEl.classList.add("active");
      if (dateEl) {
        if (status === "Pending") {
          dateEl.textContent = order.createdAt ? new Date(order.createdAt).toLocaleString() : "Completed";
        } else if (status === "Dispatched" && order.carrier) {
          dateEl.textContent = `Via ${order.carrier} (${order.trackingId || 'AWB Pending'})`;
        } else {
          dateEl.textContent = "Completed";
        }
      }
    } else if (idx === currentIndex) {
      // Current step
      stepEl.classList.add("current");
      stepEl.classList.add("active");
      if (dateEl) {
        if (currentStatus === "Pending") {
          dateEl.textContent = "Awaiting confirmation";
        } else if (currentStatus === "Dispatched" && order.carrier) {
          dateEl.textContent = `Dispatched via ${order.carrier} (AWB: ${order.trackingId || 'N/A'})`;
        } else if (currentStatus === "Delivered") {
          dateEl.textContent = "Delivered successfully";
        } else {
          dateEl.textContent = "In progress";
        }
      }
    } else {
      // Upcoming steps
      if (dateEl) {
        if (status === "Delivered" && order.estimatedDelivery) {
          dateEl.textContent = `Est: ${new Date(order.estimatedDelivery).toLocaleDateString()}`;
        } else {
          dateEl.textContent = "Pending";
        }
      }
    }
  });

  // If order is Cancelled, mark all steps as red/inactive or show cancellation alert
  if (currentStatus === "Cancelled") {
    statuses.forEach(status => {
      const stepEl = document.getElementById(`step-${status.replace(/ /g, "-")}`);
      if (stepEl) {
        stepEl.className = "timeline-step";
        const dateEl = stepEl.querySelector(".step-date");
        if (dateEl) dateEl.textContent = "Cancelled";
      }
    });
    // Highlight first step as cancelled in red
    const firstStep = document.getElementById("step-Pending");
    if (firstStep) {
      firstStep.style.color = "var(--danger-color)";
      const dot = firstStep.querySelector(".step-dot");
      if (dot) {
        dot.style.background = "var(--danger-color)";
        dot.style.boxShadow = "0 0 8px var(--danger-color)";
      }
    }
  } else {
    // Reset Pending first step color if not cancelled
    const firstStep = document.getElementById("step-Pending");
    if (firstStep) {
      firstStep.style.color = "";
      const dot = firstStep.querySelector(".step-dot");
      if (dot) {
        dot.style.background = "";
        dot.style.boxShadow = "";
      }
    }
  }
}

// Tracking Form submit
const deliveryTrackingForm = document.getElementById("deliveryTrackingForm");
if (deliveryTrackingForm) {
  deliveryTrackingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!hasPermission("orders.update")) {
      showToast("Permission denied", "error");
      return;
    }

    const orderId = document.getElementById("deliveryOrderId").value;
    const status = document.getElementById("deliveryStatus").value;
    const carrier = document.getElementById("deliveryCarrier").value;
    const trackingId = document.getElementById("deliveryTrackingId").value.trim();
    const estimatedDelivery = document.getElementById("deliveryEstDate").value;
    const notes = document.getElementById("deliveryNotes").value.trim();

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          carrier,
          trackingId,
          estimatedDelivery,
          notes,
          adminUser: adminUser.username
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showToast("Order tracking details updated!", "success");
      closeDeliveryModal();
      fetchOrders();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

// Export filtered orders database to CSV
window.exportOrdersToCSV = function() {
  const query = document.getElementById("orderSearchInput")?.value.toLowerCase().trim() || "";
  const dateFilter = document.getElementById("orderDateFilter")?.value || "all";
  
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const filtered = allOrders.filter(o => {
    if (o.createdAt) {
      const orderDate = new Date(o.createdAt);
      if (dateFilter === "today" && orderDate < startOfToday) return false;
      if (dateFilter === "week" && orderDate < startOfWeek) return false;
      if (dateFilter === "month" && orderDate < startOfMonth) return false;
      if (dateFilter === "year" && orderDate < startOfYear) return false;
    } else if (dateFilter !== "all") {
      return false;
    }
    const matchesQuery = 
      o.orderId.toLowerCase().includes(query) ||
      (o.customerName && o.customerName.toLowerCase().includes(query)) ||
      (o.customerPhone && o.customerPhone.includes(query)) ||
      (o.templateName && o.templateName.toLowerCase().includes(query)) ||
      (o.templateId && o.templateId.toLowerCase().includes(query)) ||
      (o.uid && o.uid.toLowerCase().includes(query));
    return matchesQuery;
  });

  if (filtered.length === 0) {
    showToast("No order data matches the current filters to export.", "error");
    return;
  }

  const headers = [
    "Order ID",
    "User ID (UID)",
    "Customer Name",
    "Customer Email",
    "Customer Phone",
    "Card Template Name",
    "Card Template ID",
    "Date Placed",
    "Payment Status",
    "Amount Paid (INR)",
    "Delivery Status",
    "Courier Partner",
    "Tracking ID (AWB)",
    "Estimated Delivery Date",
    "Shipping Address Details",
    "Courier Notes"
  ];

  const csvRows = [headers.join(",")];

  filtered.forEach(order => {
    const addr = order.shippingAddress;
    const addressStr = addr
      ? `[${addr.fullName}, Phone: ${addr.phone}${addr.emergencyPhone ? ' (Alt: ' + addr.emergencyPhone + ')' : ''}, Address: ${addr.address}${addr.address2 ? ', ' + addr.address2 : ''}, ${addr.city}, ${addr.state} - ${addr.pincode}]`
      : "No shipping address saved";

    const row = [
      order.orderId || "",
      order.uid || "",
      order.customerName || "N/A",
      order.customerEmail || "N/A",
      order.customerPhone || "N/A",
      order.templateName || "",
      order.templateId || "",
      order.createdAt ? new Date(order.createdAt).toISOString() : "N/A",
      order.paymentStatus || "Pending",
      order.amountPaid || 0,
      order.status || "Pending",
      order.carrier || "N/A",
      order.trackingId || "N/A",
      order.estimatedDelivery || "N/A",
      addressStr,
      order.notes || ""
    ];

    const escapedRow = row.map(val => {
      let stringVal = String(val);
      stringVal = stringVal.replace(/"/g, '""');
      if (stringVal.includes(",") || stringVal.includes("\n") || stringVal.includes('"') || stringVal.includes("|")) {
        stringVal = `"${stringVal}"`;
      }
      return stringVal;
    });

    csvRows.push(escapedRow.join(","));
  });

  const blob = new Blob([csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.setAttribute("href", window.URL.createObjectURL(blob));
  const dateStr = now.toISOString().slice(0, 10);
  link.setAttribute("download", `orders_export_${dateFilter}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(`Exported ${filtered.length} orders successfully!`, "success");
};

// Bind search and filter input listeners
const orderSearchInput = document.getElementById("orderSearchInput");
if (orderSearchInput) {
  orderSearchInput.addEventListener("input", filterAndRenderOrders);
}

const orderDateFilter = document.getElementById("orderDateFilter");
if (orderDateFilter) {
  orderDateFilter.addEventListener("change", filterAndRenderOrders);
}

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
