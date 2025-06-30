declare type Coords = [number, number];
declare type SOMPath = number[];
declare type SOMNode = {
  coords: number[];
  id: number;
};

// Represents metadata for the Best Matching Unit (BMU) in the SOM.
// The 'month' property indicates the month.,w
declare type BMUData = {
  name: string; // Name of the BMU
  month: number; // Month associated with the BMU
  year: number; // Year associated with the BMU
  id: number; // ID of the BMU
  // coords: number[]; // Coordinates of the BMU in the SOM grid
};

// Represents an ensemble member in a climate model ensemble.
declare type EnsembleMember = {
  dataset_name: string; // Name of the dataset; 'California' or 'NorthWest'
  model_name: string; // Name of the climate model
  variant: string; // Variant number of the model run
  ssp: string; // Shared Socioeconomic Pathway (SSP) scenario, sspXXX or historical
};

declare type EnsembleMemberTemporal = EnsembleMember & {
  time: number; // 1-7; 1-3 are historical, 4-7 are future
};

declare type EnsembleMemberTemporalClustered = EnsembleMemberTemporal & {
  clustering: number; // clustering
};,w

declare type PartialRecord<K extends keyof any, T> = {
  [P in K]?: T;
};

declare type MapMode = "Explore" | "Annotate";

declare type LLMQueryResult = {
  type: "forward" | "backward";
  query?: string;
  result?: number[];

  idsContained?: number[];
  zoneID?: number[],

  description: string;
};

declare type step = "Anchor" | "Annotate" | "Analyze";

declare type datasetType = "California" | "NorthWest" | "WestCoast"
