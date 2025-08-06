// === FRONTEND: USER & ROLE MANAGER USING BACKEND API ===

let users = [];
let rolesData = {};

// ========================= USERS =============================

async function loadUsers() {
    const res = await fetch("http://localhost:5089/api/users");
    users = await res.json();
    updateUserList();
}

async function addUser(username, password, role) {
    await fetch("http://localhost:5089/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role })
    });
    loadUsers();
}

async function deleteUser(userId) {
    await fetch(`http://localhost:5089/api/users/${userId}`, {
        method: "DELETE"
    });
    loadUsers();
}

function showEditUserModal(user) {
    const newUsername = prompt("New username:", user.username);
    if (!newUsername) return;
    const newPassword = prompt("New password:", user.password);
    if (!newPassword) return;
    const newRole = prompt("New role:", user.role);
    if (!newRole) return;
    fetch(`http://localhost:5089/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole })
    }).then(loadUsers);
}

function updateUserList() {
    const tableBody = document.querySelector("#userTable tbody");
    tableBody.innerHTML = "";

    users.forEach((user, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.role}</td>
            <td>
                <button onclick="showEditUserModal(${JSON.stringify(user).replace(/"/g, '&quot;')})">Edit</button>
                <button class="delete-button" onclick="deleteUser(${user.id})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// ========================= ROLES =============================

async function loadRoles() {
    const res = await fetch("http://localhost:5089/api/roles");
    const rolesArray = await res.json();
    rolesData = {};

    rolesArray.forEach(role => {
        rolesData[role.name] = {
            id: role.id,
            panels: {
                admin: role.panelAdmin,
                user: role.panelUser,
                logs: role.panelLogs
            },
            permissions: {
                delete: role.canDelete,
                create: role.canCreate,
                edit: role.canEdit,
                viewLogs: role.canViewLogs
            }
        };
    });

    updateRoleList();
    populateRoleOptions("newRole");
}

async function addRole(roleName) {
    await fetch("http://localhost:5089/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: roleName,
            panelAdmin: false,
            panelUser: true,
            panelLogs: false,
            canDelete: false,
            canCreate: false,
            canEdit: false,
            canViewLogs: false
        })
    });
    loadRoles();
}

async function deleteRole(roleName) {
    const role = rolesData[roleName];
    if (!role) return;
    await fetch(`http://localhost:5089/api/roles/${role.id}`, { method: "DELETE" });
    loadRoles();
}

async function toggleRoleProperty(roleName, category, property) {
    const role = rolesData[roleName];
    if (!role) return;

    // Flip the boolean
    role[category][property] = !role[category][property];

    // Send updated role
    await fetch(`http://localhost:5089/api/roles/${role.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: roleName,
            panelAdmin: role.panels.admin,
            panelUser: role.panels.user,
            panelLogs: role.panels.logs,
            canDelete: role.permissions.delete,
            canCreate: role.permissions.create,
            canEdit: role.permissions.edit,
            canViewLogs: role.permissions.viewLogs
        })
    });
    loadRoles();
}

function showEditRoleModal(role) {
    // Create a modal or inline form for editing role
    // For brevity, here's a prompt-based example:
    const newName = prompt("Role name:", role.name);
    if (!newName) return;
    const panelAdmin = confirm("Allow Admin Panel?");
    const panelUser = confirm("Allow User Panel?");
    const panelLogs = confirm("Allow Logs Panel?");
    const canDelete = confirm("Allow Delete?");
    const canCreate = confirm("Allow Create?");
    const canEdit = confirm("Allow Edit?");
    const canViewLogs = confirm("Allow View Logs?");
    fetch(`http://localhost:5089/api/roles/${role.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: newName,
            panelAdmin, panelUser, panelLogs,
            canDelete, canCreate, canEdit, canViewLogs
        })
    }).then(loadRoles);
}

function updateRoleList() {
    const roleList = document.getElementById("roleList");
    roleList.innerHTML = '';
    Object.values(rolesData).forEach(role => {
        const div = document.createElement("div");
        div.innerHTML = `
            <strong>${role.name}</strong>
            <button onclick="showEditRoleModal(${JSON.stringify(role).replace(/"/g, '&quot;')})">Edit</button>
            <button onclick="deleteRole('${role.name}')">Delete</button>
        `;
        roleList.appendChild(div);
    });
}

function populateRoleOptions(selectId) {
    const roleSelect = document.getElementById(selectId);
    roleSelect.innerHTML = "";

    Object.keys(rolesData).forEach(roleName => {
        const option = document.createElement("option");
        option.value = roleName;
        option.textContent = roleName;
        roleSelect.appendChild(option);
    });
}

// ==================== FORM HANDLERS ==========================

document.getElementById("addUserForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("newUsername").value;
    const password = document.getElementById("newPassword").value;
    const role = document.getElementById("newRole").value;
    await addUser(username, password, role);
});

document.getElementById("addRoleForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const roleName = document.getElementById("newRoleName").value;
    await addRole(roleName);
});

// ==================== INIT ==========================

loadRoles();
loadUsers();
