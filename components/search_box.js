class SearchBox {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'ai-search-container';
    this.geminiClient = null;
    this.initGeminiClient();
    this.render();
  }

  async initGeminiClient() {
    const result = await chrome.storage.sync.get(['geminiApiKey']);
    if (result.geminiApiKey) {
      this.geminiClient = new GeminiClient(result.geminiApiKey);
    }
  }

  render() {
    this.container.innerHTML = `
      <input 
        type="text" 
        class="ai-search-input" 
        placeholder="Search your starred repositories with AI..."
        autocomplete="off"
        spellcheck="false"
      >
      <div class="ai-search-results"></div>
    `;

    this.input = this.container.querySelector('.ai-search-input');
    this.resultsContainer = this.container.querySelector('.ai-search-results');

    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSearch();
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
      <div class="ai-loading">
        Searching through your starred repositories...
      </div>
    `;
  }

  showError(error) {
    this.resultsContainer.innerHTML = `
      <div class="error">
        Error: ${error.message}
      </div>
    `;
  }

  displayResults(results) {
    this.resultsContainer.innerHTML = results;
  }
} 