// Scroll to section helper
function scrollToSection(sectionId) {
  document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
}

// Mobile menu toggle function
function toggleMobileMenu() {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('mobileMenuToggle');
  nav.classList.toggle('active');
  toggle.classList.toggle('active');
}

// Navbar scroll effect - Removed since we have fixed header now

// Search functionality
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const searchSection = document.getElementById("searchResults");
  const searchList = document.getElementById("searchList");

  let searchTimer;

  input.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const query = input.value.trim();

    searchTimer = setTimeout(() => {
      if (!query) {
        searchSection.style.display = "none";
        searchList.innerHTML = "";
        return;
      }
      searchMovies(query);
    }, 400);
  });

  // Search movies
  async function searchMovies(query) {
    searchList.innerHTML = '<div class="loading"><div class="spinner"></div>Searching...</div>';
    searchSection.style.display = "block";

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      searchList.innerHTML = "";

      if (!data || data.length === 0) {
        searchList.innerHTML = `
          <div class="no-results">
            <div class="no-results-icon">🎬</div>
            <h3>No results found</h3>
            <p>Try searching for something else</p>
          </div>
        `;
        return;
      }

      data.forEach(movie => {
        const card = createMovieCard(movie);
        searchList.appendChild(card);
      });
    } catch (error) {
      searchList.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">⚠️</div>
          <h3>Search failed</h3>
          <p>Please try again later</p>
        </div>
      `;
    }
  }

  // Create movie card
  function createMovieCard(movie) {
    const card = document.createElement("div");
    card.className = "movie-card";

    const posterUrl = movie.Poster !== "N/A" ? movie.Poster : "https://via.placeholder.com/300x450?text=No+Poster";
    const rating = movie.imdbRating || "N/A";
    const year = movie.Year || "";

    card.innerHTML = `
      <img src="${posterUrl}" alt="${movie.Title}" class="movie-poster">
      <div class="movie-info">
        <div class="movie-title">${movie.Title}</div>
        <div class="movie-meta">
          <span class="year">${year}</span>
          ${rating !== "N/A" ? `<span class="rating">⭐ ${rating}</span>` : ''}
        </div>
      </div>
    `;

    card.onclick = () => {
      window.location.href = `/movie.html?id=${movie.imdbID}`;
    };

    return card;
  }

  // Load trending movies
  async function loadTrending() {
    const container = document.getElementById("trendingList");
    try {
      const res = await fetch('/api/trending');
      const movies = await res.json();
      
      container.innerHTML = "";
      movies.forEach(movie => {
        if (movie.Response !== "False") {
          container.appendChild(createMovieCard(movie));
        }
      });
    } catch (error) {
      container.innerHTML = '<div class="no-results">Failed to load trending movies</div>';
    }
  }

  // Load top rated movies
  async function loadTopRated() {
    const container = document.getElementById("topRatedList");
    try {
      const res = await fetch('/api/top-rated');
      const movies = await res.json();
      
      container.innerHTML = "";
      movies.forEach(movie => {
        if (movie.Response !== "False") {
          container.appendChild(createMovieCard(movie));
        }
      });
    } catch (error) {
      container.innerHTML = '<div class="no-results">Failed to load top rated movies</div>';
    }
  }

  // Load popular movies
  async function loadPopular() {
    const container = document.getElementById("popularList");
    try {
      const res = await fetch('/api/popular');
      const movies = await res.json();
      
      container.innerHTML = "";
      movies.forEach(movie => {
        if (movie.Response !== "False") {
          container.appendChild(createMovieCard(movie));
        }
      });
    } catch (error) {
      container.innerHTML = '<div class="no-results">Failed to load popular movies</div>';
    }
  }

  // Initialize all sections
  loadTrending();
  loadTopRated();
  loadPopular();
});