// ==========================================
// CATEGORIES
// ==========================================

let categories = [];

async function loadCategories(){

    await fetchCategories();

    initializeCategoryEvents();

}

async function fetchCategories(){

    Utils.showLoader("Loading categories...");

    try{

        const { data, error } = await window.supabaseClient

            .from("store_categories")

            .select("*")

            .order("created_at",{

                ascending:false

            });

        if(error) throw error;

        categories=data;

        renderCategories();

    }

    catch(err){

        console.error(err);

        Utils.toast(err.message,"error");

    }

    finally{

        Utils.hideLoader();

    }

}
function renderCategories(){

    const tbody=document.getElementById("categoriesTable");

    if(!tbody) return;

    tbody.innerHTML="";

    if(categories.length===0){

        tbody.innerHTML=`

        <tr>

            <td colspan="4" style="text-align:center;padding:40px;">

                No categories found.

            </td>

        </tr>

        `;

        return;

    }

    categories.forEach(category=>{

        tbody.innerHTML+=`

        <tr>

            <td>${category.name}</td>

            <td>${category.slug}</td>

            <td>${Utils.date(category.created_at)}</td>

            <td>

                <div class="actions">

                    <button

                        class="icon-action"

                        onclick="editCategory('${category.id}')"

                    >

                        <i class="fas fa-pen"></i>

                    </button>

                    <button

                        class="icon-action"

                        onclick="deleteCategory('${category.id}')"

                    >

                        <i class="fas fa-trash"></i>

                    </button>

                </div>

            </td>

        </tr>

        `;

    });

}
// ==========================================
// EVENTS
// ==========================================

function initializeCategoryEvents() {

    const addBtn = document.getElementById("newCategoryBtn");

    if (addBtn) {

        addBtn.onclick = openCategoryModal;

    }

    const form = document.getElementById("categoryForm");

    if (form) {

        form.onsubmit = saveCategory;

    }

    const nameInput = document.getElementById("categoryName");

    if (nameInput) {

        nameInput.addEventListener("input", () => {

            document.getElementById("categorySlug").value =
                Utils.slug(nameInput.value);

        });

    }

}

// ==========================================
// MODAL
// ==========================================

function openCategoryModal() {

    document.getElementById("categoryModalTitle").textContent =
        "Add Category";

    document.getElementById("categoryForm").reset();

    document.getElementById("categoryId").value = "";

    document.getElementById("categoryModal")
        .classList.add("show");

}

function closeCategoryModal() {

    document.getElementById("categoryModal")
        .classList.remove("show");

}
// ==========================================
// SAVE CATEGORY
// ==========================================

async function saveCategory(e) {

    e.preventDefault();

    const id = document.getElementById("categoryId").value;

    const name = document
        .getElementById("categoryName")
        .value
        .trim();

    const slug = document
        .getElementById("categorySlug")
        .value
        .trim();

    try {

        Utils.showLoader("Saving category...");

        if (id === "") {

            const { error } = await window.supabaseClient

                .from("store_categories")

                .insert({

                    name,

                    slug

                });

            if (error) throw error;

            Utils.toast("Category created successfully.");

        }

        else {

            const { error } = await window.supabaseClient

                .from("store_categories")

                .update({

                    name,

                    slug

                })

                .eq("id", id);

            if (error) throw error;

            Utils.toast("Category updated successfully.");

        }

        closeCategoryModal();

        fetchCategories();

    }

    catch (err) {

        console.error(err);

        Utils.toast(err.message, "error");

    }

    finally {

        Utils.hideLoader();

    }

}
// ==========================================
// EDIT CATEGORY
// ==========================================

function editCategory(id) {

    const category = categories.find(c => c.id === id);

    if (!category) return;

    document.getElementById("categoryModalTitle").textContent =
        "Edit Category";

    document.getElementById("categoryId").value =
        category.id;

    document.getElementById("categoryName").value =
        category.name;

    document.getElementById("categorySlug").value =
        category.slug;

    document.getElementById("categoryModal")
        .classList.add("show");

}
// ==========================================
// DELETE CATEGORY
// ==========================================

async function deleteCategory(id) {

    const confirmed = await Utils.confirm(

        "Delete this category?"

    );

    if (!confirmed) return;

    try {

        Utils.showLoader("Deleting...");

        const { count } = await window.supabaseClient

            .from("store_products")

            .select("*", {

                count: "exact",

                head: true

            })

            .eq("category_id", id);

        if (count > 0) {

            throw new Error(

                "This category contains products."

            );

        }

        const { error } = await window.supabaseClient

            .from("store_categories")

            .delete()

            .eq("id", id);

        if (error) throw error;

        Utils.toast("Category deleted.");

        fetchCategories();

    }

    catch (err) {

        Utils.toast(err.message, "error");

    }

    finally {

        Utils.hideLoader();

    }

}