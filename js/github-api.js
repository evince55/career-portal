class GitHubAPI {
  constructor() {
    this.baseUrl = 'https://api.github.com';
    this.user = 'chaitea321';
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }
  
  async fetchProjects(filter = '') {
    const cacheKey = `projects_${filter}`;
    
    if (this.cache.has(cacheKey)) {
      const { data, timestamp } = this.cache.get(cacheKey);
      if (Date.now() - timestamp < this.cacheExpiry) {
        return data;
      }
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/users/${this.user}/repos?sort=updated&direction=desc`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const repos = await response.json();
      
      const filtered = filter
        ? repos.filter((repo) =>
            repo.name.toLowerCase().includes(filter.toLowerCase()) ||
            repo.description?.toLowerCase().includes(filter.toLowerCase())
          )
        : repos;
      
      const projects = filtered.map(repo => ({
        name: repo.name,
        description: repo.description || 'No description available',
        link: repo.html_url,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language || 'Unknown',
        updated: new Date(repo.updated_at).toLocaleDateString()
      }));
      
      this.cache.set(cacheKey, { data: projects, timestamp: Date.now() });
      
      return projects;
    } catch (error) {
      console.error('GitHub API fetch error:', error);
      return this.getMockData();
    }
  }
  
  async fetchUserStats() {
    try {
      const response = await fetch(`${this.baseUrl}/users/${this.user}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        name: data.name || 'Chaitanya Kumar',
        company: data.company || 'Freelance',
        location: data.location || 'Aurora, IL',
        blog: data.blog || 'chai-homelab.com',
        followers: data.followers,
        following: data.following,
        publicRepos: data.public_repos,
        avatar: data.avatar_url
      };
    } catch (error) {
      console.error('GitHub user stats error:', error);
      return this.getMockStats();
    }
  }
  
  async fetchContributions() {
    try {
      const response = await fetch(
        `${this.baseUrl}/users/${this.user}/contributions?color=8b5cf6&period=365`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        totalContributions: data.reduce((sum, day) => sum + day.count, 0),
        days: data.length
      };
    } catch (error) {
      console.error('Contributions fetch error:', error);
      return { totalContributions: 250, days: 180 };
    }
  }
  
  getMockData() {
    return [
      {
        name: 'CS211',
        description: 'Full-stack course management system with real-time updates',
        link: 'https://github.com/chaitea321/CS211',
        stars: 12,
        forks: 3,
        language: 'TypeScript',
        updated: '2024-05-15'
      },
      {
        name: 'minecraft-monitoring',
        description: 'Istio service mesh observability platform for Minecraft servers',
        link: 'https://github.com/chaitea321/minecraft-monitoring',
        stars: 28,
        forks: 7,
        language: 'YAML',
        updated: '2024-06-04'
      }
    ];
  }
  
  getMockStats() {
    return {
      name: 'Chaitanya Kumar',
      company: 'Freelance',
      location: 'Aurora, IL',
      blog: 'chai-homelab.com',
      followers: 15,
      following: 8,
      publicRepos: 2,
      avatar: 'https://github.com/chaitea321.png'
    };
  }
  
  clearCache() {
    this.cache.clear();
  }
}

export default GitHubAPI;
