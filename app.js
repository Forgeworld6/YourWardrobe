(() => {
  const $ = (id) => document.getElementById(id);
  const categoryNames = { top: "Top / Shirt", bottom: "Bottom / Pants", shoes: "Footwear" };
  const inputIds = { top: "topInput", bottom: "bottomInput", shoes: "shoesInput" };
  const state = {
    pieces: { top: null, bottom: null, shoes: null },
    saved: load("yw_saved", []),
    wardrobe: load("yw_wardrobe", []),
    notifications: load("yw_notifications", [])
  };

  let soundEnabled = localStorage.getItem("yw_sound") !== "off";
  let audioContext = null;
  let introSoundPlayed = false;
  let serviceWorkerRegistration = null;
  let watchedRegistration = null;
  let applyingUpdate = false;
  let pendingWardrobeDeleteId = null;
  let lastDeleteTrigger = null;

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
  }

  function persist() {
    try {
      localStorage.setItem("yw_saved", JSON.stringify(state.saved));
      localStorage.setItem("yw_wardrobe", JSON.stringify(state.wardrobe));
    } catch {
      showToast("Device storage is full. Try using smaller images.");
    }
    updateStats();
  }

  function safeText(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function updateSoundControls() {
    $("soundStatus").textContent = soundEnabled ? "On" : "Off";
    $("introSoundButton").textContent = soundEnabled ? "♫ Play intro sound" : "♫ Enable intro sound";
  }

  function updateThemeControls() {
    $("themeStatus").textContent = document.body.classList.contains("dark") ? "Dark" : "Light";
  }

  function playIntroSound() {
    if (!soundEnabled || introSoundPlayed) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      audioContext = audioContext || new AudioContextClass();
      const playChime = () => {
        if (introSoundPlayed || !soundEnabled || !audioContext || audioContext.state !== "running") return;
        introSoundPlayed = true;
        const now = audioContext.currentTime;
        const master = audioContext.createGain();
        master.gain.setValueAtTime(0.0001, now);
        master.gain.exponentialRampToValueAtTime(0.075, now + 0.035);
        master.gain.exponentialRampToValueAtTime(0.0001, now + 0.78);
        master.connect(audioContext.destination);
        [[523.25, 0], [659.25, 0.13], [783.99, 0.26]].forEach(([frequency, delay]) => {
          const oscillator = audioContext.createOscillator();
          const envelope = audioContext.createGain();
          const start = now + delay;
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(frequency, start);
          envelope.gain.setValueAtTime(0.0001, start);
          envelope.gain.exponentialRampToValueAtTime(0.42, start + 0.025);
          envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.23);
          oscillator.connect(envelope);
          envelope.connect(master);
          oscillator.start(start);
          oscillator.stop(start + 0.25);
        });
      };
      if (audioContext.state === "running") playChime();
      else audioContext.resume().then(playChime).catch(() => {});
    } catch {
      // Browsers may require a tap before playing sound.
    }
  }

  function enableIntroSound() {
    soundEnabled = true;
    localStorage.setItem("yw_sound", "on");
    updateSoundControls();
    introSoundPlayed = false;
    playIntroSound();
  }

  function go(page) {
    document.querySelectorAll(".page").forEach(el => el.classList.toggle("active", el.id === "page-" + page));
    $("notificationButton").addEventListener("click", () => go("notifications"));
  $("markNotificationsRead").addEventListener("click", markNotificationsRead);

  function persistNotifications() {
    try { localStorage.setItem("yw_notifications", JSON.stringify(state.notifications)); } catch {}
    updateNotificationDot();
  }

  function updateNotificationDot() {
    const unread = state.notifications.some(item => !item.read);
    $("notificationDot").classList.toggle("hidden", !unread);
    $("notificationButton").setAttribute("aria-label", unread ? "Notifications, unread updates" : "Notifications");
  }

  function addNotification(title, message, type) {
    const key = type || (title + message);
    if (state.notifications.some(item => item.key === key)) return;
    state.notifications.unshift({ id: Date.now(), key, title, message, date: new Date().toLocaleString(), read: false });
    state.notifications = state.notifications.slice(0, 50);
    persistNotifications();
    renderNotifications();
  }

  function renderNotifications() {
    const list = $("notificationsList");
    if (!state.notifications.length) {
      list.innerHTML = '<div class="empty-card"><span>♧</span><strong>You\'re all caught up</strong><p>New updates and announcements will appear here.</p></div>';
      return;
    }
    list.innerHTML = state.notifications.map(item =>
      '<article class="notification-card' + (item.read ? '' : ' unread') + '"><span class="notification-symbol">•</span><div class="notification-copy"><strong>' +
      safeText(item.title) + '</strong><p>' + safeText(item.message) + '</p><small>' + safeText(item.date) + '</small></div>' +
      (item.read ? '' : '<span class="notification-unread-label">NEW</span>') + '</article>'
    ).join("");
  }

  function markNotificationsRead() {
    let changed = false;
    state.notifications.forEach(item => { if (!item.read) { item.read = true; changed = true; } });
    if (changed) persistNotifications();
    renderNotifications();
  }

  document.querySelectorAll(".nav-item[data-page]").forEach(el => {
      const active = el.dataset.page === page;
      el.classList.toggle("active", active);
      if (active) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
    if (page === "wardrobe") renderWardrobe();
    if (page === "saved") renderSaved();
    if (page === "notifications") { renderNotifications(); markNotificationsRead(); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll(".nav-item[data-page]").forEach(button => button.addEventListener("click", () => go(button.dataset.page)));
  document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => go(button.dataset.go)));
  document.querySelectorAll("[data-home-link]").forEach(link => link.addEventListener("click", event => {
    event.preventDefault();
    go("home");
  }));

  function updateStats() {
    $("wardrobeCount").textContent = state.wardrobe.length + " item" + (state.wardrobe.length === 1 ? "" : "s");
    $("profileItemCount").textContent = state.wardrobe.length;
    $("profileLookCount").textContent = state.saved.length;
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
    const img = container.querySelector(".slot-visual img");
    if (piece) {
      img.src = piece.data;
      img.alt = piece.category + " preview";
      container.classList.add("has-image");
    } else {
      img.removeAttribute("src");
      container.classList.remove("has-image");
    }
  }

  function updatePreview() {
    const count = Object.values(state.pieces).filter(Boolean).length;
    $("pieceCount").textContent = count + " / 3 items added";
    setImage("topPreview", state.pieces.top);
    setImage("bottomPreview", state.pieces.bottom);
    setImage("shoesPreview", state.pieces.shoes);
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
        const piece = { name: file.name, data: reader.result, category: categoryNames[key], source: "gallery" };
        state.pieces[key] = piece;
        updatePreview();
        addToWardrobe(piece);
        showToast(categoryNames[key] + " added.");
      };
      reader.readAsDataURL(file);
    });
  });

  // Gallery inputs are activated directly by their associated labels in index.html.
  // This avoids programmatic file-input clicks, which some Android WebViews block.

  $("saveLook").addEventListener("click", () => {
    const pieces = Object.entries(state.pieces)
      .filter(([, piece]) => piece)
      .map(([key, piece]) => ({ key, ...piece }));
    if (!pieces.length) {
      $("studioMessage").textContent = "Add at least one item before saving your outfit.";
      return;
    }
    const name = $("outfitName").value.trim() || ("My outfit " + (state.saved.length + 1));
    state.saved.unshift({ id: Date.now(), name, pieces, createdAt: new Date().toLocaleDateString() });
    persist();
    $("studioMessage").textContent = "Your outfit has been saved on this device.";
    $("outfitName").value = "";
    showToast("Outfit saved!");
  });

  $("clearStudio").addEventListener("click", () => {
    state.pieces = { top: null, bottom: null, shoes: null };
    Object.values(inputIds).forEach(id => $(id).value = "");
    $("studioMessage").textContent = "";
    updatePreview();
    showToast("Outfit cleared.");
  });

  // Mix one random saved wardrobe item into each category that has options.
  $("mixOutfit").addEventListener("click", () => {
    let mixedCount = 0;

    Object.keys(inputIds).forEach(key => {
      const choices = state.wardrobe.filter(item =>
        item.category === categoryNames[key] && item.data
      );
      if (!choices.length) return;

      const currentData = state.pieces[key] && state.pieces[key].data;
      const alternatives = choices.filter(item => item.data !== currentData);
      const pool = alternatives.length ? alternatives : choices;
      const chosen = pool[Math.floor(Math.random() * pool.length)];

      state.pieces[key] = { ...chosen };
      mixedCount++;
    });

    if (!mixedCount) {
      showToast("Add clothing photos first to use Mix saved items.");
      return;
    }

    updatePreview();
    $("studioMessage").textContent = "A fresh mix from your saved items is ready.";
    showToast("Your outfit has been mixed!");
  });

  function renderWardrobe() {
    const grid = $("wardrobeGrid");
    const shirts = state.wardrobe.filter(item => /top|shirt/i.test(String(item.category || "")));
    const pants = state.wardrobe.filter(item => /bottom|pant|trouser/i.test(String(item.category || "")));
    const visibleItems = [...shirts, ...pants];
    $("wardrobeCount").textContent = visibleItems.length + (visibleItems.length === 1 ? " item" : " items");
    if (!visibleItems.length) {
      grid.innerHTML = '<div class="empty-card"><span>▤</span><strong>No shirts or pants yet</strong><p>Shirts and pants you add to an outfit will appear here. Shoes are kept out of this view.</p><button class="secondary-btn" data-go="home">Add your first item</button></div>';
      grid.querySelector("[data-go]").addEventListener("click", () => go("home"));
      return;
    }
    let addedLegacyIds = false;
    visibleItems.forEach((item, index) => {
      if (item.id === undefined || item.id === null) {
        item.id = "legacy-" + index + "-" + String(item.name || "item");
        addedLegacyIds = true;
      }
    });
    if (addedLegacyIds) persist();
    const renderColumn = (title, items, emptyMessage) => {
      const cards = items.length ? items.map(item => {
        return '<article class="wardrobe-card"><button class="wardrobe-image-open" type="button" data-preview-item="' + safeText(item.id) + '" aria-label="Open clothing image full screen"><img src="' + safeText(item.data) + '" alt="Clothing item" /></button><div class="wardrobe-card-info"><button class="remove-item-btn" data-remove-item="' + safeText(item.id) + '" type="button">Remove</button></div></article>';
      }).join("") : '<div class="wardrobe-column-empty">' + emptyMessage + '</div>';
      return '<section class="wardrobe-column"><h2 class="wardrobe-column-title">' + title + '<span>' + items.length + '</span></h2><div class="wardrobe-column-list">' + cards + '</div></section>';
    };
    grid.innerHTML = '<div class="wardrobe-columns">' + renderColumn("SHIRTS", shirts, "No shirts yet") + renderColumn("PANTS", pants, "No pants yet") + '</div>';
    grid.querySelectorAll("[data-remove-item]").forEach(button => button.addEventListener("click", () => {
      const item = state.wardrobe.find(entry => String(entry.id) === button.dataset.removeItem);
      if (!item) return;
      pendingWardrobeDeleteId = button.dataset.removeItem;
      lastDeleteTrigger = button;
      $("confirmDeleteMessage").textContent = "Remove this item from Items used?";
      $("confirmDeleteModal").classList.remove("hidden");
      $("cancelDeleteItem").focus();
    }));
    grid.querySelectorAll("[data-preview-item]").forEach(button => button.addEventListener("click", () => {
      const item = state.wardrobe.find(entry => String(entry.id) === button.dataset.previewItem);
      if (!item) return;
      const viewer = $("wardrobeImagePreview");
      viewer.querySelector("img").src = item.data;
      viewer.querySelector("img").alt = item.category || item.name || "Clothing item";
      viewer.classList.remove("hidden");
      $("closeWardrobeImagePreview").focus();
    }));
  }

  function closeWardrobeImagePreview() {
    const viewer = $("wardrobeImagePreview");
    if (!viewer) return;
    viewer.classList.add("hidden");
    const image = viewer.querySelector("img");
    if (image) image.removeAttribute("src");
  }
  $("closeWardrobeImagePreview").addEventListener("click", closeWardrobeImagePreview);
  $("wardrobeImagePreview").addEventListener("click", event => {
    if (event.target === $("wardrobeImagePreview")) closeWardrobeImagePreview();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !$("wardrobeImagePreview").classList.contains("hidden")) closeWardrobeImagePreview();
  });

  function closeWardrobeDeleteDialog() {
    $("confirmDeleteModal").classList.add("hidden");
    pendingWardrobeDeleteId = null;
    if (lastDeleteTrigger && lastDeleteTrigger.isConnected) lastDeleteTrigger.focus();
    lastDeleteTrigger = null;
  }

  $("cancelDeleteItem").addEventListener("click", closeWardrobeDeleteDialog);
  $("confirmDeleteModal").addEventListener("click", event => {
    if (event.target.matches("[data-close-delete-modal]")) closeWardrobeDeleteDialog();
  });
  $("confirmDeleteItem").addEventListener("click", () => {
    if (pendingWardrobeDeleteId === null) return;
    const item = state.wardrobe.find(entry => String(entry.id) === String(pendingWardrobeDeleteId));
    if (!item) {
      closeWardrobeDeleteDialog();
      return;
    }
    state.wardrobe = state.wardrobe.filter(entry => String(entry.id) !== String(pendingWardrobeDeleteId));
    persist();
    closeWardrobeDeleteDialog();
    renderWardrobe();
    showToast("Item removed from Items used.");
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !$("confirmDeleteModal").classList.contains("hidden")) {
      closeWardrobeDeleteDialog();
    }
  });

  function renderSaved() {
    const grid = $("savedGrid");
    if (!state.saved.length) {
      grid.innerHTML = '<div class="empty-card"><span>♡</span><strong>No saved outfits yet</strong><p>Build an outfit on Home and save it here.</p><button class="secondary-btn" data-go="home">Create an outfit</button></div>';
      grid.querySelector("[data-go]").addEventListener("click", () => go("home"));
      return;
    }
    grid.innerHTML = state.saved.map(look => {
      const imgs = (look.pieces || []).map(piece =>
        '<img src="' + safeText(piece.data) + '" alt="' + safeText(piece.category) + '" />'
      ).join("");
      return '<article class="look-card"><div class="look-images">' + imgs +
        '</div><div class="look-card-info"><div><strong>' + safeText(look.name) +
        '</strong><small>' + (look.pieces || []).length + ' item' + ((look.pieces || []).length === 1 ? "" : "s") +
        ' · ' + safeText(look.createdAt || "") + '</small></div><div class="look-card-actions"><button class="use-look" data-load="' +
        safeText(look.id) + '" type="button">Use outfit</button><button class="delete-look" data-delete="' +
        safeText(look.id) + '" aria-label="Delete ' + safeText(look.name) + '" type="button">×</button></div></div></article>';
    }).join("");

    grid.querySelectorAll("[data-load]").forEach(button => button.addEventListener("click", () => {
      const look = state.saved.find(item => String(item.id) === button.dataset.load);
      if (!look) return;
      state.pieces = { top: null, bottom: null, shoes: null };
      (look.pieces || []).forEach(piece => {
        if (piece.key && Object.prototype.hasOwnProperty.call(state.pieces, piece.key)) state.pieces[piece.key] = piece;
      });
      updatePreview();
      go("home");
      showToast("Saved outfit loaded.");
    }));

    grid.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", () => {
      state.saved = state.saved.filter(look => String(look.id) !== button.dataset.delete);
      persist();
      renderSaved();
      showToast("Saved outfit deleted.");
    }));
  }

  $("soundToggle").addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem("yw_sound", soundEnabled ? "on" : "off");
    updateSoundControls();
    if (soundEnabled) {
      introSoundPlayed = false;
      playIntroSound();
      showToast("Sound effects enabled.");
    } else showToast("Sound effects muted.");
  });
  $("introSoundButton").addEventListener("click", enableIntroSound);
  $("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("yw_theme", document.body.classList.contains("dark") ? "dark" : "light");
    updateThemeControls();
  });
  if (localStorage.getItem("yw_theme") === "dark") document.body.classList.add("dark");
  updateSoundControls();
  updateThemeControls();
  updateStats();
  updatePreview();
  updateNotificationDot();

  function showUpdateBanner() {
    $("updateBanner").classList.remove("hidden");
    addNotification("YourWardrobe update available", "A newer version is ready. Tap Update now in the update banner to install it.", "service-worker-update");
  }

  let watchedInstallingWorker = null;

  function watchInstallingWorker(worker, registration) {
    if (!worker || watchedInstallingWorker === worker) return;
    watchedInstallingWorker = worker;
    worker.addEventListener("statechange", () => {
      if (
        worker.state === "installed" &&
        navigator.serviceWorker.controller &&
        registration.waiting === worker
      ) {
        showUpdateBanner();
      }
    });
  }

  function watchServiceWorker(registration) {
    if (!registration || watchedRegistration === registration) return;
    watchedRegistration = registration;
    if (registration.waiting && navigator.serviceWorker.controller) showUpdateBanner();
    watchInstallingWorker(registration.installing, registration);
    registration.addEventListener("updatefound", () => {
      watchInstallingWorker(registration.installing, registration);
    });
  }

  $("dismissUpdate").addEventListener("click", () => $("updateBanner").classList.add("hidden"));
  $("applyUpdate").addEventListener("click", () => {
    const waitingWorker = serviceWorkerRegistration && serviceWorkerRegistration.waiting;
    if (!waitingWorker) {
      $("updateBanner").classList.add("hidden");
      showToast("YourWardrobe is already up to date.");
      return;
    }
    applyingUpdate = true;
    $("applyUpdate").disabled = true;
    $("applyUpdate").textContent = "Updating...";
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (applyingUpdate) window.location.reload();
    });
    window.addEventListener("load", async () => {
      try {
        serviceWorkerRegistration = await navigator.serviceWorker.register("./sw.js", { scope: "./", updateViaCache: "none" });
        watchServiceWorker(serviceWorkerRegistration);
        await serviceWorkerRegistration.update();
      } catch {
        // The app remains usable if service worker registration is unavailable.
      }
    });
  }

  const intro = $("appIntro");
  if (intro) {
    playIntroSound();
    window.setTimeout(() => {
      intro.classList.add("is-leaving");
      window.setTimeout(() => intro.remove(), 600);
    }, 2100);
  }
})();