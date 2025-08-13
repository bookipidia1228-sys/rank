// pretty-urls.js
// 1) Converts pretty paths <-> old query string so your current code keeps working.
// 2) Gives you a goTo(...) helper to navigate without reloading.
// 3) Makes a short-looking "school code" from the school name.

(function () {
    // --- school name <-> code (URL-safe base64 that looks random-ish) ---
    function toBase64Url(str) {
      // Handles Unicode
      return btoa(unescape(encodeURIComponent(str)))
        .replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
    }
    function fromBase64Url(b64) {
      try {
        return decodeURIComponent(escape(atob(b64.replace(/-/g,'+').replace(/_/g,'/'))));
      } catch { return null; }
    }
  
    // --- On first load: sync path <-> query so existing JS sees ?year=... etc. ---
    const pathParts = location.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    const params = new URLSearchParams(location.search);
  
    // If user opened /2025[/Group][/roll-or-schoolCode] but your JS expects ?year=...
    if (pathParts.length && !params.has('year')) {
      const [year, group, third] = pathParts;
      if (/^\d{4}$/.test(year)) {
        params.set('year', year);
        if (group) params.set('group', decodeURIComponent(group));
        if (third) {
          if (/^\d+$/.test(third)) {
            params.set('roll', third);
          } else {
            const schoolName = fromBase64Url(third) || third.replace(/-/g,' ');
            params.set('school', schoolName);
          }
        }
        history.replaceState(null, '', location.pathname + '?' + params.toString());
      }
    }
  
    // If URL is old style (?year=...) convert it to pretty style immediately.
    if (!pathParts.length && (params.has('year') || params.has('group') || params.has('roll') || params.has('school'))) {
      const year = params.get('year');
      const group = params.get('group');
      const roll = params.get('roll');
      const school = params.get('school');
      const code = school ? toBase64Url(school) : null;
      const newPath = '/' + [year, group, roll || code].filter(Boolean).map(encodeURIComponent).join('/');
      history.replaceState(null, '', newPath + (params.toString() ? '?' + params.toString() : ''));
    }
  
    // Intercept clicks on links like ?year=... and turn them into /year/Group/...
    document.addEventListener('click', function (e) {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const u = new URL(a.getAttribute('href'), location.origin);
      const p = u.searchParams;
      if (p.has('year')) {
        e.preventDefault();
        goTo({
          year: p.get('year'),
          group: p.get('group') || undefined,
          roll: p.get('roll') || undefined,
          school: p.get('school') || undefined
        });
      }
    });
  
    // A single helper you can call from your own JS to navigate without reload.
    window.goTo = function ({ year, group, roll, school } = {}) {
      const code = school ? toBase64Url(school) : undefined;
      const path = '/' + [year, group, roll || code].filter(Boolean).map(encodeURIComponent).join('/');
  
      // Keep old query too so your existing code keeps working right now.
      const qp = new URLSearchParams();
      if (year) qp.set('year', year);
      if (group) qp.set('group', group);
      if (roll) qp.set('roll', roll);
      if (school) qp.set('school', school);
  
      history.pushState(null, '', path + (qp.toString() ? '?' + qp.toString() : ''));
      // If your code listens to popstate, this will refresh; if not, no problem.
      window.dispatchEvent(new Event('popstate'));
    };
  
    // Keep query in sync when user hits Back/Forward on pretty URLs.
    window.addEventListener('popstate', function () {
      const parts = location.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
      if (!parts.length) return;
      const [year, group, third] = parts;
      const qp = new URLSearchParams();
      if (year) qp.set('year', year);
      if (group) qp.set('group', decodeURIComponent(group));
      if (third) {
        if (/^\d+$/.test(third)) qp.set('roll', third);
        else qp.set('school', fromBase64Url(third) || third.replace(/-/g, ' '));
      }
      history.replaceState(null, '', location.pathname + '?' + qp.toString());
    });
  })();
  
