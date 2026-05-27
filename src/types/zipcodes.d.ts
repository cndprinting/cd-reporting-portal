declare module "zipcodes" {
  export interface ZipInfo {
    zip: string;
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    country: string;
  }
  export function lookup(zip: string | number): ZipInfo | undefined;
  export function lookupByName(city: string, state: string): ZipInfo[];
  export function distance(zipA: string, zipB: string): number | null;
  export function radius(zip: string, miles: number): string[];
  const _default: {
    lookup: typeof lookup;
    lookupByName: typeof lookupByName;
    distance: typeof distance;
    radius: typeof radius;
  };
  export default _default;
}
