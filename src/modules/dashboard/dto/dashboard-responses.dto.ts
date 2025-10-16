export interface AppointmentsTrendResponse {
  labels: string[];
  data: number[];
  total: number;
}

export interface DiagnosisFrequencyResponse {
  labels: string[];
  data: number[];
  total: number;
}

export interface LaboratoryOrdersStatusResponse {
  labels: string[];
  data: number[];
  total: number;
}

export interface ProductsInventoryResponse {
  labels: string[];
  data: number[];
  total: number;
  details: {
    lowStock: string[];
    mediumStock: string[];
    highStock: string[];
  };
}

export interface ShiftStatusDistributionResponse {
  labels: string[];
  data: number[];
  total: number;
}

export interface PatientsAgeDemographicsResponse {
  labels: string[];
  data: number[];
  total: number;
}
