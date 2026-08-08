import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    reactStrictMode: true, // causes double render on component mount (dev)
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'cdn.myanimelist.net' },
            { protocol: 'https', hostname: '**.myanimelist.net' },
            { protocol: 'https', hostname: 'meusanimes.blog' },
            { protocol: 'https', hostname: '**.meusanimes.blog' },
        ],
    },
}

export default nextConfig
