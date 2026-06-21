/**
 * Simulates network delay (default between 300ms and 600ms).
 */
export const delay = (ms?: number): Promise<void> => {
  const min = 300;
  const max = 600;
  const duration = ms !== undefined ? ms : Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, duration));
};
