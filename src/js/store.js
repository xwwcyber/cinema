const HISTORY_LIMIT = 50;

const HistoryManager = {
  getAll() {
    const list = Storage.get(Config.STORAGE_KEYS.HISTORY) || [];
    return list.sort((a, b) => b.timestamp - a.timestamp);
  },

  add(video) {
    const list = Storage.get(Config.STORAGE_KEYS.HISTORY) || [];
    const idx = list.findIndex((v) => v.videoId === video.videoId);
    if (idx !== -1) list.splice(idx, 1);

    list.unshift({
      videoId: video.videoId,
      name: video.name,
      pic: video.pic || "",
      lastEp: video.lastEp || "",
      sourceName: video.sourceName || "",
      timestamp: Date.now(),
    });

    if (list.length > HISTORY_LIMIT) list.length = HISTORY_LIMIT;
    Storage.set(Config.STORAGE_KEYS.HISTORY, list);
  },

  remove(videoId) {
    const list = Storage.get(Config.STORAGE_KEYS.HISTORY) || [];
    Storage.set(
      Config.STORAGE_KEYS.HISTORY,
      list.filter((v) => v.videoId !== videoId),
    );
  },

  clear() {
    Storage.set(Config.STORAGE_KEYS.HISTORY, []);
  },
};

const FavoriteManager = {
  getAll() {
    return Storage.get(Config.STORAGE_KEYS.FAVORITES) || [];
  },

  add(video) {
    const list = this.getAll();
    if (list.some((v) => v.videoId === video.videoId)) return;

    list.unshift({
      videoId: video.videoId,
      name: video.name,
      pic: video.pic || "",
      timestamp: Date.now(),
    });
    Storage.set(Config.STORAGE_KEYS.FAVORITES, list);
  },

  remove(videoId) {
    const list = this.getAll();
    Storage.set(
      Config.STORAGE_KEYS.FAVORITES,
      list.filter((v) => v.videoId !== videoId),
    );
  },

  isFavorite(videoId) {
    return this.getAll().some((v) => v.videoId === videoId);
  },

  toggle(video) {
    if (this.isFavorite(video.videoId)) {
      this.remove(video.videoId);
      return false;
    }
    this.add(video);
    return true;
  },
};
