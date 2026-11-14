(() => {
  const $ = (id) => document.getElementById(id);
  const categoryNames = { top: "Top / Shirt", bottom: "Bottom / Pants", shoes: "Footwear" };
  const inputIds = { top: "topInput", bottom: "bottomInput", shoes: "shoesInput" };
  const state = {
    pieces: { top: null, bottom: null, shoes: null },
    saved: load("yw_saved", []),
    wardrobe: load("yw_wardrobe", [])
  };

  let soundEnabled = localStorage.getItem("yw_sound") !== "off";
  let audioContext = null;
  let introSoundPlayed = false;
  let serviceWorkerRegistration = null;
  let watchedRegistration = null;
  let applyingUpdate = false;

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
    document.querySelectorAll(".nav-item[data-page]").forEach(el => {
      const active = el.dataset.page === page;
      el.classList.toggle("active", active);
      if (active) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
    if (page === "wardrobe") renderWardrobe();
    if (page === "saved") renderSaved();
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

  // The large plus area in each preview opens that item's gallery picker.
  document.querySelectorAll(".slot-visual[data-gallery]").forEach(control => {
    const openGallery = () => {
      const key = control.dataset.gallery;
      const input = $(inputIds[key]);
      if (!input) {
        showToast("The gallery picker is unavailable for this item.");
        return;
      }
      input.value = "";
      input.click();
    };

    control.addEventListener("click", event => {
      event.preventDefault();
      openGallery();
    });

    control.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openGallery();
      }
    });
  });

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

  function renderWardrobe() {
    const grid = $("wardrobeGrid");
    if (!state.wardrobe.length) {
      grid.innerHTML = '<div class="empty-card"><span>▤</span><strong>No items yet</strong><p>Items you add to an outfit will appear here.</p><button class="secondary-btn" data-go="home">Add your first item</button></div>';
      grid.querySelector("[data-go]").addEventListener("click", () => go("home"));
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

  function showUpdateBanner() {
    $("updateBanner").classList.remove("hidden");
  }

  function watchServiceWorker(registration) {
    if (!registration || watchedRegistration === registration) return;
    watchedRegistration = registration;
    if (registration.waiting && navigator.serviceWorker.controller) showUpdateBanner();
    registration.addEventListener("updatefound", () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;
      installingWorker.addEventListener("statechange", () => {
        if (installingWorker.state === "installed" && navigator.serviceWorker.controller) showUpdateBanner();
      });
    });
  }

  async function checkForAppUpdates() {
    const button = $("checkUpdatesButton");
    button.disabled = true;
    const label = button.querySelector("strong");
    const originalLabel = label ? label.textContent : "Check for updates";
    if (label) label.textContent = "Checking for updates...";
    try {
      if (!("serviceWorker" in navigator)) {
        showToast("App updates are not supported in this browser.");
        return;
      }
      let registration = serviceWorkerRegistration || await navigator.serviceWorker.getRegistration();
      if (!registration) registration = await navigator.serviceWorker.register("./sw.js");
      serviceWorkerRegistration = registration;
      watchServiceWorker(registration);
      await registration.update();
      if (registration.waiting) {
        showUpdateBanner();
        showToast("A new version is ready to install.");
      } else if (registration.installing) {
        showToast("Checking for an update. A prompt will appear if one is found.");
      } else showToast("You're using the latest version.");
    } catch {
      showToast(navigator.onLine ? "Could not check for updates. Please try again." : "Connect to the internet to check for updates.");
    } finally {
      button.disabled = false;
      if (label) label.textContent = originalLabel;
    }
  }

  $("checkUpdatesButton").addEventListener("click", checkForAppUpdates);
  $("dismissUpdate").addEventListener("click", () => $("updateBanner").classList.add("hidden"));
  $("applyUpdate").addEventListener("click", () => {
    applyingUpdate = true;
    $("applyUpdate").disabled = true;
    $("applyUpdate").textContent = "Updating...";
    const waitingWorker = serviceWorkerRegistration && serviceWorkerRegistration.waiting;
    if (waitingWorker) waitingWorker.postMessage({ type: "SKIP_WAITING" });
    else window.location.reload();
  });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (applyingUpdate) window.location.reload();
    });
    window.addEventListener("load", async () => {
      try {
        serviceWorkerRegistration = await navigator.serviceWorker.register("./sw.js");
        watchServiceWorker(serviceWorkerRegistration);
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