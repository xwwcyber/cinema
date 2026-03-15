// Cloudflare Worker — Cinema CORS 代理
// 使用方法：在 Cloudflare Dashboard 创建 Worker，粘贴此代码并部署

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function handleRequest(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/health') {
    return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (path === '/proxy') {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'URL parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
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
        return new Response(rewritten, {
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            ...corsHeaders,
          },
        });
      }

      const body = await response.arrayBuffer();
      return new Response(body, {
        headers: {
          'Content-Type': contentType || 'application/octet-stream',
          ...corsHeaders,
        },
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: 'Proxy request failed', message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  }

  return new Response('Cinema CORS Proxy Worker is running. Use /proxy?url=TARGET_URL', {
    headers: { 'Content-Type': 'text/plain', ...corsHeaders },
  });
}
