class SearchBox {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'ai-search-container';
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
      <div class="ai-search-wrapper">
        <input 
          type="text" 
          class="ai-search-input" 
          placeholder="使用 AI 搜索已收藏的仓库..."
          autocomplete="off"
          spellcheck="false"
        >
        <button class="ai-search-clear" title="清除搜索">
          <svg class="ai-search-clear-icon" viewBox="0 0 16 16" width="16" height="16">
            <path fill="currentColor" d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>
          </svg>
        </button>
        <button class="ai-search-button" title="搜索">
          <svg class="ai-search-button-icon" viewBox="0 0 16 16" width="16" height="16">
            <path fill="currentColor" d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"></path>
          </svg>
        </button>
      </div>
      <div class="ai-search-results"></div>
    `;

    this.input = this.container.querySelector('.ai-search-input');
    this.resultsContainer = this.container.querySelector('.ai-search-results');
    this.clearButton = this.container.querySelector('.ai-search-clear');
    this.searchButton = this.container.querySelector('.ai-search-button');

    // 监听输入框变化，控制清除按钮的显示/隐藏
    this.input.addEventListener('input', () => {
      this.clearButton.style.display = this.input.value ? 'flex' : 'none';
    });

    // 初始化时隐藏清除按钮
    this.clearButton.style.display = 'none';

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

    // 输入框获得焦点时的动画效果
    this.input.addEventListener('focus', () => {
      this.container.querySelector('.ai-search-wrapper').classList.add('focused');
    });

    this.input.addEventListener('blur', () => {
      this.container.querySelector('.ai-search-wrapper').classList.remove('focused');
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