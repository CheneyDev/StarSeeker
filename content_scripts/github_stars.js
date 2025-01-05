function getUsernameFromUrl() {
  const path = window.location.pathname;
  const matches = path.match(/^\/([^/]+)/);
  return matches ? matches[1] : null;
}

async function fetchAllStarredRepos() {
  const username = getUsernameFromUrl();
  if (!username) {
    throw new Error('无法获取用户名');
  }

  let page = 1;
  let allRepos = [];
  
  while (true) {
    const response = await fetch(
      `https://api.github.com/users/${username}/starred?page=${page}&per_page=100`,
      {
        headers: {
          'Accept': 'application/vnd.github+json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch starred repositories');
    }
    
    const repos = await response.json();
    if (repos.length === 0) break;
    
    allRepos = allRepos.concat(repos);
    page++;
  }
  
  return processStarredRepos(allRepos);
}

function processStarredRepos(repos) {
  return repos.map(repo => ({
    full_name: repo.full_name,
    description: repo.description || ''  // 如果description为null，使用空字符串
  }));
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

class StarDataManager {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'star-data-manager p-3 border rounded-2 mb-3';
    this.setupUI();
  }

  setupUI() {
    // 状态显示
    this.statusContainer = document.createElement('div');
    this.statusContainer.className = 'mb-2';
    this.container.appendChild(this.statusContainer);

    // 操作按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'd-flex gap-2 mb-3';
    
    // 获取数据按钮
    this.fetchButton = document.createElement('button');
    this.fetchButton.className = 'btn btn-primary btn-sm';
    this.fetchButton.textContent = '获取Star列表';
    this.fetchButton.onclick = () => this.startFetching();
    
    // 查看数据按钮
    this.viewButton = document.createElement('button');
    this.viewButton.className = 'btn btn-outline-primary btn-sm';
    this.viewButton.textContent = '查看数据';
    this.viewButton.onclick = () => this.toggleDataView();
    
    // 刷新按钮
    this.refreshButton = document.createElement('button');
    this.refreshButton.className = 'btn btn-outline-primary btn-sm';
    this.refreshButton.textContent = '刷新数据';
    this.refreshButton.onclick = () => this.refreshData();
    
    // 删除按钮
    this.deleteButton = document.createElement('button');
    this.deleteButton.className = 'btn btn-outline-danger btn-sm';
    this.deleteButton.textContent = '删除数据';
    this.deleteButton.onclick = () => this.deleteData();

    // 管理缓存按钮
    this.manageButton = document.createElement('button');
    this.manageButton.className = 'btn btn-outline-secondary btn-sm';
    this.manageButton.textContent = '管理缓存';
    this.manageButton.onclick = () => this.toggleManagePanel();
    
    buttonContainer.appendChild(this.fetchButton);
    buttonContainer.appendChild(this.viewButton);
    buttonContainer.appendChild(this.refreshButton);
    buttonContainer.appendChild(this.deleteButton);
    buttonContainer.appendChild(this.manageButton);
    this.container.appendChild(buttonContainer);

    // 数据展示面板
    this.dataPanel = document.createElement('div');
    this.dataPanel.className = 'data-panel color-bg-subtle rounded-2 p-3 border';
    this.dataPanel.style.display = 'none';
    this.dataPanel.style.maxHeight = '400px';
    this.dataPanel.style.overflowY = 'auto';
    this.container.appendChild(this.dataPanel);

    // 缓存管理面板
    this.managePanel = document.createElement('div');
    this.managePanel.className = 'manage-panel color-bg-subtle rounded-2 p-3 border mt-3';
    this.managePanel.style.display = 'none';
    this.container.appendChild(this.managePanel);

    this.updateStatus();
  }

  async toggleDataView() {
    const username = getUsernameFromUrl();
    if (!username) {
      this.statusContainer.textContent = '无法获取用户名';
      return;
    }

    if (this.dataPanel.style.display === 'none') {
      const data = await chrome.storage.local.get(`stars_${username}`);
      const userData = data[`stars_${username}`];
      
      if (!userData) {
        this.dataPanel.innerHTML = '<div class="color-fg-muted">暂无数据</div>';
      } else {
        // 创建表格视图
        const table = document.createElement('table');
        table.className = 'width-full';
        table.style.cssText = `
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
        `;
        
        // 表头
        const thead = document.createElement('thead');
        thead.innerHTML = `
          <tr class="color-bg-subtle">
            <th class="p-2 border" style="width: 60px">序号</th>
            <th class="p-2 border" style="width: 35%">仓库名称</th>
            <th class="p-2 border">描述</th>
          </tr>
        `;
        table.appendChild(thead);
        
        // 表格内容
        const tbody = document.createElement('tbody');
        userData.repos.forEach((repo, index) => {
          const tr = document.createElement('tr');
          tr.className = index % 2 === 0 ? 'color-bg-default' : 'color-bg-subtle';
          
          // 使用模板字符串创建单元格，添加文本溢出控制的样式
          tr.innerHTML = `
            <td class="p-2 border text-center">${index + 1}</td>
            <td class="p-2 border" style="max-width: 0">
              <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                <a href="https://github.com/${repo.full_name}" 
                   target="_blank" 
                   class="Link--primary no-underline"
                   title="${repo.full_name}">
                  ${repo.full_name}
                </a>
              </div>
            </td>
            <td class="p-2 border color-fg-muted" style="max-width: 0">
              <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                   title="${repo.description || '暂无描述'}">
                ${repo.description || '暂无描述'}
              </div>
            </td>
          `;
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        
        // 创建一个包装器来控制表格的水平滚动
        const tableWrapper = document.createElement('div');
        tableWrapper.style.cssText = `
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        `;
        tableWrapper.appendChild(table);
        
        this.dataPanel.innerHTML = '';
        this.dataPanel.appendChild(tableWrapper);
      }
      
      this.dataPanel.style.display = 'block';
      this.viewButton.textContent = '隐藏数据';
      this.viewButton.className = 'btn btn-outline-primary btn-sm selected';
    } else {
      this.dataPanel.style.display = 'none';
      this.viewButton.textContent = '查看数据';
      this.viewButton.className = 'btn btn-outline-primary btn-sm';
    }
  }

  async startFetching() {
    this.fetchButton.disabled = true;
    this.statusContainer.textContent = '正在获取数据...';
    
    try {
      const username = getUsernameFromUrl();
      if (!username) {
        throw new Error('无法获取用户名');
      }

      const repos = await fetchAllStarredRepos();
      
      // 保存到本地存储
      const data = {
        username,
        repos,
        lastUpdated: new Date().toISOString()
      };
      
      await chrome.storage.local.set({ [`stars_${username}`]: data });
      this.updateStatus();
    } catch (error) {
      console.error('Failed to fetch stars:', error);
      this.statusContainer.textContent = '获取数据失败: ' + error.message;
    } finally {
      this.fetchButton.disabled = false;
    }
  }

  async refreshData() {
    await this.startFetching();
  }

  async deleteData() {
    const username = getUsernameFromUrl();
    if (!username) {
      this.statusContainer.textContent = '无法获取用户名';
      return;
    }
    await chrome.storage.local.remove(`stars_${username}`);
    this.updateStatus();
  }

  async updateStatus() {
    const username = getUsernameFromUrl();
    if (!username) {
      this.statusContainer.textContent = '无法获取用户名';
      this.refreshButton.disabled = true;
      this.deleteButton.disabled = true;
      this.viewButton.disabled = true;
      return;
    }

    const data = await chrome.storage.local.get(`stars_${username}`);
    const userData = data[`stars_${username}`];
    
    if (userData) {
      const lastUpdated = new Date(userData.lastUpdated).toLocaleString();
      this.statusContainer.innerHTML = `
        <div class="text-small color-fg-muted">
          已缓存 ${userData.repos.length} 个Star项目
          <br>
          最后更新: ${lastUpdated}
        </div>
      `;
      this.refreshButton.disabled = false;
      this.deleteButton.disabled = false;
      this.viewButton.disabled = false;
    } else {
      this.statusContainer.textContent = '未获取Star数据';
      this.refreshButton.disabled = true;
      this.deleteButton.disabled = true;
      this.viewButton.disabled = true;
      if (this.dataPanel.style.display !== 'none') {
        this.toggleDataView();
      }
    }
  }

  async toggleManagePanel() {
    // 如果数据面板是打开的，先关闭它
    if (this.dataPanel.style.display !== 'none') {
      this.dataPanel.style.display = 'none';
      this.viewButton.textContent = '查看数据';
      this.viewButton.className = 'btn btn-outline-primary btn-sm';
    }

    if (this.managePanel.style.display === 'none') {
      await this.updateManagePanelContent();
      this.managePanel.style.display = 'block';
      this.manageButton.className = 'btn btn-outline-secondary btn-sm selected';
    } else {
      this.managePanel.style.display = 'none';
      this.manageButton.className = 'btn btn-outline-secondary btn-sm';
    }
  }

  async updateManagePanelContent() {
    const allData = await chrome.storage.local.get(null);
    const starData = Object.entries(allData)
      .filter(([key]) => key.startsWith('stars_'))
      .map(([key, value]) => ({
        username: value.username,
        count: value.repos.length,
        lastUpdated: value.lastUpdated
      }));

    if (starData.length === 0) {
      this.managePanel.innerHTML = '<div class="color-fg-muted text-center">暂无缓存数据</div>';
    } else {
      const table = document.createElement('table');
      table.className = 'width-full';
      table.style.cssText = `
        border-collapse: collapse;
        table-layout: fixed;
        width: 100%;
      `;

      // 创建表头
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr class="color-bg-subtle">
          <th class="p-2 border text-center" style="width: 30%">用户名</th>
          <th class="p-2 border text-center" style="width: 20%">Star数量</th>
          <th class="p-2 border text-center" style="width: 35%">最后更新</th>
          <th class="p-2 border text-center" style="width: 15%">操作</th>
        </tr>
      `;
      table.appendChild(thead);

      // 创建表格内容
      const tbody = document.createElement('tbody');
      starData.forEach((data, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'color-bg-default' : 'color-bg-subtle';
        
        // 创建用户名单元格
        const usernameTd = document.createElement('td');
        usernameTd.className = 'p-2 border';
        usernameTd.style.cssText = 'max-width: 0; text-align: center;';
        const usernameDiv = document.createElement('div');
        usernameDiv.style.cssText = 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
        const usernameLink = document.createElement('a');
        usernameLink.href = `https://github.com/${data.username}?tab=stars`;
        usernameLink.target = '_blank';
        usernameLink.className = 'Link--primary no-underline';
        usernameLink.title = data.username;
        usernameLink.textContent = data.username;
        usernameDiv.appendChild(usernameLink);
        usernameTd.appendChild(usernameDiv);
        
        // 创建数量单元格
        const countTd = document.createElement('td');
        countTd.className = 'p-2 border text-center';
        countTd.textContent = data.count;
        
        // 创建更新时间单元格
        const dateTd = document.createElement('td');
        dateTd.className = 'p-2 border text-center';
        dateTd.style.cssText = 'max-width: 0;';
        const dateDiv = document.createElement('div');
        dateDiv.style.cssText = 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
        dateDiv.title = new Date(data.lastUpdated).toLocaleString();
        dateDiv.textContent = new Date(data.lastUpdated).toLocaleString();
        dateTd.appendChild(dateDiv);
        
        // 创建操作按钮单元格
        const actionTd = document.createElement('td');
        actionTd.className = 'p-2 border text-center';
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-sm btn-danger';
        deleteButton.textContent = '删除';
        deleteButton.dataset.username = data.username;
        deleteButton.addEventListener('click', () => this.deleteUserData(data.username));
        actionTd.appendChild(deleteButton);
        
        // 添加所有单元格到行
        tr.appendChild(usernameTd);
        tr.appendChild(countTd);
        tr.appendChild(dateTd);
        tr.appendChild(actionTd);
        tbody.appendChild(tr);
      });
      
      table.appendChild(tbody);
      this.managePanel.innerHTML = '';
      this.managePanel.appendChild(table);
    }
  }

  async deleteUserData(username) {
    await chrome.storage.local.remove(`stars_${username}`);
    // 只更新管理面板的内容，而不是切换显示状态
    await this.updateManagePanelContent();
    if (username === getUsernameFromUrl()) {
      await this.updateStatus(); // 如果删除的是当前用户的数据，更新状态
    }
  }
}

// 在文件末尾添加事件监听器
document.addEventListener('deleteUserStars', async (event) => {
  const username = event.detail;
  const managers = document.querySelectorAll('.star-data-manager');
  managers.forEach(manager => {
    const dataManager = manager.__dataManager;
    if (dataManager) {
      dataManager.deleteUserData(username);
    }
  });
});

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
    searchBox.container.classList.add('star-seeker-search-box');
    
    const dataManager = new StarDataManager();
    // 保存实例引用以便事件处理
    dataManager.container.__dataManager = dataManager;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'star-seeker-container';
    wrapper.appendChild(dataManager.container);
    wrapper.appendChild(searchBox.container);
    
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
      // 将包装器插入到第一个区域的前面
      firstSection.parentElement.insertBefore(wrapper, firstSection);
      console.log('GitHub Stars AI Search: Components successfully inserted before Lists/Stars section');
    } else {
      // 如果找不到这些区域，就插入到主容器的开头
      mainContent.insertBefore(wrapper, mainContent.firstChild);
      console.log('GitHub Stars AI Search: Components inserted at the beginning of main content');
    }
  } catch (error) {
    console.error('GitHub Stars AI Search: Failed to insert components', {
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