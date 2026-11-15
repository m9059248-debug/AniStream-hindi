
/* ==========================================
   AniStream Hindi - Universal Profile System
========================================== */

const SUPABASE_URL = "https://gmacsiymybvfcxydvkla.supabase.co";
const SUPABASE_KEY = "sb_publishable_Li6BRvLN87cvF8zghHQCxw_STmBDeGF";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

const el = (...ids) => {
  for (const id of ids) {
    const node = document.getElementById(id);
    if (node) return node;
  }
  return null;
};

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

function showLogin() {
  const auth = el("authSection", "authPanel");
  const account = el("accountSection", "profilePanel");

  if (auth) auth.hidden = false;
  if (account) account.hidden = true;
}

function showAccount() {
  const auth = el("authSection", "authPanel");
  const account = el("accountSection", "profilePanel");

  if (auth) auth.hidden = true;
  if (account) account.hidden = false;
}

function userName(user) {
  const m = user.user_metadata || {};

  return m.full_name ||
         m.name ||
         m.username ||
         user.email?.split("@")[0] ||
         "AniStream User";
}

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
  const letter = name.charAt(0).toUpperCase();

  const oldAvatar = el("profileAvatar");
  const newAvatar = el("avatarPreview");
  const initial = el("profileInitial");

  let imageUrl = meta.avatar_url || meta.picture || "";

  if (meta.avatar_path) {
    const { data } = await db.storage
      .from("avatars")
      .createSignedUrl(meta.avatar_path, 3600);

    if (data?.signedUrl) imageUrl = data.signedUrl;
  }

  if (oldAvatar) {
    oldAvatar.replaceChildren();

    if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = "Profile photo";
      img.className = "avatar";
      oldAvatar.appendChild(img);
      oldAvatar.className = "avatar";
    } else {
      oldAvatar.textContent = letter;
      oldAvatar.className = "avatar avatar-fallback";
    }
  }

  if (initial) initial.textContent = letter;

  if (newAvatar) {
    if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
      newAvatar.src = imageUrl;
      newAvatar.style.display = "block";
    } else {
      newAvatar.removeAttribute("src");
      newAvatar.style.display = "none";
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

  if (el("displayNameInput")) {
    el("displayNameInput").value =
      meta.full_name || meta.name || "";
  }

  if (el("usernameInput")) {
    el("usernameInput").value = meta.username || "";
  }

  if (el("bioInput")) {
    el("bioInput").value = meta.bio || "";
  }

  if (el("privacyInput")) {
    el("privacyInput").checked =
      meta.private_profile !== false;
  }

  if (el("joinedDate")) {
    el("joinedDate").textContent = user.created_at
      ? new Date(user.created_at).toLocaleDateString()
      : "—";
  }

  await renderAvatar(user);
}

/* ==========================================
   SIGNUP
========================================== */

async function signupUser(event) {
  event.preventDefault();
  clearMsg();

  const name = el("signupName")?.value.trim();
  const username =
    el("signupUsername")?.value.trim() || name?.replace(/\s+/g, "_");

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

  const button = el("signupSubmit", "signupButton");
  if (button) {
    button.disabled = true;
    button.textContent = "Creating Account...";
  }

  try {
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin +
          window.location.pathname,
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
      msg("Account created! Please verify your email, then login.", "success");
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

  const button = el("loginSubmit", "loginButton");
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

  const button = el("googleLogin", "googleLoginBtn");

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
      redirectTo: new URL("profile.html", window.location.href).href
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

  const name =
    el("displayNameInput")?.value.trim() ||
    currentUser.user_metadata?.full_name ||
    userName(currentUser);

  const username = el("usernameInput")?.value.trim();
  const bio = el("bioInput")?.value.trim() || "";
  const privacy = el("privacyInput")?.checked ?? true;

  if (!username) {
    return msg("Please enter a username.", "error");
  }

  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    return msg("Username must be 3-24 characters.", "error");
  }

  const button = el("profileSave", "saveProfileBtn");
  if (button) button.disabled = true;

  try {
    const { data, error } = await db.auth.updateUser({
      data: {
        full_name: name,
        username,
        bio,
        private_profile: privacy
      }
    });

    if (error) throw error;

    await loadProfile(data.user);
    msg("Profile updated successfully!", "success");

  } catch (error) {
    msg(error.message, "error");
  } finally {
    if (button) button.disabled = false;
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
      data: { avatar_path: path }
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
      data: { avatar_path: null }
    });

    if (error) throw error;

    await db.storage.from("avatars").remove([path]);

    await loadProfile(data.user);
    msg("Profile photo removed.", "success");

  } catch (error) {
    msg(error.message, "error");
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
    showLogin();
    switchTab("login");
    msg("Logged out successfully.", "success");

  } catch (error) {
    msg(error.message, "error");
  }
}

/* ==========================================
   INIT
========================================== */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Show login form by default
    showLogin();
    switchTab("login");

    el("loginTab")?.addEventListener("click", () => switchTab("login"));
    el("signupTab")?.addEventListener("click", () => switchTab("signup"));

    el("loginForm")?.addEventListener("submit", loginUser);
    el("signupForm")?.addEventListener("submit", signupUser);

    el("googleLogin", "googleLoginBtn")?.addEventListener("click", googleLogin);
    el("forgotPassword", "forgotPasswordBtn")?.addEventListener("click", forgotPassword);

    el("profileSave", "saveProfileBtn")?.addEventListener("click", saveProfile);
    el("logoutButton", "logoutBtn")?.addEventListener("click", logoutUser);

    el("photoInput", "avatarInput")?.addEventListener("change", uploadPhoto);
    el("removePhoto", "deleteAvatarBtn")?.addEventListener("click", removePhoto);

    el("deleteAccountInfo")?.addEventListener("click", () => {
      msg("Please contact the AniStream administrator to request account deletion.", "info");
    });

    const { data, error } = await db.auth.getSession();
    if (error) throw error;

    if (data.session?.user) {
      await loadProfile(data.session.user);
    } else {
      showLogin();
    }

    db.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        currentUser = null;
        showLogin();
      } else if (session?.user) {
        setTimeout(() => loadProfile(session.user), 0);
      }
    });

  } catch (error) {
    console.error("AniStream Profile Error:", error);
    showLogin();
    msg("Profile error: " + error.message, "error");
  }
});
