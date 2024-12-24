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
  // 检查是否已存在搜索框
  const existingSearch = document.querySelector('.ai-search-container');
  if (existingSearch) {
    console.log('Search box already exists, skipping insertion');
    return;
  }

  try {
    console.log('Creating new SearchBox instance');
    const searchBox = new SearchBox();
    
    // 检查是否是个人资料页
    const isProfilePage = container.closest('#user-profile-frame') !== null;
    console.log('Is profile page:', isProfilePage);
    
    if (isProfilePage) {
      // 在个人资料页中，将搜索框插入到合适的位置
      const searchForm = container.querySelector('form.subnav-search');
      if (searchForm) {
        console.log('Found search form, inserting before it');
        searchForm.parentElement.insertBefore(searchBox.container, searchForm);
      } else {
        // 尝试找到标题和搜索框之间的位置
        const flexContainer = container.querySelector('.d-flex.flex-column.flex-lg-row');
        if (flexContainer) {
          console.log('Found flex container, inserting before it');
          flexContainer.parentElement.insertBefore(searchBox.container, flexContainer);
        } else {
          console.log('No suitable insertion point found, appending to container');
          container.appendChild(searchBox.container);
        }
      }
    } else {
      // 在其他用户页面中，将搜索框插入到标题后面
      const targetElement = container.querySelector('.d-flex.flex-column.flex-lg-row');
      if (targetElement) {
        console.log('Found target element for insertion');
        container.insertBefore(searchBox.container, targetElement);
      } else {
        console.log('No target element found, appending to container');
        container.appendChild(searchBox.container);
      }
    }
    
    console.log('GitHub Stars AI Search: SearchBox successfully inserted');
  } catch (error) {
    console.error('GitHub Stars AI Search: Failed to insert SearchBox', {
      error: error.toString(),
      errorStack: error.stack,
      container: container ? container.outerHTML : 'null',
      containerHTML: container ? container.innerHTML : 'null',
      isProfilePage: container ? container.closest('#user-profile-frame') !== null : 'null'
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