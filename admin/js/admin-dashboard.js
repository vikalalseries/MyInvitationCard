// Admin Dashboard Handler
const BACKEND_URL = "http://localhost:5000";
let allUsers = [];
let allCredentials = [];
let allOrders = [];

// ── TEMPLATE FOLDER RESOLVER ──
// Maps any templateId from the DB to an actual folder inside universal-template-editor/templates/.
// Only 'card1' exists right now — all other IDs (card101, card102, 1, 37…) fall back to it.
const TEMPLATE_FOLDER_MAP = {
  'card1': 'card1',
  '1': 'card1',
  '37': 'card1',
  '38': 'card1'
};
function resolveTemplateFolder(templateId) {
  if (!templateId) return 'card1';
  const id = String(templateId).toLowerCase();
  // Exact match
  if (TEMPLATE_FOLDER_MAP[id]) return TEMPLATE_FOLDER_MAP[id];
  // Strip numeric suffix: 'card101' → 'card1'
  const stripped = id.replace(/\d+$/, '');
  if (stripped && TEMPLATE_FOLDER_MAP[stripped + '1']) return TEMPLATE_FOLDER_MAP[stripped + '1'];
  // Pattern: starts with 'card' → use card1
  if (id.startsWith('card')) return 'card1';
  // Purely numeric → card1
  if (/^\d+$/.test(id)) return 'card1';
  return 'card1';
}

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

let currentActiveTabId = "overviewTab";

// Setup active tab on load
if (firstActiveTab) {
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));
  
  firstActiveTab.classList.add("active");
  const targetId = firstActiveTab.getAttribute("data-target");
  currentActiveTabId = targetId;
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
    currentActiveTabId = targetId;
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
function loadTabData(tabId, isBackground = false) {
  switch (tabId) {
    case "overviewTab":
      fetchOverviewStats(isBackground);
      break;
    case "usersTab":
      fetchUsers(isBackground);
      break;
    case "credentialsTab":
      fetchCredentials(isBackground);
      break;
    case "adminsTab":
      fetchAdmins(isBackground);
      break;
    case "templatesTab":
      fetchTemplates(isBackground);
      break;
    case "ordersTab":
      fetchOrders(isBackground);
      break;
    case "paymentsTab":
      fetchPayments(isBackground);
      break;
    case "pricingTab":
      fetchPricing(isBackground);
      break;
    case "auditTab":
      fetchAuditLogs(isBackground);
      break;
  }
}

// Auto-polling timer for live backend updates (polls active tab every 10 seconds silently)
const AUTO_POLL_INTERVAL_MS = 10000;
setInterval(() => {
  const isModalOpen = !!document.querySelector(".modal-overlay.open, .modal-admin:not(.hidden), .modal:not(.hidden)");
  if (currentActiveTabId && document.visibilityState === "visible" && !isModalOpen) {
    loadTabData(currentActiveTabId, true);
  }
}, AUTO_POLL_INTERVAL_MS);

// --- TAB DATA FETCHERS & ACTION HANDLERS ---

// 1. Overview stats
async function fetchOverviewStats(isBackground = false) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/dashboard-stats`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    
    document.getElementById("statRevenue").textContent = `₹${data.stats.totalRevenue.toLocaleString("en-IN")}`;
    document.getElementById("statOrders").textContent = data.stats.totalOrders;
    document.getElementById("statUsers").textContent = data.stats.totalUsers;
    document.getElementById("statTemplates").textContent = data.stats.templatesCount;
    document.getElementById("statPopularTemplate").textContent = data.stats.popularTemplate;
    document.getElementById("statConversionRate").textContent = data.stats.conversionRate;

    // Render weekly sales chart dynamically
    const chartContainer = document.querySelector(".analytics-chart-placeholder");
    if (chartContainer && data.stats.weeklySales) {
      chartContainer.innerHTML = "";
      
      const sales = data.stats.weeklySales;
      const maxRevenue = Math.max(...sales.map(s => s.revenue), 1000); // minimum scale factor

      sales.forEach(s => {
        const heightPercent = Math.max(5, Math.round((s.revenue / maxRevenue) * 95));
        const bar = document.createElement("div");
        bar.className = "simulated-chart-bar";
        bar.style.height = `${heightPercent}%`;
        bar.title = `${s.day}: ₹${s.revenue.toFixed(2)}`;
        bar.innerHTML = `<span>${s.day}</span>`;
        chartContainer.appendChild(bar);
      });
    }
  } catch (err) {
    if (!isBackground) console.error("Failed to load dashboard stats", err);
  }
}

// 2. Users management
async function fetchUsers(isBackground = false) {
  const tableBody = document.getElementById("usersTableBody");
  if (!tableBody) return;
  if (!isBackground) {
    tableBody.innerHTML = `<tr><td colspan="9" class="loading-cell"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>`;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/users`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    allUsers = data.users || [];
    renderUsersTable(allUsers);
  } catch (err) {
    if (!isBackground) showToast(err.message, "error");
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
async function fetchOrders(isBackground = false) {
  const tableBody = document.getElementById("ordersTableBody");
  if (!tableBody) return;
  if (!isBackground) {
    tableBody.innerHTML = `<tr><td colspan="7" class="loading-cell"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>`;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/orders`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    allOrders = data.orders || [];
    filterAndRenderOrders();
  } catch (err) {
    if (!isBackground) showToast(err.message, "error");
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
      <td>${order.orderType || 'normal'}</td>
      <td><button class="table-action-btn edit" onclick="openPrintCardModal('${order.orderId}')"><i class="fa-solid fa-eye"></i> View Design</button></td>
      <td><button class="table-action-btn edit" onclick="window.open('${BACKEND_URL}/api/admin/orders/${order._id}/slip', '_blank')"><i class="fa-solid fa-print"></i> Print Slip</button></td>
      <td>${actionBtn}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// Value formatter helpers
function formatValue(val) {
  if (!val) return "N/A";
  return val.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function formatKey(key) {
  if (!key) return "";
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Switch Order Modal Tabs
window.switchOrderTab = function(tabId, btn) {
  document.querySelectorAll(".order-tab-panel").forEach(panel => {
    panel.classList.remove("active");
  });
  document.querySelectorAll(".order-tab-btn").forEach(button => {
    button.classList.remove("active");
  });
  const targetPanel = document.getElementById(tabId);
  if (targetPanel) targetPanel.classList.add("active");
  if (btn) btn.classList.add("active");
};

// Open Delivery & Order Detail Portal Modal
window.openDeliveryModal = async function(orderId) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/orders/${orderId}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch order details");
    
    const order = data.order;
    window.currentSelectedOrder = order;

    // Reset tabs
    const firstTabBtn = document.querySelector(".order-tab-btn");
    if (firstTabBtn) window.switchOrderTab('order-details-tab', firstTabBtn);

    // Populate modal title
    document.getElementById("portalOrderId").textContent = order.orderId;
    
    // TAB 1: ORDER DETAILS
    document.getElementById("specTemplateName").textContent = order.templateName || "N/A";
    document.getElementById("specTemplateId").textContent = order.templateId || "N/A";
    document.getElementById("specQuantity").textContent = order.quantity || "N/A";
    document.getElementById("specPaperStock").textContent = formatValue(order.stockOption);
    document.getElementById("specPremiumPaper").textContent = order.premiumPaperStock ? formatValue(order.premiumPaperStock) : "None";
    document.getElementById("specEnvelope").textContent = formatValue(order.envelopeOption);
    document.getElementById("specDeliveryMethod").textContent = formatValue(order.deliveryMethod);
    
    // View Editor button
    const viewEditorBtn = document.getElementById("viewTemplateEditorBtn");
    if (viewEditorBtn) {
      viewEditorBtn.href = `../universal-template-editor/editor.html?templateId=${order.templateId}`;
    }

    // Load Preview iframe
    const iframe = document.getElementById("orderTemplateIframe");
    const placeholder = document.getElementById("orderTemplatePlaceholder");
    if (iframe) {
      const templateFolder = resolveTemplateFolder(order.templateId);
      iframe.src = `../universal-template-editor/templates/${templateFolder}/template.html`;
      
      // Pass the customized user fields to the preview iframe on load
      iframe.onload = function() {
        if (order.templateEditData) {
          iframe.contentWindow.postMessage({
            type: 'UPDATE_TEMPLATE_DATA',
            data: order.templateEditData
          }, '*');
        }
      };
      
      iframe.style.display = "block";
      if (placeholder) placeholder.style.display = "none";
    }
    
    // User customizations list (key-value)
    const customizationsList = document.getElementById("orderCustomizationsList");
    if (customizationsList) {
      customizationsList.innerHTML = "";
      if (order.templateEditData && order.templateEditData.fields) {
        const fields = order.templateEditData.fields;
        for (const [key, val] of Object.entries(fields)) {
          if (val && typeof val === "string") {
            const div = document.createElement("div");
            div.style.display = "flex";
            div.style.justifyContent = "space-between";
            div.style.borderBottom = "1px dashed var(--border-color)";
            div.style.paddingBottom = "3px";
            div.innerHTML = `<span style="font-weight:600; color:var(--text-muted);">${formatKey(key)}:</span><span>${val}</span>`;
            customizationsList.appendChild(div);
          }
        }
      }
      if (customizationsList.children.length === 0) {
        customizationsList.innerHTML = `<div style="color:var(--text-muted); font-style:italic;">No custom fields edited.</div>`;
      }
    }

    // Billing details
    const pricing = order.pricing || {};
    document.getElementById("billBaseCost").textContent = `₹${(pricing.baseTotal || 0).toFixed(2)}`;
    document.getElementById("billPaperAddon").textContent = `₹${(pricing.paperTotal || 0).toFixed(2)}`;
    document.getElementById("billEnvelopeAddon").textContent = `₹${(pricing.envelopeTotal || 0).toFixed(2)}`;
    document.getElementById("billShippingCost").textContent = `₹${(pricing.deliveryPrice || 0).toFixed(2)}`;
    document.getElementById("billSubtotal").textContent = `₹${(pricing.subtotal || 0).toFixed(2)}`;
    document.getElementById("billTax").textContent = `₹${(pricing.tax || 0).toFixed(2)}`;
    document.getElementById("billGrandTotal").textContent = `₹${(pricing.total || 0).toFixed(2)}`;
    
    const paymentStatusBadge = document.getElementById("billPaymentStatus");
    if (paymentStatusBadge) {
      paymentStatusBadge.textContent = order.paymentStatus || "Pending";
      paymentStatusBadge.className = `badge ${order.paymentStatus === "Paid" ? "success-badge" : "danger-badge"}`;
    }
    document.getElementById("billPaymentRef").textContent = order.paymentId || "N/A";

    // TAB 2: DELIVERY & TRACKING
    document.getElementById("tab2CustName").textContent = order.customerName || "N/A";
    document.getElementById("tab2CustPhone").textContent = order.customerPhone || "N/A";
    document.getElementById("tab2CustEmail").textContent = order.customerEmail || "N/A";
    
    const addr = order.shippingAddress;
    if (addr) {
      document.getElementById("tab2AddressText").innerHTML = `
        <strong>${addr.fullName}</strong><br>
        ${addr.address}${addr.address2 ? ', ' + addr.address2 : ''}<br>
        ${addr.city}, ${addr.state} - <strong>${addr.pincode}</strong><br>
        Phone: ${addr.phone} ${addr.emergencyPhone ? '(Alt: ' + addr.emergencyPhone + ')' : ''}
      `;
    } else {
      document.getElementById("tab2AddressText").textContent = "No shipping address saved.";
    }

    // Set form input values
    document.getElementById("tab2Status").value = order.status || "Pending";
    document.getElementById("tab2Carrier").value = order.carrier || "";
    document.getElementById("tab2TrackingId").value = order.trackingId || "";
    document.getElementById("tab2Notes").value = order.notes || "";
    
    if (order.estimatedDelivery) {
      try {
        const d = new Date(order.estimatedDelivery);
        if (!isNaN(d.getTime())) {
          document.getElementById("tab2EstDate").value = d.toISOString().split("T")[0];
        } else {
          document.getElementById("tab2EstDate").value = "";
        }
      } catch (e) {
        document.getElementById("tab2EstDate").value = "";
      }
    } else {
      document.getElementById("tab2EstDate").value = "";
    }

    // Assign local delivery partner fields
    const dp = order.deliveryPartner || {};
    document.getElementById("partnerName").value = dp.name || "";
    document.getElementById("partnerPhone").value = dp.phone || "";
    document.getElementById("partnerVehicle").value = dp.vehicleNumber || "";

    // Clear Manual checkpoint inputs
    document.getElementById("checkpointLocation").value = "";
    document.getElementById("checkpointStatus").value = "";
    document.getElementById("checkpointDesc").value = "";

    // Render interactive stepper journey and logs
    updateTimelineUI(order);
    renderTrackingHistoryLogs(order.trackingHistory || []);

    // TAB 3: REVIEWS & COMMENTS
    // Customer Review rating & comment
    const review = order.review || {};
    const starContainer = document.getElementById("reviewStarRating");
    if (starContainer) {
      starContainer.innerHTML = "";
      const rating = review.rating || 0;
      if (rating > 0) {
        for (let i = 1; i <= 5; i++) {
          starContainer.innerHTML += `<i class="${i <= rating ? 'fa-solid' : 'fa-regular'} fa-star"></i>`;
        }
        document.getElementById("reviewDateText").textContent = `Reviewed on ${new Date(review.createdAt).toLocaleDateString()}`;
        document.getElementById("reviewCommentText").textContent = `"${review.comment || 'No comment written'}"`;
      } else {
        starContainer.innerHTML = `<span style="font-size:13px; color:var(--text-muted);">Not Rated</span>`;
        document.getElementById("reviewDateText").textContent = "No review submitted yet";
        document.getElementById("reviewCommentText").textContent = "The customer hasn't submitted feedback for this order yet.";
      }
    }

    // Admin comments thread
    renderAdminCommentsList(order.adminComments || []);
    
    // Clear comment input
    document.getElementById("newAdminCommentInput").value = "";

    // Reset problem report fields
    document.getElementById("problemType").selectedIndex = 0;
    document.getElementById("problemDescription").value = "";

    // Render problems log
    renderProblemsList(order.problems || []);

    // TAB 4: PRINT SLIP
    renderSlipDocPreview(order);

    // Permissions check
    const canUpdate = hasPermission("orders.update");
    document.getElementById("tab2Status").disabled = !canUpdate;
    document.getElementById("tab2Carrier").disabled = !canUpdate;
    document.getElementById("tab2TrackingId").disabled = !canUpdate;
    document.getElementById("tab2EstDate").disabled = !canUpdate;
    document.getElementById("tab2Notes").disabled = !canUpdate;
    document.getElementById("partnerName").disabled = !canUpdate;
    document.getElementById("partnerPhone").disabled = !canUpdate;
    document.getElementById("partnerVehicle").disabled = !canUpdate;
    
    const saveCarrierBtn = document.querySelector("#tab2TrackingForm button[type='submit']");
    if (saveCarrierBtn) saveCarrierBtn.style.display = canUpdate ? "block" : "none";

    // Show modal
    const modal = document.getElementById("manageDeliveryModal");
    if (modal) modal.classList.remove("hidden");

  } catch (err) {
    showToast(err.message, "error");
  }
};

// Close Delivery Modal
window.closeDeliveryModal = function() {
  const modal = document.getElementById("manageDeliveryModal");
  if (modal) modal.classList.add("hidden");
};

// Copy Address helper
window.copyDeliveryAddress = function() {
  const text = document.getElementById("tab2AddressText").innerText;
  if (text) {
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

  // If order is Cancelled or Returned, mark all steps appropriately
  if (currentStatus === "Cancelled" || currentStatus === "Returned") {
    statuses.forEach(status => {
      const stepEl = document.getElementById(`step-${status.replace(/ /g, "-")}`);
      if (stepEl) {
        stepEl.className = "timeline-step";
        const dateEl = stepEl.querySelector(".step-date");
        if (dateEl) dateEl.textContent = currentStatus;
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

// Render tracking history checkpoint logs
function renderTrackingHistoryLogs(history) {
  const container = document.getElementById("trackingHistoryLogs");
  if (!container) return;
  container.innerHTML = "";
  
  if (history.length === 0) {
    container.innerHTML = `<div style="color:var(--text-muted); font-style:italic;">No tracking checkpoints pushed.</div>`;
    return;
  }

  const sorted = [...history].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

  sorted.forEach(log => {
    const div = document.createElement("div");
    div.style.position = "relative";
    div.style.marginBottom = "8px";
    div.style.borderBottom = "1px solid var(--border-color)";
    div.style.paddingBottom = "5px";
    
    const time = new Date(log.timestamp).toLocaleString();
    div.innerHTML = `
      <div style="font-weight:600; color:var(--text-active);">${log.status} - ${log.location}</div>
      <div style="color:var(--text-main); margin: 2px 0;">${log.description}</div>
      <div style="font-size:10px; color:var(--text-muted);">${time} | By: ${log.updatedBy}</div>
    `;
    container.appendChild(div);
  });
}

// Render Admin comments list
function renderAdminCommentsList(comments) {
  const container = document.getElementById("adminCommentsList");
  if (!container) return;
  container.innerHTML = "";

  if (comments.length === 0) {
    container.innerHTML = `<div style="color:var(--text-muted); text-align:center; font-style:italic; padding: 20px 0;">No internal comments yet.</div>`;
    return;
  }

  comments.forEach(c => {
    const isMe = c.adminUser === adminUser.username;
    const bubbleWrapper = document.createElement("div");
    bubbleWrapper.style.display = "flex";
    bubbleWrapper.style.flexDirection = "column";
    bubbleWrapper.style.alignItems = isMe ? "flex-end" : "flex-start";
    bubbleWrapper.style.width = "100%";

    const bubble = document.createElement("div");
    bubble.style.maxWidth = "85%";
    bubble.style.background = isMe ? "rgba(99, 102, 241, 0.15)" : "var(--bg-soft)";
    bubble.style.border = `1px solid ${isMe ? 'var(--primary-color)' : 'var(--border-color)'}`;
    bubble.style.borderRadius = "12px";
    bubble.style.padding = "8px 12px";
    bubble.style.fontSize = "13px";
    bubble.style.wordBreak = "break-word";
    
    bubble.innerHTML = `
      <div style="font-weight:700; font-size:11px; margin-bottom:3px; color:var(--text-active);">${c.adminUser}</div>
      <div style="color:var(--text-main);">${c.comment}</div>
      <div style="font-size:9.5px; text-align:right; color:var(--text-muted); margin-top:4px;">${new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
    `;
    bubbleWrapper.appendChild(bubble);
    container.appendChild(bubbleWrapper);
  });

  container.scrollTop = container.scrollHeight;
}

// Render problem issues list
function renderProblemsList(problems) {
  const container = document.getElementById("problemsList");
  if (!container) return;
  container.innerHTML = "";

  if (problems.length === 0) {
    container.innerHTML = `<div style="color:var(--text-muted); text-align:center; font-style:italic; padding: 20px 0;">No problems logged for this order.</div>`;
    return;
  }

  problems.forEach(p => {
    const card = document.createElement("div");
    card.style.background = p.status === "Open" ? "rgba(239, 68, 68, 0.05)" : "rgba(16, 185, 129, 0.05)";
    card.style.border = `1px solid ${p.status === 'Open' ? 'var(--danger-color)' : 'var(--success-color)'}`;
    card.style.borderRadius = "8px";
    card.style.padding = "10px";
    card.style.fontSize = "12.5px";
    card.style.position = "relative";

    const dateStr = new Date(p.createdAt).toLocaleDateString();
    let actionBtn = "";
    if (p.status === "Open" && hasPermission("orders.update")) {
      actionBtn = `<button onclick="resolveProblem('${p._id}')" class="table-action-btn success" style="position:absolute; right:10px; top:10px; height:26px; padding:0 8px; font-size:11px; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-check"></i> Resolve</button>`;
    }

    let footer = `Reported: ${p.reportedBy} on ${dateStr}`;
    if (p.status === "Resolved") {
      footer += ` | Resolved: ${p.resolvedBy} on ${new Date(p.resolvedAt).toLocaleDateString()}`;
    }

    card.innerHTML = `
      <div style="font-weight:700; color:var(--text-active); margin-bottom:4px;">
        <span class="badge ${p.status === 'Open' ? 'danger-badge' : 'success-badge'}">${p.status}</span>
        [${p.type}]
      </div>
      <div style="color:var(--text-main); margin-bottom:6px; padding-right: 70px;">${p.description}</div>
      <div style="font-size:10px; color:var(--text-muted);">${footer}</div>
      ${actionBtn}
    `;
    container.appendChild(card);
  });
}

// Render packing slip preview
function renderSlipDocPreview(order) {
  const container = document.getElementById("printSlipDocPreview");
  if (!container) return;

  const addr = order.shippingAddress || {};
  const pricing = order.pricing || {};
  const statusText = order.slipPrinted 
    ? `<span style="color:green; font-weight:bold;">PRINTER COPY (Printed by ${order.slipPrintedBy} on ${new Date(order.slipPrintedAt).toLocaleString()})</span>`
    : `<span style="color:red; font-weight:bold;">PENDING PRINT</span>`;

  document.getElementById("slipPrintedStatusText").innerHTML = order.slipPrinted
    ? `<i class="fa-solid fa-circle-check" style="color:var(--success-color);"></i> Printed by <strong>${order.slipPrintedBy}</strong> on ${new Date(order.slipPrintedAt).toLocaleString()}`
    : `<i class="fa-solid fa-circle-xmark" style="color:var(--danger-color);"></i> Slip not printed yet`;

  container.innerHTML = `
    <div class="header">
      <div class="logo">MY INVITATION CARD</div>
      <div style="font-size:12px; margin-top:5px;">Digital & Printed Personal Invitations</div>
      <div style="font-size:14px; font-weight:bold; margin-top:15px; text-decoration:underline;">PACKING & DISPATCH SLIP</div>
    </div>
    
    <div style="display:flex; justify-content:space-between; font-size:13px; margin-top:20px;">
      <div>
        <strong>Order ID:</strong> #${order.orderId}<br>
        <strong>Order Date:</strong> ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}<br>
        <strong>Status:</strong> ${order.status}<br>
        <strong>Slip Status:</strong> ${statusText}
      </div>
      <div style="text-align:right;">
        <strong>Courier Partner:</strong> ${order.carrier || 'Pending Assignment'}<br>
        <strong>AWB / Tracking ID:</strong> ${order.trackingId || 'Pending AWB'}<br>
        <strong>Est. Delivery:</strong> ${order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString() : 'N/A'}
      </div>
    </div>
    
    <hr>
    
    <div style="font-size:13px;">
      <strong>SHIPPING TO:</strong><br>
      <div style="margin-top:5px; font-size:14px; line-height:1.5;">
        <strong>${addr.fullName || 'N/A'}</strong><br>
        ${addr.address || 'N/A'}<br>
        ${addr.address2 ? addr.address2 + '<br>' : ''}
        ${addr.city || 'N/A'}, ${addr.state || 'N/A'} - <strong>${addr.pincode || 'N/A'}</strong><br>
        <strong>Phone:</strong> ${addr.phone || 'N/A'} ${addr.emergencyPhone ? '(Alt: ' + addr.emergencyPhone + ')' : ''}
      </div>
    </div>
    
    <hr>
    
    <table class="details-table" style="font-size:13px;">
      <thead>
        <tr>
          <th>Invitation Template</th>
          <th>Paper Specs</th>
          <th>Envelope Choice</th>
          <th>Qty</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${order.templateName || 'N/A'}</strong><br>
            <span style="font-size:11px; color:#555;">ID: ${order.templateId}</span>
          </td>
          <td>
            Stock: ${formatValue(order.stockOption)}<br>
            Premium: ${order.premiumPaperStock ? formatValue(order.premiumPaperStock) : 'None'}
          </td>
          <td>
            ${formatValue(order.envelopeOption)}
          </td>
          <td>
            <strong>${order.quantity || 100} units</strong>
          </td>
        </tr>
      </tbody>
    </table>
    
    <div class="pricing-summary" style="font-size:13px;">
      <strong>Payment Status:</strong> ${order.paymentStatus || 'Pending'} (${order.paymentId ? 'Razorpay ' + order.paymentId : 'No payment ref'})<br>
      <div style="font-size:15px; font-weight:bold; margin-top:5px;">Grand Total: ₹${(pricing.total || 0).toFixed(2)}</div>
    </div>
    
    <hr>
    
    <div style="font-size:11px; text-align:center; color:#555;">
      Thank you for ordering from MyInvitationCard. Please verify all items before packaging.<br>
      For customer queries, contact support@myinvitationcard.com
    </div>
  `;
}

// Courier Carrier details submit
const tab2TrackingForm = document.getElementById("tab2TrackingForm");
if (tab2TrackingForm) {
  tab2TrackingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!hasPermission("orders.update")) {
      showToast("Permission denied", "error");
      return;
    }

    const order = window.currentSelectedOrder;
    if (!order) return;

    const status = document.getElementById("tab2Status").value;
    const carrier = document.getElementById("tab2Carrier").value;
    const trackingId = document.getElementById("tab2TrackingId").value.trim();
    const estimatedDelivery = document.getElementById("tab2EstDate").value;
    const notes = document.getElementById("tab2Notes").value.trim();

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/orders/${order.orderId}/status`, {
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
      openDeliveryModal(order.orderId);
      fetchOrders();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

// Assign Delivery Partner
window.saveDeliveryPartner = async function() {
  if (!hasPermission("orders.update")) {
    showToast("Permission denied", "error");
    return;
  }
  const order = window.currentSelectedOrder;
  if (!order) return;

  const name = document.getElementById("partnerName").value.trim();
  const phone = document.getElementById("partnerPhone").value.trim();
  const vehicleNumber = document.getElementById("partnerVehicle").value.trim();

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/orders/${order.orderId}/delivery-partner`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, vehicleNumber, adminUser: adminUser.username })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showToast("Delivery partner assigned successfully!", "success");
    openDeliveryModal(order.orderId);
    fetchOrders();
  } catch (err) {
    showToast(err.message, "error");
  }
};

// Add Manual Checkpoint
window.addTrackingCheckpoint = async function() {
  if (!hasPermission("orders.update")) {
    showToast("Permission denied", "error");
    return;
  }
  const order = window.currentSelectedOrder;
  if (!order) return;

  const location = document.getElementById("checkpointLocation").value.trim();
  const status = document.getElementById("checkpointStatus").value;
  const description = document.getElementById("checkpointDesc").value.trim();

  if (!location || !description) {
    showToast("Location and Description are required", "error");
    return;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/orders/${order.orderId}/tracking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, location, description, adminUser: adminUser.username })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showToast("Tracking checkpoint added successfully", "success");
    openDeliveryModal(order.orderId);
    fetchOrders();
  } catch (err) {
    showToast(err.message, "error");
  }
};

// Add Admin Comment
window.addAdminComment = async function() {
  const order = window.currentSelectedOrder;
  if (!order) return;

  const comment = document.getElementById("newAdminCommentInput").value.trim();
  if (!comment) return;

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/orders/${order.orderId}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment, adminUser: adminUser.username })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showToast("Comment added to thread", "success");
    openDeliveryModal(order.orderId);
  } catch (err) {
    showToast(err.message, "error");
  }
};

// Report Problem Issue
window.reportProblemIssue = async function() {
  const order = window.currentSelectedOrder;
  if (!order) return;

  const type = document.getElementById("problemType").value;
  const description = document.getElementById("problemDescription").value.trim();

  if (!description) {
    showToast("Problem description is required", "error");
    return;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/orders/${order.orderId}/problem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "report", type, description, adminUser: adminUser.username })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showToast("Issue logged successfully", "success");
    openDeliveryModal(order.orderId);
    fetchOrders();
  } catch (err) {
    showToast(err.message, "error");
  }
};

// Resolve Problem Issue
window.resolveProblem = async function(problemId) {
  if (!hasPermission("orders.update")) {
    showToast("Permission denied", "error");
    return;
  }
  const order = window.currentSelectedOrder;
  if (!order) return;

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/orders/${order.orderId}/problem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve", problemId, adminUser: adminUser.username })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showToast("Issue resolved successfully", "success");
    openDeliveryModal(order.orderId);
    fetchOrders();
  } catch (err) {
    showToast(err.message, "error");
  }
};

// Print Slip Button trigger
window.printOrderSlipBtn = async function() {
  const order = window.currentSelectedOrder;
  if (!order) return;

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/orders/${order.orderId}/slip-printed`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminUser: adminUser.username })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    const printContent = document.getElementById("printSlipDocPreview").innerHTML;
    const printWindow = window.open("", "_blank", "width=800,height=600");
    printWindow.document.write(`
      <html>
        <head>
          <title>Packing Slip - #${order.orderId}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 40px; color: black; background: white; line-height: 1.4; }
            hr { border: none; border-top: 1px dashed black; margin: 20px 0; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 20px; font-weight: bold; letter-spacing: 2px; }
            .details-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .details-table th, .details-table td { border: 1px solid black; padding: 10px; text-align: left; }
            .pricing-summary { text-align: right; margin-top: 20px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();

    showToast("Packing slip generated & printed!", "success");
    openDeliveryModal(order.orderId);
    fetchOrders();
  } catch (err) {
    showToast(err.message, "error");
  }
};

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
async function fetchPayments(isBackground = false) {
  const tableBody = document.getElementById("paymentsTableBody");
  if (!tableBody) return;
  if (!isBackground) {
    tableBody.innerHTML = `<tr><td colspan="6" class="loading-cell"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>`;
  }

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
    if (!isBackground) showToast(err.message, "error");
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

// 7. Pricing & Site settings — Template Pricing Management
let allPricingTemplates = []; // cached template list for filtering
let pricingRenderBatch = 9;
let pricingRenderIndex = 0;
let pricingRenderedTemplates = [];
let pricingObserver = null;
const pricingSentinelId = "pricingGridSentinel";

async function fetchPricing() {
  const grid = document.getElementById("pricingTemplateGrid");
  if (grid) {
    grid.innerHTML = `<div class="pricing-empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading templates...</p></div>`;
  }

  try {
    // Fetch templates for the pricing grid
    const tplRes = await fetch(`${BACKEND_URL}/api/admin/templates`);
    const tplData = await tplRes.json();
    if (!tplRes.ok) throw new Error(tplData.message);
    allPricingTemplates = tplData.templates || [];
    renderPricingGrid(allPricingTemplates);
  } catch (err) {
    if (grid) {
      grid.innerHTML = `<div class="pricing-empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load templates</p></div>`;
    }
    showToast("Failed to load template pricing data", "error");
  }

  // Also load global pricing values
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
    document.getElementById("minOrderQtyInput").value = config.min_order_qty || 50;

    // Load volume discount tiers
    const container = document.getElementById("volumeTiersContainer");
    if (container) {
      container.innerHTML = "";
      const tiers = config.volume_discount_tiers || [{upTo:50,discount:0},{upTo:100,discount:5},{upTo:200,discount:10},{upTo:500,discount:15},{upTo:1000,discount:20}];
      tiers.forEach(t => addVolumeTierRow(t.upTo, t.discount));
    }
  } catch (err) {
    // Silent — global pricing failed but template grid may still work
  }
}

// Volume discount tier row helpers
function addVolumeTierRow(upTo = '', discount = '') {
  const container = document.getElementById("volumeTiersContainer");
  if (!container) return;
  const row = document.createElement("div");
  row.className = "volume-tier-row";
  row.style.cssText = "display:flex;gap:8px;align-items:center;margin-bottom:6px;";
  row.innerHTML = `
    <label style="font-size:0.8rem;white-space:nowrap;">Up to</label>
    <input type="number" class="tier-upto" min="1" value="${upTo}" placeholder="e.g. 100" style="width:80px;" required>
    <label style="font-size:0.8rem;white-space:nowrap;">cards →</label>
    <input type="number" class="tier-discount" min="0" max="100" value="${discount}" placeholder="%" style="width:70px;" required>
    <label style="font-size:0.8rem;">% off</label>
    <button type="button" onclick="removeVolumeTierRow(this)" style="background:none;border:none;color:#e11d48;cursor:pointer;font-size:1rem;"><i class="fa-solid fa-trash-can"></i></button>
  `;
  container.appendChild(row);
}

function removeVolumeTierRow(btn) {
  btn.closest(".volume-tier-row").remove();
}

function createPricingCard(t) {
  const card = document.createElement("div");
  card.className = "pricing-template-card";
  card.setAttribute("data-category", t.category || "");
  card.setAttribute("data-status", t.status || "active");
  card.setAttribute("data-template-id", t.templateId);

  let thumbUrl = t.thumbnail || "";
  if (thumbUrl && !thumbUrl.startsWith("http") && !thumbUrl.startsWith("assets")) {
    thumbUrl = `${BACKEND_URL}/${thumbUrl}`;
  } else if (thumbUrl && thumbUrl.startsWith("assets")) {
    thumbUrl = `../${thumbUrl}`;
  }

  const now = new Date();
  const hasOffer = t.offerPrice != null && t.offerPrice > 0;
  const offerActive = hasOffer && (
    (!t.offerStartDate && !t.offerEndDate) ||
    (t.offerStartDate && t.offerEndDate && new Date(t.offerStartDate) <= now && new Date(t.offerEndDate) >= now) ||
    (t.offerStartDate && !t.offerEndDate && new Date(t.offerStartDate) <= now) ||
    (!t.offerStartDate && t.offerEndDate && new Date(t.offerEndDate) >= now)
  );

  let badgesHtml = "";
  if (offerActive && t.offerLabel) {
    badgesHtml += `<span class="offer-badge">${t.offerLabel}</span>`;
  }

  let flagsHtml = "";
  if (t.isFeatured) flagsHtml += `<span class="flag-icon featured" title="Featured"><i class="fa-solid fa-star"></i></span>`;
  if (t.isPremium) flagsHtml += `<span class="flag-icon premium" title="Premium"><i class="fa-solid fa-crown"></i></span>`;

  let priceHtml = "";
  if (offerActive) {
    priceHtml = `
      <span class="current-price">₹${t.offerPrice}</span>
      <span class="original-price">₹${t.price}</span>
      ${t.offerLabel ? `<span class="offer-tag">${t.offerLabel}</span>` : ""}
    `;
  } else {
    priceHtml = `<span class="current-price">₹${t.price}</span>`;
    if (hasOffer) {
      priceHtml += `<span class="offer-tag" style="background:var(--warning-bg);color:var(--warning-color);">Offer Scheduled</span>`;
    }
  }

  card.innerHTML = `
    <div class="pricing-card-thumb" style="background-image: url('${thumbUrl}')">
      <div class="pricing-card-badges">${badgesHtml}</div>
      ${flagsHtml ? `<div class="pricing-card-flags">${flagsHtml}</div>` : ""}
    </div>
    <div class="pricing-card-body">
      <h4 title="${t.name}">${t.name}</h4>
      <div class="pricing-card-price-row">${priceHtml}</div>
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span class="pricing-card-id">ID: ${t.templateId}</span>
        <span class="pricing-card-status ${t.status || 'active'}">${(t.status || "active").toUpperCase()}</span>
      </div>
      <div class="pricing-card-action">
        <button class="btn-set-price" onclick="openPricingModal('${t.templateId}')">
          <i class="fa-solid fa-pen-to-square"></i> Set Price & Offers
        </button>
      </div>
    </div>
  `;

  return card;
}

function createPricingSentinel() {
  let sentinel = document.getElementById(pricingSentinelId);
  if (!sentinel) {
    sentinel = document.createElement("div");
    sentinel.id = pricingSentinelId;
    sentinel.className = "pricing-load-sentinel";
    sentinel.innerHTML = `<span class="pricing-load-more"><i class="fa-solid fa-spinner fa-spin"></i> Loading more templates...</span>`;
    const grid = document.getElementById("pricingTemplateGrid");
    if (grid) grid.insertAdjacentElement("afterend", sentinel);
  }
  return sentinel;
}

function removePricingSentinel() {
  const sentinel = document.getElementById(pricingSentinelId);
  if (sentinel) sentinel.remove();
  if (pricingObserver) {
    pricingObserver.disconnect();
    pricingObserver = null;
  }
}

function setupPricingObserver() {
  if (!("IntersectionObserver" in window)) return;
  const sentinel = document.getElementById(pricingSentinelId);
  if (!sentinel) return;

  pricingObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadMorePricingTemplates();
      }
    });
  }, {
    rootMargin: "200px"
  });

  pricingObserver.observe(sentinel);
}

function loadMorePricingTemplates() {
  const grid = document.getElementById("pricingTemplateGrid");
  if (!grid || pricingRenderIndex >= pricingRenderedTemplates.length) {
    removePricingSentinel();
    return;
  }

  const nextTemplates = pricingRenderedTemplates.slice(pricingRenderIndex, pricingRenderIndex + pricingRenderBatch);
  nextTemplates.forEach(t => grid.appendChild(createPricingCard(t)));
  pricingRenderIndex += nextTemplates.length;

  if (pricingRenderIndex < pricingRenderedTemplates.length) {
    createPricingSentinel();
    if (!pricingObserver) setupPricingObserver();
  } else {
    removePricingSentinel();
  }
}

function renderPricingGrid(templates, reset = true) {
  const grid = document.getElementById("pricingTemplateGrid");
  const countEl = document.getElementById("pricingResultsCount");
  if (!grid) return;

  if (reset) {
    pricingRenderedTemplates = templates;
    pricingRenderIndex = 0;
    grid.innerHTML = "";
    removePricingSentinel();
  }

  if (templates.length === 0) {
    grid.innerHTML = `<div class="pricing-empty-state"><i class="fa-solid fa-box-open"></i><p>No templates match your filters</p></div>`;
    removePricingSentinel();
    if (countEl) countEl.textContent = "0 templates";
    return;
  }

  if (countEl) countEl.textContent = `${templates.length} template${templates.length !== 1 ? "s" : ""}`;
  loadMorePricingTemplates();
}

// Filter pricing templates
function filterPricingTemplates() {
  const category = document.getElementById("pricingCategoryFilter").value;
  const status = document.getElementById("pricingStatusFilter").value;
  const search = (document.getElementById("pricingSearchInput").value || "").trim().toLowerCase();

  let filtered = allPricingTemplates;

  if (category !== "all") {
    filtered = filtered.filter(t => (t.category || "").toLowerCase() === category);
  }
  if (status !== "all") {
    filtered = filtered.filter(t => (t.status || "active").toLowerCase() === status);
  }
  if (search) {
    filtered = filtered.filter(t =>
      (t.name || "").toLowerCase().includes(search) ||
      (t.templateId || "").toLowerCase().includes(search)
    );
  }

  renderPricingGrid(filtered);
}

// Attach filter event listeners
["pricingCategoryFilter", "pricingStatusFilter"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("change", filterPricingTemplates);
});
const pricingSearchEl = document.getElementById("pricingSearchInput");
if (pricingSearchEl) pricingSearchEl.addEventListener("input", filterPricingTemplates);

// ---- PRICING MODAL ----
let currentPricingTemplateId = null;

window.openPricingModal = function(templateId) {
  if (!hasPermission("pricing.edit")) {
    showToast("You do not have permission to edit template pricing", "error");
    return;
  }

  const t = allPricingTemplates.find(tpl => tpl.templateId === templateId);
  if (!t) {
    showToast("Template not found", "error");
    return;
  }

  currentPricingTemplateId = templateId;

  // Compute thumbnail
  let thumbUrl = t.thumbnail || "";
  if (thumbUrl && !thumbUrl.startsWith("http") && !thumbUrl.startsWith("assets")) {
    thumbUrl = `${BACKEND_URL}/${thumbUrl}`;
  } else if (thumbUrl && thumbUrl.startsWith("assets")) {
    thumbUrl = `../${thumbUrl}`;
  }

  // Populate modal preview
  document.getElementById("pricingModalThumb").style.backgroundImage = `url('${thumbUrl}')`;
  document.getElementById("pricingModalName").textContent = t.name;
  document.getElementById("pricingModalCategory").textContent = (t.category || "general").toUpperCase();
  document.getElementById("pricingModalId").textContent = `ID: ${t.templateId}`;

  // Populate form fields
  document.getElementById("modalBasePrice").value = t.price || 0;
  document.getElementById("modalOfferPrice").value = (t.offerPrice != null && t.offerPrice > 0) ? t.offerPrice : "";
  document.getElementById("modalOfferLabel").value = t.offerLabel || "";
  document.getElementById("modalOfferStart").value = t.offerStartDate ? new Date(t.offerStartDate).toISOString().split("T")[0] : "";
  document.getElementById("modalOfferEnd").value = t.offerEndDate ? new Date(t.offerEndDate).toISOString().split("T")[0] : "";
  document.getElementById("modalIsFeatured").checked = !!t.isFeatured;
  document.getElementById("modalIsPremium").checked = !!t.isPremium;
  document.getElementById("modalExpressDelivery").checked = t.expressDeliveryAvailable !== false;
  document.getElementById("modalTaxFree").checked = !!t.taxFree;
  document.getElementById("modalHasEnvelope").checked = t.hasEnvelope !== false;
  document.getElementById("modalHasPremiumPages").checked = !!t.hasPremiumPages;
  document.getElementById("modalAllowedStates").value = t.availableStates ? t.availableStates.join(", ") : "";
  document.getElementById("modalAllowedDistricts").value = t.availableDistricts ? t.availableDistricts.join(", ") : "";
  document.getElementById("modalAllowedCardStocks").value = t.allowedCardStocks ? t.allowedCardStocks.join(", ") : "";
  document.getElementById("modalPremiumCardStocks").value = t.premiumCardStocks ? t.premiumCardStocks.join(", ") : "";

  // Open modal
  document.getElementById("pricingModalOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
};

window.closePricingModal = function() {
  document.getElementById("pricingModalOverlay").classList.remove("open");
  document.body.style.overflow = "";
  currentPricingTemplateId = null;
};

// Close button & cancel button
const pricingModalCloseBtn = document.getElementById("pricingModalClose");
if (pricingModalCloseBtn) pricingModalCloseBtn.addEventListener("click", closePricingModal);

const pricingModalCancelBtn = document.getElementById("pricingModalCancelBtn");
if (pricingModalCancelBtn) pricingModalCancelBtn.addEventListener("click", closePricingModal);

// Close on backdrop click
const pricingModalOverlay = document.getElementById("pricingModalOverlay");
if (pricingModalOverlay) {
  pricingModalOverlay.addEventListener("click", (e) => {
    if (e.target === pricingModalOverlay) closePricingModal();
  });
}

// Close on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && pricingModalOverlay && pricingModalOverlay.classList.contains("open")) {
    closePricingModal();
  }
});

// Save pricing modal
const pricingModalSaveBtn = document.getElementById("pricingModalSaveBtn");
if (pricingModalSaveBtn) {
  pricingModalSaveBtn.addEventListener("click", async () => {
    if (!currentPricingTemplateId) return;

    const payload = {
      price: Number(document.getElementById("modalBasePrice").value) || 0,
      offerPrice: document.getElementById("modalOfferPrice").value ? Number(document.getElementById("modalOfferPrice").value) : null,
      offerLabel: document.getElementById("modalOfferLabel").value.trim(),
      offerStartDate: document.getElementById("modalOfferStart").value || null,
      offerEndDate: document.getElementById("modalOfferEnd").value || null,
      isFeatured: document.getElementById("modalIsFeatured").checked,
      isPremium: document.getElementById("modalIsPremium").checked,
      expressDeliveryAvailable: document.getElementById("modalExpressDelivery").checked,
      taxFree: document.getElementById("modalTaxFree").checked,
      hasEnvelope: document.getElementById("modalHasEnvelope").checked,
      hasPremiumPages: document.getElementById("modalHasPremiumPages").checked,
      availableStates: document.getElementById("modalAllowedStates").value.trim(),
      availableDistricts: document.getElementById("modalAllowedDistricts").value.trim(),
      allowedCardStocks: document.getElementById("modalAllowedCardStocks").value.trim(),
      premiumCardStocks: document.getElementById("modalPremiumCardStocks").value.trim(),
      adminUser: adminUser.username
    };

    pricingModalSaveBtn.disabled = true;
    pricingModalSaveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/templates/${currentPricingTemplateId}/pricing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showToast(data.message, "success");
      closePricingModal();

      // Refresh the template grid
      fetchPricing();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      pricingModalSaveBtn.disabled = false;
      pricingModalSaveBtn.innerHTML = `<i class="fa-solid fa-check"></i> Save Changes`;
    }
  });
}

// Global pricing form submit
const pricingSettingsForm = document.getElementById("pricingSettingsForm");
if (pricingSettingsForm) {
  pricingSettingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!hasPermission("pricing.edit")) {
      showToast("You do not have permission to modify pricing configuration", "error");
      return;
    }

    // Collect volume tiers
    const tierRows = document.querySelectorAll(".volume-tier-row");
    const tiers = [];
    tierRows.forEach(row => {
      const upTo = Number(row.querySelector(".tier-upto").value);
      const discount = Number(row.querySelector(".tier-discount").value);
      if (upTo > 0) tiers.push({ upTo, discount });
    });
    tiers.sort((a, b) => a.upTo - b.upTo);

    const config = {
      wedding_price: Number(document.getElementById("weddingPriceInput").value),
      birthday_price: Number(document.getElementById("birthdayPriceInput").value),
      nikah_price: Number(document.getElementById("nikahPriceInput").value),
      premium_export_price: Number(document.getElementById("premiumExportInput").value),
      printing_price_per_page: Number(document.getElementById("printingPriceInput").value),
      tax_rate: Number(document.getElementById("taxRateInput").value),
      shipping_base: Number(document.getElementById("shippingBaseInput").value),
      min_order_qty: Number(document.getElementById("minOrderQtyInput").value),
      volume_discount_tiers: tiers
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

// Auto-refresh active tab data and active order modal details every 10 seconds for real-time updates
setInterval(() => {
  if (window.currentActiveTabId) {
    // Silently reload tab data (don't show table loading spinner spinner during silent update)
    // We can fetch data in the background and update the display
    if (window.currentActiveTabId === "overviewTab") {
      fetchOverviewStats();
    } else if (window.currentActiveTabId === "usersTab") {
      fetch(`${BACKEND_URL}/api/admin/users`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            allUsers = data.users || [];
            renderUsersTable(allUsers);
          }
        }).catch(err => console.error("Silent users refresh failed:", err));
    } else if (window.currentActiveTabId === "ordersTab") {
      fetch(`${BACKEND_URL}/api/admin/orders`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            allOrders = data.orders || [];
            renderOrdersTable(allOrders);
          }
        }).catch(err => console.error("Silent orders refresh failed:", err));
    } else if (window.currentActiveTabId === "paymentsTab") {
      fetch(`${BACKEND_URL}/api/admin/payments`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const tableBody = document.getElementById("paymentsTableBody");
            if (tableBody) {
              tableBody.innerHTML = "";
              data.payments.forEach(p => {
                const tr = document.createElement("tr");
                const amountText = `₹${p.amount.toFixed(2)}`;
                const badgeClass = p.status === "Paid" ? "success-badge" : "danger-badge";
                const refundBtn = p.status === "Paid" && hasPermission("payment.refund")
                  ? `<button class="table-action-btn delete" onclick="triggerRefund('${p.razorpayPaymentId}', ${p.amount})">Refund</button>`
                  : `<span style="color:var(--text-muted); font-size:12px;">No Actions</span>`;
                tr.innerHTML = `
                  <td>#${p.transactionId}</td>
                  <td><code>${p.razorpayPaymentId}</code></td>
                  <td><strong>${p.uid}</strong></td>
                  <td>${amountText}</td>
                  <td><span class="badge ${badgeClass}">${p.status}</span></td>
                  <td>${refundBtn}</td>
                `;
                tableBody.appendChild(tr);
              });
            }
          }
        }).catch(err => console.error("Silent payments refresh failed:", err));
    } else if (window.currentActiveTabId === "adminsTab") {
      fetch(`${BACKEND_URL}/api/admin/accounts`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            renderAdminsTable(data.accounts);
          }
        }).catch(err => console.error("Silent admins refresh failed:", err));
    }
    
    // Also if the order details modal is open, refresh the order details too!
    const modal = document.getElementById("manageDeliveryModal");
    if (modal && !modal.classList.contains("hidden") && window.currentSelectedOrder) {
      fetch(`${BACKEND_URL}/api/admin/orders/${window.currentSelectedOrder.orderId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            window.currentSelectedOrder = data.order;
            
            // Re-render only dynamic components of the modal
            updateTimelineUI(data.order);
            renderTrackingHistoryLogs(data.order.trackingHistory || []);
            renderAdminCommentsList(data.order.adminComments || []);
            renderProblemsList(data.order.problems || []);
            renderSlipDocPreview(data.order);
          }
        })
        .catch(err => console.error("Real-time order modal refresh failed:", err));
    }
  }
}, 10000);

// ── CUSTOM PRINT CARD MODAL FUNCTIONS ──

window.openPrintCardModal = async function(orderId) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/orders/${orderId}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch order details");

    const order = data.order;
    window.currentSelectedPrintOrder = order;

    const orderIdEl = document.getElementById("printModalOrderId");
    if (orderIdEl) orderIdEl.textContent = order.orderId;
    
    // Set checkbox to checked (hide background by default)
    const toggle = document.getElementById("printModalHideBgToggle");
    if (toggle) toggle.checked = true;
    
    // Update bg status text
    const statusText = document.getElementById("printModalBgStatusText");
    if (statusText) statusText.textContent = "Hide Card Background (Easy Print)";

    // Load iframe
    loadPrintCardIframe(order, true);

    const modal = document.getElementById("printCardModal");
    if (modal) modal.classList.remove("hidden");
  } catch (err) {
    showToast(err.message, "error");
  }
};

window.closePrintCardModal = function() {
  const modal = document.getElementById("printCardModal");
  if (modal) modal.classList.add("hidden");
  const iframe = document.getElementById("printCardIframe");
  if (iframe) iframe.src = "about:blank";
};

window.togglePrintModalBg = function() {
  const order = window.currentSelectedPrintOrder;
  if (!order) return;
  
  const toggle = document.getElementById("printModalHideBgToggle");
  const hideBg = toggle ? toggle.checked : true;
  
  const statusText = document.getElementById("printModalBgStatusText");
  if (statusText) {
    statusText.textContent = hideBg ? "Hide Card Background (Easy Print)" : "Show Card Background";
  }

  loadPrintCardIframe(order, hideBg);
};

window.printCardIframe = function() {
  const iframe = document.getElementById("printCardIframe");
  if (!iframe) return;
  
  try {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  } catch (e) {
    showToast("Error starting print preview: " + e.message, "error");
  }
};

function loadPrintCardIframe(order, hideBg) {
  const iframe = document.getElementById("printCardIframe");
  if (!iframe) return;

  // Resolve the actual folder (card101 → card1 etc.)
  const templateFolder = resolveTemplateFolder(order.templateId);
  // Load the template HTML file with hideBg parameter
  const templatePath = `../universal-template-editor/templates/${templateFolder}/template.html?hideBg=${hideBg}`;
  iframe.src = templatePath;

  iframe.onload = function() {
    if (order.templateEditData) {
      iframe.contentWindow.postMessage({
        type: 'UPDATE_TEMPLATE_DATA',
        data: order.templateEditData
      }, '*');
    }
  };
}

