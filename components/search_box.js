class SearchBox {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'subnav-search width-full';
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
        <div class="FormControl-horizontalGroup">
          <div class="FormControl width-full">
            <label class="sr-only FormControl-label" for="star-search">
              Search stars
            </label>    
            <div class="FormControl-input-wrap">
              <input 
                id="star-search"
                type="search" 
                class="FormControl-input FormControl-medium"
                placeholder="Search stars"
                aria-label="Search stars"
                autocomplete="off"
                spellcheck="false"
              >
            </div>
          </div>
          <button type="button" class="search-clear-button" style="display: none;">
            <svg class="octicon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>
            </svg>
          </button>
          <button type="submit" class="Button Button--secondary" data-hotkey="s,/" data-action="click:qbsearch-input#handleSubmit">
            <span class="Button-content">
              <span class="Button-label">Search</span>
            </span>
          </button>
        </div>
      </div>
      <div class="search-results"></div>
    `;

    // 获取元素引用
    this.input = this.container.querySelector('input[type="search"]');
    this.resultsContainer = this.container.querySelector('.search-results');
    this.clearButton = this.container.querySelector('.search-clear-button');
    this.searchButton = this.container.querySelector('.Button--secondary');

    // 监听输入框变化
    this.input.addEventListener('input', () => {
      this.clearButton.style.display = this.input.value ? 'flex' : 'none';
    });

    // 清除按钮点击事件
    this.clearButton.addEventListener('click', () => {
      this.input.value = '';
      this.clearButton.style.display = 'none';
      this.resultsContainer.innerHTML = '';
      this.input.focus();
    });

    // 搜索按钮点击事件
    this.searchButton.addEventListener('click', () => {
      this.handleSearch();
    });

    // 输入框回车事件
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
    this.resultsContainer.innerHTML = '';
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(results, 'text/html');
      
      const links = doc.querySelectorAll('a');
      
      if (links.length === 0) {
        this.resultsContainer.innerHTML = `
          <div class="search-result-item">
            <p>No matching repositories found.</p>
          </div>
        `;
        return;
      }
      
      links.forEach((link, index) => {
        const description = link.nextSibling ? link.nextSibling.textContent.trim() : '';
        
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        resultItem.style.animationDelay = `${index * 0.1}s`;
        
        const [author, repo] = link.textContent.split('/').map(s => s.trim());
        
        resultItem.innerHTML = `
          <h3>
            <a href="${link.href}" target="_blank" rel="noopener noreferrer">
              ${author} / <strong>${repo}</strong>
            </a>
          </h3>
          <p>${description}</p>
          <div class="search-result-meta">
            <span>
              <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16">
                <path fill="currentColor" d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path>
              </svg>
              Starred
            </span>
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