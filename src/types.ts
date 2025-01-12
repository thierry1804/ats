export interface Candidate {
  id: string;
  name: string;
  email: string;
  status: 'new' | 'reviewing' | 'interviewed' | 'offered' | 'rejected';
  role: string;
  appliedDate: string;
  resume?: string;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract';
  status: 'open' | 'closed';
  description: string;
  requirements: string[];
  postedDate: string;
}