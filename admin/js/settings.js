// =========================================
// STUDIO_FIT SETTINGS
// =========================================

async function loadSettings() {
    await requireAdmin();
    loadAdminInformation();
    initializeSettingsEvents();
}

function loadAdminInformation() {
    const profile = window.adminProfile;
    if (!profile) return;

    const name = profile.full_name || "Administrator";
    const email = profile.email || "";

    document.getElementById("settingsFullName").value =
        name === "Administrator" ? "" : name;
    document.getElementById("settingsEmail").value = email;
    document.getElementById("adminName").textContent = name;
    document.getElementById("adminEmail").textContent = email;

    const initials = (name || email || "Admin")
        .split("@")[0]
        .split(" ")
        .filter(Boolean)
        .map(word => word.charAt(0))
        .join("")
        .substring(0, 2)
        .toUpperCase() || "A";

    document.getElementById("settingsAvatar").textContent = initials;
}

function initializeSettingsEvents() {
    document
        .getElementById("settingsForm")
        ?.addEventListener("submit", saveProfile);

    document
        .getElementById("passwordForm")
        ?.addEventListener("submit", changePassword);
}

async function saveProfile(e) {
    e.preventDefault();

    const btn = e.target.querySelector("button[type='submit']");
    const full_name = document.getElementById("settingsFullName").value.trim();

    if (btn) {
        btn.disabled = true;
        btn.textContent = "Saving...";
    }

    try {
        const { error } = await window.supabaseClient
            .from("store_profiles")
            .update({ full_name })
            .eq("id", window.adminProfile.id);

        if (error) throw error;

        window.adminProfile.full_name = full_name;
        loadAdminInformation();
        Utils.toast("Admin profile updated.");
    } catch (err) {
        console.error(err);
        Utils.toast(err.message, "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Save Admin Profile";
        }
    }
}

async function changePassword(e) {
    e.preventDefault();

    const password = document.getElementById("newPassword").value;
    const confirm = document.getElementById("confirmPassword").value;

    if (password.length < 8) {
        Utils.toast("Password must be at least 8 characters.", "error");
        return;
    }

    if (password !== confirm) {
        Utils.toast("Passwords do not match.", "error");
        return;
    }

    try {
        const { error } = await window.supabaseClient.auth.updateUser({ password });
        if (error) throw error;

        Utils.toast("Password updated.");
        e.target.reset();
    } catch (err) {
        console.error(err);
        Utils.toast(err.message, "error");
    }
}
