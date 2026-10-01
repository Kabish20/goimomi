import axios from "axios";

const api = axios.create({
    baseURL: ""
});

const publicForms = new Set([
    'global-horizons-srilanka',
    'business-journey-registrations', 'businessjourneyregistrations',
    'chithirai-registrations', 'chithirairegistrations', 'chithirai-enquiries',
    'chithiraienquiries', 'canton-enquiries', 'cantonenquiries',
    'enquiry-form', 'enquiryform', 'holiday-form', 'holidayform', 'umrah-form', 'umrahform',
]);
const publicReads = new Set([
    'cities', 'pickup-point-masters', 'airports', 'countries', 'nationalities',
    'regions', 'destinations', 'visas', 'packages', 'cruisecalendar', 'cruise-calendar',
    'goimomiproducts', 'goimomi-products',
]);

const isPublicRequest = (config) => {
    if (config.skipAuth) return true;
    const path = (config.url || '').split('?')[0];
    if (['/api/token/', '/api/token/refresh/', '/api/adminlogin/', '/api/admin-login/'].includes(path)) return true;
    const match = path.match(/^\/api\/([^/]+)\/(.*)$/);
    if (!match) return false;
    const method = (config.method || 'get').toLowerCase();
    // Administrative catalogue requests must retain their credentials.
    const params = new URLSearchParams((config.url || '').split('?')[1] || '');
    const all = config.params?.all ?? params.get('all');
    if (String(all).toLowerCase() === 'true') return false;
    return (method === 'post' && !match[2] && publicForms.has(match[1])) ||
        (['get', 'head', 'options'].includes(method) && publicReads.has(match[1]) &&
            (!match[2] || /^\d+\/$/.test(match[2])));
};

export const clearAuthTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('adminUser');
    delete api.defaults.headers.common.Authorization;
};

let refreshPromise = null;

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (!isPublicRequest(config) && token && token !== 'undefined' && token !== 'null') {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            // Axios merges default headers before interceptors run.
            delete config.headers.Authorization;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Prevent infinite loops if refresh or token endpoint itself fails
        if (!originalRequest || isPublicRequest(originalRequest)) {
            return Promise.reject(error);
        }

        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refreshToken');
            try {
                if (refreshToken && refreshToken !== 'undefined' && refreshToken !== 'null') {
                    if (!refreshPromise) {
                        refreshPromise = axios.post('/api/token/refresh/', { refresh: refreshToken })
                            .then((response) => {
                                if (!response.data.access || localStorage.getItem('refreshToken') !== refreshToken) {
                                    throw new Error('Session changed while refreshing credentials.');
                                }
                                localStorage.setItem('accessToken', response.data.access);
                                return response.data.access;
                            })
                            .finally(() => { refreshPromise = null; });
                    }
                    const newAccessToken = await refreshPromise;
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return api(originalRequest);
                }
                clearAuthTokens();
            } catch (err) {
                if (localStorage.getItem('refreshToken') !== refreshToken) {
                    return Promise.reject(error);
                }
                // Refresh token expired or invalid
                clearAuthTokens();
                // Only redirect to admin login if currently on an admin page
                if (window.location.pathname.startsWith('/admin')) {
                    window.location.href = "/admin-login";
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
