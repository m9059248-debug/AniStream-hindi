
/* ==========================================
   AniStream Hindi - Profile System
   Matching your profile.html IDs
========================================== */

const SUPABASE_URL = "https://gmacsiymybvfcxydvkla.supabase.co";
const SUPABASE_KEY = "sb_publishable_Li6BRvLN87cvF8zghHQCxw_STmBDeGF";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let currentUser = null;

const $ = id => document.getElementById(id);

function message(text, type = "info") {
  const el = $("profileMessage");
  if (!el) return;

  el.textContent = text;
  el.className = "profile-message show " + type;
}

function clearMessage() {
  const el = $("profileMessage");
  if (!el) return;
  el.textContent = "";
  el.className = "profile-message";
}

function showLogin() {
  if ($("authSection")) $("authSection").hidden = false;
  if ($("accountSection")) $("accountSection").hidden = true;
}

function showAccount() {
  if ($("authSection")) $("authSection").hidden = true;
  if ($("accountSection")) $("accountSection").hidden = false;
}

function switchTab(tab) {
  const login = tab === "login";

  $("loginForm").hidden = !login;
  $("signupForm").hidden = login;

  $("loginTab").classList.toggle("active", login);
  $("signupTab").classList.toggle("active", !login);

  clearMessage();
}

function displayName(user) {
  const meta = user.user_metadata || {};

  return meta.full_name ||
         meta.name ||
         meta.username ||
         user.email?.split("@")[0] ||
         "AniStream User";
}

/* ==========================================
   AVATAR
========================================== */

async function showAvatar(user) {
  const box = $("profileAvatar");
  if (!box) return;

  const meta = user.user_metadata || {};
  const path = meta.avatar_path;

  let imageUrl = meta.avatar_url || meta.picture || "";

  if (path) {
    const { data, error } = await db.storage
      .from("avatars")
      .createSignedUrl(path, 3600);

    if (!error && data?.signedUrl) {
      imageUrl = data.signedUrl;
    }
  }

  if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
    box.innerHTML = "";

    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = "Profile photo";
    img.className = "avatar";
    img.onerror = () => {
      box.textContent = displayName(user).charAt(0).toUpperCase();
      box.className = "avatar avatar-fallback";
    };

    box.appendChild(img);
  } else {
    box.textContent = displayName(user).charAt(0).toUpperCase();
    box.className = "avatar avatar-fallback";
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

  showAccount();

  $("profileName").textContent = displayName(user);
  $("profileEmail").textContent = user.email || "";

  $("displayNameInput").value =
    meta.full_name || meta.name || "";

  $("usernameInput").value =
    meta.username || "";

  $("bioInput").value =
    meta.bio || "";

  $("privacyInput").checked =
    meta.private_profile !== false;

  $("joinedDate").textContent =
    user.created_at
      ? new Date(user.created_at).toLocaleDateString()
      : "—";

  await showAvatar(user);
}

/* ==========================================
   SIGNUP
========================================== */

async function signupUser(event) {
  event.preventDefault();
  clearMessage();

  const name = $("signupName").value.trim();
  const username = $("signupUsername").value.trim();
  const email = $("signupEmail").value.trim();
  const password = $("signupPassword").value;

  if (!name || !username || !email || !password) {
    return message("Please fill all fields.", "error");
  }

  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    return message(
      "Username must be 3-24 characters (letters, numbers and _).",
      "error"
    );
  }

  if (password.length < 8) {
    return message(
      "Password must be at least 8 characters.",
      "error"
    );
  }

  const button = $("signupSubmit");
  button.disabled = true;
  button.textContent = "Creating Account...";

  try {
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.href,
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
      message("Account created successfully!", "success");
    } else {
      message(
        "Account created! Please verify your email, then login.",
        "success"
      );
      switchTab("login");
    }

  } catch (error) {
    message(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Create Account";
  }
}

/* ==========================================
   LOGIN
========================================== */

async function loginUser(event) {
  event.preventDefault();
  clearMessage();

  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  const button = $("loginSubmit");
  button.disabled = true;
  button.textContent = "Logging in...";

  try {
    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    await loadProfile(data.user);
    message("Login successful!", "success");

  } catch (error) {
    message(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Login";
  }
}

/* ==========================================
   GOOGLE LOGIN
========================================== */

async function googleLogin() {
  clearMessage();

  const button = $("googleLogin");
  button.disabled = true;
  button.textContent = "Connecting to Google...";

  try {
    const { error } = await db.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin +
                    window.location.pathname
      }
    });

    if (error) throw error;

  } catch (error) {
    message(error.message, "error");
    button.disabled = false;
    button.textContent = "Continue with Google";
  }
}

/* ==========================================
   FORGOT PASSWORD
========================================== */

async function forgotPassword() {
  clearMessage();

  const email = $("loginEmail").value.trim();

  if (!email) {
    return message("Enter your email address first.", "error");
  }

  try {
    const { error } = await db.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: window.location.origin +
                    window.location.pathname
      }
    );

    if (error) throw error;

    message("Password reset email sent!", "success");

  } catch (error) {
    message(error.message, "error");
  }
}

/* ==========================================
   SAVE PROFILE
========================================== */

async function saveProfile() {
  if (!currentUser) return;

  clearMessage();

  const name = $("displayNameInput").value.trim();
  const username = $("usernameInput").value.trim();
  const bio = $("bioInput").value.trim();
  const isPrivate = $("privacyInput").checked;

  if (!name || !username) {
    return message("Name and username are required.", "error");
  }

  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    return message(
      "Username must be 3-24 characters (letters, numbers and _).",
      "error"
    );
  }

  const button = $("profileSave");
  button.disabled = true;

  try {
    const { data, error } = await db.auth.updateUser({
      data: {
        full_name: name,
        username: username,
        bio: bio,
        private_profile: isPrivate
      }
    });

    if (error) throw error;

    await loadProfile(data.user);
    message("Profile updated successfully!", "success");

  } catch (error) {
    message(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

/* ==========================================
   UPLOAD PHOTO
========================================== */

async function uploadPhoto(event) {
  if (!currentUser) return;

  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    return message("Please select an image.", "error");
  }

  if (file.size > 5 * 1024 * 1024) {
    return message("Image must be under 5 MB.", "error");
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

    if (error) throw error;

    currentUser = data.user;

    if (oldPath) {
      await db.storage.from("avatars").remove([oldPath]);
    }

    await loadProfile(currentUser);
    message("Profile photo updated!", "success");

  } catch (error) {
    message(error.message, "error");
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
    return message(
      "No uploaded profile photo found.",
      "error"
    );
  }

  if (!confirm("Remove your profile photo?")) return;

  try {
    const { error: updateError } = await db.auth.updateUser({
      data: { avatar_path: null }
    });

    if (updateError) throw updateError;

    await db.storage.from("avatars").remove([path]);

    const { data } = await db.auth.getUser();

    await loadProfile(data.user);
    message("Profile photo removed.", "success");

  } catch (error) {
    message(error.message, "error");
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
    message("Logged out successfully.", "success");

  } catch (error) {
    message(error.message, "error");
  }
}

/* ==========================================
   DELETE ACCOUNT INFO
========================================== */

function deleteAccountInfo() {
  message(
    "For account deletion, please contact the AniStream administrator. Your account has not been deleted.",
    "info"
  );
}

/* ==========================================
   INITIALIZE
========================================== */

document.addEventListener("DOMContentLoaded", async () => {

  $("loginTab").addEventListener("click", () => switchTab("login"));
  $("signupTab").addEventListener("click", () => switchTab("signup"));

  $("loginForm").addEventListener("submit", loginUser);
  $("signupForm").addEventListener("submit", signupUser);

  $("googleLogin").addEventListener("click", googleLogin);
  $("forgotPassword").addEventListener("click", forgotPassword);

  $("profileSave").addEventListener("click", saveProfile);
  $("logoutButton").addEventListener("click", logoutUser);

  $("photoInput").addEventListener("change", uploadPhoto);
  $("removePhoto").addEventListener("click", removePhoto);

  $("deleteAccountInfo").addEventListener(
    "click",
    deleteAccountInfo
  );

  switchTab("login");
  showLogin();

  // Restore existing login session
  try {
    const { data, error } = await db.auth.getSession();

    if (error) throw error;

    if (data.session?.user) {
      await loadProfile(data.session.user);
    } else {
      showLogin();
    }

  } catch (error) {
    console.error("Session error:", error);
    message("Unable to load account: " + error.message, "error");
    showLogin();
  }

  // Update UI when authentication changes
  db.auth.onAuthStateChange((event, session) => {
    setTimeout(async () => {
      if (event === "SIGNED_OUT") {
        currentUser = null;
        showLogin();
      } else if (session?.user) {
        await loadProfile(session.user);
      }
    }, 0);
  });

});
