// This is the main class for our entire movie app. Think of it as the "brain"
// that holds all the logic and data.
class MovieExplorer {
    // The constructor is like a setup function. It runs automatically when we create a new MovieExplorer.
    // It's where we define all our starting properties.
    constructor() {
        // --- App Configuration ---
        this.API_KEY = "b7a37dd868bf6a2450a8162f5fddc564"; // Your personal key to talk to the movie API.
        this.BASE_URL = "https://api.themoviedb.org/3"; // The starting point for all API requests.
        this.IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w185"; // The URL for getting movie posters.
        this.FALLBACK_IMAGE = "./photo.jpg"; // A backup image in case a movie doesn't have a poster.

        // --- App State ---
        // This object will store our genre list, like { 28: "Action" }, so we can easily find a genre name by its ID.
        this.genres = {};
        this.currentPage = 1; // For pagination, though we're not using it much yet.
        this.isSearching = false; // A simple flag to know if the user is currently searching.
        // This object keeps track of all the active filters the user has selected.
        this.currentFilters = {
            genre: '',
            year: '',
            sort: '',
        };

        // This kicks everything off!
        this.init();
    }

    // The init function is the starting point that calls all the other setup functions in the right order.
    async init() {
        this.setupEventListeners(); // First, make sure the app can listen to user actions.
        await this.loadGenres(); // Load genres from the API, since we need them to display movie cards correctly.
        this.setupYearFilter(); // Create the year options in the dropdown.
        await this.loadRandomMovies(); // Load some initial movies to fill the page.
        await this.loadTrendingMovies(); // Load the movies for the top carousel.
    }

    // This is where we connect our JavaScript to the HTML elements, making them interactive.
    setupEventListeners() {
        // Get all the interactive elements from the HTML page.
        const searchInput = document.getElementById("search-input");
        const genreFilter = document.getElementById("by-genre");
        const yearFilter = document.getElementById("by-year");
        const sortFilter = document.getElementById("sort");
        const clearBtn = document.getElementById("clear-btn");
        const trendingPrev = document.getElementById("carouselPrev");
        const trendingNext = document.getElementById("carouselNext");

        let searchTimeout; // This variable will hold our timer for debouncing.
        // Listen for when the user types in the search box.
        searchInput.addEventListener("input", (e) => {
            // This is a "debounce" technique. It prevents the app from searching on every single letter typed.
            clearTimeout(searchTimeout); // Reset the timer every time a new letter is typed.
            searchTimeout = setTimeout(() => { // Set a new timer.
                // Only run the search after the user has stopped typing for half a second (500ms).
                this.handleSearch(e.target.value);
            }, 500);
        });

        // When a filter dropdown is changed, run our main filter handler.
        genreFilter.addEventListener("change", () => this.handleFilterChange());
        yearFilter.addEventListener("change", () => this.handleFilterChange());
        sortFilter.addEventListener("change", () => this.handleFilterChange());

        // Listen for a click on the "Clear" button.
        clearBtn.addEventListener("click", () => this.clearAllFilters());

        // Listen for clicks on the carousel's previous and next buttons.
        trendingPrev.addEventListener("click", () => this.scrollCarousel("prev"));
        trendingNext.addEventListener("click", () => this.scrollCarousel("next"));
    }

    // Fetches the weekly trending movies from the API.
    async loadTrendingMovies() {
        try {
            const response = await fetch(`${this.BASE_URL}/trending/movie/week?api_key=${this.API_KEY}`);
            const data = await response.json();
            const trendingMovies = data.results.slice(0, 20); // We only want the top 20 for our carousel.
            this.displayTrendingMovies(trendingMovies); // Send the movie data to be displayed.
        } catch (error) {
            // If something goes wrong (like a network error), show an error message.
            console.error("ERROR LOADING TRENDING MOVIES: ", error);
            document.getElementById("trendingCarousel").innerHTML = "<div class='error'>Failed to load trending movies</div>";
        }
    }

    // Takes the trending movie data and puts it on the page.
    displayTrendingMovies(movies) {
        const carousel = document.getElementById("trendingCarousel");
        // We 'map' over the array of movies, turn each one into an HTML card string, and then 'join' them all together.
        carousel.innerHTML = movies.map((movie, index) => this.createTrendingCard(movie, index + 1)).join("");
    }

    // Builds the HTML string for a single card in the trending carousel.
    createTrendingCard(movie, rank) {
        // If the movie has a poster, use it. If not, use our backup image.
        const posterPath = movie.poster_path ? `${this.IMAGE_BASE_URL}${movie.poster_path}` : this.FALLBACK_IMAGE;
        // Show the rating with one decimal point, or 'N/A' if it's not available.
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        // Get just the year from the full release date.
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'TBA';
        // Get the names for the first two genre IDs. The filter(Boolean) is a clever trick to remove any 'undefined' genres.
        const genreNames = movie.genre_ids ? movie.genre_ids.slice(0, 2).map(id => this.genres[id]).filter(Boolean).join(', ') : 'N/A';

        // Return the final HTML for the card.
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

    // Fetches a random page of movies to show on page load or when filters are cleared.
    async loadRandomMovies() {
        try {
            const randomPage = Math.floor(Math.random() * 10) + 1;
            let url = `${this.BASE_URL}/discover/movie?api_key=${this.API_KEY}&page=${randomPage}`;
            
            // If any filters are already set, apply them.
            if (this.currentFilters.sort) {
                url += `&sort_by=${this.currentFilters.sort}`;
            }
            if (this.currentFilters.genre) {
                url += `&with_genres=${this.currentFilters.genre}`;
            }

            const response = await fetch(url);
            const data = await response.json();
            // Use our main display function to put these movies on the grid.
            this.displayMovies(data.results, "movieGrid");

        } catch (error) {
            console.error("ERROR LOADING RANDOM MOVIES", error);
            document.getElementById("movieGrid").innerHTML = `<div class="error">FAILED TO LOAD RANDOM MOVIES</div>`;
        }
    }

    // This is the main function for rendering movies to the grid.
    displayMovies(movies, containerId) {
        const container = document.getElementById(containerId);
        // If we get an empty array of movies, show a helpful message.
        if (movies.length === 0) {
            container.innerHTML = `<div class="no-results">
                <h2>NO MOVIES FOUND</h2>
                <p>Try adjusting your search criteria or filters.</p>
            </div>`;
            return; // Stop the function here.
        }
        // Turn each movie object into an HTML card and display it.
        container.innerHTML = movies.map(movie => this.createMovieCard(movie)).join("");
    }

    // Builds the HTML string for a standard movie card in the main grid.
    createMovieCard(movie) {
        const posterPath = movie.poster_path ? `${this.IMAGE_BASE_URL}${movie.poster_path}` : this.FALLBACK_IMAGE;
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'TBA';
        const description = movie.overview || "No description available.";
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

    // This is the central hub for handling any change in the filter dropdowns.
    async handleFilterChange() {
        const searchInput = document.getElementById("search-input");
        const genreFilter = document.getElementById("by-genre");
        const yearFilter = document.getElementById("by-year");
        const sortFilter = document.getElementById("sort");
        const clearBtn = document.getElementById("clear-btn");
        const trendingSection = document.getElementById("trendingSection");
        const movieGridTitle = document.getElementById("movieGridTitle");

        // Update our state object with the latest values from the filters.
        this.currentFilters = {
            genre: genreFilter.value,
            year: yearFilter.value,
            sort: sortFilter.value,
        };

        // Check if any filter is active or if there's text in the search box.
        const hasFilters = this.currentFilters.genre || this.currentFilters.year || this.currentFilters.sort || searchInput.value.trim();
        
        // If any filters are on, show the "Clear" button and hide the trending section.
        if (hasFilters) {
            clearBtn.classList.add("show");
            trendingSection.style.display = "none";
        } else {
            clearBtn.classList.remove("show");
            trendingSection.style.display = "block";
        }

        // Decide what to do next based on the current state.
        if (searchInput.value.trim()) {
            // If there's a search term, let the search function handle it.
            await this.handleSearch(searchInput.value.trim());
        } else {
            // If no search term, check for filters.
            if (this.currentFilters.genre || this.currentFilters.year || this.currentFilters.sort) {
                movieGridTitle.textContent = "FILTERED MOVIES";
                await this.loadFilteredMovies(); // Load movies using the selected filters.
            } else {
                // If no search and no filters, show the default random movies.
                movieGridTitle.textContent = "DISCOVER MOVIES";
                await this.loadRandomMovies();
            }
        }
    }

    // Fetches movies from the API using the selected filters.
    async loadFilteredMovies() {
        try {
            document.getElementById("movieGrid").innerHTML = `<div class="loading">LOADING FILTERED MOVIES.....</div>`;
            let url = `${this.BASE_URL}/discover/movie?api_key=${this.API_KEY}&page=1`;

            // Add parameters to the URL only if the filters are selected.
            if (this.currentFilters.genre) {
                url += `&with_genres=${this.currentFilters.genre}`;
            }
            if (this.currentFilters.year) {
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

    // Handles the logic for when a user types in the search box.
    async handleSearch(query) {
        const trimQuery = query.trim();
        const clearBtn = document.getElementById("clear-btn");
        const movieGridTitle = document.getElementById("movieGridTitle");
        const trendingSection = document.getElementById("trendingSection");

        // If the search box is cleared, go back to the default filter view.
        if (trimQuery === "") {
            this.isSearching = false;
            this.handleFilterChange();
            return;
        }

        // Otherwise, enter "search mode".
        this.isSearching = true;
        clearBtn.classList.add("show");
        movieGridTitle.textContent = `SEARCH RESULTS FOR "${trimQuery}"`;
        trendingSection.style.display = "none";

        try {
            document.getElementById("movieGrid").innerHTML = `<div class="loading">SEARCHING MOVIES.....</div>`;
            // Build the URL for the search API. encodeURIComponent handles special characters like spaces.
            let url = `${this.BASE_URL}/search/movie?api_key=${this.API_KEY}&query=${encodeURIComponent(trimQuery)}&page=1`;

            if (this.currentFilters.year) {
                url += `&primary_release_year=${this.currentFilters.year}`;
            }

            const response = await fetch(url);
            const data = await response.json();
            
            let results = data.results;
            // The search API doesn't let us filter by genre or sort in the URL,
            // so we have to do it ourselves after we get the results. This is client-side filtering.
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
    
    // A helper function that sorts an array of movies.
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
                return movies; // If the sort key is unknown, don't sort.
        }
    }

    // Resets the entire UI and state back to the beginning.
    clearAllFilters() {
        // Clear all the input fields.
        document.getElementById("search-input").value = "";
        document.getElementById("by-genre").value = "";
        document.getElementById("by-year").value = "";
        document.getElementById("sort").value = "";

        // Reset the state variables.
        this.currentFilters = { genre: "", year: "", sort: "" };
        this.isSearching = false;
        
        // Reset the UI elements to their default state.
        document.getElementById("clear-btn").classList.remove("show");
        document.getElementById("trendingSection").style.display = "block";
        document.getElementById("movieGridTitle").textContent = "DISCOVER MOVIES";
        
        // Load a fresh set of random movies.
        this.loadRandomMovies();
    }

    // Handles the scrolling of the trending carousel.
    scrollCarousel(direction) {
        const carousel = document.getElementById("trendingCarousel");
        // Scroll by 80% of the carousel's visible width for a nice effect.
        const scrollAmount = carousel.clientWidth * 0.8;
        if (direction === "prev") {
            carousel.scrollBy({ left: -scrollAmount, behavior: "smooth" });
        } else {
            carousel.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
    }

    // Fetches the list of all genres from the API.
    async loadGenres() {
        try {
            const response = await fetch(`${this.BASE_URL}/genre/movie/list?api_key=${this.API_KEY}`);
            const data = await response.json();
            // Use .reduce() to turn the array of genres into an easy-to-use object (our ID-to-name map).
            this.genres = data.genres.reduce((acc, genre) => {
                acc[genre.id] = genre.name;
                return acc;
            }, {});

            // Now, use that same list to create the options for the genre dropdown.
            const genreSelect = document.getElementById("by-genre");
            data.genres.forEach(genre => {
                const option = document.createElement("option"); // Create a new <option> element.
                option.value = genre.id; // The hidden value will be the ID.
                option.textContent = genre.name; // The visible text will be the name.
                genreSelect.appendChild(option); // Add the new option to the dropdown.
            });
        } catch (error) {
            console.error("ERROR LOADING GENRES: ", error);
        }
    }

    // Dynamically creates the options for the year filter dropdown.
    setupYearFilter() {
        const yearSelect = document.getElementById("by-year");
        const currentYear = new Date().getFullYear();
        // Create a dropdown option for every year from the current year down to 1950.
        for (let y = currentYear; y >= 1950; y--) {
            const option = document.createElement("option");
            option.value = y;
            option.textContent = y;
            yearSelect.appendChild(option);
        }
    }
}

// This is the line that actually starts our app. It creates a new "instance" of our MovieExplorer class.
new MovieExplorer();