import type { UserRole } from "../modules/auth/auth.interface.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        name: string;
        role: UserRole;
      };
    }
  }
}

export {};
