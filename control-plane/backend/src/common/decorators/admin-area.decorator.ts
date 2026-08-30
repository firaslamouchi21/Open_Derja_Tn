import { Roles } from './roles.decorator';

export const AdminArea = () => Roles('admin', 'superadmin');
