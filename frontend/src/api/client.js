import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 600000, // Increased to 10 mins for large repos
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      "An unexpected error occurred";
    return Promise.reject(new Error(msg));
  }
);

export const indexRepo = (payload) => api.post("/index", payload);
export const fetchIssue = () => api.get("/issue");
export const fetchLocalize = () => api.get("/localize");
export const fetchPatch = () => api.get("/patch");
export const fetchEvaluate = () => api.get("/evaluate");

export default api;
