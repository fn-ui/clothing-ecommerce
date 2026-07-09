// =========================================
// STUDIO_FIT SETTINGS
// =========================================

let settings = {};

// =========================================
// LOAD SETTINGS PAGE
// =========================================

async function loadSettings() {

    await loadAdminInformation();

    initializeSettingsEvents();

}

// =========================================
// LOAD ADMIN INFO
// =========================================

async function loadAdminInformation() {

    try {

        const user = window.adminProfile;

        if (!user) return;

        const initials = (user.full_name || "Admin")
            .split(" ")
            .map(word => word.charAt(0))
            .join("")
            .substring(0, 2)
            .toUpperCase();

        if (document.getElementById("profileAvatar"))
            document.getElementById("profileAvatar").textContent = initials;

        if (document.getElementById("profileName"))
            document.getElementById("profileName").textContent =
                user.full_name || "Administrator";

        if (document.getElementById("profileEmail"))
            document.getElementById("profileEmail").textContent =
                user.email || "";

        if (document.getElementById("fullName"))
            document.getElementById("fullName").value =
                user.full_name || "";

        if (document.getElementById("email"))
            document.getElementById("email").value =
                user.email || "";

    }

    catch(err){

        console.error(err);

        Utils.toast("Failed loading profile.","error");

    }

}

// =========================================
// EVENTS
// =========================================

function initializeSettingsEvents(){

    document
        .getElementById("profileForm")
        ?.addEventListener("submit", saveProfile);

    document
        .getElementById("passwordForm")
        ?.addEventListener("submit", changePassword);

    document
        .getElementById("logoutBtn")
        ?.addEventListener("click", logoutAdmin);

}

// =========================================
// SAVE PROFILE
// =========================================

async function saveProfile(e){

    e.preventDefault();

    const btn = e.target.querySelector("button[type='submit']");

    if(btn){

        btn.disabled = true;

        btn.textContent = "Saving...";

    }

    try{

        const full_name = document
            .getElementById("fullName")
            .value
            .trim();

        const {

            error

        } = await window.supabaseClient

            .from("store_admins")

            .update({

                full_name

            })

            .eq("id",window.adminProfile.id);

        if(error) throw error;

        window.adminProfile.full_name = full_name;

        Utils.toast("Profile updated.");

    }

    catch(err){

        console.error(err);

        Utils.toast(err.message,"error");

    }

    finally{

        if(btn){

            btn.disabled = false;

            btn.textContent = "Save Changes";

        }

    }

}

// =========================================
// CHANGE PASSWORD
// =========================================

async function changePassword(e){

    e.preventDefault();

    const password = document
        .getElementById("newPassword")
        .value;

    const confirm = document
        .getElementById("confirmPassword")
        .value;

    if(password !== confirm){

        Utils.toast("Passwords do not match.","error");

        return;

    }

    try{

        const {

            error

        } = await window.supabaseClient.auth.updateUser({

            password

        });

        if(error) throw error;

        Utils.toast("Password updated.");

        e.target.reset();

    }

    catch(err){

        console.error(err);

        Utils.toast(err.message,"error");

    }

}

// =========================================
// LOGOUT
// =========================================

async function logoutAdmin(){

    const confirmed = confirm(

        "Logout from Studio Fit Admin?"

    );

    if(!confirmed) return;

    await window.supabaseClient.auth.signOut();

    window.location.href = "login.html";

}