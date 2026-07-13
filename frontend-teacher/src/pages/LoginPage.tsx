import { useState, type FormEvent } from 'react';
import { BookOpen, Lock, UserRound } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { navigate } from '../router';

export function LoginPage() {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(identifier, password);
      navigate('/dashboard', true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
    <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl lg:grid-cols-2">
      <section className="hidden bg-gradient-to-br from-blue-700 to-indigo-950 p-14 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-xl font-bold"><BookOpen />LearnMate 教师端</div>
        <div><h1 className="text-4xl font-bold leading-tight">从真实学习轨迹，<br />找到下一次有效干预。</h1><p className="mt-5 max-w-md text-sm leading-7 text-blue-100">班级学情、学生画像、测验、路径、资源与评估报告统一来自 LearnMate 后端。</p></div>
        <p className="text-xs text-blue-200">STUDENT 账号登录后会显示明确的无权限页面。</p>
      </section>
      <section className="grid place-items-center p-8"><form onSubmit={submit} className="w-full max-w-sm">
        <h2 className="text-2xl font-bold">教师登录</h2><p className="mt-2 text-sm text-slate-400">使用 LearnMate 账号与密码</p>
        <label className="mt-8 block text-xs text-slate-400">用户名或编号</label><div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3"><UserRound size={17}/><input value={identifier} onChange={event=>setIdentifier(event.target.value)} className="w-full bg-transparent py-3 outline-none" autoComplete="username" required maxLength={100}/></div>
        <label className="mt-5 block text-xs text-slate-400">密码</label><div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3"><Lock size={17}/><input value={password} onChange={event=>setPassword(event.target.value)} type="password" className="w-full bg-transparent py-3 outline-none" autoComplete="current-password" required maxLength={200}/></div>
        {error&&<div className="mt-4 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
        <button disabled={loading} className="mt-6 w-full rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60">{loading?'正在验证…':'登录教师工作台'}</button>
      </form></section>
    </div>
  </div>;
}
