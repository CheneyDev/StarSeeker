async function fetchAllStarredRepos() {
  const username = document.querySelector('[data-hovercard-type="user"]').innerText;
  let page = 1;
  let allRepos = [];
  
  while (true) {
    const response = await fetch(
      `https://api.github.com/users/${username}/starred?page=${page}&per_page=100`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch starred repositories');
    }
    
    const repos = await response.json();
    if (repos.length === 0) break;
    
    allRepos = allRepos.concat(repos);
    page++;
  }
  
  return allRepos;
}

function init() {
  // 检查是否在 Stars 页面
  const isStarsPage = window.location.href.includes('?tab=stars') || 
                     window.location.href.endsWith('/stars');
  
  if (!isStarsPage) {
    return;
  }

  // 等待一小段时间确保 DOM 完全加载
  setTimeout(() => {
    // 尝试多个可能的选择器
    const possibleSelectors = [
      '.table-list-header-toggle',
      '.repository-list-header',
      '.user-profile-repositories',
      '.user-profile-repos-container',
      '.js-responsive-underlinenav',
      '.UnderlineNav-body'
    ];

    let searchArea = null;
    for (const selector of possibleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`Found matching element with selector: ${selector}`);
        searchArea = element;
        break;
      }
    }
    
    // 如果还是找不到，尝试找到仓库列表的父容器
    if (!searchArea) {
      const repoList = document.querySelector('[data-repository-hovercards-enabled]');
      if (repoList) {
        searchArea = repoList.parentElement;
        console.log('Found repository list container');
      }
    }
    
    // 查找现有的搜索框容器
    const existingSearch = document.querySelector('.ai-search-container');

    if (!searchArea) {
      console.error('GitHub Stars AI Search: Could not find any suitable container');
      // 输出页面结构以帮助调试
      console.log('Current page structure:', document.body.innerHTML);
      return;
    }

    // 如果搜索框已存在，不要重复添加
    if (existingSearch) {
      return;
    }

    try {
      const searchBox = new SearchBox();
      // 将搜索框插入到搜索区域的开头
      searchArea.insertBefore(searchBox.container, searchArea.firstChild);
      console.log('GitHub Stars AI Search: SearchBox successfully initialized');
    } catch (error) {
      console.error('GitHub Stars AI Search: Failed to initialize SearchBox', error);
    }
  }, 1000); // 增加等待时间到 1 秒
}

// 在页面加载完成后执行初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 监听 Turbo 导航事件
document.addEventListener('turbo:load', init);

// 为了向后兼容，也监听 PJAX 事件
document.addEventListener('pjax:complete', init);

// 监听 URL 变化
let lastUrl = location.href; 
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    init();
  }
}).observe(document, { subtree: true, childList: true }); 