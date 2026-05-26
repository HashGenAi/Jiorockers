export async function onRequest(context) {
  const { params, request } = context;

  const slug = params.slug || "";
  const pathname = new URL(request.url).pathname;

  // Let static files load normally
  if (/\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|json|txt|xml)$/i.test(pathname)) {
    return context.next();
  }

  function slugify(text) {
    return text
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
      status: 404
    });
  }

  // POST DATA
  const title = foundPost.title?.$t || "No Title";
  const content = foundPost.content?.$t || "";

  // IMAGE
  const image =
    foundPost.media$thumbnail?.url?.replace("/s72-c/", "/s1200/") ||
    foundPost.content?.$t?.match(/<img.*?src="(.*?)"/i)?.[1] ||
    "";

  // LABELS
  const labels = (foundPost.category || [])
    .map(c => c.term)
    .filter(Boolean);

  // RELATED POSTS
  const relatedPosts = allPosts
    .filter(post => slugify(post.title?.$t || "") !== slug)
    .slice(0, 24);

  // CARD FUNCTION
  function createCard(post) {
    const postTitle = post.title?.$t || "No Title";
    const postSlug = slugify(postTitle);

    const postImage =
      post.media$thumbnail?.url?.replace("/s72-c/", "/s1200/") ||
      post.content?.$t?.match(/<img.*?src="(.*?)"/i)?.[1] ||
      "https://via.placeholder.com/500x750?text=No+Image";

    return `
      <a class="card" href="/${postSlug}">
        <div class="poster-wrap">
          <img class="poster" src="${postImage}" alt="${postTitle}">
        </div>

        <div class="content">
          <div class="title">
            ${postTitle}
          </div>
        </div>
      </a>
    `;
  }

  // HTML
  const html = `
<!DOCTYPE html>
<html lang="en">

<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="/style.css">
<meta content="no-referrer" name="referrer"/>
</head>

<body>

<header class="topbar">
  <a class="brand" href="/">
    <div class="brand-logo">
      M
    </div>

    <div class="brand-text">
      <h1>
        Premium Movie Blog
      </h1>

      <p>
        Latest movies, clean layout, quick browsing
      </p>
    </div>
  </a>
</header>

<div class="app">
  <div id="detailView" style="display:block;max-width:1000px;margin:auto;">
    <a href="/" class="nav-btn" style="margin-bottom:20px;display:inline-flex;">
      ⬅ Back
    </a>

    <div id="detailContent">
      <h1 class="detail-title">
        ${title}
      </h1>

      <div class="labels" style="margin-bottom:18px;display:flex;flex-wrap:wrap;gap:8px;">
        ${labels
          .map(label => `
            <span class="label">
              ${label}
            </span>
          `)
          .join("")}
      </div>

      ${
        image
          ? `
        <img
          src="${image}"
          style="width:100%;border-radius:20px;margin-bottom:20px;display:block;">
      `
          : ""
      }

      <div class="detail-body">
        ${content}
      </div>
    </div>

    <div id="relatedPostsSection" style="margin-top:50px;">
      <h2 style="margin-bottom:20px;font-size:28px;">
        Related Posts
      </h2>

      <div id="relatedPosts" class="grid">
        ${relatedPosts.map(post => createCard(post)).join("")}
      </div>
    </div>
  </div>
</div>

<script src="/script.js"></script>

</body>
</html>
`;

  return new Response(html, {
    headers: {
      "content-type": "text/html;charset=UTF-8"
    }
  });
}
