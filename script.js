/* ============================================================
   NORTHWIND — motion and interaction
   No dependencies. Transform/opacity driven.
   ============================================================ */

(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  const desktopQuery = window.matchMedia("(min-width: 1024px)");
  const reduceMotion = reduceMotionQuery.matches;
  const finePointer = finePointerQuery.matches;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const pad = (value) => String(value).padStart(2, "0");

  /* ---------- Preloader ---------- */

  function initPreloader() {
    const preloader = document.getElementById("preloader");
    const percent = document.getElementById("preloaderPercent");
    const bar = document.getElementById("preloaderBar");

    if (!preloader) {
      body.classList.remove("is-loading");
      body.classList.add("is-ready");
      return;
    }

    if (reduceMotion) {
      preloader.classList.add("is-done");
      body.classList.remove("is-loading");
      body.classList.add("is-ready");
      window.setTimeout(() => preloader.remove(), 50);
      return;
    }

    const startedAt = performance.now();
    const duration = 680;
    let finished = false;

    function setProgress(value) {
      if (percent) percent.textContent = pad(Math.round(value * 100));
      if (bar) bar.style.transform = `scaleX(${value.toFixed(4)})`;
    }

    function finish() {
      if (finished) return;
      finished = true;
      setProgress(1);
      preloader.classList.add("is-done");
      body.classList.remove("is-loading");
      body.classList.add("is-ready");
      window.setTimeout(() => preloader.remove(), 760);
    }

    function tick(now) {
      const progress = clamp((now - startedAt) / duration, 0, 1);
      setProgress(1 - Math.pow(1 - progress, 3));

      if (progress < 1) {
        window.requestAnimationFrame(tick);
      } else {
        window.setTimeout(finish, 80);
      }
    }

    window.requestAnimationFrame(tick);
    window.setTimeout(finish, 1200);

    const skip = () => finish();
    window.addEventListener("pointerdown", skip, { once: true, passive: true });
    window.addEventListener("keydown", skip, { once: true });
  }

  /* ---------- Hero title split ---------- */

  function initHeroTitle() {
    const words = Array.from(document.querySelectorAll("[data-split]"));
    let index = 0;

    words.forEach((word) => {
      const characters = Array.from(word.textContent.trim());
      const fragment = document.createDocumentFragment();

      characters.forEach((character) => {
        const span = document.createElement("span");
        span.className = "hero__char";
        span.textContent = character;
        span.style.setProperty("--i", String(index));
        index += 1;
        fragment.appendChild(span);
      });

      word.replaceChildren(fragment);
    });
  }

  /* ---------- Header, progress and horizontal projects ---------- */

  function initScrollSystem() {
    const header = document.getElementById("siteHeader");
    const progress = document.getElementById("scrollProgress");
    const projects = document.getElementById("projects");
    const projectsTrack = document.getElementById("projectsTrack");
    const projectsViewport = document.getElementById("projectsViewport");
    const projectsProgress = document.getElementById("projectProgress");
    const projectsCurrent = document.getElementById("projectCurrent");
    const contact = document.getElementById("contact");

    if (!header || !progress || !projects || !projectsTrack || !projectsViewport) {
      return;
    }

    const projectCards = Array.from(projectsTrack.querySelectorAll(".project-card"));
    const projectSectionHeight = () => window.innerHeight;

    let pinned = false;
    let metrics = {
      start: 0,
      scrollLength: 0,
      distance: 0
    };
    let scrollScheduled = false;
    let resizeTimer = 0;

    function updateHeaderAndProgress() {
      const y = window.scrollY;
      header.classList.toggle("is-scrolled", y > 24);

      if (contact) {
        const rect = contact.getBoundingClientRect();
        const headerHeight = header.offsetHeight;
        header.classList.toggle("is-inverted", rect.top < headerHeight && rect.bottom > 0);
      }

      const maxScroll = root.scrollHeight - window.innerHeight;
      const ratio = maxScroll > 0 ? clamp(y / maxScroll, 0, 1) : 0;
      progress.style.transform = `scaleX(${ratio.toFixed(4)})`;
    }

    function updateProjects() {
      if (!pinned) return;

      const y = window.scrollY;
      const relative = y - metrics.start;
      const ratio = metrics.scrollLength > 0
        ? clamp(relative / metrics.scrollLength, 0, 1)
        : 0;

      projectsTrack.style.transform = `translate3d(${(-metrics.distance * ratio).toFixed(2)}px, 0, 0)`;

      if (projectsProgress) {
        projectsProgress.style.transform = `scaleX(${ratio.toFixed(4)})`;
      }

      if (projectsCurrent) {
        const current = clamp(Math.floor(ratio * projectCards.length) + 1, 1, projectCards.length);
        projectsCurrent.textContent = pad(current);
      }
    }

    function onScrollFrame() {
      scrollScheduled = false;
      updateHeaderAndProgress();
      updateProjects();
    }

    function scheduleScroll() {
      if (scrollScheduled) return;
      scrollScheduled = true;
      window.requestAnimationFrame(onScrollFrame);
    }

    function resetHorizontalProjects() {
      pinned = false;
      projects.classList.remove("is-horizontal");
      projects.style.height = "";
      projectsTrack.style.transform = "";
      projectsTrack.style.removeProperty("--card-width");
      if (projectsProgress) projectsProgress.style.transform = "scaleX(0)";
      if (projectsCurrent) projectsCurrent.textContent = "01";
    }

    function setupHorizontalProjects() {
      resetHorizontalProjects();

      if (reduceMotion || !desktopQuery.matches) {
        scheduleScroll();
        return;
      }

      projects.classList.add("is-horizontal");

      // Fit each card inside the pinned viewport: visual is 3/2, info sits below it.
      const firstInfo = projectCards[0]?.querySelector(".project-card__info");
      const infoHeight = firstInfo ? firstInfo.offsetHeight : 58;
      const viewportHeight = projectsViewport.clientHeight;
      const cardWidth = clamp(
        Math.floor((viewportHeight - infoHeight - 4) * 1.5),
        320,
        680
      );
      projectsTrack.style.setProperty("--card-width", `${cardWidth}px`);

      const distance = Math.max(0, projectsTrack.scrollWidth - projectsViewport.clientWidth);

      if (distance < 20) {
        resetHorizontalProjects();
        scheduleScroll();
        return;
      }

      projects.style.height = `${projectSectionHeight() + distance}px`;
      projectCards.forEach((card) => card.classList.add("is-visible"));

      metrics = {
        start: projects.getBoundingClientRect().top + window.scrollY,
        scrollLength: projects.offsetHeight - projectSectionHeight(),
        distance
      };

      pinned = true;
      updateProjects();
      scheduleScroll();
    }

    function scheduleProjectsSetup() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        setupHorizontalProjects();
        scheduleScroll();
      }, 120);
    }

    window.addEventListener("scroll", scheduleScroll, { passive: true });
    window.addEventListener("resize", scheduleProjectsSetup, { passive: true });
    window.addEventListener("load", setupHorizontalProjects);

    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(() => {
        if (pinned) scheduleProjectsSetup();
      });
      observer.observe(projectsTrack);
    }

    setupHorizontalProjects();
    scheduleScroll();
  }

  /* ---------- Scroll reveals ---------- */

  function initReveals() {
    const targets = Array.from(document.querySelectorAll("[data-reveal]"));

    if (!targets.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.1,
      rootMargin: "0px 0px -7% 0px"
    });

    targets.forEach((target) => observer.observe(target));
  }

  /* ---------- Number counters ---------- */

  function initCounters() {
    const counters = Array.from(document.querySelectorAll("[data-count]"));

    if (!counters.length || reduceMotion || !("IntersectionObserver" in window)) {
      return;
    }

    function animate(counter) {
      const target = Number(counter.dataset.count) || 0;
      const duration = 1400;
      const startedAt = performance.now();

      function frame(now) {
        const progress = clamp((now - startedAt) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - progress, 5);
        counter.textContent = String(Math.round(target * eased));

        if (progress < 1) {
          window.requestAnimationFrame(frame);
        } else {
          counter.textContent = String(target);
        }
      }

      window.requestAnimationFrame(frame);
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        animate(entry.target);
      });
    }, { threshold: 0.55 });

    counters.forEach((counter) => observer.observe(counter));
  }

  /* ---------- Magnetic elements ---------- */

  function initMagnets() {
    if (reduceMotion || !finePointer) return;

    const elements = Array.from(document.querySelectorAll("[data-magnetic]"));

    elements.forEach((element) => {
      element.style.willChange = "transform";

      function move(event) {
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;

        element.style.setProperty("--magnet-x", `${(x * 0.22).toFixed(2)}px`);
        element.style.setProperty("--magnet-y", `${(y * 0.28).toFixed(2)}px`);
        element.classList.add("is-magnet-moving");
      }

      function leave() {
        element.style.setProperty("--magnet-x", "0px");
        element.style.setProperty("--magnet-y", "0px");
        element.classList.remove("is-magnet-moving");
      }

      element.addEventListener("pointermove", move, { passive: true });
      element.addEventListener("pointerleave", leave);
    });
  }

  /* ---------- Custom cursor ---------- */

  function initCursor() {
    if (reduceMotion || !finePointer) return;

    const cursor = document.getElementById("cursor");
    if (!cursor) return;

    body.classList.add("has-cursor");

    let targetX = -100;
    let targetY = -100;
    let currentX = -100;
    let currentY = -100;
    let frame = 0;
    let visible = false;

    function render() {
      currentX += (targetX - currentX) * 0.2;
      currentY += (targetY - currentY) * 0.2;
      cursor.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;

      if (Math.abs(targetX - currentX) > 0.2 || Math.abs(targetY - currentY) > 0.2) {
        frame = window.requestAnimationFrame(render);
      } else {
        currentX = targetX;
        currentY = targetY;
        cursor.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
        frame = 0;
      }
    }

    function requestRender() {
      if (!frame) frame = window.requestAnimationFrame(render);
    }

    window.addEventListener("pointermove", (event) => {
      targetX = event.clientX;
      targetY = event.clientY;

      if (!visible) {
        visible = true;
        currentX = targetX;
        currentY = targetY;
        cursor.classList.add("is-visible");
      }

      requestRender();
    }, { passive: true });

    document.addEventListener("pointerover", (event) => {
      cursor.classList.toggle("is-hover", Boolean(event.target.closest("a, button")));
    });

    document.addEventListener("pointerout", (event) => {
      if (!event.relatedTarget) cursor.classList.remove("is-visible");
    });

    window.addEventListener("pointerdown", () => cursor.classList.add("is-down"), { passive: true });
    window.addEventListener("pointerup", () => cursor.classList.remove("is-down"), { passive: true });
  }

  /* ---------- Hero pointer parallax ---------- */

  function initHeroParallax() {
    if (reduceMotion || !finePointer) return;

    const hero = document.querySelector(".hero");
    const art = document.getElementById("heroArt");
    if (!hero || !art) return;

    const layers = Array.from(art.querySelectorAll("[data-depth]"));
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    function update() {
      frame = 0;
      layers.forEach((layer) => {
        const depth = Number(layer.dataset.depth) || 0;
        const x = clamp(pointerX, -1, 1) * depth;
        const y = clamp(pointerY, -1, 1) * depth;
        layer.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      });
    }

    function move(event) {
      const rect = hero.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    function leave() {
      pointerX = 0;
      pointerY = 0;
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    hero.addEventListener("pointermove", move, { passive: true });
    hero.addEventListener("pointerleave", leave);
  }

  /* ---------- Mobile menu ---------- */

  function initMenu() {
    const toggle = document.getElementById("menuToggle");
    const menu = document.getElementById("mobileMenu");
    const closeButton = document.getElementById("menuClose");

    if (!toggle || !menu || !closeButton) return;

    let closingTimer = 0;

    toggle.setAttribute("aria-haspopup", "dialog");

    function openMenu() {
      window.clearTimeout(closingTimer);
      menu.classList.remove("is-closing");
      menu.showModal();
      body.classList.add("menu-open");
      toggle.setAttribute("aria-expanded", "true");
    }

    function closeMenu(onClosed) {
      if (!menu.open) {
        if (typeof onClosed === "function") onClosed();
        return;
      }

      menu.classList.add("is-closing");
      toggle.setAttribute("aria-expanded", "false");
      body.classList.remove("menu-open");

      const finish = () => {
        if (menu.open) menu.close();
        menu.classList.remove("is-closing");
        if (typeof onClosed === "function") onClosed();
      };

      if (reduceMotion) {
        finish();
      } else {
        closingTimer = window.setTimeout(finish, 300);
      }
    }

    toggle.addEventListener("click", openMenu);
    closeButton.addEventListener("click", () => closeMenu());

    menu.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeMenu();
    });

    menu.addEventListener("click", (event) => {
      if (event.target === menu) closeMenu();
    });

    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", (event) => {
        const target = link.getAttribute("href");
        if (!target || !target.startsWith("#")) return;

        event.preventDefault();
        closeMenu(() => {
          const section = document.querySelector(target);
          if (!section) return;
          section.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
          window.history.pushState(null, "", target);
        });
      });
    });

    window.matchMedia("(min-width: 1101px)").addEventListener("change", (event) => {
      if (event.matches) closeMenu();
    });
  }

  /* ---------- Active navigation ---------- */

  function initActiveNav() {
    if (!("IntersectionObserver" in window)) return;

    const links = Array.from(document.querySelectorAll(".site-nav a"));
    if (!links.length) return;

    const sections = links
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        links.forEach((link) => {
          link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
        });
      });
    }, {
      rootMargin: "-42% 0px -50% 0px",
      threshold: 0
    });

    sections.forEach((section) => observer.observe(section));
  }

  /* ---------- Footer year ---------- */

  function initYear() {
    const year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  /* ---------- Init ---------- */

  function init() {
    initPreloader();
    initHeroTitle();
    initScrollSystem();
    initReveals();
    initCounters();
    initMagnets();
    initCursor();
    initHeroParallax();
    initMenu();
    initActiveNav();
    initYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
