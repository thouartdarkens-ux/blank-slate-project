
interface Window {
  dataLayer: any[];
  gtag: (...args: any[]) => void;
}

declare const dataLayer: any[];
declare function gtag(...args: any[]): void;
