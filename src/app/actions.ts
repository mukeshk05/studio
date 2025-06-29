
'use server';

// This file acts as a central "barrel" file for all server actions.
// It re-exports all actions from the modularized files within the /actions directory.
// This approach ensures that components can import actions from a single, consistent path
// (e.g., '@/app/actions') while keeping the action definitions organized in separate,
// domain-specific files.

export * from './actions/index';
