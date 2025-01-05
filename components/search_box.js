class SearchBox {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'subnav-search width-full max-w-[800px] mx-auto';
    this.geminiClient = null;
    this.initGeminiClient();
    this.render();
  }

  async initGeminiClient() {
    try {
      const result = await chrome.storage.sync.get(['geminiApiKey']);
      if (result.geminiApiKey) {
        this.geminiClient = new GeminiClient(result.geminiApiKey);
      }
    } catch (error) {
      console.error('Failed to initialize GeminiClient:', error);
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="FormControl-spacingWrapper">
        <div class="FormControl-horizontalGroup relative flex items-center gap-2">
          <div class="FormControl flex-1 relative">
            <label class="sr-only FormControl-label" for="star-search">
              Search stars
            </label>    
            <div class="FormControl-input-wrap relative">
              <input 
                id="star-search"
                type="search" 
                class="FormControl-input FormControl-medium w-full px-3 py-2 bg-[var(--color-canvas-default)] border border-[var(--color-border-default)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-fg)] focus:border-[var(--color-accent-fg)] transition-colors duration-200"
                placeholder="Search stars..."
                aria-label="Search stars"
                autocomplete="off"
                spellcheck="false"
              >
            </div>
          </div>
          <button type="button" class="search-clear-button hidden p-2 hover:bg-[var(--color-canvas-subtle)] rounded-md transition-colors duration-200">
            <svg class="octicon h-4 w-4 text-[var(--color-fg-muted)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
              <path fill="currentColor" d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>
            </svg>
          </button>
          <button type="submit" class="Button Button--secondary px-4 py-2 bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-fg)] rounded-md hover:bg-[var(--color-btn-primary-hover-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-fg)] transition-colors duration-200" data-hotkey="s,/" data-action="click:qbsearch-input#handleSubmit">
            <span class="Button-content">
              <span class="Button-label">Search</span>
            </span>
          </button>
        </div>
      </div>
      <div class="search-results mt-4 space-y-4"></div>
    `;

    // Get element references
    this.input = this.container.querySelector('input[type="search"]');
    this.resultsContainer = this.container.querySelector('.search-results');
    this.clearButton = this.container.querySelector('.search-clear-button');
    this.searchButton = this.container.querySelector('.Button--secondary');

    // Listen for input changes
    this.input.addEventListener('input', () => {
      this.clearButton.style.display = this.input.value ? 'flex' : 'none';
    });

    // Clear button click event
    this.clearButton.addEventListener('click', () => {
      this.input.value = '';
      this.clearButton.style.display = 'none';
      this.resultsContainer.innerHTML = '';
      this.input.focus();
    });

    // Search button click event
    this.searchButton.addEventListener('click', () => {
      this.handleSearch();
    });

    // Input enter key event
    this.input.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        await this.handleSearch();
      }
    });
  }

  async handleSearch() {
    const query = this.input.value.trim();
    if (!query) return;

    if (!this.geminiClient) {
      this.showError(new Error('Please set your Gemini API key in the extension options'));
      return;
    }

    this.showLoading();
    try {
      const stars = await fetchAllStarredRepos();
      const results = await this.geminiClient.searchRepositories(query, stars);
      this.displayResults(results);
    } catch (error) {
      this.showError(error);
    }
  }

  showLoading() {
    this.resultsContainer.innerHTML = `
      <div class="ai-loading flex items-center justify-center p-4 text-[var(--color-fg-muted)]">
        <svg class="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Searching through your starred repositories...
      </div>
    `;
  }

  showError(error) {
    this.resultsContainer.innerHTML = `
      <div class="error p-3 text-sm text-[var(--color-danger-fg)] flex items-center gap-2">
        <span class="inline-block w-[18px] h-[18px] rounded-full bg-[var(--color-danger-fg)] text-white flex items-center justify-center text-xs font-medium">
          !
        </span>
        ${error.message}
      </div>
    `;
  }

  displayResults(results) {
    this.resultsContainer.innerHTML = '';
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(results, 'text/html');
      
      const links = doc.querySelectorAll('a');
      
      if (links.length === 0) {
        this.resultsContainer.innerHTML = `
          <div class="search-result-item p-4 bg-[var(--color-canvas-subtle)] rounded-md">
            <p class="text-[var(--color-fg-muted)]">No matching repositories found.</p>
          </div>
        `;
        return;
      }
      
      links.forEach((link, index) => {
        const description = link.nextSibling ? link.nextSibling.textContent.trim() : '';
        
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item p-4 bg-[var(--color-canvas-subtle)] rounded-md hover:bg-[var(--color-canvas-default)] transition-colors duration-200';
        resultItem.style.animationDelay = `${index * 0.1}s`;
        
        const [author, repo] = link.textContent.split('/').map(s => s.trim());
        
        resultItem.innerHTML = `
          <div class="flex flex-col gap-2">
            <h3 class="text-lg font-semibold">
              <a href="${link.href}" class="text-[var(--color-accent-fg)] hover:underline" target="_blank" rel="noopener noreferrer">
                ${author} / <strong>${repo}</strong>
              </a>
            </h3>
            <p class="text-[var(--color-fg-muted)]">${description}</p>
            <div class="flex items-center gap-1 text-xs text-[var(--color-fg-muted)]">
              <svg class="h-3.5 w-3.5" aria-hidden="true" viewBox="0 0 16 16" version="1.1">
                <path fill="currentColor" d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path>
              </svg>
              <span>Starred</span>
            </div>
          </div>
        `;
        
        this.resultsContainer.appendChild(resultItem);
      });
      
    } catch (error) {
      console.error('Error displaying results:', error);
      this.showError(new Error('Failed to display search results'));
    }
  }
} 