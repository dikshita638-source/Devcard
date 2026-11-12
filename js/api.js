const GitHubApi = (() => {
  const API_ROOT = "https://api.github.com";
  const PER_PAGE = 100;
  const MAX_REPO_PAGES = 100;
  const LANGUAGE_CONCURRENCY = 8;

  const languageCache = new Map();

  function apiError(kind, details) {
    return Object.assign(new Error(kind), { kind }, details);
  }

  async function fetchJSON(url) {
    let response;
    try {
      response = await fetch(url, {
        headers: { Accept: "application/vnd.github+json" },
      });
    } catch (networkError) {
      throw apiError("network");
    }
    if (response.ok) {
      return response.json();
    }
    if (response.status === 404) {
      throw apiError("not-found", { status: 404 });
    }
    if (response.status === 403 || response.status === 429) {
      const remaining = response.headers.get("X-RateLimit-Remaining");
      const isRateLimited = response.status === 429 || remaining === "0";
      if (isRateLimited) {
        const resetSeconds = Number(response.headers.get("X-RateLimit-Reset")) || 0;
        throw apiError("rate-limit", { status: response.status, resetSeconds });
      }
      throw apiError("forbidden", { status: response.status });
    }
    throw apiError("http", { status: response.status });
  }

  function encodeUsername(username) {
    return encodeURIComponent(username.trim());
  }

  async function getUser(username) {
    return fetchJSON(`${API_ROOT}/users/${encodeUsername(username)}`);
  }

  async function getUserRepos(username) {
    const repos = [];
    for (let page = 1; page <= MAX_REPO_PAGES; page += 1) {
      const url = `${API_ROOT}/users/${encodeUsername(username)}/repos?per_page=${PER_PAGE}&page=${page}`;
      const batch = await fetchJSON(url);
      repos.push(...batch);
      if (batch.length < PER_PAGE) break;
    }
    return repos;
  }

  async function fetchLanguages(url) {
    if (languageCache.has(url)) {
      return languageCache.get(url);
    }
    const data = await fetchJSON(url);
    languageCache.set(url, data);
    return data;
  }

  async function getLanguageStats(repos) {
    const totals = new Map();
    const targets = repos.filter((repo) => repo && repo.languages_url && repo.language);
    for (let index = 0; index < targets.length; index += LANGUAGE_CONCURRENCY) {
      const batch = targets.slice(index, index + LANGUAGE_CONCURRENCY);
      const responses = await Promise.allSettled(
        batch.map((repo) => fetchLanguages(repo.languages_url))
      );
      for (const response of responses) {
        if (response.status !== "fulfilled" || !response.value) continue;
        for (const [language, bytes] of Object.entries(response.value)) {
          totals.set(language, (totals.get(language) || 0) + bytes);
        }
      }
    }
    const totalBytes = [...totals.values()].reduce((sum, bytes) => sum + bytes, 0);
    if (totalBytes === 0) return [];
    return [...totals.entries()]
      .map(([name, bytes]) => ({ name, bytes, percentage: (bytes / totalBytes) * 100 }))
      .sort((a, b) => b.bytes - a.bytes);
  }

  return { getUser, getUserRepos, getLanguageStats };
})();
