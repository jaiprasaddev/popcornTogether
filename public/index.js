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
const desktopLoginBtn = document.getElementById("desktopLoginBtn");
const desktopUserBox = document.getElementById("desktopUserBox");
const desktopUsername = document.getElementById("desktopUsername");
const desktopLogoutBtn = document.getElementById("desktopLogoutBtn");

const mobileLoginSection = document.getElementById("mobileLoginSection");
const mobileUserSection = document.getElementById("mobileUserSection");
const mobileUsername = document.getElementById("mobileUsername");
const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

const nav = document.getElementById("nav");
const mobileMenuToggle = document.getElementById("mobileMenuToggle");

// ========== MOBILE MENU ==========
function toggleMobileMenu() {
  nav.classList.toggle("active");
  mobileMenuToggle.classList.toggle("active");
}

const navLinks = document.querySelectorAll(".nav_links li a");
navLinks.forEach(link => {
  link.addEventListener("click", () => {
    if (window.innerWidth <= 768) {
      nav.classList.remove("active");
      mobileMenuToggle.classList.remove("active");
    }
  });
});

// ========== GET STARTED ==========
const getStartedBtn = document.getElementById("getStartedBtn");

if (getStartedBtn) {
  getStartedBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const user = firebase.auth().currentUser;

    if (user && user.emailVerified) {
      window.location.href = "/room.html";
    } else {
      alert("Please login & verify your email first");
      window.location.href = "/Login.html";
    }
  });
}

// ========== AUTH UI ==========
// function updateAuthUI(user) {
//   if (user && user.emailVerified) {
//     const username = user.email.split("@")[0];

//     desktopLoginBtn.style.display = "none";
//     desktopUserBox.style.display = "flex";
//     desktopUsername.innerText = `👤 ${username}`;

//     mobileLoginSection.style.display = "none";
//     mobileUserSection.style.display = "flex";
//     mobileUsername.innerText = `👤 ${username}`;

//   } else {
//     desktopLoginBtn.style.display = "inline-block";
//     desktopUserBox.style.display = "none";

//     mobileLoginSection.style.display = "block";
//     mobileUserSection.style.display = "none";
//   }
// }
function updateAuthUI(user) {
  if (user && user.emailVerified) {

    firebase.database()
      .ref("users/" + user.uid)
      .once("value")
      .then(snapshot => {
        const data = snapshot.val();
        const username = data?.username || user.email.split("@")[0];

        // Desktop
        desktopLoginBtn.style.display = "none";
        desktopUserBox.style.display = "flex";
        desktopUsername.innerText = `👤 ${username}`;

        // Mobile
        mobileLoginSection.style.display = "none";
        mobileUserSection.style.display = "flex";
        mobileUsername.innerText = `👤 ${username}`;
      });

  } else {
    desktopLoginBtn.style.display = "inline-block";
    desktopUserBox.style.display = "none";

    mobileLoginSection.style.display = "block";
    mobileUserSection.style.display = "none";
  }
}


// ========== AUTH STATE ==========
firebase.auth().onAuthStateChanged((user) => {
  updateAuthUI(user);
});

// ========== LOGOUT ==========
desktopLogoutBtn.addEventListener("click", () => {
  firebase.auth().signOut().then(() => {
    window.location.href = "/index.html";
  });
});

mobileLogoutBtn.addEventListener("click", () => {
  firebase.auth().signOut().then(() => {
    nav.classList.remove("active");
    mobileMenuToggle.classList.remove("active");
    window.location.href = "/index.html";
  });
});

// ========== UX FIXES ==========
window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    nav.classList.remove("active");
    mobileMenuToggle.classList.remove("active");
  }
});

const observer = new MutationObserver(() => {
  document.body.style.overflow = nav.classList.contains("active") ? "hidden" : "auto";
});

observer.observe(nav, { attributes: true });
