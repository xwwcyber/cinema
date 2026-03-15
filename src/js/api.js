const API = {
  async fetchWithProxy(url, params = {}) {
    const fullUrl = this.buildUrl(url, params);
    const proxyUrl = `${Config.PROXY_URL}?url=${encodeURIComponent(fullUrl)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      Config.REQUEST_TIMEOUT,
    );

    try {
      const response = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("请求超时，请检查网络连接");
      }
      throw error;
    }
  },

  buildUrl(baseUrl, params) {
    const url = new URL(baseUrl);
    Object.keys(params).forEach((key) => {
      url.searchParams.append(key, params[key]);
    });
    return url.toString();
  },

  async getVideoList(options = {}) {
    const source = SourceManager.getCurrentSource();
    if (!source) {
      throw new Error("请先配置数据源");
    }

    const params = { ac: "list" };
    if (options.page) params.pg = options.page;
    if (options.type) params.t = options.type;
    if (options.keyword) params.wd = options.keyword;

    const data = await this.fetchWithProxy(source.url, params);

    if (typeof data === "string" && data.includes("暂不支持搜索")) {
      throw new Error("当前数据源不支持搜索功能，请切换其他数据源");
    }

    return this.normalizeListData(data);
  },

  async getVideoDetail(videoId) {
    const cacheKey = `detail_${videoId}`;
    const cached = Config.DETAIL_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < Config.CACHE_DURATION) {
      return cached.data;
    }

    const source = SourceManager.getCurrentSource();
    const data = await this.fetchWithProxy(source.url, {
      ac: "detail",
      ids: videoId,
    });

    const normalized = this.normalizeDetailData(data);

    if (normalized && normalized.length > 0) {
      Config.DETAIL_CACHE.set(cacheKey, {
        data: normalized[0],
        timestamp: Date.now(),
      });
      return normalized[0];
    }

    return null;
  },

  async getPosterWithCache(videoId) {
    const cacheKey = `poster_${videoId}`;
    const cached = Config.POSTER_CACHE.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const detail = await this.getVideoDetail(videoId);
      if (detail && detail.vod_pic) {
        Config.POSTER_CACHE.set(cacheKey, detail.vod_pic);
        return detail.vod_pic;
      }
    } catch (e) {
      console.error("Failed to fetch poster:", e);
    }
    return null;
  },

  normalizeListData(data) {
    if (!data || data.code !== 1) {
      return {
        list: [],
        page: 1,
        pagecount: 1,
        total: 0,
        class: [],
      };
    }

    return {
      list: (data.list || []).map((item) => ({
        vod_id: item.vod_id,
        vod_name: item.vod_name,
        type_id: item.type_id,
        type_name: item.type_name,
        vod_time: item.vod_time,
        vod_remarks: item.vod_remarks,
        vod_play_from: item.vod_play_from,
      })),
      page: data.page || 1,
      pagecount: data.pagecount || 1,
      total: data.total || 0,
      class: data.class || [],
    };
  },

  normalizeDetailData(data) {
    if (!data || !data.list || data.code !== 1) {
      return [];
    }

    return data.list.map((item) => ({
      vod_id: item.vod_id,
      vod_name: item.vod_name,
      type_id: item.type_id,
      type_name: item.type_name,
      vod_pic: item.vod_pic,
      vod_content: item.vod_content,
      vod_actor: item.vod_actor,
      vod_director: item.vod_director,
      vod_time: item.vod_time,
      vod_remarks: item.vod_remarks,
      vod_play_from: item.vod_play_from,
      vod_play_url: item.vod_play_url,
      playSources: this.parsePlaySources(item.vod_play_from, item.vod_play_url),
    }));
  },

  parsePlaySources(playFrom, playUrl) {
    if (!playFrom || !playUrl) {
      return [];
    }

    const fromNames = playFrom.split("$$$");
    const urlParts = playUrl.split("$$$");

    const sources = [];

    for (let i = 0; i < Math.min(fromNames.length, urlParts.length); i++) {
      const name = fromNames[i].trim();
      const episodes = this.parseEpisodes(urlParts[i]);

      const isM3u8 =
        name.toLowerCase().includes("m3u8") ||
        episodes.some((ep) => ep.url.includes(".m3u8"));

      sources.push({
        name: name,
        episodes: episodes,
        isM3u8: isM3u8,
        priority: isM3u8 ? 1 : 0,
      });
    }

    return sources.sort((a, b) => b.priority - a.priority);
  },

  parseEpisodes(episodesStr) {
    if (!episodesStr) return [];

    const episodes = [];
    const parts = episodesStr.split("#");

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const dollarIndex = trimmed.indexOf("$");
      if (dollarIndex !== -1) {
        const name = trimmed.substring(0, dollarIndex).trim();
        const url = trimmed.substring(dollarIndex + 1).trim();
        if (url) {
          episodes.push({ name, url });
        }
      }
    }

    return episodes;
  },
};
