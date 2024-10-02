import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Deferred<T> = {
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
  promise: Promise<T>;
};

export function createDeferred<T>(): Deferred<T> {
  let resolve: (value: T) => void;
  let reject: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { resolve: resolve!, reject: reject!, promise };
}

export function computedStyleRect(
  element: HTMLElement | undefined | null
): DOMRect {
  if (!element) {
    return new DOMRect(0, 0, 0, 0);
  }

  const style = getComputedStyle(element);
  const width = parseInt(style.width);
  const height = parseInt(style.height);
  const top = parseInt(style.top);
  const left = parseInt(style.left);
  return new DOMRect(left, top, width, height);
}
