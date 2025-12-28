const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
        const { hostname } = window.location;

        // If localhost, always use 3000 for direct dev access
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000/api';
        }

        // Use relative path for domain access
        // This works with Vite proxy and Nginx reverse proxy
        return '/api';
    }
    return 'http://localhost:3000/api';
};

export const API_BASE_URL = getBaseUrl();
