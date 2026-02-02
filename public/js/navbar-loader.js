fetch("/partials/navbar.html")
  .then(res => res.text())
  .then(html => {
    document.body.insertAdjacentHTML("afterbegin", html);

    // 🔥 init navbar AFTER injection
    if (typeof initNavbar === "function") {
      initNavbar();
    }
  })
  .catch(err => console.error("Navbar load error:", err));
