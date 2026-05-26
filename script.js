
    const POSTS_PER_PAGE = 24;
    const MAX_JSON_FILES = 500;

    const countdownPage = "/download";
    const fallbackPoster = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e";

    const domainMap = {};

    const postsEl = document.getElementById("posts");
    const detailView = document.getElementById("detailView");
    const detailContent = document.getElementById("detailContent");
    const pagination = document.getElementById("pagination");
    const pageNumEl = document.getElementById("pageNum");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const backBtn = document.getElementById("backBtn");
    const relatedPostsSection = document.getElementById("relatedPostsSection");
    const relatedPostsEl = document.getElementById("relatedPosts");
    const pageBadge = document.getElementById("pageBadge");
    const searchInput = document.getElementById("searchInput");
    const searchClear = document.getElementById("searchClear");
    const searchStatus = document.getElementById("searchStatus");
    const pageTitleEl = document.querySelector(".page-title");
    const brandTitle = document.querySelector(".brand-text h1");

    const searchBtn = document.getElementById("searchBtn");
    const menuBtn = document.getElementById("menuBtn");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const sidebarClose = document.getElementById("sidebarClose");

    let popup = null;
    let popupImg = null;
    let currentImages = [];
    let currentIndex = 0;

    let currentPage = 1;
    let ALL_POSTS = [];
    let loadedFileIndexes = new Set();
    let nextJsonIndex = 1;
    let noMoreFiles = false;
    let loadingFilePromises = new Map();
    let currentSearch = "";
    let searchTimer = null;

    function readDomains(){
      document.querySelectorAll('meta[name="video-domain"]').forEach(meta => {
        const id = meta.dataset.id;
        if(id){
          domainMap[id] = meta.content || "";
        }
      });
    }

    function loadPopup(){
      popup = document.getElementById("tmdbPopup");
      popupImg = document.getElementById("tmdbPopupImg");
    }

    function refreshGallery(){
      currentImages = Array.from(document.querySelectorAll(".tmdb-extra-images img"));
    }

    function updatePopupImage(){
      if(!popupImg || !currentImages.length) return;

      const img = currentImages[currentIndex];

      let src =
        img.getAttribute("data-src") ||
        img.getAttribute("data-lazy-src") ||
        img.currentSrc ||
        img.src ||
        img.getAttribute("src") ||
        "";

      src = src.replace(/\/s\d+(-c)?\//, "/s1600/");

      popupImg.style.opacity = "0";

      const preload = new Image();

      preload.onload = () => {
        popupImg.src = preload.src;
        requestAnimationFrame(() => {
          popupImg.style.opacity = "1";
        });
      };

      preload.src = src;
    }

    function openPopup(index){
      loadPopup();

      if(!popup || !popupImg) return;

      currentIndex = index;
      popup.classList.add("active");
      updatePopupImage();

      history.pushState({ popupOpen: true }, "", window.location.href);
    }

    function closePopup(){
      if(!popup) return;
      popup.classList.remove("active");
    }

    function nextImage(){
      if(!currentImages.length) return;

      currentIndex = (currentIndex + 1) % currentImages.length;
      updatePopupImage();
    }

    function prevImage(){
      if(!currentImages.length) return;

      currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
      updatePopupImage();
    }

    function setPoster(root = document){
      root.querySelectorAll(".video-wrapper").forEach(wrapper => {
        const posterBox = wrapper.querySelector(".video-poster");
        if(!posterBox) return;
        if(posterBox.dataset.ready) return;

        posterBox.dataset.ready = "1";

        let poster = wrapper.dataset.poster;

        if(!poster){
          const firstPostImage = document.querySelector("#detailContent img");
          if(firstPostImage){
            poster = firstPostImage.currentSrc || firstPostImage.src;
          }
        }

        if(poster){
          poster = poster.replace(/\/s\d+(-c)?\//, "/s1600/");
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

    window.playVideo = function(el){
      const wrapper = el.closest(".video-wrapper");
      if(!wrapper) return;

      const iframe = wrapper.querySelector(".video-player");
      const poster = wrapper.querySelector(".video-poster");

      if(!iframe) return;

      el.style.display = "none";

      if(poster){
        poster.style.display = "none";
      }

      if(!iframe.src){
        const domainId = wrapper.dataset.domainId || "";
        const domain = domainMap[domainId] || "";
        const path = iframe.dataset.src || "";

        iframe.src = path.startsWith("http") ? path : domain + path;
      }
    };

    function handleDownload(btn){
      const raw = btn.dataset.url || "";
      if(!raw) return;

      const [path = "", domainKey = ""] = raw.split("|");
      const domain = domainMap[domainKey] || "";

      const finalTarget = path.startsWith("http") ? path : domain + path;

      const url = `${countdownPage}?target=${encodeURIComponent(finalTarget)}&d=${encodeURIComponent(domainKey)}`;
      window.location.href = url;
    }

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
        <a class="card" href="/${slug}" data-slug="${slug}">
          <div class="poster-wrap">
            <img class="poster" src="${image}" loading="lazy" alt="${title}">
          </div>

          <div class="content">
            <div class="title">${title}</div>

            <div class="labels">
              ${labels.slice(0,6).map(label => `<span class="label">${label}</span>`).join("")}
            </div>
          </div>
        </a>
      `;
    }

    function isViewingPost(){
      return detailView.style.display === "block";
    }

    function updatePageBadge(){
      if(currentSearch){
        pageBadge.style.display = "inline-flex";
        pageBadge.textContent = `Search: ${currentSearch}`;
        return;
      }

      if(currentPage > 1 && !isViewingPost()){
        pageBadge.style.display = "inline-flex";
        pageBadge.textContent = `Page ${currentPage}`;
      }else{
        pageBadge.style.display = "none";
        pageBadge.textContent = "";
      }
    }

    function updateNavState(){
      if(currentPage <= 1 || currentSearch){
        prevBtn.classList.add("disabled");
        prevBtn.setAttribute("aria-disabled", "true");
      }else{
        prevBtn.classList.remove("disabled");
        prevBtn.removeAttribute("aria-disabled");
      }

      const atKnownLastPage = noMoreFiles && (currentPage * POSTS_PER_PAGE >= ALL_POSTS.length);

      if(atKnownLastPage || currentSearch){
        nextBtn.classList.add("disabled");
        nextBtn.setAttribute("aria-disabled", "true");
      }else{
        nextBtn.classList.remove("disabled");
        nextBtn.removeAttribute("aria-disabled");
      }
    }

    function showHome(){
      setPageTitleVisible(!currentSearch);
      setBrandTitleVisible(true);
      postsEl.style.display = "grid";
      pagination.style.display = currentSearch ? "none" : "flex";
      detailView.style.display = "none";
      updatePageBadge();
    }

    function showDetail(){
      setPageTitleVisible(false);
      setBrandTitleVisible(false);
      postsEl.style.display = "none";
      pagination.style.display = "none";
      detailView.style.display = "block";
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

    async function findPostBySlug(slug){
      while(!noMoreFiles){
        const found = ALL_POSTS.find(p => slugify(p.title?.$t || "") === slug);
        if(found){
          const index = ALL_POSTS.findIndex(p => slugify(p.title?.$t || "") === slug);
          const page = Math.floor(index / POSTS_PER_PAGE) + 1;
          return { post: found, page };
        }

        const ok = await loadNextJsonFile();
        if(!ok) break;
      }

      const finalFound = ALL_POSTS.find(p => slugify(p.title?.$t || "") === slug);
      if(finalFound){
        const index = ALL_POSTS.findIndex(p => slugify(p.title?.$t || "") === slug);
        const page = Math.floor(index / POSTS_PER_PAGE) + 1;
        return { post: finalFound, page };
      }

      return null;
    }

    function renderDetailHeader(post){
      const title = post.title?.$t || "No Title";
      const labels = getLabels(post);

      return `
        <h1 class="detail-title">${title}</h1>

        <div class="labels" style="margin-bottom:18px;">
          ${labels.slice(0, 8).map(label => `<span class="label">${label}</span>`).join("")}
        </div>
      `;
    }

    async function loadRelatedPosts(currentSlug){
      try{
        await ensureAllPostsLoaded();

        relatedPostsSection.style.display = "block";
        relatedPostsEl.innerHTML = `<div class="loading">Loading related posts...</div>`;

        const relatedPosts = ALL_POSTS
          .filter(post => slugify(post.title?.$t || "") !== currentSlug)
          .slice(0, 24);

        if(!relatedPosts.length){
          relatedPostsSection.style.display = "none";
          relatedPostsEl.innerHTML = "";
          return;
        }

        relatedPostsEl.innerHTML = relatedPosts.map(post => createCard(post)).join("");
      }catch(e){
        relatedPostsSection.style.display = "block";
        relatedPostsEl.innerHTML = `<div class="loading">Failed to load related posts</div>`;
      }
    }

    async function openPost(slug, addHistory = true){
      scrollToTopNow();
      closeSidebar();
      currentSearch = "";
      searchInput.value = "";
      searchClear.classList.remove("show");
      searchStatus.style.display = "none";
      showDetail();

      detailContent.innerHTML = `<div class="loading">Loading post...</div>`;
      relatedPostsSection.style.display = "none";
      relatedPostsEl.innerHTML = "";

      const result = await findPostBySlug(slug);

      if(!result){
        detailContent.innerHTML = "<h2>Post not found</h2>";
        backBtn.href = `?page=${currentPage}`;
        updateNavState();
        updatePageBadge();
        scrollToTopNow();
        return;
      }

      const post = result.post;
      const foundPage = result.page || 1;
      const title = post.title?.$t || "No Title";
      document.title = title;

      currentPage = foundPage;
      pageNumEl.innerText = currentPage;

      const content = post.content?.$t || "";

      detailContent.innerHTML = `
        ${renderDetailHeader(post)}
        <div class="detail-body">${content}</div>
      `;

      const prevPage = currentPage > 1 ? currentPage - 1 : 1;
      const nextPage = currentPage + 1;

      prevBtn.href = `?page=${prevPage}`;
      nextBtn.href = `?page=${nextPage}`;
      backBtn.href = `?page=${foundPage}`;

      if(addHistory){
        history.pushState(
          { page: foundPage, post: slug },
          "",
          `?post=${encodeURIComponent(slug)}`
        );
      }

      await loadRelatedPosts(slug);

      updateNavState();
      updatePageBadge();
      scrollToTopNow();
    }

    async function renderPage(page, addHistory = true){
      scrollToTopNow();
      closeSidebar();
      currentSearch = "";
      searchStatus.style.display = "none";
      searchInput.value = "";
      searchClear.classList.remove("show");

      setPageTitleVisible(true);
      setBrandTitleVisible(true);
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

      prevBtn.href = `?page=${prevPage}`;
      nextBtn.href = `?page=${nextPage}`;
      backBtn.href = `?page=${currentPage}`;

      relatedPostsSection.style.display = "none";
      relatedPostsEl.innerHTML = "";
      detailView.style.display = "none";
      pagination.style.display = "flex";

      if(addHistory){
        history.pushState({ page: currentPage }, "", `?page=${currentPage}`);
      }

      updateNavState();
      updatePageBadge();
      scrollToTopNow();
    }

    function matchesSearch(post, query){
      const title = (post.title?.$t || "").toLowerCase();
      const labels = getLabels(post).join(" ").toLowerCase();
      const content = (post.content?.$t || "").toLowerCase();
      return title.includes(query) || labels.includes(query) || content.includes(query);
    }

    async function renderSearchResults(query, addHistory = true){
      const q = query.trim().toLowerCase();

      if(!q){
        searchStatus.style.display = "none";
        currentSearch = "";
        if(addHistory){
          history.pushState({ page: currentPage }, "", `?page=${currentPage}`);
        }
        await renderPage(currentPage, false);
        return;
      }

      scrollToTopNow();
      closeSidebar();
      showHome();
      setPageTitleVisible(false);

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

    async function initFromURL(){
      scrollToTopNow();
      closeSidebar();

      const params = new URLSearchParams(window.location.search);
      const page = parseInt(params.get("page") || "1", 10);
      const slug = params.get("post");
      const search = params.get("search") || "";

      currentPage = Number.isFinite(page) && page > 0 ? page : 1;
      pageNumEl.innerText = currentPage;

      if(search){
        searchInput.value = search;
        searchClear.classList.add("show");
        searchBtn.classList.add("active");
        await renderSearchResults(search, false);
      }else if(slug){
        await openPost(slug, false);
      }else{
        await renderPage(currentPage, false);
      }

      scrollToTopNow();
    }

    prevBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeSidebar();
      if(prevBtn.classList.contains("disabled")) return;
      if(currentPage > 1 && !currentSearch){
        renderPage(currentPage - 1, true);
      }
    });

    nextBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeSidebar();
      if(nextBtn.classList.contains("disabled")) return;
      if(!currentSearch){
        renderPage(currentPage + 1, true);
      }
    });

    backBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeSidebar();
      history.back();
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

    document.addEventListener("click", e => {
      const downloadBtn = e.target.closest(".button-link");
      if(downloadBtn){
        e.preventDefault();
        handleDownload(downloadBtn);
        return;
      }

      const overlay = e.target.closest(".video-overlay");
      if(overlay){
        e.preventDefault();
        window.playVideo(overlay);
        return;
      }

      const galleryImg = e.target.closest(".tmdb-extra-images img");
      if(galleryImg){
        refreshGallery();
        const index = currentImages.indexOf(galleryImg);

        if(index !== -1){
          setTimeout(() => {
            openPopup(index);
          }, 100);
        }
        return;
      }

      if(e.target.closest(".tmdb-close")){
        closePopup();
        history.back();
        return;
      }

      if(e.target.closest(".tmdb-next")){
        nextImage();
        return;
      }

      if(e.target.closest(".tmdb-prev")){
        prevImage();
        return;
      }

      if(popup && e.target === popup){
        closePopup();
        history.back();
      }
    });

    document.addEventListener("keydown", e => {
      if(!popup || !popup.classList.contains("active")) return;

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

    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener(
      "touchstart",
      e => {
        if(!popup || !popup.classList.contains("active")) return;
        touchStartX = e.changedTouches[0].screenX;
      },
      { passive: true }
    );

    document.addEventListener(
      "touchend",
      e => {
        if(!popup || !popup.classList.contains("active")) return;

        touchEndX = e.changedTouches[0].screenX;

        if(touchStartX - touchEndX > 50){
          nextImage();
        }

        if(touchEndX - touchStartX > 50){
          prevImage();
        }
      },
      { passive: true }
    );

    const observer = new MutationObserver(() => {
      setPoster();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.addEventListener("popstate", () => {
      if(popup && popup.classList.contains("active")){
        closePopup();
        return;
      }
      initFromURL();
    });

    function initExtras(){
      readDomains();
      loadPopup();
      setPoster();
    }

    if(document.readyState === "loading"){
      document.addEventListener("DOMContentLoaded", initExtras, { once: true });
    }else{
      initExtras();
    }

    initFromURL();
  
