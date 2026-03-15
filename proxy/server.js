const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function isM3u8(url, contentType) {
    return url.includes('.m3u8') ||
        (contentType && (contentType.includes('mpegurl') || contentType.includes('m3u8')));
}

function rewriteM3u8Urls(content, originalUrl) {
    const url = new URL(originalUrl);
    const basePath = originalUrl.substring(0, originalUrl.lastIndexOf('/') + 1);

    return content.split('\n').map(line => {
        const trimmed = line.trim();
        // URL 行（非注释、非空行）→ 转为绝对路径
        if (trimmed && !trimmed.startsWith('#')) {
            if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
                if (trimmed.startsWith('/')) {
                    return `${url.protocol}//${url.host}${trimmed}`;
                }
                return `${basePath}${trimmed}`;
            }
        }
        // 处理 #EXT-X-KEY 等标签中的 URI="" 属性
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

app.get('/proxy', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        const decodedUrl = decodeURIComponent(url);
        console.log(`[Proxy] Fetching: ${decodedUrl}`);

        const response = await fetch(decodedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Referer': decodedUrl.split('/').slice(0, 3).join('/')
            },
            timeout: 15000
        });

        const contentType = response.headers.get('content-type') || '';

        if (isM3u8(decodedUrl, contentType)) {
            // m3u8 内容：将相对路径重写为绝对路径
            const text = await response.text();
            const rewritten = rewriteM3u8Urls(text, decodedUrl);
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.send(rewritten);
        } else {
            res.setHeader('Content-Type', contentType || 'application/octet-stream');
            const buffer = await response.buffer();
            res.send(buffer);
        }

    } catch (error) {
        console.error(`[Proxy Error] ${error.message}`);
        res.status(500).json({
            error: 'Proxy request failed',
            message: error.message
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  Cinema CORS Proxy Server`);
    console.log(`  Running on: http://localhost:${PORT}`);
    console.log(`  Health check: http://localhost:${PORT}/health`);
    console.log(`========================================\n`);
});
