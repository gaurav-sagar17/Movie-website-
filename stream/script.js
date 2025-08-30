class MovieExplorer {
    constructor() {
        // IMPORTANT: Replace this with your own API key from themoviedb.org
        this.API_KEY = "b7a37dd868bf6a2450a8162f5fddc564";
        this.BASE_URL = "https://api.themoviedb.org/3";
        this.IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w185";
        this.FALLBACK_IMAGE = "./photo.jpg";
        
        // Using a streaming source that works reliably with IMDB IDs.
        this.STREAMING_SERVERS = [
            { name: "Server 1", url: "https://vidsrc.xyz/embed/movie?imdb=" }
        ];

        // A simple cache to store movie details to avoid re-fetching them.
        this.movieCache = {};

        this.genres = {};
        this.currentPage = 1;
        this.isSearching = false;
        this.currentFilters = { genre: '', year: '', sort: '' };
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadGenres();
        this.setupYearFilter();
        await this.loadRandomMovies();
        await this.loadTrendingMovies();
    }

    setupEventListeners() {
        const movieGrid = document.getElementById("movieGrid");
        const trendingCarousel = document.getElementById("trendingCarousel");
        const modal = document.getElementById("streamingModal");
        const modalCloseBtn = document.getElementById("modalCloseBtn");
        
        movieGrid.addEventListener("click", (e) => {
            const card = e.target.closest(".movie-card");
            if (card && card.dataset.movieId) {
                this.openStreamingModal(card.dataset.movieId);
            }
        });

        trendingCarousel.addEventListener("click", (e) => {
            const card = e.target.closest(".trending-card");
            if (card && card.dataset.movieId) {
                this.openStreamingModal(card.dataset.movieId);
            }
        });

        modalCloseBtn.addEventListener("click", () => this.closeStreamingModal());
        modal.addEventListener("click", (e) => {
            if (e.target === modal) { this.closeStreamingModal(); }
        });
        
        const searchInput = document.getElementById("search-input");
        let searchTimeout;
        searchInput.addEventListener("input", (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => { this.handleSearch(e.target.value); }, 500);
        });

        document.getElementById("by-genre").addEventListener("change", () => this.handleFilterChange());
        document.getElementById("by-year").addEventListener("change", () => this.handleFilterChange());
        document.getElementById("sort").addEventListener("change", () => this.handleFilterChange());
        document.getElementById("clear-btn").addEventListener("click", () => this.clearAllFilters());
        document.getElementById("carouselPrev").addEventListener("click", () => this.scrollCarousel("prev"));
        document.getElementById("carouselNext").addEventListener("click", () => this.scrollCarousel("next"));
    }

    async openStreamingModal(movieId) {
        const modal = document.getElementById("streamingModal");
        const modalTitle = document.getElementById("modalMovieTitle");
        const modalButtons = document.getElementById("modalButtons");
        
        modal.style.display = "block";
        modalTitle.textContent = "Loading Movie...";
        modalButtons.innerHTML = '<span>Finding sources...</span>';

        const movieDetails = await this.getMovieDetails(movieId);

        if (!movieDetails) {
            modalTitle.textContent = "Movie Not Found";
            modalButtons.innerHTML = "<span>Could not load details for this movie.</span>";
            return;
        }
        
        modalTitle.textContent = movieDetails.title;

        const imdbId = movieDetails.imdb_id;
        const releaseDate = movieDetails.release_date;
        const videos = movieDetails.videos.results;
        const trailer = videos.find(video => video.type === "Trailer" && video.site === "YouTube");

        this.setupModalButtons(imdbId, trailer ? trailer.key : null, releaseDate);
    }

    closeStreamingModal() {
        const modal = document.getElementById("streamingModal");
        const streamingFrame = document.getElementById("streamingFrame");
        const modalTitle = document.getElementById("modalMovieTitle");

        modal.style.display = "none";
        streamingFrame.src = "";
        modalTitle.textContent = "";
    }
    
    setupModalButtons(imdbId, trailerKey, releaseDate) {
        const buttonContainer = document.getElementById("modalButtons");
        const streamingFrame = document.getElementById("streamingFrame");
        buttonContainer.innerHTML = "";

        const isMovieReleased = !releaseDate || new Date(releaseDate) <= new Date();
        let hasActiveSource = false;

        if (trailerKey) {
            const trailerBtn = document.createElement("button");
            trailerBtn.className = "modal-btn";
            trailerBtn.textContent = "Watch Trailer";
            trailerBtn.onclick = () => {
                this.setActiveButton(trailerBtn);
                streamingFrame.src = `https://www.youtube.com/embed/${trailerKey}?autoplay=1`;
            };
            buttonContainer.appendChild(trailerBtn);
        }

        if (isMovieReleased && imdbId) {
            this.STREAMING_SERVERS.forEach((server, index) => {
                const serverBtn = document.createElement("button");
                serverBtn.className = "modal-btn";
                serverBtn.textContent = server.name;
                serverBtn.onclick = () => {
                    this.setActiveButton(serverBtn);
                    streamingFrame.src = `${server.url}${imdbId}`;
                };
                buttonContainer.appendChild(serverBtn);

                if (index === 0) {
                    serverBtn.click();
                    hasActiveSource = true;
                }
            });
        }
        
        if (!hasActiveSource && trailerKey) {
             buttonContainer.querySelector('.modal-btn').click();
        } else if (!hasActiveSource && !trailerKey) {
            buttonContainer.innerHTML = "<span>No streaming sources or trailers found.</span>";
        }
    }

    setActiveButton(activeButton) {
        document.querySelectorAll('.modal-btn').forEach(btn => btn.classList.remove('active'));
        activeButton.classList.add('active');
    }
    
    async getMovieDetails(movieId) {
        if (this.movieCache[movieId]) {
            return this.movieCache[movieId];
        }
        try {
            const response = await fetch(`${this.BASE_URL}/movie/${movieId}?api_key=${this.API_KEY}&append_to_response=videos`);
            if (!response.ok) return null;
            const data = await response.json();
            this.movieCache[movieId] = data;
            return data;
        } catch (error) {
            console.error("Error fetching movie details:", error);
            return null;
        }
    }

    async loadTrendingMovies() {
        try {
            document.getElementById("trendingCarousel").innerHTML = '<div class="loading"></div>';
            const response = await fetch(`${this.BASE_URL}/trending/movie/week?api_key=${this.API_KEY}`);
            const data = await response.json();
            const trendingMovies = data.results.slice(0, 20);
            this.displayTrendingMovies(trendingMovies);
        } catch (error) {
            console.error("ERROR LOADING TRENDING MOVIES: ", error);
            document.getElementById("trendingCarousel").innerHTML = "<div class='error'>Failed to load trending movies</div>";
        }
    }

    displayTrendingMovies(movies) {
        const carousel = document.getElementById("trendingCarousel");
        carousel.innerHTML = movies.map((movie, index) => this.createTrendingCard(movie, index + 1)).join("");
    }

    createTrendingCard(movie, rank) {
        const posterPath = movie.poster_path ? `${this.IMAGE_BASE_URL}${movie.poster_path}` : this.FALLBACK_IMAGE;
        return `
        <div class="trending-card" data-movie-id="${movie.id}">
            <img src="${posterPath}" alt="${movie.title}" class="movie-poster" loading="lazy" onerror="this.src='${this.FALLBACK_IMAGE}'">
            <div class="trending-rank">${rank}</div>
            <div class="trending-overlay">
                <div class="trending-title">${movie.title}</div>
            </div>
        </div>`;
    }

    async loadRandomMovies() {
        try {
            document.getElementById("movieGrid").innerHTML = '<div class="loading"></div>';
            const randomPage = Math.floor(Math.random() * 10) + 1;
            let url = `${this.BASE_URL}/discover/movie?api_key=${this.API_KEY}&page=${randomPage}`;
            if (this.currentFilters.sort) { url += `&sort_by=${this.currentFilters.sort}`; }
            if (this.currentFilters.genre) { url += `&with_genres=${this.currentFilters.genre}`; }
            const response = await fetch(url);
            const data = await response.json();
            this.displayMovies(data.results, "movieGrid");
        } catch (error) {
            console.error("ERROR LOADING RANDOM MOVIES", error);
            document.getElementById("movieGrid").innerHTML = `<div class="error">FAILED TO LOAD RANDOM MOVIES</div>`;
        }
    }

    displayMovies(movies, containerId) {
        const container = document.getElementById(containerId);
        if (movies.length === 0) {
            container.innerHTML = `<div class="no-results"><h2>NO MOVIES FOUND</h2><p>Try adjusting your search criteria or filters.</p></div>`;
            return;
        }
        container.innerHTML = movies.map(movie => this.createMovieCard(movie)).join("");
    }

    createMovieCard(movie) {
        const posterPath = movie.poster_path ? `${this.IMAGE_BASE_URL}${movie.poster_path}` : this.FALLBACK_IMAGE;
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'TBA';
        const description = movie.overview || "No description available.";
        const genreNames = movie.genre_ids.slice(0, 2).map(id => this.genres[id]).filter(Boolean).join(', ');
        return `
        <div class="movie-card" data-movie-id="${movie.id}">
            <img src="${posterPath}" alt="${movie.title}" class="movie-poster" loading="lazy" onerror="this.src='${this.FALLBACK_IMAGE}'">
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-details">
                    <span class="movie-year">${year}</span>
                    <span class="movie-rating">⭐ ${rating}</span>
                </div>
                <div class="movie-genre">${genreNames}</div>
                <p class="movie-description">${description}</p>
            </div>
        </div>`;
    }
    
    async handleFilterChange() {
        const searchInput = document.getElementById("search-input");
        const genreFilter = document.getElementById("by-genre");
        const yearFilter = document.getElementById("by-year");
        const sortFilter = document.getElementById("sort");
        const clearBtn = document.getElementById("clear-btn");
        const trendingSection = document.getElementById("trendingSection");
        const movieGridTitle = document.getElementById("movieGridTitle");

        this.currentFilters = {
            genre: genreFilter.value,
            year: yearFilter.value,
            sort: sortFilter.value,
        };
        const hasFilters = this.currentFilters.genre || this.currentFilters.year || this.currentFilters.sort || searchInput.value.trim();
        if (hasFilters) {
            clearBtn.classList.add("show");
            trendingSection.style.display = "none";
        } else {
            clearBtn.classList.remove("show");
            trendingSection.style.display = "block";
        }
        if (searchInput.value.trim()) {
            await this.handleSearch(searchInput.value.trim());
        } else {
            if (this.currentFilters.genre || this.currentFilters.year || this.currentFilters.sort) {
                movieGridTitle.textContent = "FILTERED MOVIES";
                await this.loadFilteredMovies();
            } else {
                movieGridTitle.textContent = "DISCOVER MOVIES";
                await this.loadRandomMovies();
            }
        }
    }

    async loadFilteredMovies() {
        try {
            document.getElementById("movieGrid").innerHTML = '<div class="loading"></div>';
            let url = `${this.BASE_URL}/discover/movie?api_key=${this.API_KEY}&page=1`;
            if (this.currentFilters.genre) { url += `&with_genres=${this.currentFilters.genre}`; }
            if (this.currentFilters.year) { url += `&primary_release_year=${this.currentFilters.year}`; }
            if (this.currentFilters.sort) { url += `&sort_by=${this.currentFilters.sort}`; }
            const response = await fetch(url);
            const data = await response.json();
            this.displayMovies(data.results, "movieGrid");
        } catch (error) {
            console.error("ERROR LOADING FILTERED MOVIES: ", error);
            document.getElementById("movieGrid").innerHTML = `<div class="error">FAILED TO LOAD FILTERED MOVIES. PLEASE TRY AGAIN.</div>`;
        }
    }

    async handleSearch(query) {
        const trimQuery = query.trim();
        const clearBtn = document.getElementById("clear-btn");
        const movieGridTitle = document.getElementById("movieGridTitle");
        const trendingSection = document.getElementById("trendingSection");
        if (trimQuery === "") {
            this.isSearching = false;
            this.handleFilterChange();
            return;
        }
        this.isSearching = true;
        clearBtn.classList.add("show");
        movieGridTitle.textContent = `SEARCH RESULTS FOR "${trimQuery}"`;
        trendingSection.style.display = "none";
        try {
            document.getElementById("movieGrid").innerHTML = '<div class="loading"></div>';
            let url = `${this.BASE_URL}/search/movie?api_key=${this.API_KEY}&query=${encodeURIComponent(trimQuery)}&page=1`;
            if (this.currentFilters.year) { url += `&primary_release_year=${this.currentFilters.year}`; }
            const response = await fetch(url);
            const data = await response.json();
            let results = data.results;
            if (this.currentFilters.genre) { results = results.filter(movie => movie.genre_ids.includes(parseInt(this.currentFilters.genre, 10))); }
            if (this.currentFilters.sort) { results = this.sortMovies(results, this.currentFilters.sort); }
            this.displayMovies(results, "movieGrid");
        } catch (error) {
            console.error("ERROR SEARCHING MOVIES: ", error);
            document.getElementById("movieGrid").innerHTML = `<div class="error">SEARCH FAILED. PLEASE TRY AGAIN.</div>`;
        }
    }
    
    sortMovies(movies, sortBy) {
        switch (sortBy) {
            case "popularity.desc": return movies.sort((a, b) => b.popularity - a.popularity);
            case "vote_average.desc": return movies.sort((a, b) => b.vote_average - a.vote_average);
            case "release_date.desc": return movies.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
            case "title.asc": return movies.sort((a, b) => a.title.localeCompare(b.title));
            default: return movies;
        }
    }

    clearAllFilters() {
        document.getElementById("search-input").value = "";
        document.getElementById("by-genre").value = "";
        document.getElementById("by-year").value = "";
        document.getElementById("sort").value = "";
        this.currentFilters = { genre: "", year: "", sort: "" };
        this.isSearching = false;
        document.getElementById("clear-btn").classList.remove("show");
        document.getElementById("trendingSection").style.display = "block";
        document.getElementById("movieGridTitle").textContent = "DISCOVER MOVIES";
        this.loadRandomMovies();
    }

    scrollCarousel(direction) {
        const carousel = document.getElementById("trendingCarousel");
        const scrollAmount = carousel.clientWidth * 0.8;
        if (direction === "prev") {
            carousel.scrollBy({ left: -scrollAmount, behavior: "smooth" });
        } else {
            carousel.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
    }

    async loadGenres() {
        try {
            const response = await fetch(`${this.BASE_URL}/genre/movie/list?api_key=${this.API_KEY}`);
            const data = await response.json();
            this.genres = data.genres.reduce((acc, genre) => {
                acc[genre.id] = genre.name;
                return acc;
            }, {});
            const genreSelect = document.getElementById("by-genre");
            data.genres.forEach(genre => {
                const option = document.createElement("option");
                option.value = genre.id;
                option.textContent = genre.name;
                genreSelect.appendChild(option);
            });
        } catch (error) {
            console.error("ERROR LOADING GENRES: ", error);
        }
    }

    setupYearFilter() {
        const yearSelect = document.getElementById("by-year");
        const currentYear = new Date().getFullYear();
        for (let y = currentYear; y >= 1950; y--) {
            const option = document.createElement("option");
            option.value = y;
            option.textContent = y;
            yearSelect.appendChild(option);
        }
    }
}

new MovieExplorer();