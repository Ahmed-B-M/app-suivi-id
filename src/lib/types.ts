// A basic representation of the Task object based on schema
export interface Task {
  id: string;
  _id: string; // some items use _id
  taskId?: string;
  progress?: string;
  unplanned: boolean;
  date?: string;
  rating?: number;
  notationLivreur?: number;
  commentaireLivr?: string;
  metadata?: {
    notationLivreur?: number;
    commentaireLivr?: string;
  };
  // Add other task properties as needed
  [key: string]: any;
}

// A basic representation of the Round object based on schema
export interface Round {
  id: string;
  _id: string; // some items use _id
  name: string;
  status: string;
  date: string;
  // Add other round properties as needed
  [key: string]: any;
}
