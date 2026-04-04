export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  type?: 'text' | 'automation' | 'info';
  automationSteps?: AutomationStep[];
  screenshot?: string;
  diagram?: string;
}

export interface AutomationStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: number;
}

export interface UserProfile {
  name: string;
  kraId: string;
  pin: string;
  status: 'Active' | 'Inactive';
}

export interface Credentials {
  pin: string;
  password: string;
}
