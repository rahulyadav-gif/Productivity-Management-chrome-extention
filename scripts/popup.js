document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup loaded');
  
  // Initialize elements
  const loginSection = document.getElementById('login-section');
  const mainContent = document.getElementById('main-content');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const startFocusBtn = document.getElementById('start-focus');
  const viewReportsBtn = document.getElementById('view-reports');

  if (!loginSection || !mainContent || !loginForm || !loginError || !startFocusBtn || !viewReportsBtn) {
    console.error('Required elements not found');
    return;
  }

  // Check if user is logged in
  chrome.storage.local.get('token', function(data) {
    console.log('Token check:', data.token ? 'Found' : 'Not found');
    if (data.token) {
      // User is logged in, show main content
      loginSection.style.display = 'none';
      mainContent.style.display = 'block';
      updateProductivityStats();
      updateTopSites();
    } else {
      // Show login form
      loginSection.style.display = 'block';
      mainContent.style.display = 'none';
    }
  });

  // Login form submission
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    loginError.textContent = ''; // Clear previous errors

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          email: email.trim(), 
          password: password.trim() 
        }),
        credentials: 'include'
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (!data.token) {
        throw new Error('Invalid server response: no token received');
      }

      // Store token and update UI
      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ token: data.token }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });

      loginSection.style.display = 'none';
      mainContent.style.display = 'block';
      await updateProductivityStats();
      await updateTopSites();
    } catch (error) {
      console.error('Login error:', error);
      loginError.textContent = error.message || 'Connection failed. Please try again.';
      loginError.style.display = 'block';
    }
  });

  // Event listeners
  startFocusBtn.addEventListener('click', toggleFocusMode);
  viewReportsBtn.addEventListener('click', openReports);
});

async function updateProductivityStats() {
  try {
    const stats = await getProductivityStats();
    document.getElementById('productivity-score').innerHTML = `
      <h3>Productivity Score</h3>
      <div class="score">${stats.score}%</div>
    `;
    document.getElementById('time-tracked').innerHTML = `
      <h3>Time Tracked</h3>
      <div class="time">${stats.timeTracked}</div>
    `;
  } catch (error) {
    console.error('Error fetching productivity stats:', error);
    document.getElementById('error-message').textContent = 'Failed to load productivity stats';
  }
}

async function updateTopSites() {
  try {
    const sites = await getTopSites();
    const topSitesList = document.getElementById('top-sites');
    topSitesList.innerHTML = sites.map(site => `
      <li>
        <span class="site-name">${site.domain}</span>
        <span class="site-time">${site.timeSpent}</span>
      </li>
    `).join('');
  } catch (error) {
    console.error('Error fetching top sites:', error);
  }
}

async function getProductivityStats() {
  try {
    const token = await new Promise((resolve) => {
      chrome.storage.local.get('token', (data) => resolve(data.token));
    });
    
    if (!token) {
      throw new Error('Not authenticated');
    }
    
    const response = await fetch('http://localhost:5000/api/activity/today', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }
    
    const data = await response.json();
    return {
      score: Math.round(data.productivityScore || 0),
      timeTracked: formatTime(data.activities?.reduce((sum, a) => sum + (a.timeSpent || 0), 0) || 0)
    };
  } catch (error) {
    console.error('Stats error:', error);
    throw error;
  }
}

async function getTopSites() {
  try {
    const token = await new Promise(resolve => {
      chrome.storage.local.get('token', data => resolve(data.token));
    });
    
    if (!token) {
      throw new Error('Not logged in');
    }
    
    const response = await fetch('http://localhost:5000/api/activity/today', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch top sites');
    }
    
    const data = await response.json();
    return (data.activities || [])
      .sort((a, b) => (b.timeSpent || 0) - (a.timeSpent || 0))
      .slice(0, 3)
      .map(activity => ({
        domain: activity.domain || 'Unknown',
        timeSpent: formatTime(activity.timeSpent || 0)
      }));
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function toggleFocusMode() {
  // TODO: Implement focus mode toggle
  console.log('Focus mode toggled');
}

function openReports() {
  chrome.tabs.create({ url: 'reports.html' });
}