// Vercel Serverless Function — Cinema CORS 代理

function isM3u8(url, contentType) {
  return url.includes('.m3u8') ||
    (contentType && (contentType.includes('mpegurl') || contentType.includes('m3u8')));
}

function rewriteM3u8Urls(content, originalUrl) {
  const url = new URL(originalUrl);
  const basePath = originalUrl.substring(0, originalUrl.lastIndexOf('/') + 1);

  return content.split('\n').map(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        if (trimmed.startsWith('/')) {
          return `${url.protocol}//${url.host}${trimmed}`;
        }
        return `${basePath}${trimmed}`;
      }
    }
    if (trimmed.startsWith('#') && trimmed.includes('URI="')) {
      return line.replace(/URI="([^"]+)"/g, (match, uri) => {
        if (!uri.startsWith('http://') && !uri.startsWith('https://')) {
          if (uri.startsWith('/')) {
            return `URI="${url.protocol}//${url.host}${uri}"`;
          }
          return `URI="${basePath}${uri}"`;
        }
        return match;
      });
    }
    return line;
  }).join('\n');
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const decodedUrl = decodeURIComponent(targetUrl);

    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': decodedUrl.split('/').slice(0, 3).join('/'),
      },
    });

    const contentType = response.headers.get('content-type') || '';

    if (isM3u8(decodedUrl, contentType)) {
      const text = await response.text();
      const rewritten = rewriteM3u8Urls(text, decodedUrl);
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      return res.send(rewritten);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    return res.send(buffer);

  } catch (error) {
    return res.status(500).json({ error: 'Proxy request failed', message: error.message });
  }
};
