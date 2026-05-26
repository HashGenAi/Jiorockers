
(() => {

  /* =========================
     DOMAIN CACHE
  ========================= */
  const domainMap = {};

  document.querySelectorAll('meta[name="video-domain"]').forEach(meta => {
    const id = meta.dataset.id;
    domainMap[id] = meta.content;
  });

  /* =========================
     SET POSTER
  ========================= */
  function setPoster() {

    const meta = document.querySelector('meta[property="og:image"]');

    const fallback =
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e";

    const poster =
      meta && meta.content
        ? meta.content
        : fallback;

    document.querySelectorAll(".video-poster").forEach(el => {
      el.style.backgroundImage = `url('${poster}')`;
    });
  }

  /* =========================
     PLAY VIDEO
  ========================= */
  window.playVideo = function (el) {

    const wrapper = el.parentElement;

    if (!wrapper) return;

    const iframe = wrapper.querySelector(".video-player");
    const poster = wrapper.querySelector(".video-poster");

    if (!iframe) return;

    // hide play button + poster
    el.style.display = "none";

    if (poster) {
      poster.style.display = "none";
    }

    // get domain
    const domainId = wrapper.dataset.domainId;
    const domain = domainMap[domainId] || "";

    // load iframe only once
    if (!iframe.src) {

      const path = iframe.dataset.src || "";

      iframe.src = domain + path;
    }
  };

  /* =========================
     IMAGE POPUP VIEWER
  ========================= */

  const popup = document.getElementById("tmdbPopup");
  const popupImg = document.getElementById("tmdbPopupImg");

  if (popup && popupImg) {

    const images = document.querySelectorAll(".tmdb-extra-images img");

    let currentIndex = 0;

    function updateImage() {
      popupImg.src = images[currentIndex].src;
    }

    function openImage(index) {

      currentIndex = index;

      updateImage();

      popup.classList.add("active");

      history.pushState(
        { popupOpen: true },
        "",
        window.location.href
      );
    }

    function closePopup() {
      popup.classList.remove("active");
    }

    function nextImage() {

      currentIndex =
        (currentIndex + 1) % images.length;

      updateImage();
    }

    function prevImage() {

      currentIndex =
        (currentIndex - 1 + images.length) % images.length;

      updateImage();
    }

    // thumbnail click
    images.forEach((img, index) => {
      img.addEventListener("click", () => {
        openImage(index);
      });
    });

    // next button
    document.querySelector(".tmdb-next")?.addEventListener(
      "click",
      nextImage
    );

    // prev button
    document.querySelector(".tmdb-prev")?.addEventListener(
      "click",
      prevImage
    );

    // close button
    document.querySelector(".tmdb-close")?.addEventListener(
      "click",
      () => {
        closePopup();
        history.back();
      }
    );

    // outside click
    popup.addEventListener("click", e => {

      if (e.target === popup) {
        closePopup();
        history.back();
      }
    });

    // keyboard support
    document.addEventListener("keydown", e => {

      if (!popup.classList.contains("active")) return;

      switch (e.key) {

        case "ArrowRight":
          nextImage();
          break;

        case "ArrowLeft":
          prevImage();
          break;

        case "Escape":
          closePopup();
          history.back();
          break;
      }
    });

    // back button support
    window.addEventListener("popstate", () => {

      if (popup.classList.contains("active")) {
        closePopup();
      }
    });

    /* =========================
       MOBILE SWIPE
    ========================= */

    let touchStartX = 0;
    let touchEndX = 0;

    popupImg.addEventListener("touchstart", e => {
      touchStartX = e.changedTouches[0].screenX;
    });

    popupImg.addEventListener("touchend", e => {

      touchEndX = e.changedTouches[0].screenX;

      if (touchStartX - touchEndX > 50) {
        nextImage();
      }

      if (touchEndX - touchStartX > 50) {
        prevImage();
      }
    });
  }

  /* =========================
     DOWNLOAD REDIRECT
  ========================= */

  const countdownPage = "/p/download.html";

  document.querySelectorAll(".button-link").forEach(btn => {

    btn.addEventListener("click", function (e) {

      e.preventDefault();

      const raw = this.dataset.url;

      if (!raw) return;

      const [path, domainKey] = raw.split("|");

      const url =
        `${countdownPage}?target=${encodeURIComponent(path)}&d=${encodeURIComponent(domainKey)}`;

      window.location.href = url;
    });
  });

  /* =========================
     INIT
  ========================= */

  document.addEventListener("DOMContentLoaded", () => {
    setPoster();
  });

})();
