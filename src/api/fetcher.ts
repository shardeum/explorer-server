import { api } from "./axios";

export const fetcher = async (url: string) => {
  const response = await api.get(url);
  return response.data;
};
