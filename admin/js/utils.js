// ==========================================
// STUDIO_FIT ADMIN UTILITIES
// ==========================================

const Utils = {

    // ===============================
    // Currency
    // ===============================

    currency(amount) {

        return `KSh ${Number(amount).toLocaleString("en-KE", {

            minimumFractionDigits: 2,

            maximumFractionDigits: 2

        })}`;

    },

    // ===============================
    // Date
    // ===============================

    date(date) {

        return new Date(date).toLocaleDateString("en-KE", {

            year: "numeric",

            month: "short",

            day: "numeric"

        });

    },

    // ===============================
    // Slug
    // ===============================

    slug(text) {

        return text

            .trim()

            .toLowerCase()

            .replace(/[^a-z0-9]+/g, "-")

            .replace(/^-|-$/g, "");

    },

    // ===============================
    // Toast
    // ===============================

    toast(message, type = "success") {

        let toast = document.getElementById("toast");

        if (!toast) {

            toast = document.createElement("div");

            toast.id = "toast";

            toast.className = "toast";

            document.body.appendChild(toast);

        }

        toast.className = `toast ${type}`;

        toast.textContent = message;

        toast.classList.add("show");

        setTimeout(() => {

            toast.classList.remove("show");

        }, 3000);

    },

    // ===============================
    // Confirm
    // ===============================

    async confirm(message) {

        return window.confirm(message);

    },

    // ===============================
    // Loading
    // ===============================

    showLoader(text = "Loading...") {

        let loader = document.getElementById("loader");

        if (!loader) {

            loader = document.createElement("div");

            loader.id = "loader";

            loader.className = "loader-overlay";

            loader.innerHTML = `

                <div class="loader-box">

                    <div class="spinner"></div>

                    <p>${text}</p>

                </div>

            `;

            document.body.appendChild(loader);

        }

    },

    hideLoader() {

        const loader = document.getElementById("loader");

        if (loader) {

            loader.remove();

        }

    }

};