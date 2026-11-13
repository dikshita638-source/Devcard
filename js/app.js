(function () {
  "use strict";

  const REPO_LIMIT = 5;
  const LANGUAGE_DISPLAY_LIMIT = 10;
  const GITHUB_PROFILE_URL = "https://github.com";

  const LANGUAGE_COLORS = {
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    Python: "#3572A5",
    Java: "#b07219",
    "C++": "#f34b7d",
    C: "#555555",
    "C#": "#178600",
    Go: "#00ADD8",
    Rust: "#dea584",
    Ruby: "#701516",
    PHP: "#4F5D95",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
    Dart: "#00B4AB",
    HTML: "#e34c26",
    CSS: "#563d7c",
    SCSS: "#c6538c",
    Shell: "#89e051",
    Vue: "#41b883",
    "Jupyter Notebook": "#DA5B0B",
    Lua: "#0000ff",
    Perl: "#0298c3",
    Haskell: "#5e5086",
    Elixir: "#6e4a7e",
    Zig: "#ec915c",
    "Objective-C": "#438eff",
    Assembly: "#6E4C13",
    R: "#198CE7",
    MATLAB: "#e16737",
  };

  const ICONS = {
    repo:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    star:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    arrow:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>',
  };

  const dom = {
    form: document.getElementById("search-form"),
    input: document.getElementById("search-input"),
    submit: document.getElementById("search-submit"),
    emptyState: document.getElementById("empty-state"),
    loadingState: document.getElementById("loading-state"),
    errorState: document.getElementById("error-state"),
    results: document.getElementById("results"),
    loadingText: document.getElementById("loading-text"),
    errorTitle: document.getElementById("error-title"),
    errorText: document.getElementById("error-text"),
    retryButton: document.getElementById("retry-button"),
    avatar: document.getElementById("profile-avatar"),
    profileName: document.getElementById("profile-name"),
    profileUsername: document.getElementById("profile-username"),
    profileBio: document.getElementById("profile-bio"),
    followersValue: document.getElementById("stat-followers"),
    reposValue: document.getElementById("stat-repos"),
    reposList: document.getElementById("repos-list"),
    languagesList: document.getElementById("languages-list"),
  };

  const state = {
    query: "",
    loading: false,
    searchId: 0,
  };

  function showSection(section) {
    [dom.emptyState, dom.loadingState, dom.errorState, dom.results].forEach((element) => {
      element.hidden = element !== section;
    });
  }

  function setBusy(isLoading) {
    state.loading = isLoading;
    dom.submit.disabled = isLoading;
  }

  function formatCount(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "0";
    if (value >= 1000000) return `${trimDecimal(value / 1000000)}m`;
    if (value >= 1000) return `${trimDecimal(value / 1000)}k`;
    return String(value);
  }

  function trimDecimal(value) {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  function formatPercent(value) {
    return `${trimDecimal(value)}%`;
  }

  function languageColor(name) {
    return LANGUAGE_COLORS[name] || "#8B78C6";
  }

  function makeIcon(markup, className) {
    const wrapper = document.createElement("span");
    wrapper.className = className;
    wrapper.innerHTML = markup;
    return wrapper;
  }

  function buildEmptyNotice(message) {
    const notice = document.createElement("p");
    notice.className = "panel-empty";
    notice.textContent = message;
    return notice;
  }

  function renderProfile(user) {
    dom.avatar.src = user.avatar_url;
    dom.avatar.alt = `${user.name || user.login} avatar`;
    dom.profileName.textContent = user.name || user.login;
    dom.profileUsername.textContent = `@${user.login}`;
    dom.profileUsername.href = user.html_url;
    dom.profileBio.textContent = user.bio || "This developer hasn't added a bio yet.";
    dom.followersValue.textContent = formatCount(user.followers);
    dom.reposValue.textContent = formatCount(user.public_repos);

    const profileUrl = `${GITHUB_PROFILE_URL}/${encodeURIComponent(user.login)}`;
    dom.followersValue.href = `${profileUrl}?tab=followers`;
    dom.reposValue.href = `${profileUrl}?tab=repositories`;
    dom.followersValue.setAttribute("aria-label", `View ${user.login}'s followers on GitHub`);
    dom.reposValue.setAttribute("aria-label", `View ${user.login}'s public repositories on GitHub`);
  }

  function renderRepos(repos) {
    dom.reposList.replaceChildren();
    if (repos.length === 0) {
      dom.reposList.append(buildEmptyNotice("This developer has no public repositories yet."));
      return;
    }
    repos.forEach((repo) => {
      const card = document.createElement("a");
      card.className = "repo-card";
      card.href = repo.html_url;
      card.target = "_blank";
      card.rel = "noopener noreferrer";

      const head = document.createElement("div");
      head.className = "repo-head";
      const name = document.createElement("span");
      name.className = "repo-name";
      name.textContent = repo.name;
      head.append(makeIcon(ICONS.repo, "repo-icon"), name, makeIcon(ICONS.arrow, "repo-arrow"));
      card.append(head);

      if (repo.description) {
        const description = document.createElement("p");
        description.className = "repo-desc";
        description.textContent = repo.description;
        card.append(description);
      }

      const meta = document.createElement("div");
      meta.className = "repo-meta";
      const stars = document.createElement("span");
      stars.className = "repo-stars";
      const starCount = document.createElement("span");
      starCount.textContent = formatCount(repo.stargazers_count);
      stars.append(makeIcon(ICONS.star, "star-icon"), starCount);
      meta.append(stars);

      if (repo.language) {
        const language = document.createElement("span");
        language.className = "repo-lang";
        const dot = document.createElement("span");
        dot.className = "lang-dot";
        dot.style.backgroundColor = languageColor(repo.language);
        const languageName = document.createElement("span");
        languageName.textContent = repo.language;
        language.append(dot, languageName);
        meta.append(language);
      }

      card.append(meta);
      dom.reposList.append(card);
    });
  }

  function renderLanguagesPending() {
    dom.languagesList.replaceChildren();
    const pending = document.createElement("div");
    pending.className = "lang-pending";
    const spinner = document.createElement("span");
    spinner.className = "spinner spinner-sm";
    const text = document.createElement("span");
    text.textContent = "Analyzing repository languages…";
    pending.append(spinner, text);
    dom.languagesList.append(pending);
  }

  function renderLanguages(languages) {
    dom.languagesList.replaceChildren();
    if (languages.length === 0) {
      dom.languagesList.append(buildEmptyNotice("No language data could be loaded for this developer."));
      return;
    }
    languages.slice(0, LANGUAGE_DISPLAY_LIMIT).forEach((language) => {
      const row = document.createElement("div");
      row.className = "lang-row";

      const head = document.createElement("div");
      head.className = "lang-head";
      const name = document.createElement("span");
      name.className = "lang-name";
      const dot = document.createElement("span");
      dot.className = "lang-dot";
      dot.style.backgroundColor = languageColor(language.name);
      name.append(dot, document.createTextNode(language.name));
      const percentage = document.createElement("span");
      percentage.className = "lang-pct";
      percentage.textContent = formatPercent(language.percentage);
      head.append(name, percentage);

      const track = document.createElement("div");
      track.className = "lang-track";
      const fill = document.createElement("div");
      fill.className = "lang-fill";
      fill.style.backgroundColor = languageColor(language.name);
      fill.style.width = `${Math.max(1.5, Math.min(100, language.percentage)).toFixed(2)}%`;
      track.append(fill);

      row.append(head, track);
      dom.languagesList.append(row);
    });
  }

  function rateLimitText(resetSeconds) {
    if (!resetSeconds) {
      return "GitHub's API rate limit has been reached. Please wait a few minutes before searching again.";
    }
    const remainingMinutes = Math.max(1, Math.ceil((resetSeconds * 1000 - Date.now()) / 60000));
    const plural = remainingMinutes === 1 ? "" : "s";
    return `GitHub's API rate limit has been reached. Things should reset in about ${remainingMinutes} minute${plural}.`;
  }

  function describeError(error, username) {
    switch (error && error.kind) {
      case "empty-input":
        return {
          title: "Nothing to search yet",
          text: "Type a GitHub username in the search box above to get started.",
        };
      case "not-found":
        return {
          title: "User not found",
          text: `We couldn't find “${username}” on GitHub. Double-check the spelling and try again.`,
        };
      case "rate-limit":
        return { title: "Rate limit reached", text: rateLimitText(error.resetSeconds) };
      case "forbidden":
        return {
          title: "Access denied",
          text: "GitHub refused this request. Please try again in a moment.",
        };
      case "network":
        return {
          title: "Connection problem",
          text: "We couldn't reach GitHub. Check your internet connection and try again.",
        };
      default:
        return {
          title: "Something went wrong",
          text: "An unexpected error occurred while talking to GitHub. Please try again in a moment.",
        };
    }
  }

  function renderError(error, username) {
    const description = describeError(error, username);
    dom.errorTitle.textContent = description.title;
    dom.errorText.textContent = description.text;
    dom.retryButton.hidden = error && error.kind === "empty-input";
    showSection(dom.errorState);
  }

  function rankRepos(repos) {
    return [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count);
  }

  async function runSearch(username) {
    const searchId = ++state.searchId;
    state.query = username;
    setBusy(true);
    dom.loadingText.textContent = `Looking up ${username} on GitHub…`;
    showSection(dom.loadingState);
    try {
      const [user, repos] = await Promise.all([
        GitHubApi.getUser(username),
        GitHubApi.getUserRepos(username),
      ]);
      if (searchId !== state.searchId) return;

      const ranked = rankRepos(repos);

      renderProfile(user);
      renderRepos(ranked.slice(0, REPO_LIMIT));
      renderLanguagesPending();
      showSection(dom.results);

      const languages = await GitHubApi.getLanguageStats(ranked);
      if (searchId !== state.searchId) return;
      renderLanguages(languages);
    } catch (error) {
      if (searchId !== state.searchId) return;
      renderError(error, username);
    } finally {
      if (searchId === state.searchId) {
        setBusy(false);
      }
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (state.loading) return;
    const username = dom.input.value.trim();
    if (!username) {
      renderError({ kind: "empty-input" }, "");
      dom.input.focus();
      return;
    }
    runSearch(username);
  }

  dom.form.addEventListener("submit", handleSubmit);

  dom.retryButton.addEventListener("click", () => {
    if (state.query && !state.loading) {
      runSearch(state.query);
    }
  });

  dom.input.focus();
})();
