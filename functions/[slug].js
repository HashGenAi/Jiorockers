export async function onRequest(context) {
  const { request } = context;
  const urlObj = new URL(request.url);
  const pathname = urlObj.pathname;

  // Let static files load normally
  if (/\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|json|txt|xml)$/i.test(pathname)) {
    return context.next();
  }

  // Let download page load normally
  if (pathname === "/download" || pathname === "/download/") {
    return context.next();
  }

  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function escHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function loadPosts() {
    let allPosts = [];

    for (let i = 1; i <= 500; i++) {
      const feedUrl = new URL(`/json/posts${i}.json`, request.url);

      try {
        const res = await fetch(feedUrl);

        if (!res.ok) break;

        const data = await res.json();
        const posts = data?.feed?.entry || [];
        allPosts.push(...posts);
      } catch (err) {
        break;
      }
    }

    return allPosts;
  }

  const cleanPath = pathname.replace(/^\/+|\/+$/g, "");
  const slug = cleanPath ? decodeURIComponent(cleanPath) : "";

  const allPosts = await loadPosts();

  let foundPost = null;
  if (slug) {
    for (const post of allPosts) {
      const title = post.title?.$t || "";
      if (slugify(title) === slug) {
        foundPost = post;
        break;
      }
    }

    if (!foundPost) {
      return new Response("Post not found", { status: 404 });
    }
  }

  function getImage(post) {
    return (
      post.media$thumbnail?.url?.replace("/s72-c/", "/s1200/") ||
      post.content?.$t?.match(/<img[^>]*src="([^"]+)"/i)?.[1] ||
      "https://via.placeholder.com/500x750?text=No+Image"
    );
  }

  function getLabels(post) {
    return (post.category || [])
      .map((c) => c.term)
      .filter((label) => {
        if (!label) return false;
        const l = String(label).toLowerCase().trim();
        return l !== "movies" && l !== "trending";
      });
  }

  function createCard(post) {
    const postTitle = post.title?.$t || "No Title";
    const postSlug = slugify(postTitle);
    const postImage = getImage(post);
    const labels = getLabels(post);

    return `
      <a class="card" href="/${escHtml(postSlug)}" data-slug="${escHtml(postSlug)}">
        <div class="poster-wrap">
          <img class="poster" src="${escHtml(postImage)}" loading="lazy" alt="${escHtml(postTitle)}">
        </div>
        <div class="content">
          <div class="title">${escHtml(postTitle)}</div>
          <div class="labels">
            ${labels.slice(0, 6).map((label) => `<span class="label">${escHtml(label)}</span>`).join("")}
          </div>
        </div>
      </a>
    `;
  }

  const title = foundPost?.title?.$t || "Premium Movie Blog";
  const rawContent = foundPost?.content?.$t || "";
  const firstContentImageMatch = rawContent.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
  const firstContentImage = firstContentImageMatch?.[1] || "";
  const image =
    firstContentImage ||
    foundPost?.media$thumbnail?.url?.replace("/s72-c/", "/s1200/") ||
    "";
  let content = rawContent;

  if (firstContentImageMatch?.[0]) {
    content = content.replace(firstContentImageMatch[0], "");
  }
  content = content.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, "");

  const labels = foundPost ? getLabels(foundPost) : [];
  const relatedPosts = foundPost
    ? allPosts.filter((post) => slugify(post.title?.$t || "") !== slug).slice(0, 24)
    : [];

  const serverDetailHtml = foundPost
    ? `
      <h1 class="detail-title">${escHtml(title)}</h1>

      <div class="labels" style="margin-bottom:18px;display:flex;flex-wrap:wrap;gap:8px;">
        ${labels.map((label) => `<span class="label">${escHtml(label)}</span>`).join("")}
      </div>

      ${image ? `
        <img
          src="${escHtml(image)}"
          alt="${escHtml(title)}"
          style="width:100%;max-width:520px;display:block;margin:0 auto 20px auto;border-radius:20px;"
        >
      ` : ""}

      <div class="detail-body">
        ${content}
      </div>
    `
    : "";

  const serverRelatedHtml = foundPost
    ? relatedPosts.map((post) => createCard(post)).join("")
    : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(title)}</title>
<meta content="no-referrer" name="referrer"/>

<style>
  *{box-sizing:border-box}
  body{
    margin:0;
    font-family:Arial,sans-serif;
    background:#0f0f12;
    color:#fff;
  }
  a{text-decoration:none;color:inherit}
  .topbar{
    position:sticky;
    top:0;
    z-index:30;
    display:flex;
    align-items:center;
    gap:14px;
    justify-content:space-between;
    padding:14px 16px;
    background:rgba(15,15,18,.95);
    backdrop-filter:blur(10px);
    border-bottom:1px solid rgba(255,255,255,.08);
  }
  .brand{
    display:flex;
    align-items:center;
    gap:12px;
    min-width:0;
  }
  .brand-logo{
    width:42px;
    height:42px;
    border-radius:12px;
    display:grid;
    place-items:center;
    background:#222;
    font-weight:700;
  }
  .brand-text{min-width:0}
  .brand-text h1{
    margin:0;
    font-size:18px;
    line-height:1.2;
  }
  .brand-text p{
    margin:2px 0 0;
    font-size:12px;
    opacity:.75;
  }
  .topbar-center{flex:1;max-width:560px}
  .search-wrap{
    position:relative;
    display:flex;
    align-items:center;
    background:#1b1b21;
    border:1px solid rgba(255,255,255,.08);
    border-radius:999px;
    overflow:hidden;
  }
  .search-icon{
    position:absolute;
    left:14px;
    width:18px;
    height:18px;
    opacity:.85;
    pointer-events:none;
  }
  .search-input{
    width:100%;
    padding:13px 44px 13px 42px;
    border:0;
    outline:0;
    background:transparent;
    color:#fff;
    font-size:15px;
  }
  .search-input::placeholder{color:rgba(255,255,255,.55)}
  .search-clear{
    position:absolute;
    right:8px;
    width:28px;
    height:28px;
    border:0;
    border-radius:999px;
    background:rgba(255,255,255,.08);
    color:#fff;
    cursor:pointer;
    opacity:0;
    pointer-events:none;
    transition:.2s;
  }
  .search-clear.show{
    opacity:1;
    pointer-events:auto;
  }
  .topbar-actions{
    display:flex;
    align-items:center;
    gap:10px;
  }
  .menu-btn{
    width:42px;
    height:42px;
    border:0;
    border-radius:12px;
    background:#1b1b21;
    color:#fff;
    cursor:pointer;
    display:grid;
    place-items:center;
  }
  .menu-lines{
    width:18px;
    display:grid;
    gap:3px;
  }
  .menu-lines span{
    height:2px;
    background:#fff;
    border-radius:2px;
    display:block;
  }

  .sidebar-overlay{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.55);
    opacity:0;
    pointer-events:none;
    transition:.25s;
    z-index:40;
  }
  .sidebar-overlay.active{
    opacity:1;
    pointer-events:auto;
  }
  .sidebar{
    position:fixed;
    top:0;
    right:-320px;
    width:min(320px,88vw);
    height:100vh;
    background:#14141a;
    z-index:50;
    transition:.25s;
    box-shadow:-20px 0 50px rgba(0,0,0,.35);
    display:flex;
    flex-direction:column;
  }
  .sidebar.active{right:0}
  .sidebar-header{
    padding:16px;
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:12px;
    border-bottom:1px solid rgba(255,255,255,.08);
  }
  .sidebar-profile{
    display:flex;
    gap:12px;
    align-items:center;
  }
  .sidebar-avatar{
    width:44px;
    height:44px;
    border-radius:14px;
    background:#222;
    display:grid;
    place-items:center;
    font-weight:700;
  }
  .sidebar-close{
    width:36px;
    height:36px;
    border-radius:10px;
    border:0;
    background:#222;
    color:#fff;
    font-size:22px;
    cursor:pointer;
    line-height:1;
  }
  .sidebar-content{padding:16px;overflow:auto}
  .sidebar-section{margin-bottom:22px}
  .sidebar-section-title{
    font-size:12px;
    opacity:.7;
    text-transform:uppercase;
    letter-spacing:.08em;
    margin-bottom:10px;
  }
  .sidebar-link{
    display:flex;
    align-items:center;
    gap:10px;
    padding:12px 14px;
    border-radius:14px;
    background:#1b1b21;
    margin-bottom:10px;
  }
  .sidebar-note{
    margin:0;
    font-size:14px;
    line-height:1.7;
    opacity:.82;
  }

  .app{
    width:min(1200px,calc(100% - 24px));
    margin:20px auto 40px;
  }

  .grid{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(190px,1fr));
    gap:16px;
  }
  .card{
    background:#17171d;
    border:1px solid rgba(255,255,255,.06);
    border-radius:18px;
    overflow:hidden;
    transition:.2s transform,.2s box-shadow;
  }
  .card:hover{
    transform:translateY(-3px);
    box-shadow:0 14px 35px rgba(0,0,0,.28);
  }
  .poster-wrap{
    aspect-ratio:2/3;
    background:#101014;
  }
  .poster{
    width:100%;
    height:100%;
    object-fit:cover;
    display:block;
  }
  .content{
    padding:12px;
  }
  .title{
    font-size:15px;
    line-height:1.4;
    font-weight:700;
    margin-bottom:10px;
  }
  .labels{
    display:flex;
    flex-wrap:wrap;
    gap:8px;
  }
  .label{
    display:inline-flex;
    align-items:center;
    padding:5px 10px;
    border-radius:999px;
    background:#262632;
    color:#fff;
    font-size:12px;
    line-height:1;
  }

  .nav-row{
    display:flex;
    gap:10px;
    flex-wrap:wrap;
    align-items:center;
    justify-content:space-between;
    margin:18px 0 22px;
  }
  .nav-group{
    display:flex;
    gap:10px;
    flex-wrap:wrap;
    align-items:center;
  }
  .nav-btn{
    display:inline-flex;
    align-items:center;
    justify-content:center;
    gap:8px;
    padding:11px 16px;
    background:#1b1b21;
    border:1px solid rgba(255,255,255,.08);
    border-radius:999px;
    color:#fff;
    cursor:pointer;
    font-size:14px;
  }
  .nav-btn.disabled{
    opacity:.45;
    pointer-events:none;
  }
  .page-badge{
    display:none;
    align-items:center;
    padding:8px 12px;
    border-radius:999px;
    background:#22222c;
    border:1px solid rgba(255,255,255,.08);
    font-size:13px;
  }
  .search-status{
    display:none;
    margin:0 0 16px;
    font-size:14px;
    opacity:.85;
  }

  .loading{
    padding:30px 16px;
    text-align:center;
    opacity:.8;
  }

  .detail-wrap{
    max-width:1000px;
    margin:0 auto;
  }
  .detail-title{
    margin:0 0 14px;
    font-size:clamp(28px,4vw,44px);
    line-height:1.12;
  }
  .detail-body{
    line-height:1.9;
    font-size:16px;
  }
  .detail-body img{
    max-width:100%;
    height:auto;
  }
  .section-title{
    margin:40px 0 18px;
    font-size:26px;
  }

  .tmdb-popup{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.92);
    display:none;
    align-items:center;
    justify-content:center;
    z-index:70;
    padding:24px;
  }
  .tmdb-popup.active{
    display:flex;
  }
  .tmdb-popup-inner{
    max-width:min(96vw,1200px);
    max-height:90vh;
    display:flex;
    align-items:center;
    justify-content:center;
  }
  #tmdbPopupImg{
    max-width:100%;
    max-height:90vh;
    border-radius:14px;
    transition:opacity .2s;
  }
  .tmdb-close,
  .tmdb-prev,
  .tmdb-next{
    position:absolute;
    border:0;
    cursor:pointer;
    color:#fff;
    background:rgba(255,255,255,.12);
    backdrop-filter:blur(8px);
  }
  .tmdb-close{
    top:18px;
    right:18px;
    width:44px;
    height:44px;
    border-radius:14px;
    font-size:28px;
    line-height:1;
  }
  .tmdb-prev,
  .tmdb-next{
    top:50%;
    transform:translateY(-50%);
    width:46px;
    height:70px;
    border-radius:16px;
    font-size:42px;
    line-height:1;
  }
  .tmdb-prev{left:18px}
  .tmdb-next{right:18px}

  @media (max-width: 820px){
    .topbar{gap:10px}
    .brand-text p{display:none}
    .topbar-center{display:none}
  }
</style>
</head>

<body>
  <div class="sidebar-overlay" id="sidebarOverlay"></div>

  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-profile">
        <div class="sidebar-avatar">M</div>
        <div>
          <h2 style="margin:0;font-size:16px;">Premium Movies</h2>
          <p style="margin:3px 0 0;opacity:.75;font-size:13px;">Fast, clean, modern</p>
        </div>
      </div>
      <button class="sidebar-close" id="sidebarClose" aria-label="Close menu">×</button>
    </div>

    <div class="sidebar-content">
      <div class="sidebar-section">
        <div class="sidebar-section-title">Navigation</div>
        <a class="sidebar-link" href="/"><span class="icon">⌂</span><span>Home</span></a>
        <a class="sidebar-link" href="#detailContent"><span class="icon">★</span><span>Movie Details</span></a>
        <a class="sidebar-link" href="#relatedPostsSection"><span class="icon">☰</span><span>Related Posts</span></a>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-section-title">About</div>
        <p class="sidebar-note">
          Browse the newest movie posts, search instantly, open details, and move through pages with a polished layout.
        </p>
      </div>
    </div>
  </aside>

  <header class="topbar" id="top">
    <a class="brand" href="/" aria-label="Home">
      <div class="brand-logo">M</div>
      <div class="brand-text">
        <h1>Premium Movie Blog</h1>
        <p>Latest movies, clean layout, quick browsing</p>
      </div>
    </a>

    <div class="topbar-center">
      <div class="search-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M21 21l-4.35-4.35" stroke="white" stroke-width="2" stroke-linecap="round"></path>
          <circle cx="11" cy="11" r="7" stroke="white" stroke-width="2"></circle>
        </svg>

        <input id="searchInput" class="search-input" type="search" placeholder="Search movies, labels, titles...">

        <button id="searchClear" class="search-clear" aria-label="Clear search" type="button">×</button>
      </div>
    </div>

    <div class="topbar-actions">
      <button class="menu-btn search-btn" id="searchBtn" aria-label="Search" type="button">
        <svg viewBox="0 0 24 24" fill="none" width="20" height="20" aria-hidden="true">
          <path d="M21 21l-4.35-4.35" stroke="white" stroke-width="2" stroke-linecap="round"></path>
          <circle cx="11" cy="11" r="7" stroke="white" stroke-width="2"></circle>
        </svg>
      </button>

      <button class="menu-btn" id="menuBtn" aria-label="Open menu" type="button">
        <div class="menu-lines" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
      </button>
    </div>
  </header>

  <div class="app">

    <div class="nav-row">
      <div class="nav-group">
        <button class="nav-btn" id="prevBtn" type="button">← Prev</button>
        <span class="page-badge" id="pageBadge"></span>
        <button class="nav-btn" id="nextBtn" type="button">Next →</button>
      </div>
      <button class="nav-btn" id="backBtn" type="button">Back</button>
    </div>

    <p class="search-status" id="searchStatus"></p>

    <div id="posts" class="grid"></div>

    <div id="detailView" class="detail-wrap" style="${foundPost ? "display:block;" : "display:none;"}">
      <div id="detailContent">
        ${serverDetailHtml}
      </div>

      <div id="relatedPostsSection" style="${foundPost ? "margin-top:50px;display:block;" : "display:none;"}">
        <h2 class="section-title">Related Posts</h2>
        <div id="relatedPosts" class="grid">${serverRelatedHtml}</div>
      </div>
    </div>
  </div>

  <div id="tmdbPopup" class="tmdb-popup">
    <button class="tmdb-close" type="button" aria-label="Close image">×</button>
    <button class="tmdb-prev" type="button" aria-label="Previous image">‹</button>
    <div class="tmdb-popup-inner">
      <img id="tmdbPopupImg" alt="">
    </div>
    <button class="tmdb-next" type="button" aria-label="Next image">›</button>
  </div>

<script>
(() => {
  const POSTS_PER_PAGE = 24;
  const MAX_JSON_FILES = 500;
  const countdownPage = '/download';
  const fallbackPoster = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e';

  const postsEl = document.getElementById('posts');
  const detailView = document.getElementById('detailView');
  const detailContent = document.getElementById('detailContent');
  const pagination = document.getElementById('pagination');
  const pageNumEl = document.getElementById('pageNum');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const backBtn = document.getElementById('backBtn');
  const relatedPostsSection = document.getElementById('relatedPostsSection');
  const relatedPostsEl = document.getElementById('relatedPosts');
  const pageBadge = document.getElementById('pageBadge');
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  const searchStatus = document.getElementById('searchStatus');
  const pageTitleEl = document.querySelector('.page-title');
  const brandTitle = document.querySelector('.brand-text h1');
  const searchBtn = document.getElementById('searchBtn');
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const sidebarClose = document.getElementById('sidebarClose');
  const popup = document.getElementById('tmdbPopup');
  const popupImg = document.getElementById('tmdbPopupImg');

  const domainMap = {};
  let currentPage = 1;
  let ALL_POSTS = [];
  let loadedFileIndexes = new Set();
  let nextJsonIndex = 1;
  let noMoreFiles = false;
  let loadingFilePromises = new Map();
  let currentSearch = '';
  let searchTimer = null;
  let currentImages = [];
  let currentIndex = 0;

  function esc(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function slugify(text) {
    return String(text || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function readDomains() {
    document.querySelectorAll('meta[name="video-domain"]').forEach(meta => {
      const id = meta.dataset.id;
      if (id) {
        domainMap[id] = meta.content || '';
      }
    });
  }

  function setPoster(root = document) {
    root.querySelectorAll('.video-wrapper').forEach(wrapper => {
      const posterBox = wrapper.querySelector('.video-poster');
      if (!posterBox) return;
      if (posterBox.dataset.ready) return;
      posterBox.dataset.ready = '1';

      let poster = wrapper.dataset.poster || '';

      if (!poster) {
        const firstPostImage = document.querySelector('#detailContent img');
        if (firstPostImage) {
          poster = firstPostImage.currentSrc || firstPostImage.src || '';
        }
      }

      if (poster) {
        poster = poster.replace(/\/s\d+(-c)?\//, '/s1600/');
      }

      if (!poster) {
        poster = fallbackPoster;
      }

      posterBox.innerHTML = '<img src="' + esc(poster) + '" alt="" draggable="false" loading="eager" decoding="async" style="width:100%;height:100%;object-fit:cover;display:block;">';
    });
  }

  window.playVideo = function(el) {
    const wrapper = el.closest('.video-wrapper');
    if (!wrapper) return;

    const iframe = wrapper.querySelector('.video-player');
    const poster = wrapper.querySelector('.video-poster');
    if (!iframe) return;

    el.style.display = 'none';
    if (poster) poster.style.display = 'none';

    if (!iframe.src) {
      const domainId = wrapper.dataset.domainId || '';
      const domain = domainMap[domainId] || '';
      const path = iframe.dataset.src || '';

      iframe.src = path.startsWith('http') ? path : domain + path;
    }
  };

  function handleDownload(btn) {
    const raw = btn.dataset.url || '';
    if (!raw) return;

    const parts = raw.split('|');
    const path = parts[0] || '';
    const domainKey = parts[1] || '';
    const domain = domainMap[domainKey] || '';

    const finalTarget = path.startsWith('http') ? path : domain + path;
    const url = countdownPage + '?target=' + encodeURIComponent(finalTarget) + '&d=' + encodeURIComponent(domainKey);
    window.location.href = url;
  }

  function loadPopup() {
    currentImages = Array.from(document.querySelectorAll('.tmdb-extra-images img'));
  }

  function refreshGallery() {
    currentImages = Array.from(document.querySelectorAll('.tmdb-extra-images img'));
  }

  function updatePopupImage() {
    if (!popupImg || !currentImages.length) return;

    const img = currentImages[currentIndex];
    let src =
      img.getAttribute('data-src') ||
      img.getAttribute('data-lazy-src') ||
      img.currentSrc ||
      img.src ||
      img.getAttribute('src') ||
      '';

    src = src.replace(/\/s\d+(-c)?\//, '/s1600/');
    popupImg.style.opacity = '0';

    const preload = new Image();
    preload.onload = () => {
      popupImg.src = preload.src;
      requestAnimationFrame(() => {
        popupImg.style.opacity = '1';
      });
    };
    preload.src = src;
  }

  function openPopup(index) {
    if (!popup || !popupImg) return;
    currentIndex = index;
    popup.classList.add('active');
    updatePopupImage();
    history.pushState({ popupOpen: true }, '', window.location.href);
  }

  function closePopup() {
    if (!popup) return;
    popup.classList.remove('active');
  }

  function nextImage() {
    if (!currentImages.length) return;
    currentIndex = (currentIndex + 1) % currentImages.length;
    updatePopupImage();
  }

  function prevImage() {
    if (!currentImages.length) return;
    currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
    updatePopupImage();
  }

  function scrollToTopNow() {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  function setPageTitleVisible(visible) {
    if (pageTitleEl) pageTitleEl.style.display = visible ? 'block' : 'none';
  }

  function setBrandTitleVisible(visible) {
    if (brandTitle) brandTitle.style.display = visible ? 'block' : 'none';
  }

  function openSidebar() {
    if (sidebar) sidebar.classList.add('active');
    if (sidebarOverlay) sidebarOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('active');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function toggleSidebar() {
    if (sidebar && sidebar.classList.contains('active')) closeSidebar();
    else openSidebar();
  }

  function getJsonFile(index) {
    return 'json/posts' + index + '.json';
  }

  function getImage(post) {
    return (
      post.media$thumbnail?.url?.replace('/s72-c/', '/s1200/') ||
      post.content?.$t?.match(/<img.*?src="(.*?)"/i)?.[1] ||
      'https://via.placeholder.com/500x750?text=No+Image'
    );
  }

  function getLabels(post) {
    const labels = (post.category || [])
      .map(c => c.term)
      .filter(label => {
        if (!label) return false;
        const l = label.toLowerCase().trim();
        return l !== 'movies' && l !== 'trending';
      });

    return labels;
  }

  function createCard(post) {
    const image = getImage(post);
    const title = post.title?.$t || 'No Title';
    const labels = getLabels(post);
    const slug = slugify(title);

    return (
      '<a class="card" href="/' + esc(slug) + '" data-slug="' + esc(slug) + '">' +
        '<div class="poster-wrap">' +
          '<img class="poster" src="' + esc(image) + '" loading="lazy" alt="' + esc(title) + '">' +
        '</div>' +
        '<div class="content">' +
          '<div class="title">' + esc(title) + '</div>' +
          '<div class="labels">' +
            labels.slice(0, 6).map(label => '<span class="label">' + esc(label) + '</span>').join('') +
          '</div>' +
        '</div>' +
      '</a>'
    );
  }

  function isViewingPost() {
    return detailView && detailView.style.display === 'block';
  }

  function updatePageBadge() {
    if (!pageBadge) return;

    if (currentSearch) {
      pageBadge.style.display = 'inline-flex';
      pageBadge.textContent = 'Search: ' + currentSearch;
      return;
    }

    if (currentPage > 1 && !isViewingPost()) {
      pageBadge.style.display = 'inline-flex';
      pageBadge.textContent = 'Page ' + currentPage;
    } else {
      pageBadge.style.display = 'none';
      pageBadge.textContent = '';
    }
  }

  function updateNavState() {
    if (prevBtn) {
      if (currentPage <= 1 || currentSearch) {
        prevBtn.classList.add('disabled');
        prevBtn.setAttribute('aria-disabled', 'true');
      } else {
        prevBtn.classList.remove('disabled');
        prevBtn.removeAttribute('aria-disabled');
      }
    }

    if (nextBtn) {
      const atKnownLastPage = noMoreFiles && (currentPage * POSTS_PER_PAGE >= ALL_POSTS.length);

      if (atKnownLastPage || currentSearch) {
        nextBtn.classList.add('disabled');
        nextBtn.setAttribute('aria-disabled', 'true');
      } else {
        nextBtn.classList.remove('disabled');
        nextBtn.removeAttribute('aria-disabled');
      }
    }
  }

  function showHome() {
    setPageTitleVisible(!currentSearch);
    setBrandTitleVisible(true);
    if (postsEl) postsEl.style.display = 'grid';
    if (pagination) pagination.style.display = currentSearch ? 'none' : 'flex';
    if (detailView) detailView.style.display = 'none';
    updatePageBadge();
  }

  function showDetail() {
    setPageTitleVisible(false);
    setBrandTitleVisible(false);
    if (postsEl) postsEl.style.display = 'none';
    if (pagination) pagination.style.display = 'none';
    if (detailView) detailView.style.display = 'block';
    updatePageBadge();
  }

  async function loadJsonFile(index) {
    if (index > MAX_JSON_FILES) {
      noMoreFiles = true;
      return false;
    }

    if (loadedFileIndexes.has(index)) return true;

    if (loadingFilePromises.has(index)) return loadingFilePromises.get(index);

    const promise = (async () => {
      try {
        const file = getJsonFile(index);
        const res = await fetch(file, { cache: 'force-cache' });

        if (!res.ok) {
          if (res.status === 404) noMoreFiles = true;
          return false;
        }

        const data = await res.json();
        const entries = data?.feed?.entry || [];
        ALL_POSTS.push(...entries);
        loadedFileIndexes.add(index);
        return true;
      } catch (err) {
        console.error('Failed to load:', getJsonFile(index), err);
        return false;
      } finally {
        loadingFilePromises.delete(index);
      }
    })();

    loadingFilePromises.set(index, promise);
    return promise;
  }

  async function loadNextJsonFile() {
    if (noMoreFiles) return false;

    const index = nextJsonIndex;
    const ok = await loadJsonFile(index);

    if (ok) {
      nextJsonIndex += 1;
    }

    return ok;
  }

  async function ensurePostsForPage(page) {
    const neededCount = page * POSTS_PER_PAGE;

    while (ALL_POSTS.length < neededCount && !noMoreFiles) {
      const ok = await loadNextJsonFile();
      if (!ok) break;
    }
  }

  async function ensureAllPostsLoaded() {
    while (!noMoreFiles && nextJsonIndex <= MAX_JSON_FILES) {
      const ok = await loadNextJsonFile();
      if (!ok) break;
    }
  }

  async function findPostBySlug(targetSlug) {
    while (!noMoreFiles) {
      const found = ALL_POSTS.find(p => slugify(p.title?.$t || '') === targetSlug);
      if (found) {
        const index = ALL_POSTS.findIndex(p => slugify(p.title?.$t || '') === targetSlug);
        const page = Math.floor(index / POSTS_PER_PAGE) + 1;
        return { post: found, page };
      }

      const ok = await loadNextJsonFile();
      if (!ok) break;
    }

    const finalFound = ALL_POSTS.find(p => slugify(p.title?.$t || '') === targetSlug);
    if (finalFound) {
      const index = ALL_POSTS.findIndex(p => slugify(p.title?.$t || '') === targetSlug);
      const page = Math.floor(index / POSTS_PER_PAGE) + 1;
      return { post: finalFound, page };
    }

    return null;
  }

  function renderDetailHeader(post) {
    const title = post.title?.$t || 'No Title';
    const labels = getLabels(post);

    return (
      '<h1 class="detail-title">' + esc(title) + '</h1>' +
      '<div class="labels" style="margin-bottom:18px;display:flex;flex-wrap:wrap;gap:8px;">' +
        labels.slice(0, 8).map(label => '<span class="label">' + esc(label) + '</span>').join('') +
      '</div>'
    );
  }

  async function loadRelatedPosts(currentSlug) {
    try {
      await ensureAllPostsLoaded();

      if (relatedPostsSection) relatedPostsSection.style.display = 'block';
      if (relatedPostsEl) relatedPostsEl.innerHTML = '<div class="loading">Loading related posts...</div>';

      const relatedPosts = ALL_POSTS
        .filter(post => slugify(post.title?.$t || '') !== currentSlug)
        .slice(0, 24);

      if (!relatedPosts.length) {
        if (relatedPostsSection) relatedPostsSection.style.display = 'none';
        if (relatedPostsEl) relatedPostsEl.innerHTML = '';
        return;
      }

      if (relatedPostsEl) relatedPostsEl.innerHTML = relatedPosts.map(post => createCard(post)).join('');
    } catch (e) {
      if (relatedPostsSection) relatedPostsSection.style.display = 'block';
      if (relatedPostsEl) relatedPostsEl.innerHTML = '<div class="loading">Failed to load related posts</div>';
    }
  }

  async function openPost(targetSlug, addHistory = true) {
    scrollToTopNow();
    closeSidebar();
    currentSearch = '';
    if (searchInput) searchInput.value = '';
    if (searchClear) searchClear.classList.remove('show');
    if (searchStatus) searchStatus.style.display = 'none';
    showDetail();

    if (detailContent) detailContent.innerHTML = '<div class="loading">Loading post...</div>';
    if (relatedPostsSection) relatedPostsSection.style.display = 'none';
    if (relatedPostsEl) relatedPostsEl.innerHTML = '';

    const result = await findPostBySlug(targetSlug);

    if (!result) {
      if (detailContent) detailContent.innerHTML = '<h2>Post not found</h2>';
      updateNavState();
      updatePageBadge();
      scrollToTopNow();
      return;
    }

    const post = result.post;
    const foundPage = result.page || 1;
    const postTitle = post.title?.$t || 'No Title';
    document.title = postTitle;

    currentPage = foundPage;
    if (pageNumEl) pageNumEl.innerText = String(currentPage);

    const content = post.content?.$t || '';

    if (detailContent) {
      detailContent.innerHTML = renderDetailHeader(post) + '<div class="detail-body">' + content + '</div>';
    }

    if (prevBtn) prevBtn.href = '?page=' + (currentPage > 1 ? currentPage - 1 : 1);
    if (nextBtn) nextBtn.href = '?page=' + (currentPage + 1);
    if (backBtn) backBtn.href = '?page=' + foundPage;

    if (addHistory) {
      history.pushState({ page: foundPage, post: targetSlug }, '', '?post=' + encodeURIComponent(targetSlug));
    }

    await loadRelatedPosts(targetSlug);
    updateNavState();
    updatePageBadge();
    scrollToTopNow();
    setPoster();
    readDomains();
    loadPopup();
  }

  async function renderPage(page, addHistory = true) {
    scrollToTopNow();
    closeSidebar();
    currentSearch = '';
    if (searchStatus) searchStatus.style.display = 'none';
    if (searchInput) searchInput.value = '';
    if (searchClear) searchClear.classList.remove('show');

    setPageTitleVisible(true);
    setBrandTitleVisible(true);

    if (postsEl) postsEl.innerHTML = '<div class="loading">Loading Premium Movies...</div>';

    await ensurePostsForPage(page);

    const totalLoadedPages = Math.max(1, Math.ceil(ALL_POSTS.length / POSTS_PER_PAGE));
    currentPage = Math.min(Math.max(1, page), totalLoadedPages);

    const start = (currentPage - 1) * POSTS_PER_PAGE;
    const end = start + POSTS_PER_PAGE;
    const pagePosts = ALL_POSTS.slice(start, end);

    if (postsEl) postsEl.innerHTML = pagePosts.map(post => createCard(post)).join('');
    if (pageNumEl) pageNumEl.innerText = String(currentPage);

    if (prevBtn) prevBtn.href = '?page=' + (currentPage > 1 ? currentPage - 1 : 1);
    if (nextBtn) nextBtn.href = '?page=' + (currentPage + 1);
    if (backBtn) backBtn.href = '?page=' + currentPage;

    if (relatedPostsSection) relatedPostsSection.style.display = 'none';
    if (relatedPostsEl) relatedPostsEl.innerHTML = '';
    if (detailView) detailView.style.display = 'none';
    if (pagination) pagination.style.display = 'flex';

    if (addHistory) {
      history.pushState({ page: currentPage }, '', '?page=' + currentPage);
    }

    updateNavState();
    updatePageBadge();
    scrollToTopNow();
  }

  function matchesSearch(post, query) {
    const title = (post.title?.$t || '').toLowerCase();
    const labels = getLabels(post).join(' ').toLowerCase();
    const content = (post.content?.$t || '').toLowerCase();
    return title.includes(query) || labels.includes(query) || content.includes(query);
  }

  async function renderSearchResults(query, addHistory = true) {
    const q = query.trim().toLowerCase();

    if (!q) {
      if (searchStatus) searchStatus.style.display = 'none';
      currentSearch = '';
      if (addHistory) history.pushState({ page: currentPage }, '', '?page=' + currentPage);
      await renderPage(currentPage, false);
      return;
    }

    scrollToTopNow();
    closeSidebar();
    showHome();
    setPageTitleVisible(false);

    currentSearch = query.trim();
    if (searchStatus) {
      searchStatus.style.display = 'block';
      searchStatus.textContent = 'Searching for “' + currentSearch + '”…';
    }

    if (postsEl) postsEl.innerHTML = '<div class="loading">Searching all posts...</div>';
    if (pagination) pagination.style.display = 'none';

    await ensureAllPostsLoaded();

    const results = ALL_POSTS.filter(post => matchesSearch(post, q));

    if (results.length) {
      if (postsEl) postsEl.innerHTML = results.map(post => createCard(post)).join('');
      if (searchStatus) {
        searchStatus.textContent = 'Showing ' + results.length + ' result' + (results.length === 1 ? '' : 's') + ' for “' + currentSearch + '”';
      }
    } else {
      if (postsEl) postsEl.innerHTML = '<div class="loading">No results found for “' + esc(currentSearch) + '”</div>';
      if (searchStatus) searchStatus.textContent = 'No results found for “' + currentSearch + '”';
    }

    if (pageNumEl) pageNumEl.innerText = 'Search';

    if (prevBtn) {
      prevBtn.classList.add('disabled');
      prevBtn.setAttribute('aria-disabled', 'true');
    }
    if (nextBtn) {
      nextBtn.classList.add('disabled');
      nextBtn.setAttribute('aria-disabled', 'true');
    }

    if (pageBadge) {
      pageBadge.style.display = 'inline-flex';
      pageBadge.textContent = 'Search: ' + currentSearch;
    }

    if (addHistory) {
      history.pushState({ search: currentSearch }, '', '?search=' + encodeURIComponent(currentSearch));
    }

    scrollToTopNow();
  }

  function handleSearchInput() {
    const value = searchInput ? searchInput.value : '';
    if (searchClear) {
      if (value.trim()) searchClear.classList.add('show');
      else searchClear.classList.remove('show');
    }

    if (searchBtn) {
      searchBtn.classList.toggle('active', !!value.trim() || document.activeElement === searchInput);
    }

    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      renderSearchResults(value, true);
    }, 300);
  }

  function initExtras() {
    readDomains();
    loadPopup();
    setPoster();
  }

  async function initFromURL() {
    scrollToTopNow();
    closeSidebar();
    initExtras();

    const params = new URLSearchParams(window.location.search);
    const page = parseInt(params.get('page') || '1', 10);
    const slug = params.get('post');
    const search = params.get('search') || '';

    currentPage = Number.isFinite(page) && page > 0 ? page : 1;
    if (pageNumEl) pageNumEl.innerText = String(currentPage);

    if (search) {
      if (searchInput) searchInput.value = search;
      if (searchClear) searchClear.classList.add('show');
      if (searchBtn) searchBtn.classList.add('active');
      await renderSearchResults(search, false);
    } else if (slug) {
      await openPost(slug, false);
    } else {
      await renderPage(currentPage, false);
    }

    scrollToTopNow();
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeSidebar();
      if (prevBtn.classList.contains('disabled')) return;
      if (currentPage > 1 && !currentSearch) {
        renderPage(currentPage - 1, true);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeSidebar();
      if (nextBtn.classList.contains('disabled')) return;
      if (!currentSearch) {
        renderPage(currentPage + 1, true);
      }
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeSidebar();
      history.back();
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
      searchBtn.classList.add('active');
    });
  }

  if (searchInput) {
    searchInput.addEventListener('focus', () => {
      if (searchBtn) searchBtn.classList.add('active');
    });

    searchInput.addEventListener('blur', () => {
      if (searchBtn && !searchInput.value.trim()) {
        searchBtn.classList.remove('active');
      }
    });

    searchInput.addEventListener('input', handleSearchInput);

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(searchTimer);
        renderSearchResults(searchInput.value, true);
      }
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchClear.classList.remove('show');
      if (searchBtn) searchBtn.classList.remove('active');
      currentSearch = '';
      if (searchStatus) searchStatus.style.display = 'none';
      renderPage(currentPage, true);
      if (searchInput) searchInput.focus();
    });
  }

  if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
  if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });

  window.addEventListener('popstate', () => {
    if (popup && popup.classList.contains('active')) {
      closePopup();
    }
    initFromURL();
  });

  document.addEventListener('click', (e) => {
    const downloadBtn = e.target.closest('.button-link');
    if (downloadBtn) {
      e.preventDefault();
      handleDownload(downloadBtn);
      return;
    }

    const overlay = e.target.closest('.video-overlay');
    if (overlay) {
      e.preventDefault();
      playVideo(overlay);
      return;
    }

    const galleryImg = e.target.closest('.tmdb-extra-images img');
    if (galleryImg) {
      refreshGallery();
      const index = currentImages.indexOf(galleryImg);
      if (index !== -1) {
        setTimeout(() => openPopup(index), 100);
      }
      return;
    }

    if (e.target.closest('.tmdb-close')) {
      closePopup();
      history.back();
      return;
    }

    if (e.target.closest('.tmdb-next')) {
      nextImage();
      return;
    }

    if (e.target.closest('.tmdb-prev')) {
      prevImage();
      return;
    }

    if (popup && e.target === popup) {
      closePopup();
      history.back();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!popup || !popup.classList.contains('active')) return;

    switch (e.key) {
      case 'ArrowRight':
        nextImage();
        break;
      case 'ArrowLeft':
        prevImage();
        break;
      case 'Escape':
        closePopup();
        history.back();
        break;
    }
  });

  let touchStartX = 0;
  let touchEndX = 0;

  document.addEventListener('touchstart', (e) => {
    if (!popup || !popup.classList.contains('active')) return;
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!popup || !popup.classList.contains('active')) return;
    touchEndX = e.changedTouches[0].screenX;

    if (touchStartX - touchEndX > 50) nextImage();
    if (touchEndX - touchStartX > 50) prevImage();
  }, { passive: true });

  const observer = new MutationObserver(() => {
    setPoster();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  initFromURL();
})();
</script>

</body>
</html>
`;

  return new Response(html, {
    headers: {
      "content-type": "text/html;charset=UTF-8",
    },
  });
}
