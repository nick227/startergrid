import React from 'react';
import { AutomotiveHomeTemplate } from './AutomotiveHomeTemplate.tsx';

export const templateRegistry: Record<string, React.ComponentType> = {
  automotive: AutomotiveHomeTemplate,
};
