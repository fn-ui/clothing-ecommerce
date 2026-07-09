// =========================================
// STUDIO_FIT NEWSLETTER
// =========================================

let subscribers = [];
let filteredSubscribers = [];

// =========================================
// LOAD PAGE
// =========================================

async function loadNewsletter() {
    await fetchSubscribers();
    initializeNewsletterEvents();
}

// =========================================
// FETCH SUBSCRIBERS
// =========================================

async function fetchSubscribers() {
    try {

        const { data, error } = await window.supabaseClient
            .from("store_newsletter")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        subscribers = data || [];
        filteredSubscribers = [...subscribers];

        renderSubscribers();
        updateNewsletterStats();

    } catch (err) {
        console.error(err);

        document.getElementById("newsletterTable").innerHTML = `
            <tr>
                <td colspan="4" class="text-center">
                    Failed to load subscribers.
                </td>
            </tr>
        `;
    }
}

// =========================================
// RENDER TABLE
// =========================================

function renderSubscribers() {

    const tbody = document.getElementById("newsletterTable");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (!filteredSubscribers.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">
                    No subscribers found.
                </td>
            </tr>
        `;

        return;
    }

    filteredSubscribers.forEach(subscriber => {

        tbody.innerHTML += `
            <tr>

                <td>${subscriber.email}</td>

                <td>
                    ${new Date(subscriber.created_at).toLocaleDateString()}
                </td>

                <td>

                    <span class="badge success">
                        Active
                    </span>

                </td>

                <td>

                    <button
                        class="icon-action delete"
                        onclick="deleteSubscriber('${subscriber.id}')"
                    >

                        <i class="fas fa-trash"></i>

                    </button>

                </td>

            </tr>
        `;

    });

}

// =========================================
// STATS
// =========================================

function updateNewsletterStats() {

    const total = document.getElementById("subscriberCount");

    if (total) {

        total.textContent = subscribers.length;

    }

}

// =========================================
// SEARCH
// =========================================

function filterSubscribers() {

    const keyword = document
        .getElementById("subscriberSearch")
        .value
        .trim()
        .toLowerCase();

    filteredSubscribers = subscribers.filter(subscriber =>
        subscriber.email.toLowerCase().includes(keyword)
    );

    renderSubscribers();

}

// =========================================
// EVENTS
// =========================================

function initializeNewsletterEvents() {

    document
        .getElementById("subscriberSearch")
        ?.addEventListener("input", filterSubscribers);

    document
        .getElementById("exportSubscribers")
        ?.addEventListener("click", exportSubscribers);

}

// =========================================
// DELETE
// =========================================

async function deleteSubscriber(id) {

    const confirmed = confirm(
        "Delete this subscriber?"
    );

    if (!confirmed) return;

    try {

        const { error } = await window.supabaseClient
            .from("store_newsletter")
            .delete()
            .eq("id", id);

        if (error) throw error;

        Utils.toast("Subscriber deleted.");

        await fetchSubscribers();

    }

    catch (err) {

        console.error(err);

        Utils.toast(err.message, "error");

    }

}

// =========================================
// EXPORT CSV
// =========================================

function exportSubscribers() {

    if (!subscribers.length) {

        Utils.toast("No subscribers.");

        return;

    }

    const csv = [
        ["Email", "Subscribed On"],

        ...subscribers.map(s => [
            s.email,
            new Date(s.created_at).toLocaleDateString()
        ])
    ];

    const content = csv
        .map(row => row.join(","))
        .join("\n");

    const blob = new Blob(
        [content],
        { type: "text/csv" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = "newsletter.csv";

    a.click();

    URL.revokeObjectURL(url);

}