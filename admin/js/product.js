// ==========================================
// STUDIO_FIT PRODUCTS
// ==========================================

let products = [];
let filteredProducts = [];

const PRODUCTS_PER_PAGE = 10;

let currentPage = 1;

// ==========================================
// LOAD PRODUCTS PAGE
// ==========================================

async function loadProducts() {

    await loadCategoryFilter();

    await fetchProducts();

    initializeProductEvents();

}

// ==========================================
// FETCH PRODUCTS
// ==========================================

async function fetchProducts() {

    try {

        const { data, error } = await window.supabaseClient

            .from("store_products")

            .select(`
                *,
                store_categories (
                    id,
                    name
                ),
                store_product_images (
                    image_url,
                    is_primary
                )
            `)

            .order("created_at", {
                ascending: false
            });

        if (error) throw error;

        products = data || [];

        filteredProducts = [...products];

        renderProducts();

    }

    catch (err) {

        console.error(err);

        const table = document.getElementById("productsTable");

        if (table) {

            table.innerHTML = `

                <tr>

                    <td colspan="8" style="text-align:center;padding:40px">

                        Failed to load products.

                    </td>

                </tr>

            `;

        }

    }

}

// ==========================================
// RENDER PRODUCTS
// ==========================================

function renderProducts() {

    const tbody = document.getElementById("productsTable");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (filteredProducts.length === 0) {

        tbody.innerHTML = `

            <tr>

                <td colspan="8" style="text-align:center;padding:40px">

                    No products found.

                </td>

            </tr>

        `;

        return;

    }

    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;

    const end = start + PRODUCTS_PER_PAGE;

    const pageProducts = filteredProducts.slice(start, end);

    pageProducts.forEach(product => {

        const primaryImage =
            product.store_product_images.find(img => img.is_primary)
            || product.store_product_images[0];

        tbody.innerHTML += `

            <tr>

                <td>

                    <img
                        src="${primaryImage ? primaryImage.image_url : "../assets/no-image.png"}"
                        class="product-image"
                    >

                </td>

                <td>

                    ${product.name}

                </td>

                <td>

                    ${product.store_categories?.name || "-"}

                </td>

                <td>

                  ${Utils.currency(product.price)}

                </td>

                <td>

                    ${product.stock}

                </td>

                <td>

                    <span class="badge ${product.featured ? "green" : "gray"}">

                        ${product.featured ? "Featured" : "No"}

                    </span>

                </td>

                <td>

                    <span class="status ${product.active ? "active" : "out"}">

                        ${product.active ? "Active" : "Inactive"}

                    </span>

                </td>

                <td>

                    <div class="actions">

                        <button

                            class="icon-action"

                            onclick="editProduct('${product.id}')"

                        >

                            <i class="fas fa-pen"></i>

                        </button>

                        <button

                            class="icon-action"

                            onclick="deleteProduct('${product.id}')"

                        >

                            <i class="fas fa-trash"></i>

                        </button>

                    </div>

                </td>

            </tr>

        `;

    });

    renderPagination();

}
// ==========================================
// LOAD CATEGORY FILTER
// ==========================================

async function loadCategoryFilter() {

    try {

        const { data, error } = await window.supabaseClient

            .from("store_categories")

            .select("*")

            .order("name");

        if (error) throw error;

        const select = document.getElementById("categoryFilter");

        if (!select) return;

        select.innerHTML = `
            <option value="">All Categories</option>
        `;

        data.forEach(category => {

            select.innerHTML += `
                <option value="${category.id}">
                    ${category.name}
                </option>
            `;

        });

    }

    catch (err) {

        console.error(err);

    }

}

// ==========================================
// EVENTS
// ==========================================

function initializeProductEvents() {

    const search = document.getElementById("productSearch");

    const category = document.getElementById("categoryFilter");

    if (search) {

        search.addEventListener("input", filterProducts);

    }

    if (category) {

        category.addEventListener("change", filterProducts);

    }

    const addBtn = document.getElementById("addProductBtn");

    if (addBtn) {

        addBtn.addEventListener("click", () => {

            loadPage("add-product");

        });

    }

}

// ==========================================
// FILTER PRODUCTS
// ==========================================

function filterProducts() {

    const keyword = document

        .getElementById("productSearch")

        .value

        .trim()

        .toLowerCase();

    const category = document

        .getElementById("categoryFilter")

        .value;

    filteredProducts = products.filter(product => {

        const matchesSearch =

            product.name.toLowerCase().includes(keyword) ||

            product.slug.toLowerCase().includes(keyword);

        const matchesCategory =

            category === "" ||

            product.category_id === category;

        return matchesSearch && matchesCategory;

    });

    currentPage = 1;

    renderProducts();

}

// ==========================================
// PAGINATION
// ==========================================

function renderPagination() {

    const container = document.getElementById("pagination");

    if (!container) return;

    container.innerHTML = "";

    const pages = Math.ceil(

        filteredProducts.length / PRODUCTS_PER_PAGE

    );

    if (pages <= 1) return;

    for (let i = 1; i <= pages; i++) {

        const button = document.createElement("button");

        button.className =

            i === currentPage

                ? "btn btn-primary"

                : "btn btn-secondary";

        button.textContent = i;

        button.onclick = () => {

            currentPage = i;

            renderProducts();

        };

        container.appendChild(button);

    }

}
// ==========================================
// ADD PRODUCT PAGE
// ==========================================

let selectedImages = [];

async function loadAddProduct() {

    editingProductId = null;

    await loadProductCategories();

    setupSlugGenerator();

    setupImagePreview();

    setupProductForm();

}

// ==========================================
// LOAD CATEGORIES
// ==========================================

async function loadProductCategories() {

    const select = document.getElementById("productCategory");

    if (!select) return;

    const { data, error } = await window.supabaseClient

        .from("store_categories")

        .select("*")

        .order("name");

    if (error) {

        console.error(error);

        return;

    }

    select.innerHTML = "";

    data.forEach(category => {

        select.innerHTML += `

            <option value="${category.id}">

                ${category.name}

            </option>

        `;

    });

}

// ==========================================
// SLUG
// ==========================================

function setupSlugGenerator() {

    const name = document.getElementById("productName");

    const slug = document.getElementById("productSlug");

    if (!name) return;

    name.addEventListener("input", () => {

        slug.value = name.value

            .trim()

            .toLowerCase()

            .replace(/[^a-z0-9]+/g, "-")

            .replace(/^-|-$/g, "");

    });

}
// ==========================================
// IMAGE PREVIEW
// ==========================================

function setupImagePreview() {

    const input = document.getElementById("productImages");

    const preview = document.getElementById("imagePreview");

    if (!input) return;

    input.addEventListener("change", () => {

        selectedImages = [...input.files];

        preview.innerHTML = "";

        selectedImages.forEach((file,index)=>{

            const reader=new FileReader();

            reader.onload=e=>{

                preview.innerHTML += `

                <div class="image-preview ${index===0?"primary":""}">

                    <img src="${e.target.result}">

                </div>

                `;

            };

            reader.readAsDataURL(file);

        });

    });

}
// ==========================================
// PRODUCT FORM
// ==========================================

function setupProductForm(){

    const form=document.getElementById("productForm");

    if(!form) return;

    form.addEventListener("submit",saveProduct);

}
// ==========================================
// SAVE PRODUCT
// ==========================================

async function saveProduct(e) {

    e.preventDefault();

    const submitBtn = e.target.querySelector("button[type='submit']");

    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    try {

        const product = {

            category_id: document.getElementById("productCategory").value,

            name: document.getElementById("productName").value.trim(),

            slug: document.getElementById("productSlug").value.trim(),

            description: document.getElementById("productDescription").value.trim(),

            price: Number(document.getElementById("productPrice").value),

            stock: Number(document.getElementById("productStock").value),

            featured: document.getElementById("featured").checked,

            active: document.getElementById("active").checked

        };

        const {

            data: insertedProduct,

            error: productError

        } = await window.supabaseClient

            .from("store_products")

            .insert(product)

            .select()

            .single();

        if (productError) throw productError;

        if (selectedImages.length > 0) {

            await uploadProductImages(

                insertedProduct.id,

                selectedImages

            );

        }

        Utils.toast("Product created successfully.");

        loadPage("products");

    }

    catch(err){

        console.error(err);

        Utils.toast(err.message, "error");

    }

    finally{

        submitBtn.disabled=false;

        submitBtn.textContent="Save Product";

    }

}
// ==========================================
// UPLOAD PRODUCT IMAGES
// ==========================================

async function uploadProductImages(productId, files){

    for(let i=0;i<files.length;i++){

        const file = files[i];

        const extension = file.name.split(".").pop();

        const filename =

            `${Date.now()}-${crypto.randomUUID()}.${extension}`;

        const filepath = `products/${filename}`;

        const {

            error: uploadError

        } = await window.supabaseClient.storage

            .from("store_products")

            .upload(filepath,file);

        if(uploadError){

            throw uploadError;

        }

        const {

            data: publicUrlData

        } = window.supabaseClient.storage

            .from("store_products")

            .getPublicUrl(filepath);

        const publicUrl = publicUrlData.publicUrl;

        const {

            error: imageError

        } = await window.supabaseClient

            .from("store_product_images")

            .insert({

                product_id: productId,

                image_url: publicUrl,

                is_primary: i===0

            });

        if(imageError){

            throw imageError;

        }

    }

}
// ==========================================
// EDIT PRODUCT
// ==========================================

let editingProductId = null;

function editProduct(id){

    editingProductId = id;

    loadPage("edit-product");

}
// ==========================================
// LOAD EDIT PRODUCT
// ==========================================

async function loadEditProduct(){

    await loadProductCategories();

    setupSlugGenerator();

    setupImagePreview();

    setupProductForm();

    await populateProduct();

}
// ==========================================
// POPULATE PRODUCT
// ==========================================

async function populateProduct(){

    if(!editingProductId) return;

    const {

        data,

        error

    } = await window.supabaseClient

        .from("store_products")

        .select(`
            *,
            store_product_images(*)
        `)

        .eq("id",editingProductId)

        .single();

    if(error){

        Utils.toast(error.message,"error");

        return;

    }

    document.querySelector(".page-title").textContent="Edit Product";

    document.getElementById("productName").value=data.name;

    document.getElementById("productSlug").value=data.slug;

    document.getElementById("productDescription").value=data.description ?? "";

    document.getElementById("productPrice").value=data.price;

    document.getElementById("productStock").value=data.stock;

    document.getElementById("productCategory").value=data.category_id;

    document.getElementById("featured").checked=data.featured;

    document.getElementById("active").checked=data.active;

    renderExistingImages(data.store_product_images);

}
// ==========================================
// EXISTING IMAGES
// ==========================================

function renderExistingImages(images) {

    const preview = document.getElementById("imagePreview");

    preview.innerHTML = "";

    images.forEach(image => {

        const card = document.createElement("div");

        card.className = `image-preview ${image.is_primary ? "primary" : ""}`;

        card.innerHTML = `

            <img src="${image.image_url}">

            <div class="image-actions">

                <button
                    class="image-btn primary-btn"
                    title="Make Primary"
                >
                    <i class="fas fa-star"></i>
                </button>

                <button
                    class="image-btn delete-btn"
                    title="Delete"
                >
                    <i class="fas fa-trash"></i>
                </button>

            </div>

        `;

        card.querySelector(".primary-btn").onclick = () =>
            makePrimaryImage(image.id);

        card.querySelector(".delete-btn").onclick = () =>
            deleteProductImage(image);

        preview.appendChild(card);

    });

}
// ==========================================
// DELETE IMAGE
// ==========================================

async function deleteProductImage(image){

    const confirmed = await Utils.confirm(

        "Delete this image?"

    );

    if(!confirmed) return;

    try{

        Utils.showLoader("Deleting image...");

        const path = image.image_url.split("/store_products/")[1];

        if(path){

            await window.supabaseClient.storage

                .from("store_products")

                .remove([path]);

        }

        const { error } = await window.supabaseClient

            .from("store_product_images")

            .delete()

            .eq("id",image.id);

        if(error) throw error;

        Utils.toast("Image deleted.");

        await populateProduct();

    }

    catch(err){

        Utils.toast(err.message,"error");

    }

    finally{

        Utils.hideLoader();

    }

}
// ==========================================
// PRIMARY IMAGE
// ==========================================

async function makePrimaryImage(imageId){

    try{

        Utils.showLoader("Updating...");

        const {

            data: images

        } = await window.supabaseClient

            .from("store_product_images")

            .select("*")

            .eq("product_id",editingProductId);

        for(const img of images){

            await window.supabaseClient

                .from("store_product_images")

                .update({

                    is_primary:false

                })

                .eq("id",img.id);

        }

        await window.supabaseClient

            .from("store_product_images")

            .update({

                is_primary:true

            })

            .eq("id",imageId);

        Utils.toast("Primary image updated.");

        await populateProduct();

    }

    finally{

        Utils.hideLoader();

    }

}