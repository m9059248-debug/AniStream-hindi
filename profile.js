
/* ==========================================
   AniStream Hindi - Universal Profile System
   + Automatic Watch History Display
========================================== */

const SUPABASE_URL = "https://gmacsiymybvfcxydvkla.supabase.co";
const SUPABASE_KEY = "sb_publishable_Li6BRvLN87cvF8zghHQCxw_STmBDeGF";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let currentUser = null;
let historyRequest = 0;

const el = (...ids) => {
  for (const id of ids) {
    const node = document.getElementById(id);
    if (node) return node;
  }
  return null;
};

/* ==========================================
   MESSAGE
========================================== */

function msg(text, type = "info") {
  const box = el("profileMessage");

  if (!box) {
    console.log(text);
    return;
  }

  box.textContent = text;
  box.className = "profile-message show " + type;
}

function clearMsg() {
  const box = el("profileMessage");

  if (box) {
    box.textContent = "";
    box.className = "profile-message";
  }
}

/* ==========================================
   SHOW / HIDE SECTIONS
========================================== */

function showLogin() {
  const auth = el("authPanel");
  const account = el("profilePanel");
  const history = el("watchHistoryPanel");

  if (auth) auth.hidden = false;
  if (account) account.hidden = true;
  if (history) history.hidden = true;

  clearHistory();
}

function showAccount() {
  const auth = el("authPanel");
  const account = el("profilePanel");
  const history = el("watchHistoryPanel");

  if (auth) auth.hidden = true;
  if (account) account.hidden = false;
  if (history) history.hidden = false;
}

/* ==========================================
   USER NAME
========================================== */

function userName(user) {
  const meta = user.user_metadata || {};

  return meta.full_name ||
    meta.name ||
    meta.username ||
    user.email?.split("@")[0] ||
    "AniStream User";
}

/* ==========================================
   LOGIN / SIGNUP TABS
========================================== */

function switchTab(tab) {
  const login = tab === "login";

  const loginForm = el("loginForm");
  const signupForm = el("signupForm");

  if (loginForm) loginForm.hidden = !login;
  if (signupForm) signupForm.hidden = login;

  el("loginTab")?.classList.toggle("active", login);
  el("signupTab")?.classList.toggle("active", !login);

  clearMsg();
}

/* ==========================================
   PROFILE AVATAR
========================================== */

async function renderAvatar(user) {
  const meta = user.user_metadata || {};
  const name = userName(user);

  const initial = el("profileInitial");
  const preview = el("avatarPreview");

  let imageUrl = meta.avatar_url || meta.picture || "";

  if (meta.avatar_path) {
    const { data, error } = await db.storage
      .from("avatars")
      .createSignedUrl(meta.avatar_path, 3600);

    if (!error && data?.signedUrl) {
      imageUrl = data.signedUrl;
    }
  }

  if (initial) {
    initial.textContent = name.charAt(0).toUpperCase();
  }

  if (preview) {
    if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
      preview.src = imageUrl;
      preview.style.display = "block";
    } else {
      preview.removeAttribute("src");
      preview.style.display = "none";
    }
  }
}

/* ==========================================
   LOAD PROFILE
========================================== */

async function loadProfile(user) {
  if (!user) {
    currentUser = null;
    showLogin();
    return;
  }

  currentUser = user;

  const meta = user.user_metadata || {};
  const name = userName(user);

  showAccount();

  if (el("profileName")) {
    el("profileName").textContent = name;
  }

  if (el("profileEmail")) {
    el("profileEmail").textContent = user.email || "";
  }

  if (el("usernameInput")) {
    el("usernameInput").value = meta.username || "";
  }

  if (el("bioInput")) {
    el("bioInput").value = meta.bio || "";
  }

  if (el("joinedDate")) {
    el("joinedDate").textContent = user.created_at
      ? new Date(user.created_at).toLocaleDateString("en-IN")
      : "—";
  }

  await renderAvatar(user);

  // Load user's anime history
  await loadWatchHistory(user.id);
}

/* ==========================================
   SIGNUP
========================================== */

async function signupUser(event) {
  event.preventDefault();
  clearMsg();

  const name = el("signupName")?.value.trim();
  const username = name?.replace(/\s+/g, "_");
  const email = el("signupEmail")?.value.trim();
  const password = el("signupPassword")?.value;

  if (!name || !email || !password) {
    return msg("Please fill all required fields.", "error");
  }

  if (password.length < 8) {
    return msg("Password must be at least 8 characters.", "error");
  }

  if (username && !/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    return msg("Username must use 3-24 letters, numbers or underscores.", "error");
  }

  const button = el("signupButton");

  if (button) {
    button.disabled = true;
    button.textContent = "Creating Account...";
  }

  try {
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: new URL(
          "profile.html",
          window.location.href
        ).href,

        data: {
          full_name: name,
          username: username,
          bio: "",
          private_profile: true
        }
      }
    });

    if (error) throw error;

    if (data.session && data.user) {
      await loadProfile(data.user);
      msg("Account created successfully!", "success");
    } else {
      switchTab("login");
      msg(
        "Account created! Please verify your email, then login.",
        "success"
      );
    }

  } catch (error) {
    msg(error.message, "error");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Create Account";
    }
  }
}

/* ==========================================
   LOGIN
========================================== */

async function loginUser(event) {
  event.preventDefault();
  clearMsg();

  const email = el("loginEmail")?.value.trim();
  const password = el("loginPassword")?.value;

  const button = el("loginButton");

  if (button) {
    button.disabled = true;
    button.textContent = "Logging in...";
  }

  try {
    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    await loadProfile(data.user);

    msg("Login successful!", "success");

  } catch (error) {
    msg(error.message, "error");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Login";
    }
  }
}

/* ==========================================
   GOOGLE LOGIN
========================================== */

async function googleLogin() {
  clearMsg();

  const button = el("googleLoginBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Connecting...";
  }

  try {
    const redirectUrl = new URL(
      "profile.html",
      window.location.href
    ).href;

    const { error } = await db.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl
      }
    });

    if (error) throw error;

  } catch (error) {
    msg(error.message, "error");

    if (button) {
      button.disabled = false;
      button.textContent = "Continue with Google";
    }
  }
}

/* ==========================================
   FORGOT PASSWORD
========================================== */

async function forgotPassword() {
  clearMsg();

  const email = el("loginEmail")?.value.trim();

  if (!email) {
    return msg("Enter your email address first.", "error");
  }

  try {
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: new URL(
        "profile.html",
        window.location.href
      ).href
    });

    if (error) throw error;

    msg("Password reset email sent!", "success");

  } catch (error) {
    msg(error.message, "error");
  }
}

/* ==========================================
   SAVE PROFILE
========================================== */

async function saveProfile() {
  if (!currentUser) return;

  clearMsg();

  const username = el("usernameInput")?.value.trim();
  const bio = el("bioInput")?.value.trim() || "";

  if (!username) {
    return msg("Please enter a username.", "error");
  }

  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    return msg(
      "Username must be 3-24 letters, numbers or underscores.",
      "error"
    );
  }

  const button = el("saveProfileBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Saving...";
  }

  try {
    const { data, error } = await db.auth.updateUser({
      data: {
        username,
        bio
      }
    });

    if (error) throw error;

    currentUser = data.user;

    await loadProfile(currentUser);

    msg("Profile updated successfully!", "success");

  } catch (error) {
    msg(error.message, "error");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Save Changes";
    }
  }
}

/* ==========================================
   PHOTO UPLOAD
========================================== */

async function uploadPhoto(event) {
  if (!currentUser) return;

  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    return msg("Select a valid image.", "error");
  }

  if (file.size > 5 * 1024 * 1024) {
    return msg("Image must be under 5 MB.", "error");
  }

  try {
    msg("Uploading photo...", "info");

    const oldPath = currentUser.user_metadata?.avatar_path;

    const extension = file.name.split(".").pop().toLowerCase();

    const path = `${currentUser.id}/${Date.now()}.${extension}`;

    const { error: uploadError } = await db.storage
      .from("avatars")
      .upload(path, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data, error } = await db.auth.updateUser({
      data: {
        avatar_path: path
      }
    });

    if (error) {
      await db.storage.from("avatars").remove([path]);
      throw error;
    }

    currentUser = data.user;

    if (oldPath) {
      await db.storage.from("avatars").remove([oldPath]);
    }

    await loadProfile(currentUser);

    msg("Profile photo updated!", "success");

  } catch (error) {
    msg(error.message, "error");
  }

  event.target.value = "";
}

/* ==========================================
   REMOVE PHOTO
========================================== */

async function removePhoto() {
  if (!currentUser) return;

  const path = currentUser.user_metadata?.avatar_path;

  if (!path) {
    return msg("No uploaded photo found.", "error");
  }

  if (!confirm("Remove your profile photo?")) return;

  try {
    const { data, error } = await db.auth.updateUser({
      data: {
        avatar_path: null
      }
    });

    if (error) throw error;

    await db.storage.from("avatars").remove([path]);

    currentUser = data.user;

    await loadProfile(currentUser);

    msg("Profile photo removed.", "success");

  } catch (error) {
    msg(error.message, "error");
  }
}

/* ==========================================
   WATCH HISTORY - CLEAR
========================================== */

function clearHistory() {
  const list = el("historyList");
  const count = el("historyCount");
  const empty = el("historyEmpty");
  const loading = el("historyLoading");

  if (list) list.replaceChildren();
  if (count) count.textContent = "0 Anime";
  if (empty) empty.hidden = true;
  if (loading) loading.hidden = true;
}

/* ==========================================
   WATCH HISTORY - DATE
========================================== */

function formatWatchDate(date) {
  if (!date) return "Date unavailable";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Date unavailable";
  }

  return parsed.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/* ==========================================
   WATCH HISTORY - SAFE IMAGE
========================================== */

function safeImage(url) {
  if (!url) return "";

  try {
    const parsed = new URL(url, window.location.origin);

    if (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:"
    ) {
      return parsed.href;
    }
  } catch (error) {}

  return "";
}

/* ==========================================
   WATCH HISTORY - RENDER
========================================== */

function renderWatchHistory(records) {
  const list = el("historyList");
  const count = el("historyCount");
  const empty = el("historyEmpty");

  if (!list) return;

  list.replaceChildren();

  if (!records.length) {
    if (count) count.textContent = "0 Anime";
    if (empty) empty.hidden = false;
    return;
  }

  if (empty) empty.hidden = true;

  if (count) {
    count.textContent =
      records.length + (records.length === 1 ? " Anime" : " Anime");
  }

  records.forEach((anime) => {
    const card = document.createElement("article");
    card.className = "history-card";

    const poster = document.createElement("img");
    poster.className = "history-poster";
    poster.alt = anime.anime_title || "Anime poster";
    poster.loading = "lazy";

    poster.src = safeImage(anime.anime_thumbnail) ||
      "https://placehold.co/160x220/141827/ffffff?text=AniStream";

    poster.onerror = () => {
      poster.src = "https://placehold.co/160x220/141827/ffffff?text=AniStream";
    };

    const info = document.createElement("div");
    info.className = "history-info";

    const title = document.createElement("h3");
    title.textContent = anime.anime_title || "Unknown Anime";

    const episode = document.createElement("div");
    episode.className = "history-episode";

    episode.textContent = anime.episode_number
      ? "Last watched: Episode " + anime.episode_number
      : "Episode information unavailable";

    const date = document.createElement("div");
    date.className = "history-date";

    date.textContent = "Watched: " + formatWatchDate(anime.watched_at);

    const watchLink = document.createElement("a");
    watchLink.className = "history-watch";
    watchLink.textContent = "▶ Watch Again";

    let watchUrl = anime.watch_url;

    if (!watchUrl && anime.anime_id) {
      watchUrl = "watch.html?id=" +
        encodeURIComponent(anime.anime_id) +
        "&episode=" +
        encodeURIComponent(anime.episode_number || 1);
    }

    if (watchUrl) {
      try {
        const parsed = new URL(watchUrl, window.location.href);

        if (
          parsed.origin === window.location.origin &&
          ["http:", "https:"].includes(parsed.protocol)
        ) {
          watchLink.href = parsed.href;
        } else {
          watchLink.hidden = true;
        }
      } catch (error) {
        watchLink.hidden = true;
      }
    } else {
      watchLink.hidden = true;
    }

    info.append(title, episode, date, watchLink);
    card.append(poster, info);

    list.appendChild(card);
  });
}

/* ==========================================
   WATCH HISTORY - LOAD FROM SUPABASE
========================================== */

async function loadWatchHistory(userId) {
  if (!userId) return;

  const requestId = ++historyRequest;

  const list = el("historyList");
  const loading = el("historyLoading");
  const empty = el("historyEmpty");
  const count = el("historyCount");

  if (list) list.replaceChildren();
  if (empty) empty.hidden = true;
  if (loading) loading.hidden = false;
  if (count) count.textContent = "Loading...";

  try {
    const { data, error } = await db
      .from("watch_history")
      .select(
        "id,user_id,anime_id,anime_title,anime_thumbnail,episode_number,watched_at,watch_url"
      )
      .eq("user_id", userId)
      .order("watched_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    // Prevent an old user's request from updating the current profile
    if (
      requestId !== historyRequest ||
      !currentUser ||
      currentUser.id !== userId
    ) {
      return;
    }

    // One card per anime, newest record first
    const uniqueAnime = new Map();

    (data || []).forEach((item) => {
      const key = String(item.anime_id || item.id);

      if (!uniqueAnime.has(key)) {
        uniqueAnime.set(key, item);
      }
    });

    renderWatchHistory(Array.from(uniqueAnime.values()));

  } catch (error) {
    console.error("Watch History Error:", error);

    if (requestId !== historyRequest) return;

    if (list) list.replaceChildren();

    if (count) count.textContent = "Unavailable";

    if (empty) {
      empty.hidden = false;
      empty.querySelector("h3").textContent = "History Could Not Load";
      empty.querySelector("p").textContent =
        "Please check your watch_history database and try again.";
    }

  } finally {
    if (requestId === historyRequest && loading) {
      loading.hidden = true;
    }
  }
}

/* ==========================================
   LOGOUT
========================================== */

async function logoutUser() {
  if (!confirm("Are you sure you want to logout?")) return;

  try {
    const { error } = await db.auth.signOut();

    if (error) throw error;

    currentUser = null;
    historyRequest++;

    showLogin();
    switchTab("login");

    msg("Logged out successfully.", "success");

  } catch (error) {
    msg(error.message, "error");
  }
}

/* ==========================================
   AUTH INITIALIZATION
========================================== */

document.addEventListener("DOMContentLoaded", async () => {

  try {
    showLogin();
    switchTab("login");

    // Tab events
    el("loginTab")?.addEventListener("click", () => {
      switchTab("login");
    });

    el("signupTab")?.addEventListener("click", () => {
      switchTab("signup");
    });

    // Authentication
    el("loginForm")?.addEventListener("submit", loginUser);
    el("signupForm")?.addEventListener("submit", signupUser);

    el("googleLoginBtn")?.addEventListener("click", googleLogin);

    el("forgotPasswordBtn")?.addEventListener("click", forgotPassword);

    // Profile
    el("saveProfileBtn")?.addEventListener("click", saveProfile);
    el("logoutBtn")?.addEventListener("click", logoutUser);

    // Avatar
    el("avatarInput")?.addEventListener("change", uploadPhoto);

    el("deleteAvatarBtn")?.addEventListener("click", removePhoto);

    // Get current session
    const { data, error } = await db.auth.getSession();

    if (error) throw error;

    if (data.session?.user) {
      await loadProfile(data.session.user);
    } else {
      showLogin();
    }

    // Auth state listener
    db.auth.onAuthStateChange((event, session) => {

      if (event === "SIGNED_OUT") {
        currentUser = null;
        historyRequest++;
        showLogin();
      }

      else if (
        session?.user &&
        ["SIGNED_IN", "INITIAL_SESSION", "USER_UPDATED"].includes(event)
      ) {
        setTimeout(() => {
          if (currentUser?.id !== session.user.id) {
            loadProfile(session.user);
          }
        }, 0);
      }
    });

  } catch (error) {
    console.error("AniStream Profile Error:", error);

    showLogin();

    msg(
      "Profile error: " + error.message,
      "error"
    );
  }
});
