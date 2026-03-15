const Config = {
  PROXY_URL: (() => {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1")
      return "http://localhost:3001/proxy";
    if (host.includes("vercel.app")) return "/api/proxy";
    return "https://cinema-proxy.xwwcyber.workers.dev/proxy";
  })(),
  STORAGE_KEYS: {
    SOURCES: "cinema_sources",
    CURRENT_SOURCE: "cinema_current_source",
    FAVORITES: "cinema_favorites",
    HISTORY: "cinema_history",
  },
  DEFAULT_SOURCES: [
    {
      id: "source_1",
      name: "默认",
      url: "https://api.apibdzy.com/api.php/provide/vod/",
      enabled: true,
    },
    {
      id: "source_2",
      name: "闪电资源",
      url: "http://sdzyapi.com/api.php/provide/vod/",
      enabled: true,
    },
    {
      id: "source_3",
      name: "量子资源",
      url: "https://cj.lziapi.com/api.php/provide/vod/",
      enabled: true,
    },
    {
      id: "source_4",
      name: "百度资源",
      url: "https://bdzy1.com/api.php/provide/vod/",
      enabled: true,
    },
    {
      id: "source_5",
      name: "极速资源",
      url: "https://jszyapi.com/api.php/provide/vod/",
      enabled: true,
    },
    {
      id: "source_6",
      name: "新浪资源",
      url: "https://api.xinlangapi.com/xinlangapi.php/provide/vod/",
      enabled: true,
    },
    {
      id: "source_7",
      name: "红牛资源",
      url: "https://www.hongniuzy2.com/api.php/provide/vod/",
      enabled: true,
    },
  ],
  REQUEST_TIMEOUT: 30000,
  CACHE_DURATION: 5 * 60 * 1000,
  POSTER_CACHE: new Map(),
  DETAIL_CACHE: new Map(),
};

const Storage = {
  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error("Storage get error:", e);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error("Storage set error:", e);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error("Storage remove error:", e);
      return false;
    }
  },
};

const SourceManager = {
  getSources() {
    const sources = Storage.get(Config.STORAGE_KEYS.SOURCES);
    if (!sources || sources.length === 0) {
      Storage.set(Config.STORAGE_KEYS.SOURCES, Config.DEFAULT_SOURCES);
      return Config.DEFAULT_SOURCES;
    }
    return sources;
  },

  getCurrentSource() {
    const currentId = Storage.get(Config.STORAGE_KEYS.CURRENT_SOURCE);
    const sources = this.getSources();
    if (currentId) {
      const source = sources.find((s) => s.id === currentId);
      if (source) return source;
    }
    return sources.find((s) => s.enabled) || sources[0];
  },

  setCurrentSource(sourceId) {
    Storage.set(Config.STORAGE_KEYS.CURRENT_SOURCE, sourceId);
  },

  addSource(source) {
    const sources = this.getSources();
    const newSource = {
      id: "source_" + Date.now(),
      name: source.name,
      url: source.url,
      enabled: true,
    };
    sources.push(newSource);
    Storage.set(Config.STORAGE_KEYS.SOURCES, sources);
    return newSource;
  },

  updateSource(sourceId, data) {
    const sources = this.getSources();
    const index = sources.findIndex((s) => s.id === sourceId);
    if (index !== -1) {
      sources[index] = { ...sources[index], ...data };
      Storage.set(Config.STORAGE_KEYS.SOURCES, sources);
      return sources[index];
    }
    return null;
  },

  deleteSource(sourceId) {
    const sources = this.getSources();
    const filtered = sources.filter((s) => s.id !== sourceId);
    if (filtered.length === 0) {
      return false;
    }
    Storage.set(Config.STORAGE_KEYS.SOURCES, filtered);

    const currentSource = this.getCurrentSource();
    if (currentSource && currentSource.id === sourceId) {
      this.setCurrentSource(filtered[0].id);
    }
    return true;
  },
};
