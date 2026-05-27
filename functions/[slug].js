export async function onRequest(context) {
  const { params, request } = context;

  const slug = params.slug || "";
  const urlObj = new URL(request.url);
  const pathname = urlObj.pathname;
  const pathnameLower = pathname.toLowerCase();

  // Let static files load normally
  if (/\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|json|txt|xml)$/i.test(pathname)) {
    return context.next();
  }

  // Let home page load normally
  if (pathname === "/" || pathname === "/index.html") {
    return context.next();
  }

  // Special pages
  const specialPages = [
    "/download",
    "/telugu",
    "/tamil",
    "/malayalam",
    "/kannada",
    "/hindi",
    "/english",
  ];

  // Redirect /telugu -> /telugu/ so it behaves like a folder page
  if (specialPages.includes(pathnameLower) && !pathname.endsWith("/")) {
    return Response.redirect(new URL(pathname + "/", request.url).toString(), 301);
  }

  // Let special pages load normally with trailing slash
  if (specialPages.includes(pathnameLower.replace(/\/$/, "")) && pathname.endsWith("/")) {
    return context.next();
  }

  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  let foundPost = null;
  let allPosts = [];

  // SEARCH POSTS
  for (let i = 1; i <= 500; i++) {
    const url = new URL(`/json/posts${i}.json`, request.url);

    try {
      const res = await fetch(url);

      if (!res.ok) break;

      const data = await res.json();
      const posts = data?.feed?.entry || [];

      allPosts.push(...posts);

      for (const post of posts) {
        const title = post.title?.$t || "";
        if (slugify(title) === slug) {
          foundPost = post;
        }
      }

      if (foundPost) break;
    } catch (err) {
      break;
    }
  }

  // NOT FOUND
  if (!foundPost) {
    return new Response("Post not found", {
      status: 404,
      headers: {
        "content-type": "text/plain;charset=UTF-8",
      },
    });
  }

  // POST DATA
  const title = foundPost.title?.$t || "No Title";
  const rawContent = foundPost.content?.$t || "";

  // First image from content
  const firstContentImageMatch = rawContent.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
  const firstContentImage = firstContentImageMatch?.[1] || "";

  // Featured image
  const image =
    firstContentImage ||
    foundPost.media$thumbnail?.url?.replace("/s72-c/", "/s1200/") ||
    "";

  // CLEAN CONTENT
  let content = rawContent;

  // Remove first image
  if (firstContentImageMatch?.[0]) {
    content = content.replace(firstContentImageMatch[0], "");
  }

  // Remove ALL h1 tags from body so only the title h1 remains
  content = content.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, "");

  // LABELS
  const labels = (foundPost.category || [])
    .map((c) => c.term)
    .filter(Boolean);

  // RELATED POSTS
  const relatedPosts = allPosts
    .filter((post) => slugify(post.title?.$t || "") !== slug)
    .slice(0, 24);

  // CARD FUNCTION
  function createCard(post) {
    const postTitle = post.title?.$t || "No Title";
    const postSlug = slugify(postTitle);

    const postImage =
      post.content?.$t?.match(/<img.*?src="(.*?)"/i)?.[1] ||
      post.media$thumbnail?.url?.replace("/s72-c/", "/s1200/") ||
      "https://via.placeholder.com/500x750?text=No+Image";

    return `
      <a class="card" href="/${postSlug}">
        <div class="poster-wrap">
          <img class="poster" src="${postImage}" alt="${postTitle}">
        </div>
        <div class="content">
          <div class="title">${postTitle}</div>
        </div>
      </a>
    `;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base href="/">
<title>${title}</title>
<link rel="stylesheet" href="/style.css">
<script src="/script.js" defer></script>
<script src="/anotherjs.js" defer></script>
<meta content="no-referrer" name="referrer"/>
<meta content="https://hashgen.website" data-id="d1" name="video-domain"/>
</head>

<body>

  <div class="sidebar-overlay" id="sidebarOverlay"></div>

  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-profile">
        <div class="sidebar-avatar">M</div>
        <div>
          <h2>Premium Movies</h2>
          <p>Fast, clean, modern</p>
        </div>
      </div>

      <button class="sidebar-close" id="sidebarClose" aria-label="Close menu">×</button>
    </div>

    <div class="sidebar-content">
      <div class="sidebar-section">
        <div class="sidebar-section-title">Navigation</div>

        <a class="sidebar-link" href="/">
          <span class="icon">⌂</span>
          <span>Home</span>
        </a>

        <a class="sidebar-link" href="#detailContent">
          <span class="icon">★</span>
          <span>Movie Details</span>
        </a>

        <a class="sidebar-link" href="#relatedPostsSection">
          <span class="icon">☰</span>
          <span>Related Posts</span>
        </a>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-section-title">About</div>
        <p class="sidebar-note">
          Browse the newest movie posts, search instantly, open details,
          and move through pages with a polished layout.
        </p>
      </div>
    </div>
  </aside>

  <header class="topbar" id="top">
    <a class="brand" href="/" aria-label="Home">
      <div class="brand-logo">M</div>
      <div class="brand-text">
        <div class="site-title">Premium Movie Blog</div>
        <p>Latest movies, clean layout, quick browsing</p>
      </div>
    </a>

    <div class="topbar-center">
      <div class="search-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M21 21l-4.35-4.35" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <circle cx="11" cy="11" r="7" stroke="white" stroke-width="2"/>
        </svg>

        <input
          id="searchInput"
          class="search-input"
          type="search"
          placeholder="Search movies, labels, titles..."
        >

        <button
          id="searchClear"
          class="search-clear"
          aria-label="Clear search"
          type="button"
        >×</button>
      </div>
    </div>

    <div class="topbar-actions">
      <button class="menu-btn search-btn" id="searchBtn" aria-label="Search" type="button">
        <svg viewBox="0 0 24 24" fill="none" width="20" height="20" aria-hidden="true">
          <path d="M21 21l-4.35-4.35" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <circle cx="11" cy="11" r="7" stroke="white" stroke-width="2"/>
        </svg>
      </button>

      <button class="menu-btn" id="menuBtn" aria-label="Open menu" type="button">
        <div class="menu-lines" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>
    </div>
  </header>

  <div class="app">
    <div id="detailView" style="display:block;max-width:1000px;margin:auto;">
      <a href="/" class="nav-btn" style="margin-bottom:20px;display:inline-flex;">
        ⬅ Back
      </a>

      <div id="detailContent">
        <h1 class="detail-title">${title}</h1>

        <div class="labels" style="margin-bottom:18px;display:flex;flex-wrap:wrap;gap:8px;">
          ${labels
            .map(
              (label) => `
              <span class="label">${label}</span>
            `
            )
            .join("")}
        </div>

        ${image ? `
          <img
            src="${image}"
            alt="${title}"
            style="
              width:100%;
              max-width:520px;
              display:block;
              margin:0 auto 20px auto;
              border-radius:20px;
            ">
        ` : ""}

        <div class="detail-body">
          ${content}
        </div>
      </div>

      <div id="relatedPostsSection" style="margin-top:50px;">
        <h2 style="margin-bottom:20px;font-size:28px;">Related Posts</h2>

        <div id="relatedPosts" class="grid">
          ${relatedPosts.map((post) => createCard(post)).join("")}
        </div>
      </div>
    </div>
  </div>

  <script>
    document.addEventListener("DOMContentLoaded", () => {
      const sidebar = document.getElementById("sidebar");
      const sidebarOverlay = document.getElementById("sidebarOverlay");

      const menuBtn = document.getElementById("menuBtn");
      const sidebarClose = document.getElementById("sidebarClose");

      const searchBtn = document.getElementById("searchBtn");
      const searchInput = document.getElementById("searchInput");
      const searchClear = document.getElementById("searchClear");

      function openSidebar() {
        sidebar?.classList.add("active");
        sidebarOverlay?.classList.add("active");
        document.body.style.overflow = "hidden";
      }

      function closeSidebar() {
        sidebar?.classList.remove("active");
        sidebarOverlay?.classList.remove("active");
        document.body.style.overflow = "";
      }

      function runSearch() {
        const value = searchInput?.value.trim();
        if (!value) return;
        window.location.href = "/?search=" + encodeURIComponent(value);
      }

      menuBtn?.addEventListener("click", openSidebar);
      sidebarClose?.addEventListener("click", closeSidebar);
      sidebarOverlay?.addEventListener("click", closeSidebar);

      searchBtn?.addEventListener("click", runSearch);

      searchClear?.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        searchInput?.focus();
      });

      searchInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          runSearch();
        }
      });
    });
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
