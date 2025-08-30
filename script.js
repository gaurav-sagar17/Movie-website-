class MovieExplorer {
    constructor() {
        // FIX: You must get your own API key from themoviedb.org
        this.API_KEY = "b7a37dd868bf6a2450a8162f5fddc564";
        // FIX: Corrected API Base URL
        this.BASE_URL = "https://api.themoviedb.org/3";
        // FIX: Corrected Image Base URL (should not contain a specific file)
        this.IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w185";
        this.FALLBACK_IMAGE = "./photo.jpg";
        //  mapping of genre id's with the actual genre
        this.genres = {};
        this.currentPage = 1;
        this.isSearching = false;
        // FIX: Standardized to 'currentFilters'
        this.currentFilters = {
            genre: '',
            year: '',
            sort: '',
        };
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
        // FIX: Corrected all element IDs to match HTML
        const searchInput = document.getElementById("search-input");
        const genreFilter = document.getElementById("by-genre");
        const yearFilter = document.getElementById("by-year");
        const sortFilter = document.getElementById("sort");
        const clearBtn = document.getElementById("clear-btn");
        const trendingPrev = document.getElementById("carouselPrev");
        const trendingNext = document.getElementById("carouselNext");

        let searchTimeout;
        // e-> event object created by browser ,  target-> which evnt input in this case ,  value-> content of ehat is being types in the search bx 
        searchInput.addEventListener("input", (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                // FIX: Correct way to get input value
                this.handleSearch(e.target.value);
            }, 500);
        });

        genreFilter.addEventListener("change", () => this.handleFilterChange());
        yearFilter.addEventListener("change", () => this.handleFilterChange());
        sortFilter.addEventListener("change", () => this.handleFilterChange());
        clearBtn.addEventListener("click", () => this.clearAllFilters());

        // FIX: Buttons use 'click' events, not 'change'
        trendingPrev.addEventListener("click", () => this.scrollCarousel("prev"));
        trendingNext.addEventListener("click", () => this.scrollCarousel("next"));
    }

    async loadTrendingMovies() {
        try {
            const response = await fetch(`${this.BASE_URL}/trending/movie/week?api_key=${this.API_KEY}`);
            const data = await response.json();
            // console.log(data) ; 
            const trendingMovies = data.results.slice(0, 20);
            this.displayTrendingMovies(trendingMovies);
        } catch (error) {
            console.error("ERROR LOADING TRENDING MOVIES: ", error);
            document.getElementById("trendingCarousel").innerHTML = "<div class='error'>Failed to load trending movies</div>";
        }
    }

    displayTrendingMovies(movies) {
        const carousel = document.getElementById("trendingCarousel");
        // FIX: Corrected typo in function name and parameter
        carousel.innerHTML = movies.map((movie, index) => this.createTrendingCard(movie, index + 1)).join("");
    }

    createTrendingCard(movie, rank) {
        // FIX: Corrected variable name for image URL
        const posterPath = movie.poster_path ? `${this.IMAGE_BASE_URL}${movie.poster_path}` : this.FALLBACK_IMAGE;
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        // FIX: Corrected typo 'release_data' to 'release_date'
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'TBA';
        // FIX: Corrected genre mapping logic and typo 'genres_ids'
        // .map->maps genre_id number with the gnre name , .filter(boolean) ->  if any undefined elemnt from map fucntion it removes it simpley   ;  undifened int the sense that a genre_id might not be present in the this,genre mapping then map would assign undefiend in that case  
        const genreNames = movie.genre_ids ? movie.genre_ids.slice(0, 2).map(id => this.genres[id]).filter(Boolean).join(', ') : 'N/A';

        return `
        <div class="trending-card">
            <img src="${posterPath}" alt="${movie.title}" class="movie-poster" loading="lazy" onerror="this.src='${this.FALLBACK_IMAGE}'">
            <div class="trending-rank">${rank}</div>
            <div class="trending-overlay">
                <div class="trending-title">${movie.title}</div>
                <div class="trending-details">
                    <span class="trending-year">${year}</span>
                    <span class="trending-rating">⭐ ${rating}</span>
                </div>
                <div class="trending-genre">${genreNames}</div>
            </div>
        </div>`;
    }

    async loadRandomMovies() {
        try {
            const randomPage = Math.floor(Math.random() * 10) + 1;
            let url = `${this.BASE_URL}/discover/movie?api_key=${this.API_KEY}&page=${randomPage}`;
            
            if (this.currentFilters.sort) {
                url += `&sort_by=${this.currentFilters.sort}`;
            }
            if (this.currentFilters.genre) {
                url += `&with_genres=${this.currentFilters.genre}`;
            }

            const response = await fetch(url);
            const data = await response.json();
            // data.results has all movies on the rando page  ; 
            this.displayMovies(data.results, "movieGrid");

        } catch (error) {
            console.error("ERROR LOADING RANDOM MOVIES", error);
            document.getElementById("movieGrid").innerHTML = `<div class="error">FAILED TO LOAD RANDOM MOVIES</div>`;
        }
    }

    displayMovies(movies, containerId) {
        // FIX: Use the 'container' variable, not the 'containerId' string
        const container = document.getElementById(containerId);
        if (movies.length === 0) {
            container.innerHTML = `<div class="no-results">
                <h2>NO MOVIES FOUND</h2>
                <p>Try adjusting your search criteria or filters.</p>
            </div>`;
            return;
        }
        // FIX: Corrected typo 'craeteMovieCard'
        container.innerHTML = movies.map(movie => this.createMovieCard(movie)).join("");
    }

    createMovieCard(movie) {
        const posterPath = movie.poster_path ? `${this.IMAGE_BASE_URL}${movie.poster_path}` : this.FALLBACK_IMAGE;
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'TBA';
        const description = movie.overview || "No description available.";
        // FIX: Corrected genre mapping logic
        const genreNames = movie.genre_ids ? movie.genre_ids.slice(0, 2).map(id => this.genres[id]).filter(Boolean).join(', ') : 'N/A';

        return `
        <div class="movie-card">
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
            document.getElementById("movieGrid").innerHTML = `<div class="loading">LOADING FILTERED MOVIES.....</div>`;
            // FIX: Endpoint is /discover/movie not /discover/movies
            let url = `${this.BASE_URL}/discover/movie?api_key=${this.API_KEY}&page=1`;

            if (this.currentFilters.genre) {
                url += `&with_genres=${this.currentFilters.genre}`;
            }
            if (this.currentFilters.year) {
                // FIX: Parameter is 'primary_release_year'
                url += `&primary_release_year=${this.currentFilters.year}`;
            }
            if (this.currentFilters.sort) {
                url += `&sort_by=${this.currentFilters.sort}`;
            }

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
            // After clearing search, re-apply filters if they exist
            this.handleFilterChange();
            return;
        }

        this.isSearching = true;
        clearBtn.classList.add("show");
        movieGridTitle.textContent = `SEARCH RESULTS FOR "${trimQuery}"`;
        trendingSection.style.display = "none";

        try {
            document.getElementById("movieGrid").innerHTML = `<div class="loading">SEARCHING MOVIES.....</div>`;
            // FIX: Endpoint is /search/movie not /search/movies. Corrected query param.
            let url = `${this.BASE_URL}/search/movie?api_key=${this.API_KEY}&query=${encodeURIComponent(trimQuery)}&page=1`;

            if (this.currentFilters.year) {
                url += `&primary_release_year=${this.currentFilters.year}`;
            }

            const response = await fetch(url);
            const data = await response.json();
            
            let results = data.results;
            // Post-search filtering for genre and sorting
            if (this.currentFilters.genre) {
                results = results.filter(movie => movie.genre_ids.includes(parseInt(this.currentFilters.genre, 10)));
            }
            if (this.currentFilters.sort) {
                results = this.sortMovies(results, this.currentFilters.sort);
            }
            this.displayMovies(results, "movieGrid");
        } catch (error) {
            console.error("ERROR SEARCHING MOVIES: ", error);
            document.getElementById("movieGrid").innerHTML = `<div class="error">SEARCH FAILED. PLEASE TRY AGAIN.</div>`;
        }
    }
    
    // Manual sorting function for search results
    sortMovies(movies, sortBy) {
        switch (sortBy) {
            case "popularity.desc":
                return movies.sort((a, b) => b.popularity - a.popularity);
            case "vote_average.desc":
                return movies.sort((a, b) => b.vote_average - a.vote_average);
            case "release_date.desc":
                return movies.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
            case "title.asc":
                return movies.sort((a, b) => a.title.localeCompare(b.title));
            default:
                return movies;
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
        const scrollAmount = carousel.clientWidth * 0.8; // Scroll 80% of the visible width
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
            // FIX: Correctly populate genres object
            this.genres = data.genres.reduce((acc, genre) => {
                acc[genre.id] = genre.name;
                return acc;
            }, {});

            // FIX: Correct ID for genre select
            const genreSelect = document.getElementById("by-genre");
            // FIX: Use data.genres
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
        // FIX: Correct ID for year select
        const yearSelect = document.getElementById("by-year");
        const currentYear = new Date().getFullYear();
        // FIX: Changed end year to something more reasonable
        for (let y = currentYear; y >= 1950; y--) {
            const option = document.createElement("option");
            option.value = y;
            option.textContent = y;
            yearSelect.appendChild(option);
        }
    }
}

// Instantiate the class to start the app
new MovieExplorer();