
export enum AppTab {
  EXPLORE = 'explore',
  ASSISTANT = 'assistant',
  ANALYZER = 'analyzer',
  LAB = 'lab'
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  image?: string;
  sourceUrl?: string;
}

export interface AnalysisResult {
  dishName: string;
  ingredients: string[];
  calories: string;
  suggestedAction: string;
}
