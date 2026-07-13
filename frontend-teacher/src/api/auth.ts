import {api} from './client';import type {User} from '../types';
export function login(identifier:string,password:string){return api<{token:string;user:User}>('/auth/login',{method:'POST',body:JSON.stringify({identifier,password})});}
export function me(){return api<{user:User}>('/auth/me');}
