/* Atherium & Atherium Studio — Live GitHub Auto-Sync (Zero dependencies, offline-safe) */
(function () {
  "use strict";

  var REPOS = {
    ath: { owner: "Deadstillplays", name: "Atherium" },
    studio: { owner: "Deadstillplays", name: "AtheriumStudio" }
  };
  var CACHE_KEY = "ath_gh_sync_v2";
  var CACHE_TTL_MS = 5 * 60 * 1000;

  function escHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtBytes(n) {
    if (typeof n !== "number" || !isFinite(n) || n < 0) return "";
    if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + " MB";
    if (n >= 1024) return (n / 1024).toFixed(1) + " KB";
    return n + " B";
  }

  function fmtDate(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      var diff = Math.max(0, Date.now() - d.getTime());
      var mins = Math.floor(diff / 60000);
      if (mins < 2) return "just now";
      if (mins < 60) return mins + "m ago";
      var hrs = Math.floor(mins / 60);
      if (hrs < 48) return hrs + "h ago";
      var days = Math.floor(hrs / 24);
      if (days < 30) return days + "d ago";
      return d.toISOString().slice(0, 10);
    } catch (_) {
      return "";
    }
  }

  function apiJson(url) {
    return fetch(url, {
      headers: { Accept: "application/vnd.github+json" }
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function fetchText(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    });
  }

  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.ts || (Date.now() - parsed.ts) > CACHE_TTL_MS) return null;
      return parsed.data;
    } catch (_) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data }));
    } catch (_) {}
  }

  function clearCache() {
    try { sessionStorage.removeItem(CACHE_KEY); } catch (_) {}
  }

  function triggerBlobDownload(url, filename, fallbackHref) {
    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.blob();
      })
      .then(function (blob) {
        var objUrl = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = objUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          document.body.removeChild(a);
          URL.revokeObjectURL(objUrl);
        }, 500);
      })
      .catch(function () {
        window.location.href = fallbackHref || url;
      });
  }

  function wireCopyButtons() {
    var boxes = document.querySelectorAll("pre.codebox[data-copy]");
    boxes.forEach(function (pre) {
      if (pre.parentElement && pre.parentElement.classList.contains("code-wrap")) return;
      var wrap = document.createElement("div");
      wrap.className = "code-wrap";
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.textContent = "Copy";
      btn.addEventListener("click", function () {
        var lines = pre.textContent.split("\n").map(function (ln) {
          return ln.replace(/^\$\s+/, "").replace(/\s+#.*$/, "");
        }).filter(function (ln) { return ln.trim().length > 0; });
        var text = pre.getAttribute("data-copy") === "raw" ? pre.textContent : lines.join("\n");
        var done = function () {
          btn.textContent = "Copied";
          setTimeout(function () { btn.textContent = "Copy"; }, 1400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(done);
        } else {
          var ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand("copy"); } catch (_) {}
          document.body.removeChild(ta);
          done();
        }
      });
      wrap.appendChild(btn);
    });
  }

  function wireSourceToggles(root) {
    var scope = root || document;
    var btns = scope.querySelectorAll("button[data-src-url]");
    btns.forEach(function (btn) {
      if (btn.getAttribute("data-wired") === "1") return;
      btn.setAttribute("data-wired", "1");
      btn.addEventListener("click", function () {
        var row = btn.closest(".lib-item");
        if (!row) return;
        var box = row.querySelector(".src-preview");
        if (!box) {
          box = document.createElement("pre");
          box.className = "src-preview";
          row.appendChild(box);
        }
        if (box.style.display === "block") {
          box.style.display = "none";
          btn.textContent = "View";
          return;
        }
        box.style.display = "block";
        btn.textContent = "Hide";
        if (box.getAttribute("data-loaded") === "1") return;
        box.textContent = "Loading source from GitHub...";
        var primary = btn.getAttribute("data-src-url");
        var fallback = btn.getAttribute("data-local-url");
        fetchText(primary)
          .catch(function () { return fallback ? fetchText(fallback) : Promise.reject(new Error("offline")); })
          .then(function (txt) {
            box.textContent = txt;
            box.setAttribute("data-loaded", "1");
          })
          .catch(function () {
            box.textContent = "Could not load preview (open on GitHub instead).";
          });
      });
    });

    var dlLinks = scope.querySelectorAll("a[data-gh-dl]");
    dlLinks.forEach(function (a) {
      if (a.getAttribute("data-wired") === "1") return;
      a.setAttribute("data-wired", "1");
      a.addEventListener("click", function (ev) {
        var raw = a.getAttribute("data-gh-dl");
        var fn = a.getAttribute("data-filename") || a.getAttribute("download");
        if (!raw || !fn) return;
        ev.preventDefault();
        triggerBlobDownload(raw, fn, a.getAttribute("href"));
      });
    });
  }

  // Pure vanilla in-browser ZIP builder (PKZIP 2.0 STORE mode with CRC-32)
  var CRC_TABLE = (function () {
    var c, t = [];
    for (var n = 0; n < 256; n++) {
      c = n;
      for (var k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      }
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(buf) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < buf.length; i++) {
      c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xFF];
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function strToUtf8Bytes(str) {
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(str);
    }
    var utf8 = [];
    for (var i = 0; i < str.length; i++) {
      var charcode = str.charCodeAt(i);
      if (charcode < 0x80) utf8.push(charcode);
      else if (charcode < 0x800) {
        utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
      } else if (charcode < 0xd800 || charcode >= 0xe000) {
        utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
      } else {
        i++;
        charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
      }
    }
    return new Uint8Array(utf8);
  }

  function makeZipBlob(entries) {
    var parts = [];
    var cdParts = [];
    var offset = 0;

    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var nameBytes = strToUtf8Bytes(entry.name);
      var dataBytes = entry.data instanceof Uint8Array ? entry.data : strToUtf8Bytes(entry.data);
      var crc = crc32(dataBytes);
      var sz = dataBytes.length;
      var nameLen = nameBytes.length;

      var lh = new Uint8Array(30);
      var v = new DataView(lh.buffer);
      v.setUint32(0, 0x04034b50, true);
      v.setUint16(4, 20, true);
      v.setUint16(6, 0, true);
      v.setUint16(8, 0, true); // STORE
      v.setUint32(14, crc, true);
      v.setUint32(18, sz, true);
      v.setUint32(22, sz, true);
      v.setUint16(26, nameLen, true);
      v.setUint16(28, 0, true);

      parts.push(lh);
      parts.push(nameBytes);
      parts.push(dataBytes);

      var cdh = new Uint8Array(46);
      var cv = new DataView(cdh.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0, true);
      cv.setUint16(10, 0, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, sz, true);
      cv.setUint32(24, sz, true);
      cv.setUint16(28, nameLen, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint32(42, offset, true);

      cdParts.push(cdh);
      cdParts.push(nameBytes);

      offset += 30 + nameLen + sz;
    }

    var cdOffset = offset;
    var cdSize = 0;
    for (var j = 0; j < cdParts.length; j++) {
      cdSize += cdParts[j].length;
    }

    var eocd = new Uint8Array(22);
    var ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, cdOffset, true);

    var all = parts.concat(cdParts, [eocd]);
    return new Blob(all, { type: "application/zip" });
  }

  var currentCategory = "all";

  function updateCounts() {
    var allItems = document.querySelectorAll(".lib-item");
    var total = allItems.length;
    var nPlugins = document.querySelectorAll('.lib-item[data-cat="plugin"], .lib-item[data-plg-file]').length;
    var nThemes = document.querySelectorAll('.lib-item[data-cat="theme"], .lib-item[data-thm-file]').length;
    var nLibs = document.querySelectorAll('.lib-item[data-cat="lib"], .lib-item[data-lib-file]').length;

    var elAll = document.getElementById("count-all");
    var elPlg = document.getElementById("count-plugins");
    var elThm = document.getElementById("count-themes");
    var elLib = document.getElementById("count-libs");

    if (elAll) elAll.textContent = String(total);
    if (elPlg) elPlg.textContent = String(nPlugins);
    if (elThm) elThm.textContent = String(nThemes);
    if (elLib) elLib.textContent = String(nLibs);
  }

  function applyFilter() {
    var inp = document.getElementById("catalog-filter");
    var q = inp ? inp.value.trim().toLowerCase() : "";
    var clearBtn = document.getElementById("filter-clear");
    if (clearBtn) clearBtn.style.display = q.length > 0 ? "inline-block" : "none";

    var items = document.querySelectorAll(".lib-item");
    var shown = 0;

    items.forEach(function (el) {
      var cat = el.getAttribute("data-cat") ||
        (el.hasAttribute("data-plg-file") ? "plugin" : (el.hasAttribute("data-thm-file") ? "theme" : "lib"));
      var catMatch = (currentCategory === "all" || cat === currentCategory);
      var hay = (el.getAttribute("data-search") || el.textContent || "").toLowerCase();
      var queryMatch = !q || hay.indexOf(q) !== -1;

      var ok = catMatch && queryMatch;
      el.style.display = ok ? "" : "none";
      if (ok) shown += 1;
    });

    var libsHead = document.getElementById("libs");
    var plgsHead = document.getElementById("plugins");
    var thmsHead = document.getElementById("themes");
    var bundleBox = document.querySelector(".bundle-box");

    if (libsHead) libsHead.style.display = (currentCategory === "all" || currentCategory === "lib") ? "" : "none";
    if (plgsHead) plgsHead.style.display = (currentCategory === "all" || currentCategory === "plugin") ? "" : "none";
    if (thmsHead) thmsHead.style.display = (currentCategory === "all" || currentCategory === "theme") ? "" : "none";
    if (bundleBox) bundleBox.style.display = (currentCategory === "all" || currentCategory === "plugin") ? "" : "none";

    var empty = document.getElementById("filter-empty");
    if (empty) empty.style.display = (shown === 0) ? "block" : "none";

    var statusEl = document.getElementById("filter-status");
    if (statusEl) {
      if (q.length > 0) {
        statusEl.style.display = "block";
        statusEl.textContent = "Found " + shown + " item" + (shown === 1 ? "" : "s") + " matching \"" + q + "\"" +
          (currentCategory !== "all" ? " in " + currentCategory + "s" : "") + ".";
      } else if (currentCategory !== "all") {
        statusEl.style.display = "block";
        statusEl.textContent = "Showing " + shown + " " + currentCategory + (shown === 1 ? "" : "s") + ".";
      } else {
        statusEl.style.display = "none";
      }
    }
  }

  function wireFilter() {
    var inp = document.getElementById("catalog-filter");
    var clearBtn = document.getElementById("filter-clear");

    if (inp && inp.getAttribute("data-wired") !== "1") {
      inp.setAttribute("data-wired", "1");
      inp.addEventListener("input", applyFilter);
    }

    if (clearBtn && clearBtn.getAttribute("data-wired") !== "1") {
      clearBtn.setAttribute("data-wired", "1");
      clearBtn.addEventListener("click", function () {
        if (inp) {
          inp.value = "";
          inp.focus();
        }
        applyFilter();
      });
    }

    var pills = document.querySelectorAll(".cat-pill");
    pills.forEach(function (pill) {
      if (pill.getAttribute("data-wired") === "1") return;
      pill.setAttribute("data-wired", "1");
      pill.addEventListener("click", function () {
        pills.forEach(function (p) { p.classList.remove("active"); });
        pill.classList.add("active");
        currentCategory = pill.getAttribute("data-cat") || "all";
        applyFilter();
      });
    });

    if (window.location.hash === "#plugins") {
      pills.forEach(function (p) {
        if (p.getAttribute("data-cat") === "plugin") {
          pills.forEach(function (x) { x.classList.remove("active"); });
          p.classList.add("active");
          currentCategory = "plugin";
        }
      });
    } else if (window.location.hash === "#themes") {
      pills.forEach(function (p) {
        if (p.getAttribute("data-cat") === "theme") {
          pills.forEach(function (x) { x.classList.remove("active"); });
          p.classList.add("active");
          currentCategory = "theme";
        }
      });
    }

    updateCounts();
    applyFilter();
  }

  function wireBundleInstall() {
    var selCountEl = document.getElementById("sel-plugin-count");
    var statusEl = document.getElementById("bundle-zip-status");
    var btnSelAll = document.getElementById("btn-select-all-plugins");
    var btnDeselAll = document.getElementById("btn-deselect-all-plugins");
    var btnDlSel = document.getElementById("btn-dl-selected-plugins");

    function updatePluginCount() {
      var chks = document.querySelectorAll(".plugin-chk:checked");
      if (selCountEl) selCountEl.textContent = String(chks.length);
    }

    document.querySelectorAll(".plugin-chk").forEach(function (chk) {
      if (chk.getAttribute("data-chkwired") === "1") return;
      chk.setAttribute("data-chkwired", "1");
      chk.addEventListener("change", updatePluginCount);
    });

    if (btnSelAll && btnSelAll.getAttribute("data-wired") !== "1") {
      btnSelAll.setAttribute("data-wired", "1");
      btnSelAll.addEventListener("click", function () {
        document.querySelectorAll(".plugin-chk").forEach(function (c) { c.checked = true; });
        updatePluginCount();
      });
    }

    if (btnDeselAll && btnDeselAll.getAttribute("data-wired") !== "1") {
      btnDeselAll.setAttribute("data-wired", "1");
      btnDeselAll.addEventListener("click", function () {
        document.querySelectorAll(".plugin-chk").forEach(function (c) { c.checked = false; });
        updatePluginCount();
      });
    }

    if (btnDlSel && btnDlSel.getAttribute("data-wired") !== "1") {
      btnDlSel.setAttribute("data-wired", "1");
      btnDlSel.addEventListener("click", function () {
        var chks = Array.prototype.slice.call(document.querySelectorAll(".plugin-chk:checked"));
        if (chks.length === 0) {
          if (statusEl) statusEl.textContent = "Please select at least 1 plugin.";
          return;
        }
        if (statusEl) statusEl.textContent = "Packaging " + chks.length + " plugins...";
        btnDlSel.disabled = true;

        var tasks = chks.map(function (c) {
          var file = c.getAttribute("data-file") || ("plugins/" + c.getAttribute("data-name"));
          var name = c.getAttribute("data-name") || file.split("/").pop();
          var rawUrl = "https://raw.githubusercontent.com/" + REPOS.studio.owner + "/" + REPOS.studio.name + "/main/plugins/" + encodeURIComponent(name);
          return fetchText(file)
            .catch(function () { return fetchText(rawUrl); })
            .then(function (txt) { return { name: name, data: txt }; })
            .catch(function () { return null; });
        });

        Promise.all(tasks)
          .then(function (results) {
            var valid = results.filter(Boolean);
            if (valid.length === 0) throw new Error("Could not load selected plugin sources.");
            var blob = makeZipBlob(valid);
            var objUrl = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = objUrl;
            a.download = "atherium-custom-plugins-bundle.zip";
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
              document.body.removeChild(a);
              URL.revokeObjectURL(objUrl);
            }, 600);
            if (statusEl) statusEl.textContent = "Downloaded (" + valid.length + " plugins packed)";
          })
          .catch(function (err) {
            if (statusEl) statusEl.textContent = "Bundle packaging failed: " + (err.message || err);
          })
          .finally(function () {
            btnDlSel.disabled = false;
          });
      });
    }

    // Guide tabs
    var tabs = document.querySelectorAll(".guide-tab");
    tabs.forEach(function (tab) {
      if (tab.getAttribute("data-wired") === "1") return;
      tab.setAttribute("data-wired", "1");
      tab.addEventListener("click", function () {
        var targetId = tab.getAttribute("data-tab");
        tabs.forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        document.querySelectorAll(".guide-pane").forEach(function (p) {
          p.style.display = (p.id === targetId) ? "block" : "none";
        });
      });
    });

    updatePluginCount();
  }

  function detectPlatform() {
    var ua = (navigator.userAgent || "").toLowerCase();
    if (ua.indexOf("win") !== -1) return "win";
    if (ua.indexOf("linux") !== -1) return "linux";
    return "";
  }

  function fetchGitHubSnapshot() {
    var athBase = "https://api.github.com/repos/" + REPOS.ath.owner + "/" + REPOS.ath.name;
    var stuBase = "https://api.github.com/repos/" + REPOS.studio.owner + "/" + REPOS.studio.name;

    return Promise.allSettled([
      apiJson(athBase),
      apiJson(stuBase),
      apiJson(athBase + "/commits?per_page=1"),
      apiJson(stuBase + "/commits?per_page=1"),
      apiJson(stuBase + "/releases/latest"),
      apiJson(stuBase + "/contents"),
      apiJson(athBase + "/contents/lib"),
      apiJson(stuBase + "/contents/plugins"),
      apiJson(stuBase + "/contents/themes")
    ]).then(function (res) {
      function val(i) { return res[i].status === "fulfilled" ? res[i].value : null; }
      var athRepo = val(0);
      var stuRepo = val(1);
      if (!athRepo && !stuRepo) throw new Error("GitHub API unavailable");

      var athBranch = (athRepo && athRepo.default_branch) || "main";
      var stuBranch = (stuRepo && stuRepo.default_branch) || "main";
      var athCommits = val(2);
      var stuCommits = val(3);
      var stuRel = val(4);
      var stuRoot = val(5);
      var athLibs = val(6);
      var stuPlugins = val(7);
      var stuThemes = val(8);

      var athHead = Array.isArray(athCommits) && athCommits[0] ? {
        sha: athCommits[0].sha.slice(0, 7),
        msg: (athCommits[0].commit && athCommits[0].commit.message || "").split("\n")[0],
        date: athCommits[0].commit && athCommits[0].commit.author && athCommits[0].commit.author.date,
        url: athCommits[0].html_url
      } : null;

      var stuHead = Array.isArray(stuCommits) && stuCommits[0] ? {
        sha: stuCommits[0].sha.slice(0, 7),
        msg: (stuCommits[0].commit && stuCommits[0].commit.message || "").split("\n")[0],
        date: stuCommits[0].commit && stuCommits[0].commit.author && stuCommits[0].commit.author.date,
        url: stuCommits[0].html_url
      } : null;

      // Resolve latest Studio AppImage and Windows EXE (prefer GitHub Release if present, else main branch raw)
      var appImage = {
        url: "https://github.com/" + REPOS.studio.owner + "/" + REPOS.studio.name + "/raw/" + stuBranch + "/AtheriumStudio-x86_64.AppImage",
        size: null,
        source: stuBranch + (stuHead ? "@" + stuHead.sha : "")
      };
      var winExe = {
        url: "https://github.com/" + REPOS.studio.owner + "/" + REPOS.studio.name + "/raw/" + stuBranch + "/AtheriumStudio-x86_64.exe",
        size: null,
        source: stuBranch + (stuHead ? "@" + stuHead.sha : "")
      };

      if (Array.isArray(stuRoot)) {
        stuRoot.forEach(function (f) {
          if (!f || f.type !== "file") return;
          if (/\.AppImage$/i.test(f.name)) {
            appImage.url = "https://github.com/" + REPOS.studio.owner + "/" + REPOS.studio.name + "/raw/" + stuBranch + "/" + encodeURIComponent(f.name);
            appImage.size = f.size;
            appImage.name = f.name;
          } else if (/\.exe$/i.test(f.name)) {
            winExe.url = "https://github.com/" + REPOS.studio.owner + "/" + REPOS.studio.name + "/raw/" + stuBranch + "/" + encodeURIComponent(f.name);
            winExe.size = f.size;
            winExe.name = f.name;
          }
        });
      }

      var releaseTag = null;
      var releaseUrl = null;
      if (stuRel && Array.isArray(stuRel.assets) && stuRel.assets.length > 0) {
        var relTime = stuRel.published_at ? Date.parse(stuRel.published_at) : 0;
        var headTime = stuHead && stuHead.date ? Date.parse(stuHead.date) : 0;
        if (relTime >= headTime || !appImage.size) {
          stuRel.assets.forEach(function (a) {
            if (/\.AppImage$/i.test(a.name)) {
              appImage.url = a.browser_download_url;
              appImage.size = a.size;
              appImage.name = a.name;
              appImage.source = stuRel.tag_name;
              releaseTag = stuRel.tag_name;
              releaseUrl = stuRel.html_url;
            } else if (/\.exe$/i.test(a.name)) {
              winExe.url = a.browser_download_url;
              winExe.size = a.size;
              winExe.name = a.name;
              winExe.source = stuRel.tag_name;
              releaseTag = stuRel.tag_name;
              releaseUrl = stuRel.html_url;
            }
          });
        }
      }

      var libs = Array.isArray(athLibs) ? athLibs.filter(function (f) {
        return f && f.type === "file" && /\.athlib$/i.test(f.name);
      }).map(function (f) {
        return {
          name: f.name,
          size: f.size,
          raw: "https://raw.githubusercontent.com/" + REPOS.ath.owner + "/" + REPOS.ath.name + "/" + athBranch + "/lib/" + encodeURIComponent(f.name),
          html: f.html_url
        };
      }) : [];

      var plugins = Array.isArray(stuPlugins) ? stuPlugins.filter(function (f) {
        return f && f.type === "file" && /\.athplugin$/i.test(f.name);
      }).map(function (f) {
        return {
          name: f.name,
          size: f.size,
          raw: "https://raw.githubusercontent.com/" + REPOS.studio.owner + "/" + REPOS.studio.name + "/" + stuBranch + "/plugins/" + encodeURIComponent(f.name),
          html: f.html_url
        };
      }) : [];

      var themes = Array.isArray(stuThemes) ? stuThemes.filter(function (f) {
        return f && f.type === "file" && /\.aththeme$/i.test(f.name);
      }).map(function (f) {
        return {
          name: f.name,
          size: f.size,
          raw: "https://raw.githubusercontent.com/" + REPOS.studio.owner + "/" + REPOS.studio.name + "/" + stuBranch + "/themes/" + encodeURIComponent(f.name),
          html: f.html_url
        };
      }) : [];

      return {
        athBranch: athBranch,
        stuBranch: stuBranch,
        athStars: athRepo ? athRepo.stargazers_count : null,
        stuStars: stuRepo ? stuRepo.stargazers_count : null,
        athPushed: athRepo ? athRepo.pushed_at : null,
        stuPushed: stuRepo ? stuRepo.pushed_at : null,
        athHead: athHead,
        stuHead: stuHead,
        releaseTag: releaseTag,
        releaseUrl: releaseUrl,
        appImage: appImage,
        winExe: winExe,
        libs: libs,
        plugins: plugins,
        themes: themes
      };
    });
  }

  function applySnapshot(d) {
    // 1. Top live GitHub status strip
    var bar = document.getElementById("gh-sync-bar");
    if (bar) {
      var parts = [];
      if (d.athHead) {
        parts.push(
          '<span>Atherium <a href="' + escHtml(d.athHead.url) + '"><code>' +
          escHtml(d.athBranch + "@" + d.athHead.sha) + "</code></a> (" +
          escHtml(fmtDate(d.athHead.date || d.athPushed)) + ")</span>"
        );
      }
      if (d.stuHead) {
        parts.push(
          '<span>Studio <a href="' + escHtml(d.stuHead.url) + '"><code>' +
          escHtml(d.releaseTag || (d.stuBranch + "@" + d.stuHead.sha)) + "</code></a> (" +
          escHtml(fmtDate(d.stuHead.date || d.stuPushed)) + ")</span>"
        );
      }
      if (parts.length > 0) {
        bar.innerHTML =
          '<span class="sync-dot"></span> ' + parts.join(' &nbsp;|&nbsp; ') +
          ' &nbsp;|&nbsp; <a href="#sync" id="gh-force-sync" class="sync-refresh">[sync]</a>';
        var ref = document.getElementById("gh-force-sync");
        if (ref) {
          ref.addEventListener("click", function (ev) {
            ev.preventDefault();
            clearCache();
            bar.innerHTML = '<span class="sync-dot"></span> Syncing with GitHub...';
            runSync(true);
          });
        }
      }
    }

    // 2. Studio Download buttons (AppImage + EXE) always linked to latest GitHub build/release
    var plat = detectPlatform();
    var btnLinux = document.getElementById("dl-studio-linux");
    if (btnLinux && d.appImage) {
      btnLinux.href = d.appImage.url;
      var szL = d.appImage.size ? " (" + fmtBytes(d.appImage.size) + ")" : "";
      btnLinux.textContent = "Linux (.AppImage)" + szL + (plat === "linux" ? " *" : "");
      if (plat === "linux") btnLinux.classList.add("rec");
    }
    var btnWin = document.getElementById("dl-studio-win");
    if (btnWin && d.winExe) {
      btnWin.href = d.winExe.url;
      var szW = d.winExe.size ? " (" + fmtBytes(d.winExe.size) + ")" : "";
      btnWin.textContent = "Windows (.exe)" + szW + (plat === "win" ? " *" : "");
      if (plat === "win") btnWin.classList.add("rec");
    }
    var stuMeta = document.getElementById("studio-live-meta");
    if (stuMeta) {
      var pieces = [];
      if (d.releaseTag && d.releaseUrl) {
        pieces.push('Latest release: <a href="' + escHtml(d.releaseUrl) + '">' + escHtml(d.releaseTag) + "</a>");
      } else if (d.stuHead) {
        pieces.push(
          'Latest build: <a href="' + escHtml(d.stuHead.url) + '"><code>' +
          escHtml(d.stuBranch + "@" + d.stuHead.sha) + "</code></a>" +
          (d.stuHead.date ? " &middot; updated " + escHtml(fmtDate(d.stuHead.date)) : "")
        );
      }
      if (d.plugins && d.plugins.length) {
        pieces.push('<a href="libraries.html#plugins">' + d.plugins.length + " plugins</a>");
      }
      if (d.themes && d.themes.length) {
        pieces.push('<a href="libraries.html#themes">' + d.themes.length + " themes</a>");
      }
      if (pieces.length) stuMeta.innerHTML = pieces.join(" &nbsp;|&nbsp; ");
    }

    // 3. Inline libraries list on index.html (live from Deadstillplays/Atherium/lib)
    var inlineLibs = document.getElementById("inline-libs");
    if (inlineLibs && d.libs && d.libs.length > 0) {
      inlineLibs.innerHTML = d.libs.map(function (lib) {
        var shortName = lib.name.replace(/\.athlib$/i, "");
        return '<a href="libs/' + escHtml(lib.name) + '" data-gh-dl="' + escHtml(lib.raw) +
          '" data-filename="' + escHtml(lib.name) + '" download>' + escHtml(shortName) + "</a>";
      }).join(" &nbsp;|&nbsp; ");
      wireSourceToggles(inlineLibs);
    }

    // 4. Full libraries catalog on libraries.html (adds any newly pushed GitHub .athlib automatically!)
    var libList = document.getElementById("lib-list");
    if (libList && d.libs && d.libs.length > 0) {
      var existing = {};
      libList.querySelectorAll(".lib-item[data-lib-file]").forEach(function (el) {
        existing[el.getAttribute("data-lib-file")] = el;
      });
      d.libs.forEach(function (lib) {
        var row = existing[lib.name];
        if (row) {
          var dl = row.querySelector("a[data-gh-dl]");
          if (dl) dl.setAttribute("data-gh-dl", lib.raw);
          var vw = row.querySelector("button[data-src-url]");
          if (vw) vw.setAttribute("data-src-url", lib.raw);
          var szEl = row.querySelector(".lib-size");
          if (szEl && lib.size) szEl.textContent = fmtBytes(lib.size);
        } else {
          var div = document.createElement("div");
          div.className = "lib-item";
          div.setAttribute("data-lib-file", lib.name);
          div.setAttribute("data-search", lib.name + " athlib library");
          div.innerHTML =
            '<div class="lib-row">' +
              '<div class="lib-left">' +
                '<img src="assets/Atheriumlib.png" alt=".athlib">' +
                '<div>' +
                  '<span class="lib-name">' + escHtml(lib.name) + '</span>' +
                  '<span class="lib-meta">(<span class="lib-size">' + escHtml(fmtBytes(lib.size)) + '</span> &middot; synced from GitHub)</span>' +
                  '<div class="lib-desc">Pure-Atherium library module from Deadstillplays/Atherium</div>' +
                '</div>' +
              '</div>' +
              '<div class="lib-actions">' +
                '<button type="button" class="btn dim" data-src-url="' + escHtml(lib.raw) + '">View</button>' +
                '<a class="btn" href="' + escHtml(lib.raw) + '" data-gh-dl="' + escHtml(lib.raw) + '" data-filename="' + escHtml(lib.name) + '" download>Download</a>' +
                '<a class="btn dim" href="' + escHtml(lib.html) + '">GitHub -&gt;</a>' +
              '</div>' +
            '</div>';
          libList.appendChild(div);
        }
      });
      wireSourceToggles(libList);
    }

    // 5. Studio Plugins catalog on libraries.html#plugins (live from Deadstillplays/AtheriumStudio/plugins)
    var plgList = document.getElementById("plugin-list");
    if (plgList && d.plugins && d.plugins.length > 0) {
      var exPlg = {};
      plgList.querySelectorAll(".lib-item[data-plg-file]").forEach(function (el) {
        exPlg[el.getAttribute("data-plg-file")] = el;
      });
      d.plugins.forEach(function (plg) {
        var row = exPlg[plg.name];
        if (row) {
          var dl = row.querySelector("a[data-gh-dl]");
          if (dl) dl.setAttribute("data-gh-dl", plg.raw);
          var vw = row.querySelector("button[data-src-url]");
          if (vw) vw.setAttribute("data-src-url", plg.raw);
        } else {
          var div = document.createElement("div");
          div.className = "lib-item";
          div.setAttribute("data-cat", "plugin");
          div.setAttribute("data-plg-file", plg.name);
          div.setAttribute("data-search", plg.name + " athplugin plugin");
          div.innerHTML =
            '<div class="lib-row">' +
              '<div class="lib-left">' +
                '<label class="bundle-chk-label" title="Include in custom bundle"><input type="checkbox" class="bundle-chk plugin-chk" checked data-file="plugins/' + escHtml(plg.name) + '" data-name="' + escHtml(plg.name) + '"></label>' +
                '<img src="assets/atherium-studio-logo.png" alt=".athplugin">' +
                '<div>' +
                  '<span class="lib-name">' + escHtml(plg.name) + '</span>' +
                  '<span class="lib-meta">(' + escHtml(fmtBytes(plg.size)) + ' &middot; synced from GitHub)</span>' +
                  '<div class="lib-desc">Atherium Studio plugin from Deadstillplays/AtheriumStudio</div>' +
                '</div>' +
              '</div>' +
              '<div class="lib-actions">' +
                '<button type="button" class="btn dim" data-src-url="' + escHtml(plg.raw) + '">View</button>' +
                '<a class="btn" href="' + escHtml(plg.raw) + '" data-gh-dl="' + escHtml(plg.raw) + '" data-filename="' + escHtml(plg.name) + '" download>Download</a>' +
                '<a class="btn dim" href="' + escHtml(plg.html) + '">GitHub -&gt;</a>' +
              '</div>' +
            '</div>';
          plgList.appendChild(div);
        }
      });
      wireSourceToggles(plgList);
      wireBundleInstall();
      updateCounts();
      applyFilter();
    }

    // 6. Studio Themes catalog on libraries.html#themes (live from Deadstillplays/AtheriumStudio/themes)
    var thmList = document.getElementById("theme-list");
    if (thmList && d.themes && d.themes.length > 0) {
      var exThm = {};
      thmList.querySelectorAll(".lib-item[data-thm-file]").forEach(function (el) {
        exThm[el.getAttribute("data-thm-file")] = el;
      });
      d.themes.forEach(function (thm) {
        var row = exThm[thm.name];
        if (row) {
          var dl = row.querySelector("a[data-gh-dl]");
          if (dl) dl.setAttribute("data-gh-dl", thm.raw);
          var vw = row.querySelector("button[data-src-url]");
          if (vw) vw.setAttribute("data-src-url", thm.raw);
        } else {
          var div = document.createElement("div");
          div.className = "lib-item";
          div.setAttribute("data-cat", "theme");
          div.setAttribute("data-thm-file", thm.name);
          div.setAttribute("data-search", thm.name + " aththeme theme");
          div.innerHTML =
            '<div class="lib-row">' +
              '<div class="lib-left">' +
                '<img src="assets/atherium-studio-logo.png" alt=".aththeme">' +
                '<div>' +
                  '<span class="lib-name">' + escHtml(thm.name) + '</span>' +
                  '<span class="lib-meta">(' + escHtml(fmtBytes(thm.size)) + ' &middot; synced from GitHub)</span>' +
                  '<div class="lib-desc">Custom Atherium Studio theme from Deadstillplays/AtheriumStudio</div>' +
                '</div>' +
              '</div>' +
              '<div class="lib-actions">' +
                '<button type="button" class="btn dim" data-src-url="' + escHtml(thm.raw) + '">View</button>' +
                '<a class="btn" href="' + escHtml(thm.raw) + '" data-gh-dl="' + escHtml(thm.raw) + '" data-filename="' + escHtml(thm.name) + '" download>Download</a>' +
                '<a class="btn dim" href="' + escHtml(thm.html) + '">GitHub -&gt;</a>' +
              '</div>' +
            '</div>';
          thmList.appendChild(div);
        }
      });
      wireSourceToggles(thmList);
      updateCounts();
      applyFilter();
    }

    // 7. Live LICENSE sync on license.html
    var licBox = document.getElementById("license-text");
    if (licBox && d.athBranch) {
      fetchText("https://raw.githubusercontent.com/" + REPOS.ath.owner + "/" + REPOS.ath.name + "/" + d.athBranch + "/LICENSE")
        .then(function (txt) {
          if (txt && txt.trim().length > 20) licBox.textContent = txt;
        })
        .catch(function () {});
    }
  }

  function wireThemeToggle() {
    var btn = document.getElementById("theme-toggle-btn");
    var iconEl = document.getElementById("theme-icon");
    var labelEl = document.getElementById("theme-label");

    function getSavedTheme() {
      try {
        return localStorage.getItem("ath_theme") || "auto";
      } catch (_) {
        return "auto";
      }
    }

    function applyTheme(theme) {
      var isDark = theme === "dark" || (theme === "auto" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.className = (isDark ? "theme-dark" : "theme-light");
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      document.documentElement.style.backgroundColor = isDark ? "#0b0b0e" : "#f4f5f7";

      if (iconEl) {
        iconEl.textContent = theme === "dark" ? "🌙" : (theme === "light" ? "☀️" : "💻");
      }
      if (labelEl) {
        labelEl.textContent = theme === "dark" ? "Dark" : (theme === "light" ? "Light" : "Auto");
      }
      if (btn) {
        btn.setAttribute("title", "Current theme: " + theme + " (click to cycle Auto -> Dark -> Light)");
      }
    }

    if (btn && btn.getAttribute("data-wired") !== "1") {
      btn.setAttribute("data-wired", "1");
      btn.addEventListener("click", function () {
        var cur = getSavedTheme();
        var next = cur === "auto" ? "dark" : (cur === "dark" ? "light" : "auto");
        try { localStorage.setItem("ath_theme", next); } catch (_) {}
        applyTheme(next);
      });
    }

    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
        if (getSavedTheme() === "auto") {
          applyTheme("auto");
        }
      });
    }

    applyTheme(getSavedTheme());
  }

  function runSync(force) {
    if (!force) {
      var cached = readCache();
      if (cached) {
        applySnapshot(cached);
        return;
      }
    }
    fetchGitHubSnapshot()
      .then(function (snap) {
        writeCache(snap);
        applySnapshot(snap);
      })
      .catch(function () {
        var bar = document.getElementById("gh-sync-bar");
        if (bar) {
          bar.innerHTML =
            '<span>Offline / static snapshot &nbsp;|&nbsp; <a href="https://github.com/Deadstillplays/Atherium">Atherium</a> &nbsp;&middot;&nbsp; <a href="https://github.com/Deadstillplays/AtheriumStudio">AtheriumStudio</a></span>';
        }
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    wireThemeToggle();
    wireCopyButtons();
    wireSourceToggles(document);
    wireFilter();
    wireBundleInstall();
    var force = /[?&]refresh=1/.test(window.location.search);
    runSync(force);
  });
})();
