// ==========================================
// STUDIO_FIT ADMIN AUTH
// ==========================================

const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const loginMessage = document.getElementById("loginMessage");

// ==========================================
// LOGIN
// ==========================================

if (loginForm) {

    loginForm.addEventListener("submit", login);

}

async function login(e) {

    e.preventDefault();

    loginBtn.disabled = true;
    loginBtn.textContent = "Signing In...";

    loginMessage.textContent = "";

    try {

        const email = document.getElementById("email").value.trim();

        const password = document.getElementById("password").value;

        const { data, error } = await window.supabaseClient.auth.signInWithPassword({

            email,
            password

        });

        if (error) throw error;

        const { data: profile, error: profileError } = await window.supabaseClient

            .from("store_profiles")

            .select("*")

            .eq("id", data.user.id)

            .single();

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

        loginMessage.textContent = err.message;

        loginMessage.style.color = "#ef4444";

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

        .select("*")

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

    return true;

}

// ==========================================
// AUTO REDIRECT FROM LOGIN
// ==========================================

async function redirectIfLoggedIn() {

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

    redirectIfLoggedIn();

}

// ==========================================
// LOGOUT
// ==========================================

async function logout() {

    await window.supabaseClient.auth.signOut();

    window.location.replace("login.html");

}

// ==========================================
// SESSION LISTENER
// ==========================================

window.supabaseClient.auth.onAuthStateChange((event) => {

    if (event === "SIGNED_OUT") {

        if (!window.location.pathname.includes("login.html")) {

            window.location.replace("login.html");

        }

    }

});