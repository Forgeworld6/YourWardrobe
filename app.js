(() => {
  const $ = (id) => document.getElementById(id);
  const categoryNames = { top: "Top / Shirt", bottom: "Bottom / Pants", shoes: "Footwear" };
  const inputIds = { top: "topInput", bottom: "bottomInput", shoes: "shoesInput" };
  const state = {
    pieces: { top: null, bottom: null, shoes: null },
    view: "flat",
    activeCategory: null,
    saved: load("yw_saved", []),
    wardrobe: load("yw_wardrobe", [])
  };

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
  }

  function persist() {
    localStorage.setItem("yw_saved", JSON.stringify(state.saved));
    localStorage.setItem("yw_wardrobe", JSON.stringify(state.wardrobe));
    updateStats();
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2300);
  }

  function safeText(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  function go(page) {
    document.querySelectorAll(".page").forEach(el => el.classList.toggle("active", el.id === "page-" + page));
    document.querySelectorAll(".nav-item[data-page]").forEach(el => el.classList.toggle("active", el.dataset.page === page));
    $("pageCrumb").textContent = ({ dashboard: "Dashboard", studio: "Outfit Studio", wardrobe: "My Wardrobe", saved: "Saved Looks" })[page] || "Dashboard";
    $("sidebar").classList.remove("open");
    if (page === "wardrobe") renderWardrobe();
    if (page === "saved") renderSaved();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll("[data-page]").forEach(btn => btn.addEventListener("click", () => go(btn.dataset.page)));
  document.querySelectorAll("[data-go]").forEach(btn => btn.addEventListener("click", () => go(btn.dataset.go)));
  $("mobileMenu").addEventListener("click", () => $("sidebar").classList.toggle("open"));

  function updateStats() {
    $("statItems").textContent = state.wardrobe.length;
    $("statLooks").textContent = state.saved.length;
    $("wardrobeCount").textContent = state.wardrobe.length + " item" + (state.wardrobe.length === 1 ? "" : "s");
  }

  function addToWardrobe(piece) {
    const exists = state.wardrobe.some(item =>
      item.name === piece.name &&
      item.category === piece.category &&
      (item.sourceUrl || "") === (piece.sourceUrl || "")
    );
    if (!exists) {
      state.wardrobe.unshift({ ...piece, id: Date.now() + Math.random() });
      persist();
    }
  }

  function setImage(containerId, piece) {
    const container = $(containerId);
    const img = container.querySelector("img");
    if (piece) {
      img.src = piece.data;
      img.alt = piece.category + " preview";
      img.style.display = "block";
      container.classList.add("has-image");
    } else {
      img.removeAttribute("src");
      img.style.display = "none";
      container.classList.remove("has-image");
    }
  }

  function setModelImage(id, piece, fallbackColor) {
    const el = $(id);
    el.style.backgroundColor = fallbackColor;
    el.style.backgroundImage = piece ? 'url("' + piece.data.replace(/"/g, "%22") + '")' : "none";
    el.style.backgroundPosition = "center";
    el.style.backgroundRepeat = "no-repeat";
    el.style.backgroundSize = "contain";
  }

  function updatePreview() {
    const count = Object.values(state.pieces).filter(Boolean).length;
    $("pieceCount").textContent = count + " / 3 pieces";
    $("flatPreview").classList.toggle("hidden", state.view !== "flat");
    $("modelPreview").classList.toggle("hidden", state.view !== "model");
    setImage("topPreview", state.pieces.top);
    setImage("bottomPreview", state.pieces.bottom);
    setImage("shoesPreview", state.pieces.shoes);
    setModelImage("modelTop", state.pieces.top, "#aaa");
    setModelImage("modelBottom", state.pieces.bottom, "#777");
    setModelImage("modelShoes", state.pieces.shoes, "#555");
  }

  Object.keys(inputIds).forEach(key => {
    $(inputIds[key]).addEventListener("change", event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        showToast("Please choose an image file.");
        event.target.value = "";
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        showToast("Please choose an image smaller than 8 MB.");
        event.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const piece = {
          name: file.name,
          data: reader.result,
          category: categoryNames[key],
          source: "gallery"
        };
        state.pieces[key] = piece;
        updatePreview();
        addToWardrobe(piece);
        showToast(categoryNames[key] + " added.");
      };
      reader.readAsDataURL(file);
    });
  });

  document.querySelectorAll("[data-gallery]").forEach(button => {
    button.addEventListener("click", () => {
      const key = button.dataset.gallery;
      if (inputIds[key]) $(inputIds[key]).click();
    });
  });

  function openLinkModal(key) {
    state.activeCategory = key;
    $("linkModalTitle").textContent = "Add " + categoryNames[key] + " from a link";
    $("productUrl").value = "";
    $("manualImageUrl").value = "";
    $("manualImageFallback").classList.add("hidden");
    $("linkHelp").textContent = "Paste a public product page link. We'll try to find its main image.";
    $("addUrl").disabled = false;
    $("addUrl").textContent = "Find product image";
    $("linkModal").classList.remove("hidden");
    $("productUrl").focus();
  }

  function closeLinkModal() {
    $("linkModal").classList.add("hidden");
    state.activeCategory = null;
  }

  document.querySelectorAll("[data-link]").forEach(button => {
    button.addEventListener("click", () => openLinkModal(button.dataset.link));
  });
  $("closeLinkModal").addEventListener("click", closeLinkModal);
  $("cancelLink").addEventListener("click", closeLinkModal);
  $("linkModalBackdrop").addEventListener("click", closeLinkModal);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !$("linkModal").classList.contains("hidden")) closeLinkModal();
  });

  function verifyImage(url) {
    return new Promise(resolve => {
      const image = new Image();
      let finished = false;
      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          resolve(false);
        }
      }, 10000);
      image.onload = () => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          resolve(true);
        }
      };
      image.onerror = () => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          resolve(false);
        }
      };
      image.src = url;
    });
  }

  async function getProductImage(productUrl) {
    if (/\.(png|jpe?g|webp|avif)(?:[?#]|$)/i.test(productUrl)) {
      return { image: productUrl, title: "" };
    }
    const endpoint = "https://api.microlink.io/?url=" + encodeURIComponent(productUrl) + "&filter=title,image,url";
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error("Product preview service is unavailable.");
    const result = await response.json();
    const imageUrl = result && result.data && result.data.image && result.data.image.url;
    if (result.status !== "success" || !imageUrl) throw new Error("No product image was found.");
    return { image: imageUrl, title: result.data.title || "" };
  }

  async function addProductLink() {
    const rawUrl = $("productUrl").value.trim();
    let parsed;
    try {
      parsed = new URL(rawUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid protocol");
    } catch {
      $("linkHelp").textContent = "Enter a valid product page link starting with https://";
      $("productUrl").focus();
      return;
    }

    const key = state.activeCategory;
    if (!key) return;
    const button = $("addUrl");
    button.disabled = true;
    button.textContent = "Finding image...";
    $("linkHelp").textContent = "Checking the product page for its main image. This can take a few seconds.";

    try {
      const result = await getProductImage(parsed.href);
      const imageWorks = await verifyImage(result.image);
      if (!imageWorks) throw new Error("The image could not be loaded.");
      const piece = {
        name: result.title || parsed.hostname.replace(/^www\./, ""),
        data: result.image,
        category: categoryNames[key],
        source: "link",
        sourceUrl: parsed.href
      };
      state.pieces[key] = piece;
      updatePreview();
      addToWardrobe(piece);
      closeLinkModal();
      showToast(categoryNames[key] + " image added.");
    } catch (error) {
      $("manualImageFallback").classList.remove("hidden");
      $("linkHelp").textContent = "This store did not provide a usable image preview. Paste a direct image URL below, or use ＋ to choose a photo.";
      button.disabled = false;
      button.textContent = "Try again";
    }
  }

  $("addUrl").addEventListener("click", addProductLink);
  $("productUrl").addEventListener("keydown", event => {
    if (event.key === "Enter") addProductLink();
  });

  $("useDirectImage").addEventListener("click", async () => {
    const rawImageUrl = $("manualImageUrl").value.trim();
    let parsedImage;
    try {
      parsedImage = new URL(rawImageUrl);
      if (!["http:", "https:"].includes(parsedImage.protocol)) throw new Error("Invalid protocol");
    } catch {
      $("linkHelp").textContent = "Enter a valid direct image link starting with https://";
      return;
    }
    const button = $("useDirectImage");
    button.disabled = true;
    button.textContent = "Checking image...";
    const works = await verifyImage(parsedImage.href);
    if (!works) {
      $("linkHelp").textContent = "That image link could not be opened. Check the link or choose a photo from your gallery.";
      button.disabled = false;
      button.textContent = "Use this image";
      return;
    }
    const key = state.activeCategory;
    if (!key) return;
    let sourceUrl = $("productUrl").value.trim();
    try { sourceUrl = sourceUrl ? new URL(sourceUrl).href : parsedImage.href; } catch { sourceUrl = parsedImage.href; }
    const piece = {
      name: parsedImage.hostname.replace(/^www\./, ""),
      data: parsedImage.href,
      category: categoryNames[key],
      source: "link",
      sourceUrl
    };
    state.pieces[key] = piece;
    updatePreview();
    addToWardrobe(piece);
    closeLinkModal();
    showToast(categoryNames[key] + " image added.");
  });

  document.querySelectorAll(".view-btn").forEach(button => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      document.querySelectorAll(".view-btn").forEach(item => item.classList.toggle("active", item === button));
      updatePreview();
    });
  });

  $("saveLook").addEventListener("click", () => {
    const pieces = Object.entries(state.pieces)
      .filter(([, piece]) => piece)
      .map(([key, piece]) => ({ key, ...piece }));
    if (!pieces.length) {
      $("studioMessage").textContent = "Add at least one clothing item before saving.";
      return;
    }
    const name = $("outfitName").value.trim() || ("My look " + (state.saved.length + 1));
    state.saved.unshift({
      id: Date.now(),
      name,
      pieces,
      createdAt: new Date().toLocaleDateString()
    });
    persist();
    $("studioMessage").textContent = "Your look has been saved on this device.";
    $("outfitName").value = "";
    showToast("Look saved!");
  });

  $("clearStudio").addEventListener("click", () => {
    state.pieces = { top: null, bottom: null, shoes: null };
    Object.values(inputIds).forEach(id => $(id).value = "");
    $("studioMessage").textContent = "";
    updatePreview();
    showToast("Studio cleared.");
  });

  function renderWardrobe() {
    const grid = $("wardrobeGrid");
    if (!state.wardrobe.length) {
      grid.innerHTML = '<div class="empty-card"><span>▤</span><strong>Your wardrobe is waiting</strong><p>Add clothing images in Outfit Studio. They will show up here.</p><button class="secondary-btn" data-go="studio">Go to Outfit Studio</button></div>';
      grid.querySelector("[data-go]").addEventListener("click", () => go("studio"));
      return;
    }
    grid.innerHTML = state.wardrobe.map(item => {
      const productLink = item.sourceUrl
        ? '<a class="wardrobe-source" href="' + safeText(item.sourceUrl) + '" target="_blank" rel="noopener noreferrer">View product ↗</a>'
        : "";
      return '<article class="wardrobe-card"><img src="' + safeText(item.data) + '" alt="' + safeText(item.category) + '" /><div><strong>' +
        safeText(item.name) + '</strong><small>' + safeText(item.category) + '</small>' + productLink + '</div></article>';
    }).join("");
  }

  function renderSaved() {
    const grid = $("savedGrid");
    if (!state.saved.length) {
      grid.innerHTML = '<div class="empty-card"><span>♡</span><strong>No saved looks yet</strong><p>Build an outfit and save it to see it here.</p><button class="secondary-btn" data-go="studio">Create your first look</button></div>';
      grid.querySelector("[data-go]").addEventListener("click", () => go("studio"));
      return;
    }
    grid.innerHTML = state.saved.map(look => {
      const imgs = (look.pieces || []).map(piece =>
        '<img src="' + safeText(piece.data) + '" alt="' + safeText(piece.category) + '" />'
      ).join("");
      return '<article class="look-card"><div class="look-images">' + imgs +
        '</div><div class="look-card-info"><div><strong>' + safeText(look.name) +
        '</strong><small>' + (look.pieces || []).length + ' piece' + ((look.pieces || []).length === 1 ? "" : "s") +
        ' · ' + safeText(look.createdAt || "") + '</small></div><button class="delete-look" data-delete="' +
        safeText(look.id) + '" aria-label="Delete ' + safeText(look.name) + '">×</button></div></article>';
    }).join("");
    grid.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", () => {
      state.saved = state.saved.filter(look => String(look.id) !== button.dataset.delete);
      persist();
      renderSaved();
      showToast("Saved look deleted.");
    }));
  }

  $("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("yw_theme", document.body.classList.contains("dark") ? "dark" : "light");
  });
  if (localStorage.getItem("yw_theme") === "dark") document.body.classList.add("dark");
  $("todayLabel").textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date());
  updateStats();
  updatePreview();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();