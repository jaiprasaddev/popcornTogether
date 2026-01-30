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

// ========== DOM ELEMENTS ==========
// Desktop elements
const desktopLoginBtn = document.getElementById("desktopLoginBtn");
const desktopUserBox = document.getElementById("desktopUserBox");
const desktopUsername = document.getElementById("desktopUsername");
const desktopLogoutBtn = document.getElementById("desktopLogoutBtn");

// Mobile elements
const mobileLoginSection = document.getElementById("mobileLoginSection");
const mobileUserSection = document.getElementById("mobileUserSection");
const mobileUsername = document.getElementById("mobileUsername");
const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

// Navigation elements
const nav = document.getElementById("nav");
const mobileMenuToggle = document.getElementById("mobileMenuToggle");

// ========== MOBILE MENU TOGGLE FUNCTION ==========
/**
 * Toggles the mobile hamburger menu open/closed
 * Adds/removes 'active' class to both nav and hamburger icon
 */
function toggleMobileMenu() {
  nav.classList.toggle("active");
  mobileMenuToggle.classList.toggle("active");
}

// ========== CLOSE MENU WHEN CLICKING NAV LINKS ==========
/**
 * Close mobile menu when user clicks on any navigation link
 * This provides better UX on mobile devices
 */
const navLinks = document.querySelectorAll(".nav_links li a");
navLinks.forEach(link => {
  link.addEventListener("click", () => {
    // Only close menu on mobile (when hamburger is visible)
    if (window.innerWidth <= 768) {
      nav.classList.remove("active");
      mobileMenuToggle.classList.remove("active");
    }
  });
});

// ========== CLOSE MENU WHEN CLICKING OUTSIDE ==========
/**
 * Close mobile menu when user clicks outside of it
 * This provides better UX on mobile devices
 */
document.addEventListener("click", (event) => {
  const isClickInsideNav = nav.contains(event.target);
  const isClickOnToggle = mobileMenuToggle.contains(event.target);
  
  // If menu is open and click is outside nav and toggle button
  if (nav.classList.contains("active") && !isClickInsideNav && !isClickOnToggle) {
    nav.classList.remove("active");
    mobileMenuToggle.classList.remove("active");
  }
});

// ========== UPDATE UI BASED ON AUTH STATE ==========
/**
 * Updates both desktop and mobile UI elements based on user login state
 * @param {Object|null} user - Firebase user object or null if logged out
 */
function updateAuthUI(user) {
  if (user) {
    // User is logged in
    const username = user.email.split("@")[0]; // Extract username from email
    
    // ========== DESKTOP UI (Logged In) ==========
    desktopLoginBtn.style.display = "none";
    desktopUserBox.style.display = "flex";
    desktopUsername.innerText = `👤 ${username}`;
    
    // ========== MOBILE UI (Logged In) ==========
    mobileLoginSection.style.display = "none";
    mobileUserSection.style.display = "flex";
    mobileUsername.innerText = `👤 ${username}`;
    
  } else {
    // User is logged out
    
    // ========== DESKTOP UI (Logged Out) ==========
    desktopLoginBtn.style.display = "inline-block";
    desktopUserBox.style.display = "none";
    
    // ========== MOBILE UI (Logged Out) ==========
    mobileLoginSection.style.display = "block";
    mobileUserSection.style.display = "none";
  }
}

// ========== FIREBASE AUTH STATE LISTENER ==========
/**
 * Listen for authentication state changes
 * This runs automatically when user logs in/out
 */
firebase.auth().onAuthStateChanged((user) => {
  updateAuthUI(user);
});

// ========== LOGOUT HANDLERS ==========
/**
 * Desktop logout button click handler
 */
desktopLogoutBtn.addEventListener("click", () => {
  firebase.auth().signOut().then(() => {
    window.location.href = "/index.html";
  }).catch((error) => {
    console.error("Logout error:", error);
  });
});

/**
 * Mobile logout button click handler
 * Also closes the mobile menu after logout
 */
mobileLogoutBtn.addEventListener("click", () => {
  firebase.auth().signOut().then(() => {
    // Close mobile menu
    nav.classList.remove("active");
    mobileMenuToggle.classList.remove("active");
    
    // Redirect to home
    window.location.href = "/index.html";
  }).catch((error) => {
    console.error("Logout error:", error);
  });
});

// ========== WINDOW RESIZE HANDLER ==========
/**
 * Close mobile menu when resizing to desktop view
 * Prevents menu from staying open when switching to desktop
 */
window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    nav.classList.remove("active");
    mobileMenuToggle.classList.remove("active");
  }
});

// ========== PREVENT BODY SCROLL WHEN MENU IS OPEN ==========
const observer = new MutationObserver(() => {
  if (nav.classList.contains("active")) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "auto";
  }
});

observer.observe(nav, {
  attributes: true,
  attributeFilter: ["class"]
});