function escapeAdminText(value) {
    return String(value || "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[char]));
}

function formatAdminDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString();
}

function formatAdminCurrency(value) {
    if (window.Utils?.currency) return Utils.currency(value);
    return `$${Number(value || 0).toFixed(2)}`;
}

function exportAdminCsv(filename, rows) {
    if (!rows.length || rows.length === 1) {
        Utils?.toast?.("No records to export.");
        return;
    }

    const content = rows
        .map(row => row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}
