export function debounce(func: (...args: any[]) => void, wait: number) {
    let timeout: ReturnType<typeof setTimeout> | null;
    return function (this: any, ...args: any[]) {
      const context = this;
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }