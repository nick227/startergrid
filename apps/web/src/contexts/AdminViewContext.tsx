import { createContext, useContext } from 'react';

export const AdminViewContext = createContext(false);
export const useAdminView = () => useContext(AdminViewContext);
