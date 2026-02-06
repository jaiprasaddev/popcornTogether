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

// AI Chat Elements
const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const typingIndicator = document.getElementById("typingIndicator");
const charCount = document.getElementById("charCount");
const suggestionChipsContainer = document.getElementById("suggestionChips");
const suggestionChips = document.querySelectorAll(".chip");

// Track if user has sent first message
let hassentFirstMessage = false;

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

// ========== AUTH UI ==========
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

// ========== AUTH STATE & PAGE PROTECTION ==========
firebase.auth().onAuthStateChanged((user) => {
  updateAuthUI(user);
  
  // PAGE PROTECTION: Redirect if not logged in or email not verified
  if (!user || !user.emailVerified) {
    alert("Please login & verify your email to access AI Recommendations");
    window.location.href = "/Login.html";
  }
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

// ========== AI CHAT FUNCTIONALITY ==========

// Auto-resize textarea
userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height = userInput.scrollHeight + "px";
  
  // Update character count
  const count = userInput.value.length;
  charCount.textContent = `${count}/500`;
  
  // Enable/disable send button
  sendBtn.disabled = count === 0;
});

// Send message on Enter (Shift+Enter for new line)
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Send button click
sendBtn.addEventListener("click", sendMessage);

// Suggestion chips click
suggestionChips.forEach(chip => {
  chip.addEventListener("click", () => {
    userInput.value = chip.dataset.prompt;
    userInput.style.height = "auto";
    userInput.style.height = userInput.scrollHeight + "px";
    charCount.textContent = `${userInput.value.length}/500`;
    sendBtn.disabled = false;
    userInput.focus();
  });
});

// Send message function
async function sendMessage() {
  const message = userInput.value.trim();
  
  if (!message) return;
  
  // Hide suggestion chips after first message
  if (!hassentFirstMessage) {
    suggestionChipsContainer.classList.add("hidden");
    hassentFirstMessage = true;
  }
  
  // Disable input while processing
  userInput.disabled = true;
  sendBtn.disabled = true;
  
  // Add user message to chat
  addMessage(message, "user");
  
  // Clear input
  userInput.value = "";
  userInput.style.height = "auto";
  charCount.textContent = "0/500";
  
  // Show typing indicator
  typingIndicator.style.display = "flex";
  scrollToBottom();
  
  try {
    // Call AI recommendation API
    const response = await fetch("/api/ai-recommendation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });
    
    if (!response.ok) {
      throw new Error("Failed to get AI response");
    }
    
    const data = await response.json();
    
    // Hide typing indicator
    typingIndicator.style.display = "none";
    
    // Add AI response to chat
    addMessage(data.response, "ai");
    
  } catch (error) {
    console.error("Error:", error);
    
    // Hide typing indicator
    typingIndicator.style.display = "none";
    
    // Show error message
    addMessage(
      "Sorry, I'm having trouble connecting right now. Please try again in a moment. 🔌",
      "ai"
    );
  }
  
  // Re-enable input
  userInput.disabled = false;
  sendBtn.disabled = false;
  userInput.focus();
}

// Add message to chat
function addMessage(text, sender) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}-message`;
  
  const avatarDiv = document.createElement("div");
  avatarDiv.className = "message-avatar";
  
  if (sender === "ai") {
    avatarDiv.innerHTML = '<i class="fa-solid fa-robot"></i>';
  } else {
    avatarDiv.innerHTML = '<i class="fa-solid fa-user"></i>';
  }
  
  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";
  
  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "message-bubble";
  
  // Parse markdown-like formatting for AI responses
  if (sender === "ai") {
    bubbleDiv.innerHTML = formatAIResponse(text);
  } else {
    bubbleDiv.textContent = text;
  }
  
  contentDiv.appendChild(bubbleDiv);
  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

// Format AI response with basic markdown support
function formatAIResponse(text) {
  // Convert **bold** to <strong>
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  const lines = text.split('\n');
  let formatted = '';
  let inList = false;
  let listType = '';

  lines.forEach(line => {
    const trimmedLine = line.trim();

    // Bullet points
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
      if (!inList || listType !== 'ul') {
        if (inList) formatted += `</${listType}>`;
        formatted += '<ul>';
        inList = true;
        listType = 'ul';
      }
      formatted += `<li>${trimmedLine.substring(2)}</li>`;
    }

    // Numbered list
    else if (/^\d+\.\s/.test(trimmedLine)) {
      if (!inList || listType !== 'ol') {
        if (inList) formatted += `</${listType}>`;
        formatted += '<ol>';
        inList = true;
        listType = 'ol';
      }
      formatted += `<li>${trimmedLine.replace(/^\d+\.\s/, '')}</li>`;
    }

    // Normal paragraph
    else {
      if (inList) {
        formatted += `</${listType}>`;
        inList = false;
        listType = '';
      }
      if (trimmedLine) {
        formatted += `<p>${trimmedLine}</p>`;
      }
    }
  });

  if (inList) formatted += `</${listType}>`;

  return formatted;
}

// Scroll to bottom of chat
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  scrollToBottom();
  userInput.focus();
});