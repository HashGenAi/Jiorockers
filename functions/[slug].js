export async function onRequest(context) {
  const { params, request } = context;
  const slug = params.slug;

  function slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  let foundPost = null;

  for (let i = 1; i <= 500; i++) {
    const url = new URL(`/json/posts${i}.json`, request.url);

    try {
      const res = await fetch(url);

      if (!res.ok) break;

      const data = await res.json();
      const posts = data?.feed?.entry || [];

      for (const post of posts) {
        const title = post.title?.$t || "";

        if (slugify(title) === slug) {
          foundPost = post;
          break;
        }
      }

      if (foundPost) break;

    } catch {
      break;
    }
  }

  if (!foundPost) {
    return new Response("Post not found", {
      status: 404
    });
  }

  const title = foundPost.title?.$t || "No Title";
  const content = foundPost.content?.$t || "";

  return new Response(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>

<body>

<a href="/">⬅ Back</a>

<h1>${title}</h1>

<div>
${content}
</div>

</body>
</html>
`, {
    headers: {
      "content-type": "text/html;charset=UTF-8"
    }
  });
}
