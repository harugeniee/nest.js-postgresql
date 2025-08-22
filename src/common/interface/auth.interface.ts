import { UserRole } from 'src/shared/constants';

export interface AuthPayload {
  uid: string;
  ssid: string;
  role?: UserRole;
}
