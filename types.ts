
export interface Milestone {
  year: number;
  title: string;
  description: string;
  advice: string;
  challenge: string;
}

export interface UserContext {
  name: string;
  currentStatus: string;
  tenYearGoal: string;
}

export enum GameState {
  LANDING = 'LANDING',
  LOADING_DB = 'LOADING_DB',
  LISTING = 'LISTING',
  RESUME_PROMPT = 'RESUME_PROMPT',
  INTRO = 'INTRO',
  GENERATING = 'GENERATING',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED'
}

export interface SavedSession {
  id?: string;
  context: UserContext;
  milestones: Milestone[];
  distance: number;
  currentIndex: number;
}
