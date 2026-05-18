// download-next-assets.js
// Usage: node download-next-assets.js

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function walk(dir) {
  let results = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results = results.concat(walk(full));
    } else if (entry.name.endsWith(".html")) {
      results.push(full);
    }
  }

  return results;
}

function extractLinks(html) {
  const links = new Set();

  // href="/_next/..."
  const hrefRegex = /href=["']([^"']*\/_next\/[^"']+)["']/g;

  // src="/_next/..."
  const srcRegex = /src=["']([^"']*\/_next\/[^"']+)["']/g;

  let match;

  while ((match = hrefRegex.exec(html)) !== null) {
    links.add(match[1]);
  }

  while ((match = srcRegex.exec(html)) !== null) {
    links.add(match[1]);
  }

  return [...links];
}

async function download(url) {
  try {
    const u = new URL(url);

    // save path relative to project root
    const savePath = path.join(ROOT, u.pathname.replace(/^\//, ""));

    // skip duplicate files
    if (fs.existsSync(savePath)) {
      console.log("SKIP", u.pathname);
      return;
    }

    fs.mkdirSync(path.dirname(savePath), { recursive: true });

    console.log("DOWNLOADING", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    fs.writeFileSync(savePath, buffer);
  } catch (err) {
    console.error("FAILED", url);
  }
}

(async () => {
  const htmlFiles = walk(ROOT);

  const allLinks = new Set();

  for (const file of htmlFiles) {
    console.log("Scanning", file);

    const html = fs.readFileSync(file, "utf8");

    for (const link of extractLinks(html)) {
      let absolute;

      if (link.startsWith("http")) {
        absolute = link;
      } else {
        // infer domain from first absolute URL in html
        const domainMatch = html.match(/https?:\/\/[^/"']+/);

        if (!domainMatch) continue;

        absolute = domainMatch[0] + link;
      }

      allLinks.add(absolute);
    }
  }

  console.log(`Found ${allLinks.size} assets`);

  for (const url of allLinks) {
    await download(url);
  }

  console.log("Done");
})();
