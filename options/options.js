document.addEventListener('DOMContentLoaded', () => {
  // Load saved API key
  chrome.storage.sync.get(['geminiApiKey'], (result) => {
    document.getElementById('apiKey').value = result.geminiApiKey || '';
  });

  // Save API key
  document.getElementById('save').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value;
    chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
      const status = document.getElementById('status');
      status.textContent = 'Settings saved successfully!';
      status.className = 'status success';
      setTimeout(() => {
        status.textContent = '';
        status.className = 'status';
      }, 3000);
    });
  });
}); 