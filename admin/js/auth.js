// ==========================================
// STUDIO_FIT ADMIN AUTH
// ==========================================

const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const loginMessage = document.getElementById("loginMessage");

function adminClientReady() {
    return Boolean(window.supabaseClient?.auth);
}

function setLoginMessage(message, type = "error") {
    if (!loginMessage) return;
    loginMessage.textContent = message;
    loginMessage.style.color = type === "success" ? "#059669" : "#ef4444";
}

function withTimeout(promise, milliseconds, message) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), milliseconds);
        })
    ]);
}

// ==========================================
// LOGIN
// ==========================================

if (loginForm) {

    loginForm.addEventListener("submit", login);

}

async function login(e) {

    e.preventDefault();

    if (!adminClientReady()) {
        setLoginMessage("Admin login could not connect to Supabase. Check your internet connection and Supabase settings.");
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Signing In...";

    setLoginMessage("");

    try {

        const email = document.getElementById("email").value.trim();

        const password = document.getElementById("password").value;

        const { data, error } = await withTimeout(
            window.supabaseClient.auth.signInWithPassword({

                email,
                password

            }),
            15000,
            "Supabase login is taking too long. Check your internet connection, Supabase URL/key, and auth settings."
        );

        if (error) throw error;

        const { data: profile, error: profileError } = await withTimeout(
            window.supabaseClient

            .from("store_profiles")

            .select("id,email,role,full_name")

            .eq("id", data.user.id)

            .single(),
            15000,
            "Signed in, but admin profile lookup timed out. Check store_profiles RLS policies."
        );

        if (profileError) {
                console.error("Profile Error:", profileError);
                throw profileError;
            }

            console.log("Logged in user:", data.user);
            console.log("Profile:", profile);

        if (profile.role !== "admin") {

            await window.supabaseClient.auth.signOut();

            throw new Error("You are not authorized.");

        }

        window.location.replace("dashboard.html");

    }

    catch (err) {

        setLoginMessage(err.message || "Sign in failed. Please try again.");

    }

    finally {

        loginBtn.disabled = false;

        loginBtn.textContent = "Sign In";

    }

}

// ==========================================
// CHECK ADMIN
// ==========================================

async function requireAdmin() {

    if (!adminClientReady()) {
        window.location.replace("login.html");
        return false;
    }

    const {

        data: { session }

    } = await window.supabaseClient.auth.getSession();

    if (!session) {

        window.location.replace("login.html");

        return false;

    }

    const {

        data: profile,

        error

    } = await window.supabaseClient

        .from("store_profiles")

        .select("id,email,role,full_name")

        .eq("id", session.user.id)

        .single();

    if (error || !profile) {

        await window.supabaseClient.auth.signOut();

        window.location.replace("login.html");

        return false;

    }

    if (profile.role !== "admin") {

        await window.supabaseClient.auth.signOut();

        window.location.replace("login.html");

        return false;

    }

    window.adminProfile = profile;

    hydrateAdminChrome(profile);

    return true;

}

// ==========================================
// AUTO REDIRECT FROM LOGIN
// ==========================================

async function redirectIfLoggedIn() {

    if (!adminClientReady()) return;

    const {

        data: { session }

    } = await window.supabaseClient.auth.getSession();

    if (!session) return;

    const {

        data: profile

    } = await window.supabaseClient

        .from("store_profiles")

        .select("role")

        .eq("id", session.user.id)

        .single();

    if (profile?.role === "admin") {

        window.location.replace("dashboard.html");

    }

}

if (window.location.pathname.includes("login.html")) {

    window.addEventListener("DOMContentLoaded", redirectIfLoggedIn);

}

// ==========================================
// LOGOUT
// ==========================================

async function logout() {

    await window.supabaseClient.auth.signOut();

    window.location.replace("login.html");

}

function hydrateAdminChrome(profile) {
    if (!profile) return;

    const displayName = profile.full_name || profile.email || "Admin";
    const initials = displayName
        .split("@")[0]
        .split(" ")
        .filter(Boolean)
        .map(part => part.charAt(0))
        .join("")
        .substring(0, 2)
        .toUpperCase() || "A";

    document.querySelectorAll("#adminName").forEach(element => {
        element.textContent = displayName;
    });

    document.querySelectorAll("#adminEmail").forEach(element => {
        element.textContent = profile.email || "";
    });

    document.querySelectorAll("#adminAvatar, #settingsAvatar").forEach(element => {
        element.textContent = initials;
    });
}

// ==========================================
// SESSION LISTENER
// ==========================================

if (adminClientReady()) {
window.supabaseClient.auth.onAuthStateChange((event) => {

    if (event === "SIGNED_OUT") {

        if (!window.location.pathname.includes("login.html")) {

            window.location.replace("login.html");

        }

    }

});
}
