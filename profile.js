
/* ==========================================
   AniStream Hindi - Profile System
   Supabase Authentication & User Profile
========================================== */

const SUPABASE_URL = "https://gmacsiymybvfcxydvkla.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_Li6BRvLN87cvF8zghHQCxw_STmBDeGF";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let currentUser = null;

const $ = (id) => document.getElementById(id);

function showMessage(message, type = "info") {
  const el = $("profileMessage");

  if (!el) {
    alert(message);
    return;
  }

  el.textContent = message;
  el.style.display = "block";
  el.style.color =
    type === "error" ? "#ff5252" :
    type === "success" ? "#35d07f" : "#ffffff";
}

function hideMessage() {
  const el = $("profileMessage");
  if (el) el.style.display = "none";
}

function showAuthPanel() {
  if ($("authPanel")) $("authPanel").style.display = "block";
  if ($("profilePanel")) $("profilePanel").style.display = "none";
}

function showProfilePanel() {
  if ($("authPanel")) $("authPanel").style.display = "none";
  if ($("profilePanel")) $("profilePanel").style.display = "block";
}

function getDisplayName(user) {
  const metadata = user.user_metadata || {};

  return (
    metadata.username ||
    metadata.full_name ||
    metadata.name ||
    user.email?.split("@")[0] ||
    "AniStream User"
  );
}

function getInitial(name) {
  return (name || "A").trim().charAt(0).toUpperCase();
}

/* ==========================================
   PROFILE DISPLAY
========================================== */

async function loadUserProfile(user) {
  if (!user) return;

  currentUser = user;

  const metadata = user.user_metadata || {};
  const name = getDisplayName(user);

  if ($("profileName")) $("profileName").textContent = name;

  if ($("profileEmail")) {
    $("profileEmail").textContent = user.email || "";
  }

  if ($("usernameInput")) {
    $("usernameInput").value =
      metadata.username || name;
  }

  if ($("bioInput")) {
    $("bioInput").value = metadata.bio || "";
  }

  if ($("profileInitial")) {
    $("profileInitial").textContent = getInitial(name);
  }

  await loadAvatar(user);
  updateHomepageProfileNav(user);
}

/* ==========================================
   AVATAR DISPLAY
========================================== */

async function loadAvatar(user) {
  const metadata = user.user_metadata || {};
  const avatar = $("avatarPreview");

  if (!avatar) return;

  let imageUrl = "";

  if (metadata.avatar_path) {
    const { data, error } = await supabaseClient.storage
      .from("avatars")
      .createSignedUrl(metadata.avatar_path, 3600);

    if (!error && data) {
      imageUrl = data.signedUrl;
    }
  } else if (
    metadata.avatar_url &&
    /^https?:\/\//i.test(metadata.avatar_url)
  ) {
    imageUrl = metadata.avatar_url;
  } else if (
    metadata.picture &&
    /^https?:\/\//i.test(metadata.picture)
  ) {
    imageUrl = metadata.picture;
  }

  if (imageUrl) {
    avatar.src = imageUrl;
    avatar.style.display = "block";
  }
}

/* ==========================================
   SIGNUP
========================================== */

async function signupUser(event) {
  if (event) event.preventDefault();

  hideMessage();

  const name = $("signupName")?.value.trim();
  const email = $("signupEmail")?.value.trim();
  const password = $("signupPassword")?.value;

  if (!name || !email || !password) {
    return showMessage("Please fill all fields.", "error");
  }

  if (password.length < 6) {
    return showMessage(
      "Password must be at least 6 characters.",
      "error"
    );
  }

  const button = $("signupButton");
  if (button) button.disabled = true;

  try {
    const { data, error } =
      await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            username: name
          }
        }
      });

    if (error) throw error;

    if (data.session) {
      showMessage("Account created successfully!", "success");
      await loadUserProfile(data.user);
      showProfilePanel();
    } else {
      showMessage(
        "Account created! Please verify your email, then login.",
        "success"
      );
    }
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    if (button) button.disabled = false;
  }
}

/* ==========================================
   LOGIN
========================================== */

async function loginUser(event) {
  if (event) event.preventDefault();

  hideMessage();

  const email = $("loginEmail")?.value.trim();
  const password = $("loginPassword")?.value;

  if (!email || !password) {
    return showMessage(
      "Please enter email and password.",
      "error"
    );
  }

  const button = $("loginButton");
  if (button) button.disabled = true;

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) throw error;

    showMessage("Login successful!", "success");
    await loadUserProfile(data.user);
    showProfilePanel();
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    if (button) button.disabled = false;
  }
}

/* ==========================================
   GOOGLE LOGIN
========================================== */

async function googleLogin() {
  hideMessage();

  try {
    const { error } =
      await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.href
        }
      });

    if (error) throw error;
  } catch (error) {
    showMessage(error.message, "error");
  }
}

/* ==========================================
   FORGOT PASSWORD
========================================== */

async function forgotPassword() {
  hideMessage();

  const email = $("loginEmail")?.value.trim();

  if (!email) {
    return showMessage(
      "Enter your email address first.",
      "error"
    );
  }

  try {
    const { error } =
      await supabaseClient.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: window.location.href
        }
      );

    if (error) throw error;

    showMessage(
      "Password reset link sent to your email.",
      "success"
    );
  } catch (error) {
    showMessage(error.message, "error");
  }
}

/* ==========================================
   UPDATE PASSWORD
========================================== */

async function updatePassword() {
  const password = $("newPassword")?.value;

  if (!password || password.length < 6) {
    return showMessage(
      "Enter a password with at least 6 characters.",
      "error"
    );
  }

  try {
    const { error } =
      await supabaseClient.auth.updateUser({
        password
      });

    if (error) throw error;

    showMessage(
      "Password updated successfully!",
      "success"
    );
  } catch (error) {
    showMessage(error.message, "error");
  }
}

/* ==========================================
   SAVE PROFILE
========================================== */

async function saveProfile() {
  if (!currentUser) return;

  hideMessage();

  const username = $("usernameInput")?.value.trim();
  const bio = $("bioInput")?.value.trim();

  if (!username) {
    return showMessage(
      "Please enter your username.",
      "error"
    );
  }

  try {
    const { data, error } =
      await supabaseClient.auth.updateUser({
        data: {
          username,
          full_name: username,
          bio
        }
      });

    if (error) throw error;

    currentUser = data.user;

    await loadUserProfile(currentUser);

    showMessage(
      "Profile updated successfully!",
      "success"
    );
  } catch (error) {
    showMessage(error.message, "error");
  }
}

/* ==========================================
   UPLOAD PROFILE PHOTO
========================================== */

async function uploadAvatar(event) {
  if (!currentUser) return;

  const file = event.target.files?.[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    return showMessage(
      "Please select an image file.",
      "error"
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    return showMessage(
      "Image size must be below 5 MB.",
      "error"
    );
  }

  try {
    const extension =
      file.name.split(".").pop().toLowerCase();

    const filePath =
      `${currentUser.id}/${Date.now()}.${extension}`;

    const { error: uploadError } =
      await supabaseClient.storage
        .from("avatars")
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type
        });

    if (uploadError) throw uploadError;

    const { data, error } =
      await supabaseClient.auth.updateUser({
        data: {
          avatar_path: filePath
        }
      });

    if (error) throw error;

    currentUser = data.user;

    await loadUserProfile(currentUser);

    showMessage(
      "Profile photo updated successfully!",
      "success"
    );
  } catch (error) {
    showMessage(error.message, "error");
  }

  event.target.value = "";
}

/* ==========================================
   DELETE PROFILE PHOTO
========================================== */

async function deleteAvatar() {
  if (!currentUser) return;

  const path = currentUser.user_metadata?.avatar_path;

  if (!path) {
    return showMessage(
      "No uploaded profile photo found.",
      "error"
    );
  }

  if (!confirm("Delete your profile photo?")) return;

  try {
    const { error: deleteError } =
      await supabaseClient.storage
        .from("avatars")
        .remove([path]);

    if (deleteError) throw deleteError;

    const { data, error } =
      await supabaseClient.auth.updateUser({
        data: {
          avatar_path: null
        }
      });

    if (error) throw error;

    currentUser = data.user;

    if ($("avatarPreview")) {
      $("avatarPreview").removeAttribute("src");
    }

    await loadUserProfile(currentUser);

    showMessage(
      "Profile photo deleted.",
      "success"
    );
  } catch (error) {
    showMessage(error.message, "error");
  }
}

/* ==========================================
   LOGOUT
========================================== */

async function logoutUser() {
  if (!confirm("Are you sure you want to logout?")) return;

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) throw error;

    currentUser = null;
    window.location.href = "index.html";
  } catch (error) {
    showMessage(error.message, "error");
  }
}

/* ==========================================
   HOMEPAGE PROFILE NAVIGATION
========================================== */

function updateHomepageProfileNav(user) {
  const nav = $("profileNav");

  if (!nav) return;

  const avatar = $("profileNavAvatar");
  const initial = $("profileNavInitial");
  const text = $("profileNavText");

  if (user) {
    const name = getDisplayName(user);

    if (text) text.textContent = name;

    if (initial) {
      initial.textContent = getInitial(name);
    }

    const metadata = user.user_metadata || {};

    if (avatar && metadata.avatar_url) {
      if (/^https?:\/\//i.test(metadata.avatar_url)) {
        avatar.src = metadata.avatar_url;
        avatar.style.display = "block";
      }
    }
  } else {
    if (text) text.textContent = "Login";
    if (initial) initial.textContent = "👤";
    if (avatar) {
      avatar.removeAttribute("src");
      avatar.style.display = "none";
    }
  }
}

/* ==========================================
   AUTH SESSION
========================================== */

async function initializeProfile() {
  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) throw error;

    const user = data.session?.user || null;

    if (user) {
      await loadUserProfile(user);
      showProfilePanel();
    } else {
      currentUser = null;
      showAuthPanel();
      updateHomepageProfileNav(null);
    }
  } catch (error) {
    console.error("Profile initialization:", error);
    showAuthPanel();
  }
}

/* ==========================================
   AUTH STATE LISTENER
========================================== */

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {
    if (event === "SIGNED_OUT") {
      currentUser = null;
      updateHomepageProfileNav(null);
      showAuthPanel();
      return;
    }

    if (session?.user) {
      currentUser = session.user;

      if (event === "SIGNED_IN" ||
          event === "USER_UPDATED" ||
          event === "TOKEN_REFRESHED") {
        await loadUserProfile(session.user);
        showProfilePanel();
      }
    }
  }
);

/* ==========================================
   CONNECT PAGE BUTTONS
========================================== */

document.addEventListener("DOMContentLoaded", () => {

  $("loginForm")?.addEventListener("submit", loginUser);

  $("signupForm")?.addEventListener("submit", signupUser);

  $("googleLoginBtn")?.addEventListener("click", googleLogin);

  $("forgotPasswordBtn")?.addEventListener(
    "click",
    forgotPassword
  );

  $("saveProfileBtn")?.addEventListener(
    "click",
    saveProfile
  );

  $("logoutBtn")?.addEventListener(
    "click",
    logoutUser
  );

  $("avatarInput")?.addEventListener(
    "change",
    uploadAvatar
  );

  $("deleteAvatarBtn")?.addEventListener(
    "click",
    deleteAvatar
  );

  $("updatePasswordBtn")?.addEventListener(
    "click",
    updatePassword
  );

  $("showSignupBtn")?.addEventListener("click", () => {
    if ($("loginForm")) $("loginForm").style.display = "none";
    if ($("signupForm")) $("signupForm").style.display = "block";
    hideMessage();
  });

  $("showLoginBtn")?.addEventListener("click", () => {
    if ($("signupForm")) $("signupForm").style.display = "none";
    if ($("loginForm")) $("loginForm").style.display = "block";
    hideMessage();
  });

  initializeProfile();
});
