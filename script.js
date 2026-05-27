
    const POSTS_PER_PAGE = 24;
    const MAX_JSON_FILES = 500;

    const countdownPage = "/download";

    const fallbackPoster =
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e";

    /* =========================
       DOMAIN CACHE
    ========================= */

    const domainMap = {};

    function readDomains(){

      document
        .querySelectorAll('meta[name="video-domain"]')
        .forEach(meta => {

          const id = meta.dataset.id;

          if(id){
            domainMap[id] =
              meta.content || "";
          }
        });
    }

    /* =========================
       VIDEO POSTER
    ========================= */

    function setPoster(root = document){

      root
        .querySelectorAll(".video-wrapper")
        .forEach(wrapper => {

          const posterBox =
            wrapper.querySelector(".video-poster");

          if(!posterBox) return;

          if(posterBox.dataset.ready) return;

          posterBox.dataset.ready = "1";

          let poster =
            wrapper.dataset.poster;

          if(!poster){

            const firstPostImage =
              document.querySelector(
                "#detailContent img"
              );

            if(firstPostImage){

              poster =
                firstPostImage.currentSrc
                ||
                firstPostImage.src;
            }
          }

          if(poster){
            poster =
              poster.replace(
                /\/s\d+(-c)?\//,
                "/s1600/"
              );
          }

          if(!poster){
            poster = fallbackPoster;
          }

          posterBox.innerHTML = `
          <img
            src="${poster}"
            alt=""
            draggable="false"
            loading="eager"
            decoding="async"
            style="
              width:100%;
              height:100%;
              object-fit:cover;
              display:block;
            "
          >
        `;
        });
    }

    /* =========================
       PLAY VIDEO
    ========================= */

    window.playVideo = function(el){

      const wrapper =
        el.closest(".video-wrapper");

      if(!wrapper) return;

      const iframe =
        wrapper.querySelector(".video-player");

      const poster =
        wrapper.querySelector(".video-poster");

      if(!iframe) return;

      el.style.display = "none";

      if(poster){
        poster.style.display = "none";
      }

      if(!iframe.src){

        const domainId =
          wrapper.dataset.domainId || "";

        const domain =
          domainMap[domainId] || "";

        const path =
          iframe.dataset.src || "";

        iframe.src =
          path.startsWith("http")
            ? path
            : domain + path;
      }
    };

    /* =========================
       DOWNLOAD BUTTON
    ========================= */

    function handleDownload(btn){

      const raw =
        btn.dataset.url || "";

      if(!raw) return;

      const [path = "", domainKey = ""] =
        raw.split("|");

      const domain =
        domainMap[domainKey] || "";

      const finalTarget =
        path.startsWith("http")
          ? path
          : domain + path;

      const url =
        `${countdownPage}?target=${encodeURIComponent(finalTarget)}&d=${encodeURIComponent(domainKey)}`;

      window.location.href = url;
    }

    /* =========================
       POPUP
    ========================= */

    let popup = null;
    let popupImg = null;

    let currentImages = [];
    let currentIndex = 0;

    function loadPopup(){

      popup =
        document.getElementById("tmdbPopup");

      popupImg =
        document.getElementById("tmdbPopupImg");
    }

    function refreshGallery(){

      currentImages = Array.from(
        document.querySelectorAll(
          ".tmdb-extra-images img"
        )
      );
    }

    /* =========================
       UPDATE POPUP IMAGE
    ========================= */

    function updatePopupImage(){

      if(
        !popupImg ||
        !currentImages.length
      ) return;

      const img =
        currentImages[currentIndex];

      let src =
        img.getAttribute("data-src")
        ||
        img.getAttribute("data-lazy-src")
        ||
        img.currentSrc
        ||
        img.src
        ||
        img.getAttribute("src")
        ||
        "";

      src = src.replace(
        /\/s\d+(-c)?\//,
        "/s1600/"
      );

      popupImg.style.opacity = "0";

      const preload = new Image();

      preload.onload = () => {

        popupImg.src =
          preload.src;

        requestAnimationFrame(() => {

          popupImg.style.opacity = "1";
        });
      };

      preload.src = src;
    }

    function openPopup(index){

      loadPopup();

      if(
        !popup ||
        !popupImg
      ) return;

      currentIndex = index;

      popup.classList.add("active");

      updatePopupImage();

      history.pushState(
        { popupOpen:true },
        "",
        window.location.href
      );
    }

    function closePopup(){

      if(!popup) return;

      popup.classList.remove("active");
    }

    function nextImage(){

      if(!currentImages.length) return;

      currentIndex =
        (
          currentIndex + 1
        )
        %
        currentImages.length;

      updatePopupImage();
    }

    function prevImage(){

      if(!currentImages.length) return;

      currentIndex =
        (
          currentIndex - 1
          +
          currentImages.length
        )
        %
        currentImages.length;

      updatePopupImage();
    }

    const postsEl = document.getElementById("posts");
    const pagination = document.getElementById("pagination");
    const pageNumEl = document.getElementById("pageNum");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const pageBadge = document.getElementById("pageBadge");
    const searchInput = document.getElementById("searchInput");
    const searchClear = document.getElementById("searchClear");
    const searchStatus = document.getElementById("searchStatus");
    const pageTitleEl = document.querySelector(".page-title");
    const brandTitle = document.querySelector(".brand-text h1");
    const languageCloud = document.getElementById("languageCloud");

    const searchBtn = document.getElementById("searchBtn");
    const menuBtn = document.getElementById("menuBtn");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const sidebarClose = document.getElementById("sidebarClose");

    let currentPage = 1;
    let ALL_POSTS = [];
    let loadedFileIndexes = new Set();
    let nextJsonIndex = 1;
    let noMoreFiles = false;
    let loadingFilePromises = new Map();
    let currentSearch = "";
    let currentLabel = "";
    let currentLabelTotalPages = 1;
    let searchTimer = null;

    function scrollToTopNow(){
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto"
      });
    }

    function setPageTitleVisible(visible){
      if(pageTitleEl){
        pageTitleEl.style.display = visible ? "block" : "none";
      }
    }

    function setBrandTitleVisible(visible){
      if(brandTitle){
        brandTitle.style.display = visible ? "block" : "none";
      }
    }

    function setLanguageCloudVisible(visible){
      if(languageCloud){
        languageCloud.style.display = visible ? "flex" : "none";
      }
    }

    function openSidebar(){
      sidebar.classList.add("active");
      sidebarOverlay.classList.add("active");
      document.body.classList.add("sidebar-open");
    }

    function closeSidebar(){
      sidebar.classList.remove("active");
      sidebarOverlay.classList.remove("active");
      document.body.classList.remove("sidebar-open");
    }

    function toggleSidebar(){
      if(sidebar.classList.contains("active")){
        closeSidebar();
      }else{
        openSidebar();
      }
    }

    function slugify(text){
      return text.toString().toLowerCase().trim()
        .replace(/[^a-z0-9]+/g,'-')
        .replace(/(^-|-$)/g,'');
    }

    function getJsonFile(index){
      return `json/posts${index}.json`;
    }

    function getImage(post){
      return (
        post.media$thumbnail?.url?.replace("/s72-c/","/s1200/")
        ||
        post.content?.$t?.match(/<img.*?src="(.*?)"/i)?.[1]
        ||
        "https://via.placeholder.com/500x750?text=No+Image"
      );
    }

    function getLabels(post){
      const labels = (post.category || [])
        .map(c => c.term)
        .filter(label => {
          if(!label) return false;
          const l = label.toLowerCase().trim();
          return l !== "movies" && l !== "trending";
        });

      return labels;
    }

    function createCard(post){
      const image = getImage(post);
      const title = post.title?.$t || "No Title";
      const labels = getLabels(post);
      const slug = slugify(title);

      return `
        <a class="card" href="/${slug}">
          <div class="poster-wrap">
            <img class="poster" src="${image}" loading="lazy" alt="${title}">
          </div>

          <div class="content">
            <div class="title">${title}</div>

            <div class="labels">
              ${labels.slice(0,6).map(label => `
                <span
                  class="label clickable-label label-link"
                  data-label="${encodeURIComponent(label)}"
                >${label}</span>
              `).join("")}
            </div>
          </div>
        </a>
      `;
    }

    function updatePageBadge(){
      if(currentSearch){
        pageBadge.style.display = "inline-flex";
        pageBadge.textContent = `Search: ${currentSearch}`;
        return;
      }

      if(currentLabel){
        pageBadge.style.display = "inline-flex";
        pageBadge.textContent = `Label: ${currentLabel} • Page ${currentPage}`;
        return;
      }

      if(currentPage > 1){
        pageBadge.style.display = "inline-flex";
        pageBadge.textContent = `Page ${currentPage}`;
      }else{
        pageBadge.style.display = "none";
        pageBadge.textContent = "";
      }
    }

    function updateNavState(){
      if(currentSearch){
        prevBtn.classList.add("disabled");
        nextBtn.classList.add("disabled");
        prevBtn.setAttribute("aria-disabled", "true");
        nextBtn.setAttribute("aria-disabled", "true");
        return;
      }

      if(currentLabel){
        if(currentPage <= 1){
          prevBtn.classList.add("disabled");
          prevBtn.setAttribute("aria-disabled", "true");
        }else{
          prevBtn.classList.remove("disabled");
          prevBtn.removeAttribute("aria-disabled");
        }

        if(currentPage >= currentLabelTotalPages){
          nextBtn.classList.add("disabled");
          nextBtn.setAttribute("aria-disabled", "true");
        }else{
          nextBtn.classList.remove("disabled");
          nextBtn.removeAttribute("aria-disabled");
        }

        return;
      }

      if(currentPage <= 1){
        prevBtn.classList.add("disabled");
        prevBtn.setAttribute("aria-disabled", "true");
      }else{
        prevBtn.classList.remove("disabled");
        prevBtn.removeAttribute("aria-disabled");
      }

      const atKnownLastPage =
        noMoreFiles && (currentPage * POSTS_PER_PAGE >= ALL_POSTS.length);

      if(atKnownLastPage){
        nextBtn.classList.add("disabled");
        nextBtn.setAttribute("aria-disabled", "true");
      }else{
        nextBtn.classList.remove("disabled");
        nextBtn.removeAttribute("aria-disabled");
      }
    }

    function showHome(){
      setPageTitleVisible(!currentSearch && !currentLabel);
      setBrandTitleVisible(true);
      setLanguageCloudVisible(!currentSearch);
      postsEl.style.display = "grid";
      pagination.style.display = currentSearch ? "none" : "flex";
      updatePageBadge();
    }

    async function loadJsonFile(index){
      if(index > MAX_JSON_FILES) {
        noMoreFiles = true;
        return false;
      }

      if(loadedFileIndexes.has(index)) return true;

      if(loadingFilePromises.has(index)) return loadingFilePromises.get(index);

      const promise = (async () => {
        try{
          const file = getJsonFile(index);
          const res = await fetch(file, { cache: "force-cache" });

          if(!res.ok){
            if(res.status === 404){
              noMoreFiles = true;
            }
            return false;
          }

          const data = await res.json();
          const entries = data?.feed?.entry || [];

          ALL_POSTS.push(...entries);
          loadedFileIndexes.add(index);

          return true;
        }catch(err){
          console.error("Failed to load:", getJsonFile(index), err);
          return false;
        }finally{
          loadingFilePromises.delete(index);
        }
      })();

      loadingFilePromises.set(index, promise);
      return promise;
    }

    async function loadNextJsonFile(){
      if(noMoreFiles) return false;

      const index = nextJsonIndex;
      const ok = await loadJsonFile(index);

      if(ok){
        nextJsonIndex += 1;
      }

      return ok;
    }

    async function ensurePostsForPage(page){
      const neededCount = page * POSTS_PER_PAGE;

      while(ALL_POSTS.length < neededCount && !noMoreFiles){
        const ok = await loadNextJsonFile();
        if(!ok) break;
      }
    }

    async function ensureAllPostsLoaded(){
      while(!noMoreFiles && nextJsonIndex <= MAX_JSON_FILES){
        const ok = await loadNextJsonFile();
        if(!ok) break;
      }
    }

    function matchesSearch(post, query){
      const title = (post.title?.$t || "").toLowerCase();
      const labels = getLabels(post).join(" ").toLowerCase();
      const content = (post.content?.$t || "").toLowerCase();
      return title.includes(query) || labels.includes(query) || content.includes(query);
    }

    async function renderPage(page, addHistory = true){
      scrollToTopNow();
      closeSidebar();

      currentSearch = "";
      currentLabel = "";
      currentLabelTotalPages = 1;

      searchStatus.style.display = "none";
      searchInput.value = "";
      searchClear.classList.remove("show");

      setPageTitleVisible(true);
      setBrandTitleVisible(true);
      setLanguageCloudVisible(true);
      postsEl.innerHTML = `<div class="loading">Loading Premium Movies...</div>`;

      await ensurePostsForPage(page);

      const totalLoadedPages = Math.max(
        1,
        Math.ceil(ALL_POSTS.length / POSTS_PER_PAGE)
      );

      currentPage = Math.min(Math.max(1, page), totalLoadedPages);

      const start = (currentPage - 1) * POSTS_PER_PAGE;
      const end = start + POSTS_PER_PAGE;
      const pagePosts = ALL_POSTS.slice(start, end);

      postsEl.innerHTML = pagePosts.map(post => createCard(post)).join("");
      pageNumEl.innerText = currentPage;

      const prevPage = currentPage > 1 ? currentPage - 1 : 1;
      const nextPage = currentPage + 1;

      prevBtn.href = prevPage === 1 ? `/` : `?page=${prevPage}`;
      nextBtn.href = `?page=${nextPage}`;

      pagination.style.display = "flex";

      if(addHistory){
        if(currentPage === 1){
          history.pushState({ page: 1 }, "", `/`);
        }else{
          history.pushState({ page: currentPage }, "", `?page=${currentPage}`);
        }
      }

      updateNavState();
      updatePageBadge();
      scrollToTopNow();
    }

    async function renderSearchResults(query, addHistory = true){
      const q = query.trim().toLowerCase();

      if(!q){
        searchStatus.style.display = "none";
        currentSearch = "";
        if(addHistory){
          history.pushState({ page: currentPage }, "", currentPage === 1 ? `/` : `?page=${currentPage}`);
        }
        await renderPage(currentPage, false);
        return;
      }

      scrollToTopNow();
      closeSidebar();

      currentLabel = "";
      currentLabelTotalPages = 1;

      showHome();
      setPageTitleVisible(false);
      setLanguageCloudVisible(false);

      currentSearch = query.trim();
      searchStatus.style.display = "block";
      searchStatus.textContent = `Searching for “${currentSearch}”…`;

      postsEl.innerHTML = `<div class="loading">Searching all posts...</div>`;
      pagination.style.display = "none";

      await ensureAllPostsLoaded();

      const results = ALL_POSTS.filter(post => matchesSearch(post, q));

      if(results.length){
        postsEl.innerHTML = results.map(post => createCard(post)).join("");
        searchStatus.textContent = `Showing ${results.length} result${results.length === 1 ? "" : "s"} for “${currentSearch}”`;
      }else{
        postsEl.innerHTML = `<div class="loading">No results found for “${currentSearch}”</div>`;
        searchStatus.textContent = `No results found for “${currentSearch}”`;
      }

      pageNumEl.innerText = "Search";
      prevBtn.classList.add("disabled");
      nextBtn.classList.add("disabled");
      prevBtn.setAttribute("aria-disabled", "true");
      nextBtn.setAttribute("aria-disabled", "true");
      pageBadge.style.display = "inline-flex";
      pageBadge.textContent = `Search: ${currentSearch}`;

      if(addHistory){
        history.pushState({ search: currentSearch }, "", `?search=${encodeURIComponent(currentSearch)}`);
      }

      scrollToTopNow();
    }

    async function renderLabelPosts(label, page = 1, addHistory = true){
      scrollToTopNow();
      closeSidebar();

      currentSearch = "";
      searchInput.value = "";
      searchClear.classList.remove("show");

      currentLabel = label.trim();

      showHome();
      setPageTitleVisible(false);
      setLanguageCloudVisible(true);

      searchStatus.style.display = "block";
      searchStatus.textContent = `Loading ${currentLabel} posts...`;

      postsEl.innerHTML = `<div class="loading">Loading ${currentLabel} posts...</div>`;
      pagination.style.display = "none";

      await ensureAllPostsLoaded();

      const targetLabel = currentLabel.toLowerCase().trim();

      const results = ALL_POSTS.filter(post => {
        const labels = getLabels(post).map(l => l.toLowerCase().trim());
        return labels.includes(targetLabel);
      });

      currentLabelTotalPages = Math.max(1, Math.ceil(results.length / POSTS_PER_PAGE));
      currentPage = Math.min(Math.max(1, page), currentLabelTotalPages);

      const start = (currentPage - 1) * POSTS_PER_PAGE;
      const end = start + POSTS_PER_PAGE;
      const pageItems = results.slice(start, end);

      if(pageItems.length){
        postsEl.innerHTML = pageItems.map(post => createCard(post)).join("");
        searchStatus.textContent = `${results.length} post${results.length === 1 ? "" : "s"} found in "${currentLabel}"`;
      }else{
        postsEl.innerHTML = `<div class="loading">No posts found in "${currentLabel}"</div>`;
        searchStatus.textContent = `No posts found in "${currentLabel}"`;
      }

      pageNumEl.innerText = `${currentPage} / ${currentLabelTotalPages}`;
      pagination.style.display = "flex";

      const prevPage = currentPage > 1 ? currentPage - 1 : 1;
      const nextPage = currentPage < currentLabelTotalPages ? currentPage + 1 : currentLabelTotalPages;

      prevBtn.href =
        prevPage === 1
          ? `/?label=${encodeURIComponent(currentLabel)}`
          : `?label=${encodeURIComponent(currentLabel)}&page=${prevPage}`;

      nextBtn.href = `?label=${encodeURIComponent(currentLabel)}&page=${nextPage}`;

      if(addHistory){
        history.pushState(
          { label: currentLabel, page: currentPage },
          "",
          currentPage === 1
            ? `/?label=${encodeURIComponent(currentLabel)}`
            : `?label=${encodeURIComponent(currentLabel)}&page=${currentPage}`
        );
      }

      updateNavState();
      updatePageBadge();
      scrollToTopNow();
    }

    function handleSearchInput(){
      const value = searchInput.value;
      if(value.trim()){
        searchClear.classList.add("show");
      }else{
        searchClear.classList.remove("show");
      }

      searchBtn.classList.toggle("active", !!value.trim() || document.activeElement === searchInput);

      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        renderSearchResults(value, true);
      }, 300);
    }

    function initExtras(){
      readDomains();
      loadPopup();
      setPoster();
    }

    async function initFromURL(){
      scrollToTopNow();
      closeSidebar();

      initExtras();

      const params = new URLSearchParams(window.location.search);
      const page = parseInt(params.get("page") || "1", 10);
      const search = params.get("search") || "";
      const label = params.get("label") || "";

      let pathSlug =
        window.location.pathname
          .replace(/^\/+/,"")
          .replace(/\/+$/,"");

      /* =========================
         BLOGGER OLD URL -> CLEAN SLUG
      ========================= */

      if(/^\d{4}\/\d{2}\/.+\.html$/i.test(pathSlug)){
        const cleanSlug =
          pathSlug
            .split("/")
            .pop()
            .replace(/\.html$/i, "");

        window.location.replace(`/${cleanSlug}`);
        return;
      }

      currentPage = Number.isFinite(page) && page > 0 ? page : 1;
      pageNumEl.innerText = currentPage;

      if(label){
        await renderLabelPosts(label, currentPage, false);
      }else if(search){
        searchInput.value = search;
        searchClear.classList.add("show");
        searchBtn.classList.add("active");
        await renderSearchResults(search, false);
      }else{
        await renderPage(currentPage, false);
      }

      scrollToTopNow();
    }

    prevBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeSidebar();

      if(prevBtn.classList.contains("disabled")) return;

      if(currentSearch){
        return;
      }

      if(currentLabel){
        if(currentPage > 1){
          renderLabelPosts(currentLabel, currentPage - 1, true);
        }
        return;
      }

      if(currentPage > 1){
        renderPage(currentPage - 1, true);
      }
    });

    nextBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeSidebar();

      if(nextBtn.classList.contains("disabled")) return;

      if(currentSearch){
        return;
      }

      if(currentLabel){
        if(currentPage < currentLabelTotalPages){
          renderLabelPosts(currentLabel, currentPage + 1, true);
        }
        return;
      }

      renderPage(currentPage + 1, true);
    });

    searchBtn.addEventListener("click", () => {
      searchInput.focus();
      searchInput.select();
      searchBtn.classList.add("active");
    });

    searchInput.addEventListener("focus", () => {
      searchBtn.classList.add("active");
    });

    searchInput.addEventListener("blur", () => {
      if(!searchInput.value.trim()){
        searchBtn.classList.remove("active");
      }
    });

    menuBtn.addEventListener("click", toggleSidebar);
    sidebarClose.addEventListener("click", closeSidebar);
    sidebarOverlay.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape") closeSidebar();
    });

    searchInput.addEventListener("input", handleSearchInput);

    searchInput.addEventListener("keydown", (e) => {
      if(e.key === "Enter"){
        e.preventDefault();
        clearTimeout(searchTimer);
        renderSearchResults(searchInput.value, true);
      }
    });

    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      searchClear.classList.remove("show");
      searchBtn.classList.remove("active");
      currentSearch = "";
      searchStatus.style.display = "none";
      renderPage(currentPage, true);
      searchInput.focus();
    });

    window.addEventListener("popstate", () => {
      if(
        popup &&
        popup.classList.contains("active")
      ){
        closePopup();
      }

      initFromURL();
    });

    /* =========================
       CLICK EVENTS
    ========================= */

    document.addEventListener("click", e => {

      const labelLink =
        e.target.closest(".label-link");

      if(labelLink){
        e.preventDefault();
        e.stopPropagation();

        const label =
          decodeURIComponent(labelLink.dataset.label || "");

        renderLabelPosts(label, 1, true);
        return;
      }

      const downloadBtn =
        e.target.closest(".button-link");

      if(downloadBtn){

        e.preventDefault();

        handleDownload(downloadBtn);

        return;
      }

      const overlay =
        e.target.closest(".video-overlay");

      if(overlay){

        e.preventDefault();

        playVideo(overlay);

        return;
      }

      const galleryImg =
        e.target.closest(
          ".tmdb-extra-images img"
        );

      if(galleryImg){

        refreshGallery();

        const index =
          currentImages.indexOf(galleryImg);

        if(index !== -1){

          setTimeout(() => {
            openPopup(index);
          }, 100);
        }

        return;
      }

      if(
        e.target.closest(".tmdb-close")
      ){

        closePopup();

        history.back();

        return;
      }

      if(
        e.target.closest(".tmdb-next")
      ){

        nextImage();

        return;
      }

      if(
        e.target.closest(".tmdb-prev")
      ){

        prevImage();

        return;
      }

      if(
        popup &&
        e.target === popup
      ){

        closePopup();

        history.back();
      }
    });

    /* =========================
       KEYBOARD
    ========================= */

    document.addEventListener("keydown", e => {

      if(
        !popup ||
        !popup.classList.contains("active")
      ) return;

      switch(e.key){

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

    /* =========================
       MOBILE SWIPE
    ========================= */

    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener(
      "touchstart",
      e => {

        if(
          !popup ||
          !popup.classList.contains("active")
        ) return;

        touchStartX =
          e.changedTouches[0].screenX;
      },
      { passive:true }
    );

    document.addEventListener(
      "touchend",
      e => {

        if(
          !popup ||
          !popup.classList.contains("active")
        ) return;

        touchEndX =
          e.changedTouches[0].screenX;

        if(
          touchStartX - touchEndX > 50
        ){
          nextImage();
        }

        if(
          touchEndX - touchStartX > 50
        ){
          prevImage();
        }
      },
      { passive:true }
    );

    /* =========================
       OBSERVER
    ========================= */

    const observer =
      new MutationObserver(() => {
        setPoster();
      });

    observer.observe(
      document.body,
      {
        childList:true,
        subtree:true
      }
    );

    initFromURL();
  
