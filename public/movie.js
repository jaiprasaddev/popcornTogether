// Mobile menu toggle function
function toggleMobileMenu() {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('mobileMenuToggle');
  nav.classList.toggle('active');
  toggle.classList.toggle('active');
}

const params = new URLSearchParams(window.location.search);
const movieId = params.get("id");
const container = document.getElementById("movieDetailContainer");

// Helper function to get YouTube trailer
async function getYouTubeTrailer(movieTitle, year) {
  try {
    // Create a search query for YouTube
    const searchQuery = `${movieTitle} ${year} official trailer`;
    // Return a YouTube search URL - in production, you'd use YouTube API
    return `https://www.youtube.com/embed/?search_query=${encodeURIComponent(searchQuery)}`;
  } catch (error) {
    return null;
  }
}

// Function to create a YouTube embed URL from movie title
function createTrailerEmbed(title, year) {
  // This creates a YouTube search embed - ideally you'd use YouTube Data API
  const searchQuery = encodeURIComponent(`${title} ${year} official trailer`);
  // Using nocookie domain for privacy
  return `https://www.youtube-nocookie.com/embed/?listType=search&list=${searchQuery}`;
}

async function loadMovieDetails() {
  try {
    const res = await fetch(`/api/movie/${movieId}`);
    const movie = await res.json();

    if (movie.Response === "False") {
      container.innerHTML = `
        <div class="no-results" style="min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <div class="no-results-icon">🎬</div>
          <h2>Movie not found</h2>
          <p>The movie you're looking for doesn't exist or has been removed.</p>
          <button class="btn btn-primary" onclick="window.location.href='/movies.html'" style="margin-top: 20px;">
            ← Back to Home
          </button>
        </div>
      `;
      return;
    }

    const posterUrl = movie.Poster !== "N/A" ? movie.Poster : "https://via.placeholder.com/300x450?text=No+Poster";
    const rating = movie.imdbRating !== "N/A" ? movie.imdbRating : "N/A";
    const genres = movie.Genre ? movie.Genre.split(', ') : [];
    const trailerUrl = createTrailerEmbed(movie.Title, movie.Year);

    // Create the movie hero section
    container.innerHTML = `
      <!-- Movie Hero -->
      <section class="movie-hero">
        <div class="movie-hero-bg" style="background-image: url('${posterUrl}');"></div>
        <div class="movie-hero-content">
          <img src="${posterUrl}" alt="${movie.Title}" class="movie-poster-large">
          <div class="movie-details">
            <h1 class="movie-detail-title">${movie.Title}</h1>
            <div class="movie-detail-meta">
              ${rating !== "N/A" ? `<span class="imdb-rating">⭐ ${rating}</span>` : ''}
              <span>${movie.Year}</span>
              ${movie.Runtime !== "N/A" ? `<span>⏱️ ${movie.Runtime}</span>` : ''}
              ${movie.Rated !== "N/A" ? `<span>🎫 ${movie.Rated}</span>` : ''}
            </div>
            <div class="genre-tags">
              ${genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
            </div>
            <p class="movie-description">${movie.Plot !== "N/A" ? movie.Plot : 'No description available.'}</p>
            <div class="movie-actions">
              <button class="btn btn-secondary" onclick="scrollToTrailer()">
                ▶️ Watch Trailer
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Additional Info Section -->
      <section class="movie-section" style="background: #0f0f0f;">
        <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px;">
          ${movie.Director !== "N/A" ? `
            <div>
              <h3 style="color: var(--secondary); margin-bottom: 10px; font-size: 14px;">🎬 Director</h3>
              <p style="font-size: 16px;">${movie.Director}</p>
            </div>
          ` : ''}
          ${movie.Actors !== "N/A" ? `
            <div>
              <h3 style="color: var(--secondary); margin-bottom: 10px; font-size: 14px;">🎭 Cast</h3>
              <p style="font-size: 16px;">${movie.Actors}</p>
            </div>
          ` : ''}
          ${movie.Writer !== "N/A" ? `
            <div>
              <h3 style="color: var(--secondary); margin-bottom: 10px; font-size: 14px;">✍️ Writer</h3>
              <p style="font-size: 16px;">${movie.Writer}</p>
            </div>
          ` : ''}
          ${movie.Awards !== "N/A" ? `
            <div>
              <h3 style="color: var(--secondary); margin-bottom: 10px; font-size: 14px;">🏆 Awards</h3>
              <p style="font-size: 16px;">${movie.Awards}</p>
            </div>
          ` : ''}
          ${movie.BoxOffice !== "N/A" ? `
            <div>
              <h3 style="color: var(--secondary); margin-bottom: 10px; font-size: 14px;">💰 Box Office</h3>
              <p style="font-size: 16px;">${movie.BoxOffice}</p>
            </div>
          ` : ''}
          ${movie.Released !== "N/A" ? `
            <div>
              <h3 style="color: var(--secondary); margin-bottom: 10px; font-size: 14px;">📅 Released</h3>
              <p style="font-size: 16px;">${movie.Released}</p>
            </div>
          ` : ''}
        </div>
      </section>

      <!-- Trailer Section -->
      <section class="trailer-section" id="trailerSection">
        <div class="trailer-container">
          <h2 class="section-title" style="margin-bottom: 30px;">🎥 Trailer</h2>
          <div class="trailer-embed">
            <iframe 
              src="${trailerUrl}" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen>
            </iframe>
          </div>
        </div>
      </section>
    `;

  } catch (error) {
    container.innerHTML = `
      <div class="no-results" style="min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <div class="no-results-icon">⚠️</div>
        <h2>Failed to load movie details</h2>
        <p>Please try again later or go back to home.</p>
        <button class="btn btn-primary" onclick="window.location.href='/movies.html'" style="margin-top: 20px;">
          ← Back to Home
        </button>
      </div>
    `;
  }
}

// Scroll to trailer section
function scrollToTrailer() {
  document.getElementById('trailerSection').scrollIntoView({ behavior: 'smooth' });
}

// Load movie details on page load
loadMovieDetails();