const getBaseUrl = () => {
    // In Docker/Production, we should always use relative paths
    // so Nginx can proxy correctly regardless of the host/port.
    if (typeof window !== 'undefined') {
        return '/api';
    }
    return 'http://localhost:3000/api';
};

export const API_BASE_URL = getBaseUrl();
