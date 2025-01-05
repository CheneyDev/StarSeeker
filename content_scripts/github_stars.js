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

  // 确保 SearchBox 类已经加载
  if (typeof SearchBox === 'undefined') {
    console.error('GitHub Stars AI Search: SearchBox class is not loaded');
    return;
  }

  // 等待一小段时间确保 DOM 完全加载
  setTimeout(() => {
    try {
      // 首先尝试查找个人资料页的搜索框容器
      const searchContainer = document.querySelector('#user-profile-frame');
      if (searchContainer) {
        console.log('Found profile page container');
        // 在个人资料页中
        const titleContainer = searchContainer.querySelector('.col-lg-12');
        if (titleContainer) {
          console.log('Found title container in profile page');
          insertSearchBox(titleContainer);
          return;
        }
      }

      // 如果不是个人资料页，尝试其他用户页面的布局
      const starsTitle = document.querySelector('h2.f3-light');
      if (starsTitle) {
        console.log('Found stars title in other user page');
        const titleContainer = starsTitle.parentElement;
        if (titleContainer) {
          insertSearchBox(titleContainer);
          return;
        }
      }

      console.error('GitHub Stars AI Search: Could not find suitable container');
    } catch (error) {
      console.error('GitHub Stars AI Search: Error during initialization', error);
    }
  }, 1000);
}

function insertSearchBox(container) {
  // 使用唯一的类名来检查是否已存在我们的搜索框
  const existingSearches = document.querySelectorAll('.star-seeker-search-box');
  if (existingSearches.length > 0) {
    console.log('Star Seeker search box already exists, skipping insertion');
    return;
  }

  try {
    console.log('Creating new SearchBox instance');
    const searchBox = new SearchBox();
    // 添加唯一的类名标识
    searchBox.container.classList.add('star-seeker-search-box');
    
    // 查找 Lists 和 Stars 区域的共同父容器
    const mainContent = document.querySelector('#user-profile-frame');
    if (!mainContent) {
      console.log('Could not find main content container');
      return;
    }

    // 查找所有 h2 标题
    const headings = mainContent.querySelectorAll('h2[data-view-component="true"]');
    let firstSection = null;

    // 遍历标题找到 Lists 或 Stars
    for (const heading of headings) {
      if (heading.textContent.trim() === 'Lists' || heading.textContent.trim() === 'Stars') {
        firstSection = heading;
        break;
      }
    }
    
    if (firstSection) {
      // 将搜索框插入到第一个区域的前面
      firstSection.parentElement.insertBefore(searchBox.container, firstSection);
      console.log('GitHub Stars AI Search: SearchBox successfully inserted before Lists/Stars section');
    } else {
      // 如果找不到这些区域，就插入到主容器的开头
      mainContent.insertBefore(searchBox.container, mainContent.firstChild);
      console.log('GitHub Stars AI Search: SearchBox inserted at the beginning of main content');
    }
  } catch (error) {
    console.error('GitHub Stars AI Search: Failed to insert SearchBox', {
      error: error.toString(),
      errorStack: error.stack,
      container: container ? container.outerHTML : 'null',
      containerHTML: container ? container.innerHTML : 'null'
    });
  }
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