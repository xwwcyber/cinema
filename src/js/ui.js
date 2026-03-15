const UI = {
  showLoading(message = "加载中...") {
    let overlay = document.getElementById("loading-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "loading-overlay";
      overlay.className = "loading-overlay";
      overlay.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-text">${message}</div>
            `;
      document.body.appendChild(overlay);
    }
    overlay.querySelector(".loading-text").textContent = message;
    overlay.classList.add("active");
  },

  hideLoading() {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
      overlay.classList.remove("active");
    }
  },

  showToast(message, type = "info") {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  },

  showModal(options) {
    const { title, content, onClose } = options;

    let overlay = document.getElementById("modal-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "modal-overlay";
      overlay.className = "modal-overlay";
      overlay.innerHTML = `
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body"></div>
                </div>
            `;
      document.body.appendChild(overlay);
    }

    overlay.querySelector(".modal-title").textContent = title;
    overlay.querySelector(".modal-body").innerHTML = content;

    const closeBtn = overlay.querySelector(".modal-close");
    const closeModal = () => {
      overlay.classList.remove("active");
      if (onClose) onClose();
    };

    closeBtn.onclick = closeModal;
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };

    overlay.classList.add("active");
    return overlay;
  },

  hideModal() {
    const overlay = document.getElementById("modal-overlay");
    if (overlay) {
      overlay.classList.remove("active");
    }
    const sourceModal = document.getElementById("source-modal");
    if (sourceModal) {
      sourceModal.classList.remove("active");
    }
  },

  showSourceModal() {
    const modal = document.getElementById("source-modal");
    if (modal) {
      modal.classList.add("active");
      if (typeof App !== "undefined" && App.renderSourceList) {
        App.renderSourceList();
      }
    }
  },

  renderVideoCard(video) {
    const tags =
      typeof extractTags === "function"
        ? extractTags(video)
        : [video.type_name];
    const tagsHtml = tags
      .map((tag) => `<span class="video-tag">${tag}</span>`)
      .join("");

    return `
            <div class="video-card fade-in" data-id="${video.vod_id}" onclick="App.goToDetail(${video.vod_id})">
                <div class="video-poster">
                    <div class="video-poster-placeholder" id="poster-${video.vod_id}">
                        <span>🎬</span>
                    </div>
                    ${video.vod_remarks ? `<span class="video-badge">${video.vod_remarks}</span>` : ""}
                </div>
                <div class="video-info">
                    <h3 class="video-name">${video.vod_name}</h3>
                    <div class="video-tags">${tagsHtml}</div>
                </div>
            </div>
        `;
  },

  renderVideoGrid(videos) {
    if (!videos || videos.length === 0) {
      return `
                <div class="empty-state">
                    <div class="empty-icon">🎬</div>
                    <h3 class="empty-title">暂无数据</h3>
                    <p class="empty-desc">请检查数据源配置或尝试其他分类</p>
                </div>
            `;
    }

    return `<div class="video-grid">${videos.map((v) => this.renderVideoCard(v)).join("")}</div>`;
  },

  renderPagination(currentPage, totalPages, onPageChange) {
    if (totalPages <= 1) return "";

    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    pages.push(`
            <button class="page-btn" onclick="${onPageChange}(${currentPage - 1})" ${currentPage <= 1 ? "disabled" : ""}>
                上一页
            </button>
        `);

    if (startPage > 1) {
      pages.push(
        `<button class="page-btn" onclick="${onPageChange}(1)">1</button>`,
      );
      if (startPage > 2) {
        pages.push(`<span class="page-info">...</span>`);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(`
                <button class="page-btn ${i === currentPage ? "active" : ""}" onclick="${onPageChange}(${i})">
                    ${i}
                </button>
            `);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(`<span class="page-info">...</span>`);
      }
      pages.push(
        `<button class="page-btn" onclick="${onPageChange}(${totalPages})">${totalPages}</button>`,
      );
    }

    pages.push(`
            <button class="page-btn" onclick="${onPageChange}(${currentPage + 1})" ${currentPage >= totalPages ? "disabled" : ""}>
                下一页
            </button>
        `);

    return `<div class="pagination">${pages.join("")}</div>`;
  },

  renderCategoryNav(categories, currentCategory, onChange) {
    const items = [
      { type_id: 0, type_name: "全部", active: currentCategory === 0 },
    ];

    categories.forEach((cat) => {
      items.push({
        type_id: cat.type_id,
        type_name: cat.type_name,
        active: currentCategory === cat.type_id,
      });
    });

    return items
      .map(
        (item) => `
            <button class="category-item ${item.active ? "active" : ""}" 
                    onclick="${onChange}(${item.type_id})">
                ${item.type_name}
            </button>
        `,
      )
      .join("");
  },

  renderSourceList(sources, currentSourceId) {
    if (!sources || sources.length === 0) {
      return `
                <div class="empty-state">
                    <p class="empty-desc">暂无数据源，请添加</p>
                </div>
            `;
    }

    return sources
      .map(
        (source) => `
            <div class="source-item ${source.id === currentSourceId ? "active" : ""}" data-id="${source.id}" ondblclick="App.switchSource('${source.id}')">
                <div class="source-info">
                    <div class="source-name">${source.name}</div>
                    <div class="source-url">${source.url}</div>
                </div>
                <div class="source-actions">
                    <button class="icon-btn" onclick="App.switchSource('${source.id}')" title="选择">
                        ✓
                    </button>
                    <button class="icon-btn danger" onclick="App.deleteSource('${source.id}')" title="删除">
                        ✕
                    </button>
                </div>
            </div>
        `,
      )
      .join("");
  },

  async loadPostersAsync(videos) {
    for (const video of videos) {
      try {
        const poster = await API.getPosterWithCache(video.vod_id);
        const posterEl = document.getElementById(`poster-${video.vod_id}`);
        if (posterEl && poster) {
          posterEl.innerHTML = `<img src="${poster}" alt="${video.vod_name}" loading="lazy">`;
        }
      } catch (e) {
        console.error(`Failed to load poster for ${video.vod_id}:`, e);
      }
    }
  },

  updateSourceSelector() {
    const currentSource = SourceManager.getCurrentSource();
    const selector = document.querySelector(".source-selector-btn");
    if (selector && currentSource) {
      selector.innerHTML = `
                <span class="source-indicator"></span>
                <span>${currentSource.name}</span>
                <span>▼</span>
            `;
    }
  },
};
