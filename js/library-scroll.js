// Wheel inertia for the library's left game list only. Actual scrollTop is
// animated, so Steam's virtual list, selection and scrollbar stay in sync.
// Native drag/keyboard/zoom/horizontal input is left to Steam. No idle loop.
(() => {
  "use strict";
  if (window.__aikaLibraryScroll) return;
  const SELECTOR = ".LeftListSizableContainer .ReactVirtualized__List";
  const MODES = { Standard: 0, Soft: 65, Cinematic: 150 };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let pane = null, frame = 0, target = 0, position = 0, written = 0, lastTime = 0;
  let duration = 0, direction = 0, previousBehavior = "", previewMode = null;
  let preview = null, settingMode = null, settingField = null;
  let trailLayer = null, trailRect = null, trailsEnabled = false, trailStrength = -1;
  let pointerX = 0, pointerY = 0, pointerKnown = false, focusKey = "";
  let trailMask = null, trailSteps = [], trailKey = "", previousFilter = null;
  let trailEnvelope = 0;
  const FILTER_ID = "aika-library-motion-trails";
  const NS = "http://www.w3.org/2000/svg";
  const svgNode = (tag, attrs = {}) => {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  };
  const hideTrails = () => {
    if (previousFilter !== null && pane) {
      if (previousFilter.value) pane.style.setProperty("filter", previousFilter.value, previousFilter.priority);
      else pane.style.removeProperty("filter");
      previousFilter = null;
    }
    if (trailLayer && !trailLayer.hidden) { trailLayer.hidden = true; trailLayer.style.opacity = "0"; }
    trailStrength = -1;
    trailEnvelope = 0;
  };
  const updateFocusMask = () => {
    if (!trailLayer || !trailRect || !trailMask) return;
    const x = Math.round(pointerKnown ? pointerX - trailRect.left : trailRect.width / 2);
    const y = Math.round(pointerKnown ? pointerY - trailRect.top : trailRect.height / 2);
    const width = Math.ceil(trailRect.width), height = Math.ceil(trailRect.height);
    const key = [x, y, width, height].join(",");
    if (key === focusKey) return;
    focusKey = key;
    trailLayer.style.setProperty("--aika-scroll-focus-x", x + "px");
    trailLayer.style.setProperty("--aika-scroll-focus-y", y + "px");
    // Alpha is zero around the cursor and grows towards the periphery.
    // Only regenerate this small mask when the pointer or viewport changes.
    const image = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '"><defs><radialGradient id="focus" gradientUnits="userSpaceOnUse" cx="' + x + '" cy="' + y + '" r="210" gradientTransform="translate(0 ' + (y * (1 - 150 / 210)) + ') scale(1 ' + (150 / 210) + ')"><stop offset="0.32" stop-color="white" stop-opacity="0"/><stop offset="1" stop-color="white"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#focus)"/></svg>';
    trailMask.setAttribute("href", "data:image/svg+xml," + encodeURIComponent(image));
    trailMask.setAttribute("width", width);
    trailMask.setAttribute("height", height);
  };
  const pointer = event => {
    pointerX = event.clientX; pointerY = event.clientY; pointerKnown = true;
  };
  const prepareTrails = event => {
    if (!trailsEnabled) return;
    trailRect = pane.getBoundingClientRect();
    if (!trailLayer) {
      trailLayer = document.createElement("div");
      trailLayer.className = "aika-scroll-trails";
      trailLayer.setAttribute("aria-hidden", "true");
      trailLayer.hidden = true;
      const svg = svgNode("svg", { width: 0, height: 0, "aria-hidden": "true" });
      const defs = svgNode("defs");
      const filter = svgNode("filter", { id: FILTER_ID, x: 0, y: 0, width: "100%", height: "100%", "color-interpolation-filters": "sRGB" });
      // Three short shutter samples behind the current image, vertically only.
      // SourceGraphic is already the clipped viewport, never the whole list.
      filter.append(svgNode("feGaussianBlur", { in: "SourceGraphic", stdDeviation: "0.12 0.65", result: "ink" }));
      trailSteps = [0.38, 0.24, 0.14].map((weight, i) => {
        const offset = svgNode("feOffset", { in: "ink", dx: 0, dy: 0, result: "offset" + i });
        const alpha = svgNode("feColorMatrix", { in: "offset" + i, type: "matrix", values: "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0 0", result: "trail" + i });
        filter.append(offset, alpha);
        return { offset, alpha, weight };
      });
      const merge = svgNode("feMerge", { result: "trails" });
      for (let i = 2; i >= 0; i--) merge.append(svgNode("feMergeNode", { in: "trail" + i }));
      filter.append(merge);
      trailMask = svgNode("feImage", { x: 0, y: 0, preserveAspectRatio: "none", result: "focus" });
      filter.append(trailMask, svgNode("feComposite", { in: "trails", in2: "focus", operator: "in", result: "peripheralTrails" }));
      const final = svgNode("feMerge");
      final.append(svgNode("feMergeNode", { in: "peripheralTrails" }), svgNode("feMergeNode", { in: "SourceGraphic" }));
      filter.append(final); defs.append(filter); svg.append(defs); trailLayer.append(svg);
      document.body.append(trailLayer);
    }
    Object.assign(trailLayer.style, {
      left: trailRect.left + "px", top: trailRect.top + "px",
      width: trailRect.width + "px", height: trailRect.height + "px",
    });
    if (event.clientX >= trailRect.left && event.clientX <= trailRect.right
        && event.clientY >= trailRect.top && event.clientY <= trailRect.bottom) pointer(event);
    updateFocusMask();
  };
  const updateTrails = (speed, dt, remaining) => {
    if (!trailsEnabled || !trailLayer) { hideTrails(); return; }
    // No speed cutoff: the original 650 px/s gate hid the effect for most of
    // the glide. Build up gently, retain it through deceleration, and fade
    // over the last few pixels instead of switching off halfway to the target.
    const amount = Math.max(0, Math.min(1, speed / 2000));
    const desired = (0.38 + 0.62 * Math.sqrt(amount)) * Math.min(1, remaining / 12);
    const response = desired > trailEnvelope ? 40 : 120;
    trailEnvelope += (desired - trailEnvelope) * (1 - Math.exp(-dt / response));
    const strength = Math.round(trailEnvelope * 1000) / 1000;
    if (!strength) return;
    updateFocusMask(); trailLayer.hidden = false;
    if (previousFilter === null) {
      previousFilter = { value: pane.style.getPropertyValue("filter"), priority: pane.style.getPropertyPriority("filter") };
      pane.style.filter = 'url("#' + FILTER_ID + '")';
    }
    // When scrolling down, content moves up: older samples trail below it.
    const length = Math.round((3 + Math.sqrt(amount) * 15) * 2) / 2 * direction;
    const key = strength + ":" + length;
    if (key !== trailKey) {
      trailKey = key;
      trailSteps.forEach(({offset, alpha, weight}, i) => {
        offset.setAttribute("dy", (length * (i + 1) / 3).toFixed(2));
        alpha.setAttribute("values", "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 " + (weight * strength).toFixed(3) + " 0");
      });
    }
    if (strength !== trailStrength) { trailLayer.style.opacity = String(strength); trailStrength = strength; }
  };

  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    direction = 0;
    hideTrails();
    if (pane && previousBehavior !== null) pane.style.scrollBehavior = previousBehavior;
    previousBehavior = null;
  };
  const mode = () => {
    if (reduced.matches) return "Standard";
    const css = getComputedStyle(document.documentElement);
    if (css.getPropertyValue("--aika-motion").trim() === "0") return "Standard";
    const value = previewMode || settingMode || css.getPropertyValue("--aika-library-scroll").trim();
    return Object.hasOwn(MODES, value) ? value : "Standard";
  };
  const step = (now) => {
    if (!pane?.isConnected || document.hidden) { stop(); return; }
    // Scrollbar dragging, selection navigation, filtering and Steam's own
    // scrollIntoView can change the position while inertia is running.
    if (Math.abs(pane.scrollTop - written) > 1) { stop(); return; }
    target = Math.max(0, Math.min(pane.scrollHeight - pane.clientHeight, target));
    const dt = Math.max(0, now - lastTime);
    lastTime = now;
    // Keep a fractional accumulator: CEF rounds scrollTop to device pixels.
    // Feeding that rounded value back into the easing would stall its tail.
    const distance = target - position;
    const settled = Math.abs(distance) < 0.5;
    position = settled ? target : position + distance * (1 - Math.exp(-dt / duration));
    updateTrails(Math.abs(distance) * 1000 / duration, dt, Math.abs(distance));
    pane.scrollTop = position;
    written = pane.scrollTop;
    if (settled) { stop(); return; }
    frame = requestAnimationFrame(step);
  };
  const wheel = (event) => {
    if (event.defaultPrevented || !event.cancelable || event.ctrlKey || event.metaKey || event.shiftKey
        || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const selected = mode();
    if (!MODES[selected]) { stop(); return; }
    // Nested controls inside a row keep their own wheel behavior.
    if (event.target instanceof Element && event.target.closest("input,textarea,select,[contenteditable=true]")) return;
    const height = pane.clientHeight, max = Math.max(0, pane.scrollHeight - height);
    if (!height || !max) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? height * 0.9 : 1);
    const sign = Math.sign(delta), current = pane.scrollTop;
    if ((current <= 0 && delta < 0) || (current >= max - 0.5 && delta > 0)) { stop(); return; }
    event.preventDefault();
    // Reverse immediately rather than paying off queued travel in the old
    // direction. Limit the tail to one viewport; distance is not amplified.
    if (!frame || sign !== direction || Math.abs(current - written) > 1) target = position = current;
    direction = sign;
    target = Math.max(0, Math.min(max, Math.max(current - height, Math.min(current + height, target + delta))));
    duration = MODES[selected];
    trailsEnabled = selected === "Cinematic";
    if (trailsEnabled) prepareTrails(event); else hideTrails();
    if (!frame) {
      previousBehavior = pane.style.scrollBehavior;
      pane.style.scrollBehavior = "auto";
      written = current;
      lastTime = performance.now();
      frame = requestAnimationFrame(step);
    }
  };
  const externalScroll = () => {
    if (frame && Math.abs(pane.scrollTop - written) > 1) stop();
  };
  const attach = () => {
    if (pane?.isConnected) return;
    stop();
    if (pane) {
      pane.removeEventListener("wheel", wheel);
      pane.removeEventListener("pointerdown", stop, true);
      pane.removeEventListener("scroll", externalScroll);
      pane.removeEventListener("pointermove", pointer);
    }
    pane = document.querySelector(SELECTOR);
    if (!pane) return;
    pane.addEventListener("wheel", wheel, { passive: false });
    pane.addEventListener("pointerdown", stop, true);
    pane.addEventListener("scroll", externalScroll, { passive: true });
    pane.addEventListener("pointermove", pointer, { passive: true });
  };
  // A cheap connectivity check on mutations; list scrolling does not scan DOM.
  const observer = new MutationObserver(attach);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  attach();
  const keydown = event => {
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", "Tab", "Escape"].includes(event.key)) stop();
  };
  const visibility = () => { if (document.hidden) stop(); };
  document.addEventListener("keydown", keydown, true);
  document.addEventListener("visibilitychange", visibility);
  addEventListener("resize", stop);
  reduced.addEventListener("change", stop);

  // Millennium saves a newly added Condition immediately, but may not attach
  // its option stylesheet until the next client launch. Read this one editor
  // field while it is being used so all three modes also switch live. Keep
  // CSS as the startup source; never write theme preferences from this script.
  const settingLabels = {
    Standard: "Standard", Soft: "Soft", Cinematic: "Cinematic",
    "Стандартная": "Standard", "Мягкая": "Soft", "Кинематографичная": "Cinematic",
  };
  const syncSetting = () => {
    if (!settingField?.isConnected) return;
    const label = settingField.querySelector(".DialogDropDown_CurrentDisplay")?.textContent.trim();
    const next = settingLabels[label];
    if (next && next !== settingMode) { stop(); settingMode = next; }
  };
  const settingObserver = new MutationObserver(syncSetting);
  const watchSetting = field => {
    if (!field || field === settingField) return;
    settingObserver.disconnect(); settingField = field;
    settingObserver.observe(field, { childList: true, characterData: true, subtree: true });
    syncSetting();
  };
  const settingInput = event => {
    const field = event.target instanceof Element ? event.target.closest("[data-condition]") : null;
    if (field?.dataset.condition === "Library scrolling") watchSetting(field);
  };
  document.addEventListener("click", settingInput, true);
  document.addEventListener("focusin", settingInput, true);
  watchSetting([...document.querySelectorAll("[data-condition]")].find(e => e.dataset.condition === "Library scrolling"));

  const closePreview = () => {
    stop();
    previewMode = null;
    preview?.parentElement?.classList.remove("aika-scroll-preview-open");
    preview?.remove(); preview = null;
  };
  // Explicitly opened for live comparison, never shown on normal startup.
  const showPreview = () => {
    closePreview();
    const host = document.querySelector(".LeftListSizableContainer");
    if (!host) return false;
    preview = document.createElement("div");
    preview.className = "aika-scroll-preview";
    preview.setAttribute("aria-label", "Прокрутка списка игр");
    const title = document.createElement("div"); title.className = "aika-scroll-preview-title";
    title.textContent = "Прокрутка списка игр";
    const close = document.createElement("button");close.textContent = "×";
    close.title = "Закрыть предпросмотр и вернуть режим из настроек";
    close.setAttribute("aria-label", close.title); close.onclick = closePreview;
    title.append(close); preview.append(title);
    const group = document.createElement("div"); group.className = "aika-scroll-preview-modes";
    const labels = {Standard:"Стандартная",Soft:"Мягкая",Cinematic:"Кино"};
    const initial = mode();
    for (const key of Object.keys(MODES)) {
      const button = document.createElement("button");button.textContent = labels[key];
      button.dataset.mode = key; button.title = key === "Cinematic" ? "Кинематографичная" : labels[key];
      button.setAttribute("aria-pressed", String(key === initial));
      button.onclick = () => {
        stop(); previewMode = key;
        for (const b of group.children) b.setAttribute("aria-pressed", String(b === button));
      };
      group.append(button);
    }
    preview.append(group); host.classList.add("aika-scroll-preview-open"); host.append(preview);
    return true;
  };
  const destroy = () => {
    closePreview(); observer.disconnect(); settingObserver.disconnect();
    if (pane) {
      pane.removeEventListener("wheel", wheel);
      pane.removeEventListener("pointerdown", stop, true);
      pane.removeEventListener("scroll", externalScroll);
      pane.removeEventListener("pointermove", pointer);
    }
    document.removeEventListener("keydown", keydown, true);
    document.removeEventListener("visibilitychange", visibility);
    document.removeEventListener("click", settingInput, true);
    document.removeEventListener("focusin", settingInput, true);
    removeEventListener("resize", stop);
    reduced.removeEventListener("change", stop);
    trailLayer?.remove();
    delete window.__aikaLibraryScroll;
  };
  window.__aikaLibraryScroll = { showPreview, closePreview, destroy, get mode() { return mode(); } };
})();
