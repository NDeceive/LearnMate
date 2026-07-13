import type {ReactNode} from 'react';import {Sidebar} from './Sidebar';import {TopBar} from './TopBar';
export function Layout({path,children}:{path:string;children:ReactNode}){return<div className="min-h-screen bg-slate-50 text-slate-800"><Sidebar path={path}/><div className="ml-64 min-h-screen"><TopBar/><main className="mx-auto max-w-7xl p-8">{children}</main></div></div>}
