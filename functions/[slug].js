export async function onRequest(context) {

  const { params, request } = context;

  const slug = params.slug || "";
  const urlObj = new URL(request.url);
  const pathname = urlObj.pathname;

  // Let static files load normally
  if (/\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|json|txt|xml)$/i.test(pathname)) {
    return context.next();
  }

  // Let home page load normally
  if (pathname === "/" || pathname === "/index.html") {
    return context.next();
  }

  // Let /download page load normally
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

  let foundPost = null;
  let allPosts = [];

  // SEARCH POSTS
  for (let i = 1; i <= 500; i++) {

    const url = new URL("/json/posts" + i + ".json", request.url);

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
    });
  }

  // POST DATA
  const title = foundPost.title?.$t || "No Title";
  const rawContent = foundPost.content?.$t || "";

  // First image from content
  const firstContentImageMatch =
    rawContent.match(/<img[^>]*src="([^"]+)"[^>]*>/i);

  const firstContentImage =
    firstContentImageMatch?.[1] || "";

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

  // Remove ALL h1 tags from body
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

    return (
      '<a class="card" href="/' + postSlug + '">' +
      '<div class="poster-wrap">' +
      '<img class="poster" src="' + postImage + '" alt="' + postTitle + '">' +
      '</div>' +
      '<div class="content">' +
      '<div class="title">' + postTitle + '</div>' +
      '</div>' +
      '</a>'
    );
  }

  const html =
'<!DOCTYPE html>' +
'<html lang="en">' +

'<head>' +
'<meta charset="UTF-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +

'<title>' + title + '</title>' +

'<link rel="stylesheet" href="/style.css">' +
'<script src="/script.js" defer></script>' +

'<meta content="no-referrer" name="referrer"/>' +
'<meta content="https://hashgen.website" data-id="d1" name="video-domain"/>' +
'</head>' +

'<body>' +

'<div id="detailView" style="display:block;max-width:1000px;margin:auto;">' +

'<a href="/" class="nav-btn" style="margin-bottom:20px;display:inline-flex;">⬅ Back</a>' +

'<div id="detailContent">' +

'<h1 class="detail-title">' + title + '</h1>' +

'<div class="labels" style="margin-bottom:18px;display:flex;flex-wrap:wrap;gap:8px;">' +

labels.map(function(label) {
  return '<span class="label">' + label + '</span>';
}).join("") +

'</div>' +

(
  image
    ? '<img src="' + image + '" alt="' + title + '" style="width:100%;max-width:520px;display:block;margin:0 auto 20px auto;border-radius:20px;">'
    : ''
) +

'<div class="detail-body">' +
content +
'</div>' +

'</div>' +

'<div id="relatedPostsSection" style="margin-top:50px;">' +

'<h2 style="margin-bottom:20px;font-size:28px;">Related Posts</h2>' +

'<div id="relatedPosts" class="grid">' +
relatedPosts.map(createCard).join("") +
'</div>' +

'</div>' +
'</div>' +

'<div id="tmdbPopup" class="tmdb-popup">' +
'<button class="tmdb-close" type="button">×</button>' +
'<button class="tmdb-prev" type="button">‹</button>' +
'<div class="tmdb-popup-inner">' +
'<img id="tmdbPopupImg" alt="">' +
'</div>' +
'<button class="tmdb-next" type="button">›</button>' +
'</div>' +

'<script>' +

'(function(){' +

'const countdownPage="/download";' +
'const fallbackPoster="https://images.unsplash.com/photo-1507525428034-b723cf961d3e";' +

'const domainMap={};' +

'document.querySelectorAll(\'meta[name="video-domain"]\').forEach(function(meta){' +
'const id=meta.dataset.id;' +
'if(id){domainMap[id]=meta.content||"";}' +
'});' +

'function setPoster(root){' +

'root=(root||document);' +

'root.querySelectorAll(".video-wrapper").forEach(function(wrapper){' +

'const posterBox=wrapper.querySelector(".video-poster");' +
'if(!posterBox)return;' +
'if(posterBox.dataset.ready)return;' +

'posterBox.dataset.ready="1";' +

'let poster=wrapper.dataset.poster;' +

'if(!poster){' +
'const firstPostImage=document.querySelector("#detailContent img");' +
'if(firstPostImage){' +
'poster=firstPostImage.currentSrc||firstPostImage.src;' +
'}' +
'}' +

'if(poster){' +
'poster=poster.replace(/\\/s\\d+(-c)?\\//,"/s1600/");' +
'}' +

'if(!poster){poster=fallbackPoster;}' +

'posterBox.innerHTML=' +
'\'<img src="\'+poster+\'" alt="" draggable="false" loading="eager" decoding="async" style="width:100%;height:100%;object-fit:cover;display:block;">\';' +

'});' +
'}' +

'window.playVideo=function(el){' +

'const wrapper=el.closest(".video-wrapper");' +
'if(!wrapper)return;' +

'const iframe=wrapper.querySelector(".video-player");' +
'const poster=wrapper.querySelector(".video-poster");' +

'if(!iframe)return;' +

'el.style.display="none";' +

'if(poster){poster.style.display="none";}' +

'if(!iframe.src){' +

'const domainId=wrapper.dataset.domainId||"";' +
'const domain=domainMap[domainId]||"";' +
'const path=iframe.dataset.src||"";' +

'iframe.src=path.startsWith("http") ? path : domain + path;' +
'}' +

'};' +

'function handleDownload(btn){' +

'const raw=btn.dataset.url||"";' +
'if(!raw)return;' +

'const parts=raw.split("|");' +

'const path=parts[0]||"";' +
'const domainKey=parts[1]||"";' +

'const domain=domainMap[domainKey]||"";' +

'const finalTarget=path.startsWith("http") ? path : domain + path;' +

'const url=' +
'countdownPage+' +
'\'?target=\'+encodeURIComponent(finalTarget)+' +
'\'&d=\'+encodeURIComponent(domainKey);' +

'window.location.href=url;' +
'}' +

'let popup=document.getElementById("tmdbPopup");' +
'let popupImg=document.getElementById("tmdbPopupImg");' +

'let currentImages=[];' +
'let currentIndex=0;' +

'function refreshGallery(){' +
'currentImages=Array.from(document.querySelectorAll(".tmdb-extra-images img"));' +
'}' +

'function updatePopupImage(){' +

'if(!popupImg || !currentImages.length)return;' +

'const img=currentImages[currentIndex];' +

'let src=' +
'img.getAttribute("data-src")||' +
'img.getAttribute("data-lazy-src")||' +
'img.currentSrc||' +
'img.src||"";' +

'src=src.replace(/\\/s\\d+(-c)?\\//,"/s1600/");' +

'popupImg.src=src;' +
'}' +

'function openPopup(index){' +
'currentIndex=index;' +
'popup.classList.add("active");' +
'updatePopupImage();' +
'}' +

'function closePopup(){' +
'popup.classList.remove("active");' +
'}' +

'function nextImage(){' +
'if(!currentImages.length)return;' +
'currentIndex=(currentIndex+1)%currentImages.length;' +
'updatePopupImage();' +
'}' +

'function prevImage(){' +
'if(!currentImages.length)return;' +
'currentIndex=(currentIndex-1+currentImages.length)%currentImages.length;' +
'updatePopupImage();' +
'}' +

'document.addEventListener("click",function(e){' +

'const downloadBtn=e.target.closest(".button-link");' +
'if(downloadBtn){' +
'e.preventDefault();' +
'handleDownload(downloadBtn);' +
'return;' +
'}' +

'const overlay=e.target.closest(".video-overlay");' +
'if(overlay){' +
'e.preventDefault();' +
'playVideo(overlay);' +
'return;' +
'}' +

'const galleryImg=e.target.closest(".tmdb-extra-images img");' +

'if(galleryImg){' +
'refreshGallery();' +
'const index=currentImages.indexOf(galleryImg);' +
'if(index!==-1){openPopup(index);}' +
'return;' +
'}' +

'if(e.target.closest(".tmdb-close")){' +
'closePopup();' +
'return;' +
'}' +

'if(e.target.closest(".tmdb-next")){' +
'nextImage();' +
'return;' +
'}' +

'if(e.target.closest(".tmdb-prev")){' +
'prevImage();' +
'return;' +
'}' +

'if(popup && e.target===popup){' +
'closePopup();' +
'}' +

'});' +

'document.addEventListener("keydown",function(e){' +

'if(!popup || !popup.classList.contains("active"))return;' +

'if(e.key==="ArrowRight"){nextImage();}' +
'if(e.key==="ArrowLeft"){prevImage();}' +
'if(e.key==="Escape"){closePopup();}' +

'});' +

'setPoster();' +

'})();' +

'</script>' +

'</body>' +
'</html>';

  return new Response(html, {
    headers: {
      "content-type": "text/html;charset=UTF-8",
    },
  });

}
