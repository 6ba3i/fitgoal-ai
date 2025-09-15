import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useApi = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    method = 'GET',
    body = null,
    headers = {},
    dependencies = [],
    autoFetch = true,
    onSuccess = null,
    onError = null
  } = options;

  const fetchData = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);

    try {
      let response;
      const config = {
        headers: {
          ...headers
        }
      };

      switch (method.toUpperCase()) {
        case 'GET':
          response = await api.get(url, { ...config, params });
          break;
        case 'POST':
          response = await api.post(url, body || params, config);
          break;
        case 'PUT':
          response = await api.put(url, body || params, config);
          break;
        case 'PATCH':
          response = await api.patch(url, body || params, config);
          break;
        case 'DELETE':
          response = await api.delete(url, config);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      setData(response.data);
      
      if (onSuccess) {
        onSuccess(response.data);
      }

      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
      setError(errorMessage);
      
      if (onError) {
        onError(err);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url, method, body, headers, onSuccess, onError]);

  const refetch = useCallback((params) => {
    return fetchData(params);
  }, [fetchData]);

  const mutate = useCallback((newData) => {
    setData(newData);
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (autoFetch && method === 'GET') {
      fetchData();
    }
  }, [...dependencies, autoFetch]);

  return {
    data,
    loading,
    error,
    fetchData,
    refetch,
    mutate,
    reset
  };
};

// Custom hook for paginated API calls
export const usePaginatedApi = (baseUrl, options = {}) => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const { 
    limit = 10,
    ...apiOptions 
  } = options;

  const { data, loading, error, fetchData } = useApi(baseUrl, {
    ...apiOptions,
    autoFetch: false
  });

  const loadPage = useCallback(async (pageNumber = 1) => {
    const params = {
      page: pageNumber,
      limit
    };

    try {
      const response = await fetchData(params);
      
      if (response) {
        setItems(response.items || response.data || []);
        setPage(response.page || pageNumber);
        setTotalPages(response.totalPages || 1);
        setTotalItems(response.totalItems || response.total || 0);
        setHasMore(response.hasMore !== undefined ? response.hasMore : pageNumber < response.totalPages);
      }
      
      return response;
    } catch (err) {
      console.error('Failed to load page:', err);
      throw err;
    }
  }, [fetchData, limit]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    
    const nextPage = page + 1;
    const params = {
      page: nextPage,
      limit
    };

    try {
      const response = await fetchData(params);
      
      if (response) {
        setItems(prev => [...prev, ...(response.items || response.data || [])]);
        setPage(response.page || nextPage);
        setHasMore(response.hasMore !== undefined ? response.hasMore : nextPage < response.totalPages);
      }
      
      return response;
    } catch (err) {
      console.error('Failed to load more:', err);
      throw err;
    }
  }, [page, hasMore, loading, fetchData, limit]);

  const refresh = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    return loadPage(1);
  }, [loadPage]);

  useEffect(() => {
    if (options.autoFetch !== false) {
      loadPage(1);
    }
  }, []);

  return {
    items,
    page,
    totalPages,
    totalItems,
    hasMore,
    loading,
    error,
    loadPage,
    loadMore,
    refresh
  };
};

// Custom hook for form submissions
export const useFormApi = (url, options = {}) => {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);

  const submit = useCallback(async (formData) => {
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await api.post(url, formData);
      setResponse(result.data);
      setSuccess(true);
      
      if (options.onSuccess) {
        options.onSuccess(result.data);
      }
      
      return result.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Submission failed';
      setError(errorMessage);
      
      if (options.onError) {
        options.onError(err);
      }
      
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [url, options]);

  const reset = useCallback(() => {
    setSubmitting(false);
    setSuccess(false);
    setError(null);
    setResponse(null);
  }, []);

  return {
    submit,
    submitting,
    success,
    error,
    response,
    reset
  };
};

// Custom hook for debounced API calls (useful for search)
export const useDebouncedApi = (url, query, delay = 500, options = {}) => {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay]);

  useEffect(() => {
    if (debouncedQuery) {
      search();
    } else {
      setSearchResults([]);
    }
  }, [debouncedQuery]);

  const search = async () => {
    if (!debouncedQuery) return;

    setSearching(true);
    try {
      const response = await api.get(url, {
        params: { q: debouncedQuery, ...options.params }
      });
      setSearchResults(response.data.results || response.data || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  return {
    searchResults,
    searching,
    query: debouncedQuery
  };
};