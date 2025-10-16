// A detailed representation of the Task object based on the user's specified fields
export interface Task {
  _id: string;
  id: string;
  taskId?: string | number;
  type?: string;
  date?: string;
  progress?: string;
  client?: string;
  platformName?: string;
  when?: string;
  closureDate?: string;
  updated?: string;
  attempts?: number;
  completedBy?: string;
  unplanned?: boolean;

  hubName?: string;
  roundName?: string;
  sequence?: number;
  associatedName?: string;
  driver?: {
    firstName?: string;
    lastName?: string;
  };

  timeWindow?: {
    start?: string;
    stop?: string;
  };
  actualTime?: {
    arrive?: {
      when?: string;
      isCorrectAddress?: boolean;
    };
  };
  realServiceTime?: {
    startTime?: string;
    endTime?: string;
    serviceTime?: number;
  };
  serviceTime?: number;

  contact?: {
    person?: string;
    phone?: string;
    email?: string;
    buildingInfo?: {
      floor?: string;
      hasElevator?: boolean;
      digicode1?: string;
      hasInterphone?: boolean;
      interphoneCode?: string;
    };
  };
  location?: {
    address?: string;
    street?: string;
    number?: string;
    zip?: string;
    city?: string;
    countryCode?: string;
    geometry?: [number, number];
  };
  instructions?: string;

  dimensions?: {
    volume?: number;
    bac?: number;
    poids?: number;
  };
  items?: {
    name?: string;
    status?: string;
    barcode?: string;
    type?: string;
    dimensions?: {
      poids?: number;
    };
    log?: {
      when?: string;
      to?: string;
    }[];
  }[];
  
  execution?: {
    contactless?: boolean;
  };

  metadata?: {
    notationLivreur?: number;
    commentaireLivr?: string;
    building?: string;
  };
  
  driverId?: string; // Kept for rating details functionality
  rating?: number; // Kept for rating details functionality
  [key: string]: any; // Allow other properties
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
