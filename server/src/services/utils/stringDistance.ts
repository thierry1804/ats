import natural from 'natural';

export function calculateJaroWinklerDistance(str1: string, str2: string): number {
  // @ts-ignore - La définition de types indique 3 arguments mais la fonction en accepte 2
  return natural.JaroWinklerDistance(str1, str2);
} 