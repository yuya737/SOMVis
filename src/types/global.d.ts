// Set of a enum for subsetType
// export enum subsetType {
//   month = "month",
//   waterYear = "wateryear",
// }

// List of dictionaries
// export type SOMPath = { id: number }[];
declare type SOMPath = { id: number }[];

// id is month here
declare type BMUMata = {
  name: string;
  month: number;
  year: number;
  coords: number[];
};

declare type EnsembleMember = {
  model_name: string;
  variant: number;
  ssp: string;
};
