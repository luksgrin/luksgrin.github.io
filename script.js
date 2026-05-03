// ~*~ luksgrin.github.io ~*~  client-side fluff

// ----- sparkle cursor trail (the most 2008 thing imaginable) -----
(function () {
  var glyphs = ["✧", "✦", "✶", "✺", "❀", "✿", "♡", "✩"];
  var lastSpawn = 0;
  document.addEventListener("mousemove", function (e) {
    var now = Date.now();
    if (now - lastSpawn < 35) return; // throttle
    lastSpawn = now;
    var s = document.createElement("div");
    s.className = "sparkle";
    s.textContent = glyphs[(Math.random() * glyphs.length) | 0];
    s.style.left = e.clientX + "px";
    s.style.top  = e.clientY + "px";
    s.style.setProperty("--dx", ((Math.random() - 0.5) * 40) + "px");
    s.style.setProperty("--dy", (-20 - Math.random() * 30) + "px");
    s.style.color = ["#ff66cc", "#00ffff", "#ffff66", "#ff99ff"][(Math.random() * 4) | 0];
    document.getElementById("sparkle-layer").appendChild(s);
    setTimeout(function () { s.remove(); }, 950);
  });
})();

// ----- guestbook (powered by GitHub Issues) -----
// REPO: edit this if you fork
var GB_REPO  = "luksgrin/luksgrin.github.io";
var GB_LABEL = "guestbook";

// `signGuestbook`: open a pre-filled GitHub new-issue page in a new tab.
// Visitor clicks "Submit new issue" on GitHub; on next page load it appears below.
function signGuestbook(e) {
  e.preventDefault();
  var name = (document.getElementById("gb-name").value || "").trim();
  var msg  = (document.getElementById("gb-msg").value  || "").trim();
  if (!msg) return false;

  var title = "[guestbook] " + (name || "anonymous");
  var body  = msg + "\n\n— signed at " + new Date().toISOString().slice(0,10) +
              "\n— from luksgrin.github.io guestbook";
  var url = "https://github.com/" + GB_REPO + "/issues/new" +
            "?title="  + encodeURIComponent(title) +
            "&body="   + encodeURIComponent(body) +
            "&labels=" + encodeURIComponent(GB_LABEL);
  window.open(url, "_blank", "noopener");
  // clear the form after opening so it's obvious it submitted
  document.getElementById("gb-msg").value = "";
  return false;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c];
  });
}

// Strip the trailing signature lines we inject in the body.
function trimBody(body) {
  if (!body) return "";
  // remove the trailing "— signed at .../— from luksgrin..." lines if present
  return body
    .replace(/\n*— signed at [\d-]+\s*$/m, "")
    .replace(/\n*— from luksgrin\.github\.io guestbook\s*$/m, "")
    .trim();
}

function paletteFromUsername(username) {
  // returns Promise<string[]> — five hsl colors derived from sha-256(username).
  // we use the first 15 bytes (30 hex nibbles) of the digest:
  //   bytes[0..4]   -> 5 hues   (0..360°)
  //   bytes[5..9]   -> 5 sats   (70..95%)
  //   bytes[10..14] -> 5 lits   (55..70%)
  // hsl with those bounds guarantees vivid, readable colors — no greys/muds.
  var fallback = ["#ff66cc", "#ffff66", "#66ffff", "#ff99ff", "#cc66ff"];
  if (!window.crypto || !window.crypto.subtle) return Promise.resolve(fallback);
  try {
    var buf = new TextEncoder().encode(username || "anonymous");
    return window.crypto.subtle.digest("SHA-256", buf).then(function (hashBuf) {
      var bytes = new Uint8Array(hashBuf);
      var colors = [];
      for (var i = 0; i < 5; i++) {
        var hue = Math.round((bytes[i]      / 255) * 360);
        var sat = 70 + (bytes[i + 5]  % 26);   // 70..95
        var lit = 55 + (bytes[i + 10] % 16);   // 55..70
        colors.push("hsl(" + hue + "," + sat + "%," + lit + "%)");
      }
      return colors;
    }).catch(function () { return fallback; });
  } catch (e) { return Promise.resolve(fallback); }
}

function gradientStyleFromPalette(palette) {
  // close the loop with palette[0] so the animation cycles seamlessly
  var stops = palette.concat(palette[0]).join(", ");
  return "background:linear-gradient(90deg," + stops + ");" +
         "background-size:300% 100%;" +
         "-webkit-background-clip:text;" +
         "background-clip:text;" +
         "color:transparent;" +
         "animation:glitter 4s linear infinite;" +
         "font-weight:bold;";
}

function renderGuestbookFromIssues(issues) {
  var form = document.querySelector(".gb-form");
  if (!form) return;

  // remove previous renders so reloads don't duplicate
  document.querySelectorAll(".comment.gh-comment").forEach(function (n) { n.remove(); });
  if (!issues || !issues.length) return;

  var real = issues.filter(function (i) { return !i.pull_request; });

  // compute palettes for every entry in parallel, then render synchronously
  return Promise.all(real.map(function (issue) {
    return paletteFromUsername(issue.user && issue.user.login || "anonymous");
  })).then(function (palettes) {
    real.forEach(function (issue, i) {
      var palette = palettes[i];
      var login   = issue.user && issue.user.login   ? issue.user.login   : "anonymous";
      var avatar  = issue.user && issue.user.avatar_url ? issue.user.avatar_url : "";
      var when    = new Date(issue.created_at).toLocaleDateString();
      var body    = trimBody(issue.body || "");
      if (!body) return;
      var displayName = (issue.title || "").replace(/^\[guestbook\]\s*/i, "").trim() || login;
      var nameStyle    = gradientStyleFromPalette(palette);
      var avatarBorder = palette[2]; // pick a mid-stop for the ring color

      var div = document.createElement("div");
      div.className = "comment gh-comment";
      div.innerHTML =
        '<div class="comment-head">' +
          (avatar ? '<img class="gh-avatar" style="border-color:' + avatarBorder + '" src="' + escapeHtml(avatar) + '&s=24" alt="" loading="lazy" referrerpolicy="no-referrer"> ' : '') +
          '<b style="' + nameStyle + '">' + escapeHtml(displayName) + '</b> ' +
          '<span class="tiny">@' + escapeHtml(login) + '</span> &middot; ' +
          '<span class="tiny">' + escapeHtml(when) + '</span> &middot; ' +
          '<a class="tiny" href="' + escapeHtml(issue.html_url) + '" target="_blank" rel="noopener">[ #' + issue.number + ' ]</a>' +
        '</div>' +
        '<div class="comment-body">' + escapeHtml(body) + '</div>';
      form.parentNode.insertBefore(div, form);
    });
  });
}

function loadGuestbook() {
  var url = "https://api.github.com/repos/" + GB_REPO +
            "/issues?labels=" + encodeURIComponent(GB_LABEL) +
            "&state=all&sort=created&direction=desc&per_page=30";
  fetch(url, { headers: { "Accept": "application/vnd.github+json" } })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(renderGuestbookFromIssues)
    .catch(function () { /* network error / rate-limited — leave seed comments alone */ });
}
document.addEventListener("DOMContentLoaded", loadGuestbook);

// ----- per-browser visit counter -----
// global pageview count = moe-counter image above. this is just "ur Nth visit here".
function ordinalSuffix(n) {
  var v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (n % 10) {
    case 1:  return "st";
    case 2:  return "nd";
    case 3:  return "rd";
    default: return "th";
  }
}
function updateLocalCount() {
  var el = document.querySelector(".local-count");
  if (!el) return;
  var raw = localStorage.getItem("luksgrin_visits");
  var n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) n = 0;
  n += 1;
  try { localStorage.setItem("luksgrin_visits", String(n)); } catch (_) {}
  el.textContent = n + ordinalSuffix(n);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateLocalCount);
} else {
  updateLocalCount();
}

// ----- music player: youtube playlist embed + live "now playing" ticker -----
// keeps a single ytApi promise so we only inject the api script once.
var _ytApiPromise = null;
function loadYtIframeApi() {
  if (_ytApiPromise) return _ytApiPromise;
  _ytApiPromise = new Promise(function (resolve) {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prev === "function") prev();
      resolve(window.YT);
    };
    var s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.head.appendChild(s);
  });
  return _ytApiPromise;
}

// global handle so next/prev buttons can drive the player
var _ytPlayer = null;

function updateNowPlaying(player) {
  try {
    var d = player.getVideoData();
    var ticker = document.getElementById("nowPlayingTicker");
    if (!ticker || !d || !d.title) return;
    ticker.textContent = (d.author ? d.author + " — " : "") + d.title;
  } catch (_) {}
}

document.addEventListener("DOMContentLoaded", function () {
  var playLink = document.getElementById("playMusic");
  if (!playLink) return;
  playLink.addEventListener("click", function (e) {
    e.preventDefault();
    var holder = document.getElementById("ytPlayer");
    if (!holder) return;
    var playlist = (holder.dataset.playlist || "").trim();
    var ytId     = (holder.dataset.yt       || "").trim();
    var search   = (holder.dataset.search   || "emo metalcore").trim();
    var src;
    var common = "&autoplay=1&rel=0&enablejsapi=1&origin=" +
                 encodeURIComponent(window.location.origin);
    if (playlist) {
      src = "https://www.youtube-nocookie.com/embed/videoseries?list=" +
            encodeURIComponent(playlist) + common;
    } else if (ytId) {
      src = "https://www.youtube-nocookie.com/embed/" +
            encodeURIComponent(ytId) + "?_=" + common;
    } else {
      window.open("https://www.youtube.com/results?search_query=" + encodeURIComponent(search),
                  "_blank", "noopener");
      return;
    }
    holder.innerHTML =
      '<iframe id="ytFrame" width="100%" height="200" src="' + src +
      '" title="now playing" frameborder="0"' +
      ' allow="autoplay; encrypted-media; picture-in-picture"' +
      ' allowfullscreen></iframe>';

    var ticker = document.getElementById("nowPlayingTicker");
    if (ticker) ticker.textContent = "loading mixtape...";

    loadYtIframeApi().then(function (YT) {
      _ytPlayer = new YT.Player("ytFrame", {
        events: {
          onReady: function (ev) {
            var p = ev.target;
            // turn on shuffle and jump to a random starting track
            // (slight delay so getPlaylist() is populated)
            setTimeout(function () {
              try {
                p.setShuffle({ shufflePlaylist: true });
                var pl = p.getPlaylist();
                if (pl && pl.length > 1) {
                  p.playVideoAt(Math.floor(Math.random() * pl.length));
                }
              } catch (_) {}
            }, 250);
            updateNowPlaying(p);
          },
          onStateChange: function (ev) {
            // YT.PlayerState — UNSTARTED -1, ENDED 0, PLAYING 1, PAUSED 2, BUFFERING 3, CUED 5
            if (ev.data === 1 || ev.data === 5 || ev.data === 3) {
              updateNowPlaying(ev.target);
            }
          }
        }
      });
    });
  });
});

// ----- next / prev buttons (now actually drive the player if it's loaded) -----
document.addEventListener("DOMContentLoaded", function () {
  ["nextTrack", "prevTrack"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", function (e) {
      e.preventDefault();
      try {
        if (_ytPlayer) {
          if (id === "nextTrack" && typeof _ytPlayer.nextVideo === "function") _ytPlayer.nextVideo();
          if (id === "prevTrack" && typeof _ytPlayer.previousVideo === "function") _ytPlayer.previousVideo();
        }
      } catch (_) {}
      var msgs = ["♪ skipping... ♪", "♥ rewind ♥", "buffering..."];
      el.textContent = msgs[(Math.random() * msgs.length) | 0];
      setTimeout(function () {
        el.textContent = id === "nextTrack" ? "[ next track ]" : "[ prev ]";
      }, 1000);
    });
  });
});

