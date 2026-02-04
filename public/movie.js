// ===============================
// Mobile menu toggle function
// ===============================
function toggleMobileMenu() {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('mobileMenuToggle');
  nav.classList.toggle('active');
  toggle.classList.toggle('active');
}

const params = new URLSearchParams(window.location.search);
const movieId = params.get("id");
const container = document.getElementById("movieDetailContainer");

// ===============================
// 🔥 Fetch YouTube trailer from backend (SAFE)
// ===============================
async function fetchTrailerVideoId(title, year) {
  try {
    const res = await fetch(
      `/api/trailer?title=${encodeURIComponent(title)}&year=${year}`
    );
    return await res.json(); // { videoId }
  } catch (err) {
    return null;
  }
}

// ===============================
// Load movie details
// ===============================
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

    const posterUrl =
      movie.Poster !== "N/A"
        ? movie.Poster
        : "https://via.placeholder.com/300x450?text=No+Poster";

    const rating = movie.imdbRating !== "N/A" ? movie.imdbRating : "N/A";
    const genres = movie.Genre ? movie.Genre.split(', ') : [];

    // 🔥 FETCH REAL TRAILER VIDEO ID
    const trailerData = await fetchTrailerVideoId(movie.Title, movie.Year);
    const trailerUrl =
      trailerData && trailerData.videoId
        ? `https://www.youtube.com/embed/${trailerData.videoId}`
        : null;

    // ===============================
    // Render page
    // ===============================
    container.innerHTML = `
      <!-- Movie Hero -->
      <section class="movie-hero">
        <div class="movie-hero-bg" style="background-image: url('${posterUrl}');"></div>
        <div class="movie-hero-content">
          <img src="${posterUrl}" alt="${movie.Title}" class="movie-poster-large">
          <div class="movie-details">
            <div class="movie-type-year">
              ${movie.Type ? movie.Type.charAt(0).toUpperCase() + movie.Type.slice(1) : 'Movie'} • ${movie.Year}
            </div>
            <h1 class="movie-detail-title">${movie.Title}</h1>
            
            <div class="movie-detail-meta">
              ${movie.Director !== "N/A" ? `
                <div class="meta-item">
                  <div class="meta-label">Directed By</div>
                  <div class="meta-value">${movie.Director}</div>
                </div>
              ` : ''}
              
              ${movie.Country !== "N/A" ? `
                <div class="meta-item">
                  <div class="meta-label">Country</div>
                  <div class="meta-value">${movie.Country}</div>
                </div>
              ` : ''}
              
              ${movie.Language !== "N/A" ? `
                <div class="meta-item">
                  <div class="meta-label">Language</div>
                  <div class="meta-value">${movie.Language}</div>
                </div>
              ` : ''}
              
              ${movie.Rated !== "N/A" ? `
                <div class="meta-item">
                  <div class="meta-label">Age Rating</div>
                  <div class="meta-value">${movie.Rated}</div>
                </div>
              ` : ''}
            </div>

            ${genres.length > 0 ? `
              <div class="genre-tags">
                ${genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
              </div>
            ` : ''}

            ${rating !== "N/A" ? `
              <div class="imdb-rating">⭐ ${rating} IMDb</div>
            ` : ''}
            
            <div class="movie-actions">
              <button class="btn btn-secondary" onclick="scrollToTrailer()">
                ▶️ Watch Trailer
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Overview Section -->
      <section class="overview-section">
        <h2 class="overview-title">Overview</h2>
        <p class="movie-description">
          ${movie.Plot !== "N/A" ? movie.Plot : 'No description available.'}
        </p>
      </section>

      <!-- Additional Info Section -->
      ${movie.Actors !== "N/A" || movie.Writer !== "N/A" || movie.Awards !== "N/A" || movie.BoxOffice !== "N/A" || movie.Runtime !== "N/A" || movie.Released !== "N/A" ? `
        <section class="additional-info">
          <div class="info-grid">
            ${movie.Actors !== "N/A" ? `
              <div class="info-item">
                <h3>Cast</h3>
                <p>${movie.Actors}</p>
              </div>
            ` : ''}
            
            ${movie.Writer !== "N/A" ? `
              <div class="info-item">
                <h3>Writer</h3>
                <p>${movie.Writer}</p>
              </div>
            ` : ''}
            
            ${movie.Runtime !== "N/A" ? `
              <div class="info-item">
                <h3>Runtime</h3>
                <p>${movie.Runtime}</p>
              </div>
            ` : ''}
            
            ${movie.Released !== "N/A" ? `
              <div class="info-item">
                <h3>Released</h3>
                <p>${movie.Released}</p>
              </div>
            ` : ''}
            
            ${movie.Awards !== "N/A" ? `
              <div class="info-item">
                <h3>Awards</h3>
                <p>${movie.Awards}</p>
              </div>
            ` : ''}
            
            ${movie.BoxOffice !== "N/A" ? `
              <div class="info-item">
                <h3>Box Office</h3>
                <p>${movie.BoxOffice}</p>
              </div>
            ` : ''}
          </div>
        </section>
      ` : ''}

      <!-- Trailer Section -->
      <section class="trailer-section" id="trailerSection">
        <div class="trailer-container">
          <h2>Trailer</h2>
          <div class="trailer-embed">
            ${trailerUrl ? `
              <iframe 
                src="${trailerUrl}"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
              </iframe>
            ` : `
              <p style="opacity:0.7;">Trailer not available</p>
            `}
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

// ===============================
// Scroll to trailer section
// ===============================
function scrollToTrailer() {
  document
    .getElementById('trailerSection')
    .scrollIntoView({ behavior: 'smooth' });
}

// ===============================
// Init
// ===============================
loadMovieDetails();
