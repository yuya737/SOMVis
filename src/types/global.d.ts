declare type SOMPath = number[];
declare type SOMNode = {
  coords: number[];
  id: number;
};

// Represents metadata for the Best Matching Unit (BMU) in the SOM.
// The 'month' property indicates the month.
declare type BMUData = {
  name: string; // Name of the BMU
  month: number; // Month associated with the BMU
  year: number; // Year associated with the BMU
  coords: number[]; // Coordinates of the BMU in the SOM grid
};

// Represents an ensemble member in a climate model ensemble.
declare type EnsembleMember = {
  dataset_name: string; // Name of the dataset; 'California' or 'NorthWest'
  model_name: string; // Name of the climate model
  variant: string; // Variant number of the model run
  ssp: string; // Shared Socioeconomic Pathway (SSP) scenario, sspXXX or historical
};
