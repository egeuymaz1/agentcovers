(function () {
  "use strict";

  var MEDIA_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov"];
  var VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];
  var state = {
    agents: [],
    filtered: [],
  };

  var gallery = document.getElementById("gallery");
  var emptyState = document.getElementById("emptyState");
  var videoObserver = null;

  boot();

  async function boot() {
    state.agents = await loadAgents();
    state.filtered = state.agents;
    setupVideoObserver();
    render();
  }

  async function loadAgents() {
    if (isGithubPages()) {
      try {
        var githubAgents = await loadFromGithubContents();
        if (githubAgents.length) return githubAgents;
      } catch (error) {
        console.warn("GitHub tarama basarisiz, manifest kullaniliyor.", error);
      }
    }

    if (Array.isArray(window.POOLSITE_MANIFEST)) {
      return window.POOLSITE_MANIFEST.map(normalizeAgent).sort(sortAgents);
    }

    return [];
  }

  function isGithubPages() {
    return /\.github\.io$/i.test(window.location.hostname);
  }

  async function loadFromGithubContents() {
    var repoInfo = getGithubRepoInfo();
    if (!repoInfo) return [];

    var files = await scanGithubDirectory(repoInfo, "covers");
    return groupFilesIntoAgents(files).sort(sortAgents);
  }

  function getGithubRepoInfo() {
    var hostParts = window.location.hostname.split(".");
    var owner = hostParts[0];
    var pathParts = window.location.pathname.split("/").filter(Boolean);
    var repo = pathParts[0] || owner + ".github.io";
    if (!owner || !repo) return null;
    return { owner: owner, repo: repo };
  }

  async function scanGithubDirectory(repoInfo, path) {
    var url =
      "https://api.github.com/repos/" +
      encodeURIComponent(repoInfo.owner) +
      "/" +
      encodeURIComponent(repoInfo.repo) +
      "/contents/" +
      encodeGithubPath(path);

    var response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (!response.ok) throw new Error("GitHub API " + response.status);

    var entries = await response.json();
    var files = [];
    for (var i = 0; i < entries.length; i += 1) {
      var entry = entries[i];
      if (entry.type === "dir") {
        files = files.concat(await scanGithubDirectory(repoInfo, entry.path));
      } else if (isMedia(entry.name)) {
        files.push({
          path: entry.path,
          url: sitePath(entry.path),
        });
      }
    }
    return files;
  }

  function groupFilesIntoAgents(files) {
    var groups = Object.create(null);
    files.forEach(function (file) {
      var parts = file.path.split("/");
      var root = parts[1];
      if (!root) return;
      if (!groups[root]) groups[root] = [];
      groups[root].push(file);
    });

    return Object.keys(groups).map(function (root) {
      var chosen = chooseBestMedia(groups[root]);
      return normalizeAgent({
        id: root,
        title: titleFromSlug(root),
        file: chosen.url,
        sourcePath: chosen.path,
      });
    });
  }

  function chooseBestMedia(files) {
    return files.slice().sort(function (a, b) {
      var scoreA = mediaScore(a.path);
      var scoreB = mediaScore(b.path);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.path.localeCompare(b.path);
    })[0];
  }

  function mediaScore(path) {
    var lower = path.toLowerCase();
    var score = 0;
    if (lower.indexOf("cover") !== -1) score += 10;
    if (lower.indexOf("preview") !== -1) score += 8;
    if (VIDEO_EXTENSIONS.some(function (ext) { return lower.endsWith(ext); })) score += 3;
    return score;
  }

  function normalizeAgent(agent) {
    var sourcePath = agent.sourcePath || agent.file || "";
    return {
      id: agent.id || sourcePath,
      title: agent.title || titleFromSlug(agent.id || sourcePath),
      file: agent.file,
      sourcePath: sourcePath,
      type: isVideo(sourcePath || agent.file) ? "video" : "image",
    };
  }

  function render() {
    gallery.innerHTML = "";
    emptyState.hidden = state.filtered.length !== 0;

    state.filtered.forEach(function (agent, index) {
      gallery.appendChild(createCard(agent, index));
    });
  }

  function createCard(agent, index) {
    var card = document.createElement("article");
    card.className = "card";
    card.style.animationDelay = Math.min(index * 18, 360) + "ms";

    var frame = document.createElement("div");
    frame.className = "media-frame";
    frame.appendChild(createMedia(agent));

    var body = document.createElement("div");
    body.className = "card-body";

    var title = document.createElement("h2");
    title.className = "agent-name";
    title.textContent = agent.title;

    var path = document.createElement("p");
    path.className = "agent-path";
    path.textContent = agent.sourcePath.replace(/^covers\//, "");

    body.appendChild(title);
    body.appendChild(path);
    card.appendChild(frame);
    card.appendChild(body);
    return card;
  }

  function createMedia(agent) {
    if (agent.type === "video") {
      var video = document.createElement("video");
      video.dataset.src = agent.file;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "none";
      video.setAttribute("aria-label", agent.title + " onizleme videosu");
      if (videoObserver) {
        videoObserver.observe(video);
      } else {
        video.src = agent.file;
        video.preload = "metadata";
      }
      return video;
    }

    var image = document.createElement("img");
    image.src = agent.file;
    image.alt = agent.title;
    image.loading = "lazy";
    return image;
  }

  function setupVideoObserver() {
    if (!("IntersectionObserver" in window)) {
      videoObserver = null;
      return;
    }

    videoObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (entry.isIntersecting) {
          if (!video.src) video.src = video.dataset.src;
          video.play().catch(function () {});
        } else {
          video.pause();
        }
      });
    }, { rootMargin: "320px 0px" });
  }

  function isMedia(fileName) {
    var lower = fileName.toLowerCase();
    return MEDIA_EXTENSIONS.some(function (extension) {
      return lower.endsWith(extension);
    });
  }

  function isVideo(fileName) {
    var lower = String(fileName).toLowerCase();
    return VIDEO_EXTENSIONS.some(function (extension) {
      return lower.endsWith(extension);
    });
  }

  function sitePath(path) {
    var baseParts = window.location.pathname.split("/").filter(Boolean);
    var repoBase = isGithubPages() && baseParts.length ? "/" + baseParts[0] + "/" : "/";
    return encodeURI(repoBase + path);
  }

  function encodeGithubPath(path) {
    return path
      .split("/")
      .map(function (part) {
        return encodeURIComponent(part);
      })
      .join("/");
  }

  function titleFromSlug(value) {
    var root = String(value || "")
      .replace(/\\/g, "/")
      .split("/")
      .filter(Boolean)
      .pop();

    return root
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  function sortAgents(a, b) {
    return a.title.localeCompare(b.title, "tr");
  }
})();
