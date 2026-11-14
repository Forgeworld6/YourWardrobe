(() => {
  const $ = (id) => document.getElementById(id);
  const state = {
    pieces: { top: null, bottom: null, shoes: null },
    urls: [],
    view: "flat",
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
    return String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
  }
  function go(page) {
    document.querySelectorAll(".page").forEach(el => el.classList.toggle("active", el.id === `page-${page}`));
    document.querySelectorAll(".nav-item[data-page]").forEach(el => el.classList.toggle("active", el.dataset.page === page));
    $("pageCrumb").textContent = ({ dashboard:"Dashboard", studio:"Outfit Studio", wardrobe:"My Wardrobe", saved:"Saved Looks" })[page] || "Dashboard";
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
    $("wardrobeCount").textContent = `${state.wardrobe.length} item${state.wardrobe.length === 1 ? "" : "s"}`;
  }
  const categoryNames = { top:"Top / Shirt", bottom:"Bottom / Pants", shoes:"Footwear" };
  const inputIds = { top:"topInput", bottom:"bottomInput", shoes:"shoesInput" };
  Object.keys(inputIds).forEach(key => {
    $(inputIds[key]).addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) { showToast("Please choose an image file."); return; }
      if (file.size > 8 * 1024 * 1024) { showToast("Please choose an image smaller than 8 MB."); event.target.value = ""; return; }
      const reader = new FileReader();
      reader.onload = () => {
        state.pieces[key] = { name: file.name, data: reader.result, category: categoryNames[key] };
        $(`${key}FileName`).textContent = file.name;
        updatePreview();
        addToWardrobe(state.pieces[key]);
      };
      reader.readAsDataURL(file);
    });
  });

  function addToWardrobe(piece) {
    const exists = state.wardrobe.some(item => item.name === piece.name && item.category === piece.category);
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
      img.style.display = "block";
      container.classList.add("has-image");
    } else {
      img.removeAttribute("src");
      img.style.display = "none";
      container.classList.remove("has-image");
    }
  }
  function updatePreview() {
    const count = Object.values(state.pieces).filter(Boolean).length;
    $("pieceCount").textContent = `${count} / 3 pieces`;
    $("emptyPreview").classList.toggle("hidden", count > 0);
    $("flatPreview").classList.toggle("hidden", count === 0 || state.view !== "flat");
    $("modelPreview").classList.toggle("hidden", count === 0 || state.view !== "model");
    setImage("topPreview", state.pieces.top);
    setImage("bottomPreview", state.pieces.bottom);
    setImage("shoesPreview", state.pieces.shoes);
    $("modelTop").style.background = state.pieces.top ? `center / contain no-repeat url("${state.pieces.top.data}")` : "#aaa";
    $("modelBottom").style.background = state.pieces.bottom ? `center / contain no-repeat url("${state.pieces.bottom.data}")` : "#777";
    $("modelShoes").style.background = state.pieces.shoes ? `center / contain no-repeat url("${state.pieces.shoes.data}")` : "#555";
  }
  document.querySelectorAll(".view-btn").forEach(btn => btn.addEventListener("click", () => {
    state.view = btn.dataset.view;
    document.querySelectorAll(".view-btn").forEach(b => b.classList.toggle("active", b === btn));
    updatePreview();
  }));

  $("addUrl").addEventListener("click", () => {
    const value = $("productUrl").value.trim();
    try {
      const parsed = new URL(value);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      if (state.urls.some(url => url === parsed.href)) { showToast("That link is already added."); return; }
      state.urls.push(parsed.href);
      const link = document.createElement("a");
      link.className = "url-chip";
      link.href = parsed.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = parsed.hostname + parsed.pathname.slice(0, 24);
      link.title = parsed.href;
      $("urlItems").appendChild(link);
      $("productUrl").value = "";
      showToast("Product link added to this studio session.");
    } catch {
      showToast("Enter a valid product URL starting with https://");
    }
  });

  $("saveLook").addEventListener("click", () => {
    const pieces = Object.entries(state.pieces).filter(([, piece]) => piece).map(([key, piece]) => ({ key, ...piece }));
    if (!pieces.length) { $("studioMessage").textContent = "Add at least one clothing image before saving."; return; }
    const name = $("outfitName").value.trim() || `My look ${state.saved.length + 1}`;
    state.saved.unshift({ id: Date.now(), name, pieces, urls: [...state.urls], createdAt: new Date().toLocaleDateString() });
    persist();
    $("studioMessage").textContent = "Your look has been saved on this device.";
    $("outfitName").value = "";
    showToast("Look saved!");
  });
  $("clearStudio").addEventListener("click", () => {
    state.pieces = { top:null, bottom:null, shoes:null };
    state.urls = [];
    Object.values(inputIds).forEach(id => $(id).value = "");
    ["top","bottom","shoes"].forEach(key => $(`${key}FileName`).textContent = "Choose an image");
    $("urlItems").innerHTML = "";
    $("productUrl").value = "";
    $("studioMessage").textContent = "";
    updatePreview();
    showToast("Studio cleared.");
  });

  function renderWardrobe() {
    const grid = $("wardrobeGrid");
    if (!state.wardrobe.length) {
      grid.innerHTML = `<div class="empty-card"><span>▤</span><strong>Your wardrobe is waiting</strong><p>Add clothing images in Outfit Studio. They'll show up here.</p><button class="secondary-btn" data-go="studio">Go to Outfit Studio</button></div>`;
      grid.querySelector("[data-go]").addEventListener("click", () => go("studio"));
      return;
    }
    grid.innerHTML = state.wardrobe.map(item => `<article class="wardrobe-card"><img src="${item.data}" alt="${safeText(item.category)}" /><div><strong>${safeText(item.name)}</strong><small>${safeText(item.category)}</small></div></article>`).join("");
  }
  function renderSaved() {
    const grid = $("savedGrid");
    if (!state.saved.length) {
      grid.innerHTML = `<div class="empty-card"><span>♡</span><strong>No saved looks yet</strong><p>Build an outfit and save it to see it here.</p><button class="secondary-btn" data-go="studio">Create your first look</button></div>`;
      grid.querySelector("[data-go]").addEventListener("click", () => go("studio"));
      return;
    }
    grid.innerHTML = state.saved.map(look => {
      const imgs = look.pieces.map(piece => `<img src="${piece.data}" alt="${safeText(piece.category)}" />`).join("");
      return `<article class="look-card"><div class="look-images">${imgs}</div><div class="look-card-info"><div><strong>${safeText(look.name)}</strong><small>${look.pieces.length} piece${look.pieces.length === 1 ? "" : "s"} · ${safeText(look.createdAt || "")}</small></div><button class="delete-look" data-delete="${look.id}" aria-label="Delete ${safeText(look.name)}">×</button></div></article>`;
    }).join("");
    grid.querySelectorAll("[data-delete]").forEach(btn => btn.addEventListener("click", () => {
      state.saved = state.saved.filter(look => String(look.id) !== btn.dataset.delete);
      persist(); renderSaved(); showToast("Saved look deleted.");
    }));
  }

  $("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("yw_theme", document.body.classList.contains("dark") ? "dark" : "light");
  });
  if (localStorage.getItem("yw_theme") === "dark") document.body.classList.add("dark");
  $("todayLabel").textContent = new Intl.DateTimeFormat(undefined, { weekday:"short", month:"short", day:"numeric" }).format(new Date());
  updateStats();
  updatePreview();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();