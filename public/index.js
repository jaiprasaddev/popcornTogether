// ========== FIREBASE CONFIGURATION ==========
const firebaseConfig = {
  apiKey: "AIzaSyBMz7pxtjBBwYajEfEhBhF7ADYOgEQX_Po",
  authDomain: "popcorntogether-fd170.firebaseapp.com",
  projectId: "popcorntogether-fd170",
  storageBucket: "popcorntogether-fd170.appspot.com",
  messagingSenderId: "450280562009",
  appId: "1:450280562009:web:9774f54f522f6a34378048"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

/* =====================================================
   🔥 NAVBAR INITIALIZER (IMPORTANT)
===================================================== */
function initNavbar() {
  // Navigation elements
  const nav = document.getElementById("nav");
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");

  if (!nav || !mobileMenuToggle) {
    console.warn("Navbar elements not found");
    return;
  }

  // Make toggle function global (HTML onclick uses it)
  window.toggleMobileMenu = function () {
    nav.classList.toggle("active");
    mobileMenuToggle.classList.toggle("active");
  };

  // Close menu when clicking nav links
  document.querySelectorAll(".nav_links a").forEach(link => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        nav.classList.remove("active");
        mobileMenuToggle.classList.remove("active");
      }
    });
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (
      nav.classList.contains("active") &&
      !nav.contains(e.target) &&
      !mobileMenuToggle.contains(e.target)
    ) {
      nav.classList.remove("active");
      mobileMenuToggle.classList.remove("active");
    }
  });

  // Close menu on resize
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      nav.classList.remove("active");
      mobileMenuToggle.classList.remove("active");
    }
  });

  // Prevent body scroll when menu open
  const observer = new MutationObserver(() => {
    document.body.style.overflow = nav.classList.contains("active")
      ? "hidden"
      : "auto";
  });

  observer.observe(nav, { attributes: true, attributeFilter: ["class"] });

  // Active page highlight
  const currentPage = window.location.pathname;
  document.querySelectorAll(".nav_links a").forEach(link => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("active");
    }
  });

  /* ===== AUTH UI ===== */
  const desktopLoginBtn = document.getElementById("desktopLoginBtn");
  const desktopUserBox = document.getElementById("desktopUserBox");
  const desktopUsername = document.getElementById("desktopUsername");
  const desktopLogoutBtn = document.getElementById("desktopLogoutBtn");

  const mobileLoginSection = document.getElementById("mobileLoginSection");
  const mobileUserSection = document.getElementById("mobileUserSection");
  const mobileUsername = document.getElementById("mobileUsername");
  const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

  function updateAuthUI(user) {
    if (!desktopLoginBtn) return;

    if (user) {
      const username = user.email.split("@")[0];

      desktopLoginBtn.style.display = "none";
      desktopUserBox.style.display = "flex";
      desktopUsername.innerText = `👤 ${username}`;

      mobileLoginSection.style.display = "none";
      mobileUserSection.style.display = "flex";
      mobileUsername.innerText = `👤 ${username}`;
    } else {
      desktopLoginBtn.style.display = "inline-block";
      desktopUserBox.style.display = "none";

      mobileLoginSection.style.display = "block";
      mobileUserSection.style.display = "none";
    }
  }

  firebase.auth().onAuthStateChanged(updateAuthUI);

  if (desktopLogoutBtn) {
    desktopLogoutBtn.addEventListener("click", () => {
      firebase.auth().signOut().then(() => {
        window.location.href = "/index.html";
      });
    });
  }

  if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener("click", () => {
      firebase.auth().signOut().then(() => {
        nav.classList.remove("active");
        mobileMenuToggle.classList.remove("active");
        window.location.href = "/index.html";
      });
    });
  }
}

/* =====================================================
   GET STARTED BUTTON (INDEX PAGE ONLY)
===================================================== */
const getStartedBtn = document.getElementById("getStartedBtn");

if (getStartedBtn) {
  getStartedBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const user = firebase.auth().currentUser;
    window.location.href = user ? "/room.html" : "/Login.html";
  });
}
