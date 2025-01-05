function getUsernameFromUrl() {
  const path = window.location.pathname;
  const matches = path.match(/^\/([^/]+)/);
  return matches ? matches[1] : null;
}

async function fetchAllStarredRepos() {
  const username = getUsernameFromUrl();
  if (!username) {
    throw new Error('Unable to get username');
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
    description: repo.description || ''  // Use empty string if description is null
  }));
}

function init() {
  // Check if on Stars page
  const isStarsPage = window.location.href.includes('?tab=stars') || 
                     window.location.href.endsWith('/stars');
  
  if (!isStarsPage) {
    return;
  }

  // Ensure SearchBox class is loaded
  if (typeof SearchBox === 'undefined') {
    console.error('GitHub Stars AI Search: SearchBox class is not loaded');
    return;
  }

  // Wait for DOM to be fully loaded
  setTimeout(() => {
    try {
      // First try to find search box container in profile page
      const searchContainer = document.querySelector('#user-profile-frame');
      if (searchContainer) {
        console.log('Found profile page container');
        // In profile page
        const titleContainer = searchContainer.querySelector('.col-lg-12');
        if (titleContainer) {
          console.log('Found title container in profile page');
          insertSearchBox(titleContainer);
          return;
        }
      }

      // If not in profile page, try other user page layout
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
    // Create a top container for title, status and buttons
    const headerContainer = document.createElement('div');
    headerContainer.className = 'mb-3';

    // Create a flex container for left side (title and status) and right side (button group)
    const topFlexContainer = document.createElement('div');
    topFlexContainer.className = 'd-flex justify-content-between align-items-start gap-3';

    // Left container: title and status
    const leftContainer = document.createElement('div');
    leftContainer.className = 'flex-1 min-width-0';

    // Title container
    const titleContainer = document.createElement('div');
    titleContainer.className = 'd-flex flex-items-center flex-wrap gap-2';
    titleContainer.innerHTML = `
      <h3 class="f4 color-fg-default mb-0">Star Seeker</h3>
      <span class="color-fg-muted">GitHub Star Management Assistant</span>
    `;
    leftContainer.appendChild(titleContainer);

    // Status display
    this.statusContainer = document.createElement('div');
    this.statusContainer.className = 'color-fg-muted text-small mt-1';
    leftContainer.appendChild(this.statusContainer);

    // Right side button group container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'd-flex flex-wrap gap-2 flex-shrink-0';
    
    // Sync data button
    this.syncButton = document.createElement('button');
    this.syncButton.className = 'btn btn-primary btn-sm px-2 py-0 d-flex flex-items-center';
    this.syncButton.style.height = '28px';
    this.syncButton.innerHTML = `
      <svg class="octicon" style="margin-right: 4px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14">
        <path fill="currentColor" d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z"></path>
      </svg>
      <span style="font-size: 12px">Sync Stars</span>
    `;
    this.syncButton.onclick = () => this.startFetching();
    
    // View data button
    this.viewButton = document.createElement('button');
    this.viewButton.className = 'btn btn-outline-primary btn-sm px-2 py-0 d-flex flex-items-center';
    this.viewButton.style.height = '28px';
    this.viewButton.innerHTML = `
      <svg class="octicon" style="margin-right: 4px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14">
        <path fill="currentColor" d="M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.677 1.367-1.931 2.637-3.022C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.825.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z"></path>
      </svg>
      <span style="font-size: 12px">View Data</span>
    `;
    this.viewButton.onclick = () => this.toggleDataView();

    // Manage cache button
    this.manageButton = document.createElement('button');
    this.manageButton.className = 'btn btn-outline-secondary btn-sm px-2 py-0 d-flex flex-items-center';
    this.manageButton.style.height = '28px';
    this.manageButton.innerHTML = `
      <svg class="octicon" style="margin-right: 4px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14">
        <path fill="currentColor" d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"></path>
      </svg>
      <span style="font-size: 12px">Manage Cache</span>
    `;
    this.manageButton.onclick = () => this.toggleManagePanel();
    
    buttonContainer.appendChild(this.syncButton);
    buttonContainer.appendChild(this.viewButton);
    buttonContainer.appendChild(this.manageButton);

    // 组装顶部容器
    topFlexContainer.appendChild(leftContainer);
    topFlexContainer.appendChild(buttonContainer);
    headerContainer.appendChild(topFlexContainer);

    // 搜索框容器
    this.searchContainer = document.createElement('div');
    this.searchContainer.className = 'mt-3';

    // 将所有组件添加到主容器
    this.container.appendChild(headerContainer);
    this.container.appendChild(this.searchContainer);

    // 数据展示面板
    this.dataPanel = document.createElement('div');
    this.dataPanel.className = 'data-panel color-bg-subtle rounded-2 p-3 border mt-3';
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
      this.statusContainer.textContent = 'Unable to get username';
      return;
    }

    if (this.dataPanel.style.display === 'none') {
      const data = await chrome.storage.local.get(`stars_${username}`);
      const userData = data[`stars_${username}`];
      
      if (!userData) {
        this.dataPanel.innerHTML = '<div class="color-fg-muted">No data available</div>';
      } else {
        // Create table view
        const table = document.createElement('table');
        table.className = 'width-full';
        table.style.cssText = `
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
        `;
        
        // Table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
          <tr class="color-bg-subtle">
            <th class="p-2 border" style="width: 60px">Index</th>
            <th class="p-2 border" style="width: 35%">Repository</th>
            <th class="p-2 border">Description</th>
          </tr>
        `;
        table.appendChild(thead);
        
        // Table body
        const tbody = document.createElement('tbody');
        userData.repos.forEach((repo, index) => {
          const tr = document.createElement('tr');
          tr.className = index % 2 === 0 ? 'color-bg-default' : 'color-bg-subtle';
          
          // Create table cells using template literals with text overflow control styles
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
                   title="${repo.description || 'No description'}">
                ${repo.description || 'No description'}
              </div>
            </td>
          `;
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        
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
      this.viewButton.innerHTML = `
        <svg class="octicon" style="margin-right: 4px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14">
          <path fill="currentColor" d="M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.677 1.367-1.931 2.637-3.022C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.825.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z"></path>
        </svg>
        <span style="font-size: 12px">Hide Data</span>
      `;
      this.viewButton.className = 'btn btn-outline-primary btn-sm selected';
    } else {
      this.dataPanel.style.display = 'none';
      this.viewButton.innerHTML = `
        <svg class="octicon" style="margin-right: 4px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14">
          <path fill="currentColor" d="M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.677 1.367-1.931 2.637-3.022C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.825.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z"></path>
        </svg>
        <span style="font-size: 12px">View Data</span>
      `;
      this.viewButton.className = 'btn btn-outline-primary btn-sm';
    }
  }

  async startFetching() {
    this.syncButton.disabled = true;
    this.statusContainer.textContent = 'Syncing data...';
    
    try {
      const username = getUsernameFromUrl();
      if (!username) {
        throw new Error('Unable to get username');
      }

      const repos = await fetchAllStarredRepos();
      
      // Save to local storage
      const data = {
        username,
        repos,
        lastUpdated: new Date().toISOString()
      };
      
      await chrome.storage.local.set({ [`stars_${username}`]: data });
      this.updateStatus();
    } catch (error) {
      console.error('Failed to fetch stars:', error);
      this.statusContainer.textContent = 'Failed to sync stars: ' + error.message;
    } finally {
      this.syncButton.disabled = false;
    }
  }

  async refreshData() {
    await this.startFetching();
  }

  async deleteData() {
    const username = getUsernameFromUrl();
    if (!username) {
      this.statusContainer.textContent = 'Unable to get username';
      return;
    }
    await chrome.storage.local.remove(`stars_${username}`);
    this.updateStatus();
  }

  async updateStatus() {
    const username = getUsernameFromUrl();
    if (!username) {
      this.statusContainer.textContent = 'Unable to get username';
      this.viewButton.disabled = true;
      return;
    }

    const data = await chrome.storage.local.get(`stars_${username}`);
    const userData = data[`stars_${username}`];
    
    if (userData) {
      const lastUpdated = new Date(userData.lastUpdated).toLocaleString();
      this.statusContainer.innerHTML = `
        <div class="text-small color-fg-muted">
          Cached ${userData.repos.length} stars
          <br>
          Last updated: ${lastUpdated}
        </div>
      `;
      this.viewButton.disabled = false;
    } else {
      this.statusContainer.textContent = 'No stars cached';
      this.viewButton.disabled = true;
      if (this.dataPanel.style.display !== 'none') {
        this.toggleDataView();
      }
    }
  }

  async toggleManagePanel() {
    // If data panel is open, first close it
    if (this.dataPanel.style.display !== 'none') {
      this.dataPanel.style.display = 'none';
      this.viewButton.textContent = 'View Data';
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
      this.managePanel.innerHTML = '<div class="color-fg-muted text-center">No cached data</div>';
    } else {
      const table = document.createElement('table');
      table.className = 'width-full';
      table.style.cssText = `
        border-collapse: collapse;
        table-layout: fixed;
        width: 100%;
      `;

      // Create table header
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr class="color-bg-subtle">
          <th class="p-2 border text-center" style="width: 30%">Username</th>
          <th class="p-2 border text-center" style="width: 20%">Star Count</th>
          <th class="p-2 border text-center" style="width: 35%">Last Updated</th>
          <th class="p-2 border text-center" style="width: 15%">Action</th>
        </tr>
      `;
      table.appendChild(thead);

      // Create table body
      const tbody = document.createElement('tbody');
      starData.forEach((data, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'color-bg-default' : 'color-bg-subtle';
        
        // Create username cell
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
        
        // Create count cell
        const countTd = document.createElement('td');
        countTd.className = 'p-2 border text-center';
        countTd.textContent = data.count;
        
        // Create update time cell
        const dateTd = document.createElement('td');
        dateTd.className = 'p-2 border text-center';
        dateTd.style.cssText = 'max-width: 0;';
        const dateDiv = document.createElement('div');
        dateDiv.style.cssText = 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
        dateDiv.title = new Date(data.lastUpdated).toLocaleString();
        dateDiv.textContent = new Date(data.lastUpdated).toLocaleString();
        dateTd.appendChild(dateDiv);
        
        // Create action button cell
        const actionTd = document.createElement('td');
        actionTd.className = 'p-2 border text-center';
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-sm btn-danger';
        deleteButton.textContent = 'Delete';
        deleteButton.dataset.username = data.username;
        deleteButton.addEventListener('click', () => this.deleteUserData(data.username));
        actionTd.appendChild(deleteButton);
        
        // Add all cells to the row
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
    // Only update the manage panel content, not the display state
    await this.updateManagePanelContent();
    if (username === getUsernameFromUrl()) {
      await this.updateStatus(); // If the deleted data is for the current user, update status
    }
  }
}

// Add event listener at the end of the file
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
  // Use a unique class name to check if our search box already exists
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
    // Save instance reference for event handling
    dataManager.container.__dataManager = dataManager;
    
    // Add search box to search container of data manager
    dataManager.searchContainer.appendChild(searchBox.container);
    
    // Create a container to wrap all components
    const wrapper = document.createElement('div');
    wrapper.className = 'star-seeker-container';
    wrapper.appendChild(dataManager.container);
    
    // Find Lists and Stars common parent container
    const mainContent = document.querySelector('#user-profile-frame');
    if (!mainContent) {
      console.log('Could not find main content container');
      return;
    }

    // Find all h2 headings
    const headings = mainContent.querySelectorAll('h2[data-view-component="true"]');
    let firstSection = null;

    // Loop through headings to find Lists or Stars
    for (const heading of headings) {
      if (heading.textContent.trim() === 'Lists' || heading.textContent.trim() === 'Stars') {
        firstSection = heading;
        break;
      }
    }
    
    if (firstSection) {
      // Insert wrapper before first section
      firstSection.parentElement.insertBefore(wrapper, firstSection);
      console.log('GitHub Stars AI Search: Components successfully inserted before Lists/Stars section');
    } else {
      // If no Lists or Stars sections, insert at the beginning of main content
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

// Initialize when document is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Listen for Turbo navigation events
document.addEventListener('turbo:load', init);

// Also listen for PJAX events for backward compatibility
document.addEventListener('pjax:complete', init);

// Listen for URL changes
let lastUrl = location.href; 
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    init();
  }
}).observe(document, { subtree: true, childList: true }); 