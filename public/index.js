// ========== CINEMATIC OTT LOADER ==========
(function() {
  const MIN_LOADER_TIME = 3000; // Minimum 3 seconds display
  const loader = document.getElementById('cinematicLoader');
  const loadStartTime = Date.now();

  // Add loading class to body
  document.body.classList.add('loading');

  // Function to hide loader with smooth transition
  function hideLoader() {
    const elapsedTime = Date.now() - loadStartTime;
    const remainingTime = Math.max(0, MIN_LOADER_TIME - elapsedTime);

    setTimeout(() => {
      if (loader) {
        loader.classList.add('fade-out');
        document.body.classList.remove('loading');

        // Remove loader from DOM after transition completes
        setTimeout(() => {
          loader.remove();
        }, 800);
      }
    }, remainingTime);
  }

  // Hide loader when page is fully loaded
  if (document.readyState === 'complete') {
    hideLoader();
  } else {
    window.addEventListener('load', hideLoader);
  }
})();

// ========== FIREBASE CONFIGURATION (PRESERVED) ==========
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

// ========== DOM ELEMENTS (PRESERVED) ==========
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

// ========== MOBILE MENU (PRESERVED) ==========
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

// ========== GET STARTED (PRESERVED) ==========
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

// CTA Button
const getStartedBtnCta = document.getElementById("getStartedBtnCta");
if (getStartedBtnCta) {
  getStartedBtnCta.addEventListener("click", (e) => {
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

// ========== AUTH UI (PRESERVED) ==========
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

// ========== AUTH STATE (PRESERVED) ==========
firebase.auth().onAuthStateChanged((user) => {
  updateAuthUI(user);
});

// ========== LOGOUT (PRESERVED) ==========
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

// ========== UX FIXES (PRESERVED) ==========
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

// ========== SCROLL REVEAL ANIMATIONS ==========
const revealElements = document.querySelectorAll('[data-reveal]');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
});

revealElements.forEach(el => revealObserver.observe(el));

// ========== TIMELINE PROGRESS ANIMATION ==========
const timelineProgress = document.querySelector('.timeline-progress');
const timelineSteps = document.querySelectorAll('.timeline-step');

if (timelineProgress && timelineSteps.length > 0) {
  const timelineObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Animate timeline progress
        const timelineContainer = document.querySelector('.timeline-container');
        const containerRect = timelineContainer.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Calculate progress based on scroll position
        const updateProgress = () => {
          const rect = timelineContainer.getBoundingClientRect();
          const containerTop = rect.top;
          const containerHeight = rect.height;
          
          // Calculate how much of the timeline is visible
          const visibleTop = Math.max(0, -containerTop);
          const visibleHeight = Math.min(containerHeight, viewportHeight - containerTop);
          
          // Calculate progress percentage
          let progress = (visibleTop / containerHeight) * 100;
          progress = Math.max(0, Math.min(100, progress + 20));
          
          timelineProgress.style.height = `${progress}%`;
          
          // Activate steps based on progress
          timelineSteps.forEach((step, index) => {
            const stepThreshold = ((index + 1) / timelineSteps.length) * 100;
            if (progress >= stepThreshold - 20) {
              step.classList.add('active');
            }
          });
        };
        
        // Update on scroll
        window.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress();
        
        timelineObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1
  });
  
  timelineObserver.observe(document.querySelector('.timeline-container'));
}

// ========== NAVBAR SCROLL EFFECT ==========
const header = document.querySelector('header');
let lastScrollY = window.scrollY;

window.addEventListener('scroll', () => {
  const currentScrollY = window.scrollY;
  
  // Add shadow on scroll
  if (currentScrollY > 10) {
    header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
  } else {
    header.style.boxShadow = 'none';
  }
  
  lastScrollY = currentScrollY;
}, { passive: true });

// ========== SMOOTH SCROLL FOR ANCHOR LINKS ==========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href !== '#') {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        const headerHeight = header.offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    }
  });
});

// ========== FEATURE CARD HOVER EFFECTS ==========
const featureCards = document.querySelectorAll('.feature-card');

featureCards.forEach(card => {
  card.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-8px)';
  });
  
  card.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0)';
  });
});

// ========== PARALLAX EFFECT FOR HERO ==========
const heroVideo = document.querySelector('.hero-Video');
const heroText = document.querySelector('.hero-Text');

if (heroVideo && heroText && !window.matchMedia('(pointer: coarse)').matches) {
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const heroSection = document.querySelector('.hero');
    const heroRect = heroSection.getBoundingClientRect();
    
    if (heroRect.bottom > 0) {
      const parallaxValue = scrollY * 0.3;
      heroVideo.style.transform = `translateY(${parallaxValue * 0.5}px)`;
      heroText.style.transform = `translateY(${parallaxValue * 0.3}px)`;
    }
  }, { passive: true });
}

// ========== INITIAL ANIMATIONS ON PAGE LOAD ==========
window.addEventListener('load', () => {
  // Reveal hero elements immediately
  const heroElements = document.querySelectorAll('.hero [data-reveal]');
  heroElements.forEach((el, index) => {
    setTimeout(() => {
      el.classList.add('revealed');
    }, index * 200);
  });
});

// ========== BUTTON RIPPLE EFFECT ==========
const buttons = document.querySelectorAll('.btn-primary, button');

buttons.forEach(button => {
  button.addEventListener('click', function(e) {
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s ease-out;
      pointer-events: none;
      left: ${x}px;
      top: ${y}px;
      width: 100px;
      height: 100px;
      margin-left: -50px;
      margin-top: -50px;
    `;
    
    this.style.position = 'relative';
    this.style.overflow = 'hidden';
    this.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  });
});

// Add ripple animation keyframes
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;
document.head.appendChild(rippleStyle);