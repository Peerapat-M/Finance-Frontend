import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { createClient, type User } from '@supabase/supabase-js';
import { Wallet, Plus, Trash2, Receipt, ArrowUpRight, ArrowDownLeft, Tag, LogIn, LogOut } from 'lucide-react';

// ตัวเชื่อมต่อ Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseFront = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  date: string;
}

const API_URL = 'http://localhost:5000/api/transactions';
const DEFAULT_INCOME_CATS = ['เงินเดือน', 'ขายของ', 'ลงทุน', 'รายได้เสริม'];
const DEFAULT_EXPENSE_CATS = ['อาหาร', 'เดินทาง', 'ช้อปปิ้ง', 'ที่พัก/บิล', 'บันเทิง'];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');
  
  const [customIncomeCats, setCustomIncomeCats] = useState<string[]>(() => 
    JSON.parse(localStorage.getItem('custom_inc_cats') || '[]')
  );
  const [customExpenseCats, setCustomExpenseCats] = useState<string[]>(() => 
    JSON.parse(localStorage.getItem('custom_exp_cats') || '[]')
  );
  const [newCatInput, setNewCatInput] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);

  useEffect(() => {
    supabaseFront.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setSessionToken(session?.access_token ?? null);
    });

    const { data: { subscription } } = supabaseFront.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setSessionToken(session?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (sessionToken) fetchTransactions();
    else setTransactions([]);
  }, [sessionToken]);

  useEffect(() => {
    localStorage.setItem('custom_inc_cats', JSON.stringify(customIncomeCats));
    localStorage.setItem('custom_exp_cats', JSON.stringify(customExpenseCats));
  }, [customIncomeCats, customExpenseCats]);

  const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${sessionToken}` } });

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(API_URL, getAuthHeader());
      setTransactions(res.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleGoogleLogin = async () => {
    await supabaseFront.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleLogout = async () => {
    await supabaseFront.auth.signOut();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    try {
      await axios.post(API_URL, {
        type, description, amount: parseFloat(amount), date: new Date().toISOString()
      }, getAuthHeader());
      setDescription('');
      setAmount('');
      fetchTransactions();
    } catch (err) {
      console.error('Error adding transaction:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) return;
    try {
      await axios.delete(`${API_URL}/${id}`, getAuthHeader());
      fetchTransactions();
    } catch (err) {
      console.error('Error deleting transaction:', err);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCat = newCatInput.trim();
    if (!cleanCat) return;
    if (type === 'income') {
      if (![...DEFAULT_INCOME_CATS, ...customIncomeCats].includes(cleanCat)) setCustomIncomeCats([...customIncomeCats, cleanCat]);
    } else {
      if (![...DEFAULT_EXPENSE_CATS, ...customExpenseCats].includes(cleanCat)) setCustomExpenseCats([...customExpenseCats, cleanCat]);
    }
    setDescription(cleanCat);
    setNewCatInput('');
    setShowAddCat(false);
  };

  const getSummary = () => {
    const today = new Date();
    let day = { inc: 0, exp: 0 }, week = { inc: 0, exp: 0 }, month = { inc: 0, exp: 0 };
    transactions.forEach(t => {
      const tDate = new Date(t.date);
      const amt = parseFloat(t.amount as any);
      if (today.toDateString() === tDate.toDateString()) t.type === 'income' ? day.inc += amt : day.exp += amt;
      const diffDays = Math.ceil(Math.abs(today.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) t.type === 'income' ? week.inc += amt : week.exp += amt;
      if (today.getMonth() === tDate.getMonth() && today.getFullYear() === tDate.getFullYear()) t.type === 'income' ? month.inc += amt : month.exp += amt;
    });
    return { day, week, month };
  };

  const summary = getSummary();
  const formatMoney = (num: number) => '฿' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const currentCategories = type === 'income' ? [...DEFAULT_INCOME_CATS, ...customIncomeCats] : [...DEFAULT_EXPENSE_CATS, ...customExpenseCats];

  // --- หน้าเข้าสู่ระบบแบบมินิมอลโมเดิร์น (เมื่อยังไม่ได้ล็อกอิน) ---
  if (!user) {
    return (
      <div className="bg-[#F4F7F5] min-h-screen font-sans flex items-center justify-center p-6 relative overflow-hidden selection:bg-[#D8E8E1]">
        
        {/* ตกแต่งพื้นหลังด้วยวงกลม Gradient นุ่ม ๆ (Decorative Background Blobs) */}
        <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-[#E4EFE9] rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#D8E8E1] rounded-full blur-3xl opacity-50" />

        <div className="bg-white/80 backdrop-blur-md p-8 sm:p-10 rounded-3xl border border-[#E9EFEA] shadow-[0_8px_30px_rgb(180,200,190,0.2)] max-w-md w-full text-center relative z-10 transition-all duration-300 hover:shadow-[0_8px_40px_rgb(180,200,190,0.3)]">
          
          {/* Logo Brand */}
          <div className="flex justify-center mb-6">
            <div className="bg-[#E4EFE9] text-[#4A7864] p-4 rounded-2xl shadow-xs transition-transform duration-500 hover:rotate-12">
              <Wallet size={36} strokeWidth={1.5} />
            </div>
          </div>

          {/* Header Text */}
          <h1 className="text-2xl font-bold tracking-tight text-[#243E33] sm:text-3xl">
            ยินดีต้อนรับสู่ <span className="text-[#4A7864]">Fin.</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#628275] mt-2 mb-8 leading-relaxed">
            แอปพลิเคชันบันทึกรายรับรายจ่ายประจำวันส่วนบุคคล <br className="hidden sm:inline" />
            ช่วยให้คุณจัดการเป้าหมายทางการเงินได้อย่างแม่นยำและปลอดภัย
          </p>

          {/* ปุ่มล็อกอินด้วย Google ดีไซน์พรีเมียม */}
          <button 
            onClick={handleGoogleLogin} 
            className="w-full bg-white hover:bg-[#F9FBFA] text-gray-700 font-medium py-3 px-4 border border-gray-200 rounded-xl shadow-xs hover:shadow-sm transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer text-sm group"
          >
            {/* Google SVG Icon แท้ */}
            <svg className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" viewBox="0 0 24 24" width="100%" height="100%">
              <g transform="matrix(1, 0, 0, 1, 0, 0)">
                <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.6h3.3c1.92,-1.78 3.02,-4.4 3.02,-7.4c0,-0.37 -0.03,-0.74 -0.01,-1H21.35z" fill="#4285F4" />
                <path d="M12,20.6c2.6,0 4.77,-0.85 6.36,-2.3l-3.3,-2.6c-0.9,0.6 -2.07,0.98 -3.06,0.98c-2.37,0 -4.38,-1.59 -5.1,-3.74H3.4v2.7c1.58,3.15 4.83,5.22 8.6,5.22z" fill="#34A853" />
                <path d="M6.9,12.94c-0.18,-0.54 -0.29,-1.11 -0.29,-1.7c0,-0.59 0.11,-1.16 0.29,-1.7V6.8H3.4c-0.62,1.24 -0.98,2.64 -0.98,4.14c0,1.5 0.36,2.9 0.98,4.14L6.9,12.94z" fill="#FBBC05" />
                <path d="M12,5.66c1.4,0 2.68,0.48 3.68,1.43l2.76,-2.76c-1.66,-1.55 -3.85,-2.51 -6.44,-2.51c-3.77,0 -7.02,2.07 -8.6,5.22l3.5,2.74c0.72,-2.15 2.73,-3.74 5.1,-3.74z" fill="#EA4335" />
              </g>
            </svg>
            <span className="font-sans tracking-wide">ดำเนินการต่อด้วย Google</span>
          </button>

          {/* Footer Card Notes */}
          <div className="mt-8 pt-5 border-t border-[#F2F6F3] text-[11px] text-[#A4B8AF] flex flex-col gap-1">
            <p>ระบบจะแยกพื้นที่จัดเก็บข้อมูลของคุณอย่างปลอดภัยแบบ 100%</p>
            <p className="font-light">Powered by Supabase Auth & Row Level Security</p>
          </div>

        </div>
      </div>
    );
  }

  // --- ส่วนหน้าแอปหลัก (อัปเกรดดีไซน์ใหม่) ---
  return (
    <div className="bg-[#F4F7F5] text-[#334E43] min-h-screen font-['Mali'] antialiased selection:bg-[#D8E8E1] relative overflow-hidden">
      
      {/* Decorative Background Blobs */}
      <div className="absolute top-[-5%] right-[-5%] w-80 h-80 bg-[#E4EFE9] rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#D8E8E1] rounded-full blur-3xl opacity-40 pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 relative z-10">
        
        {/* Profile Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center mb-10 pb-6 border-b border-gray-200/50 gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img src={user.user_metadata.avatar_url} alt="Profile" className="w-12 h-12 rounded-2xl border-2 border-white shadow-sm object-cover" />
              <div className="absolute -bottom-1 -right-1 bg-[#4A7864] text-white p-1 rounded-lg border-2 border-white"><Wallet size={10} /></div>
            </div>
            <div className="text-left">
              <h1 className="text-lg font-bold text-[#243E33]">Fin. <span className="font-light text-[#7C9A8E]">Dashboard</span></h1>
              <p className="text-xs text-[#628275]">ยินดีต้อนรับ, {user.user_metadata.full_name}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-[#A25757] bg-white/60 backdrop-blur-sm border border-white py-2.5 px-5 rounded-2xl hover:bg-[#FFF5F5] transition duration-300 cursor-pointer font-medium shadow-sm">
            <LogOut size={14} /> ออกจากระบบ
          </button>
        </header>

        {/* Dashboard Summary Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { title: 'สรุปวันนี้', data: summary.day, color: 'text-[#4A7864]' },
            { title: '7 วันที่ผ่านมา', data: summary.week, color: 'text-[#334E43]' },
            { title: 'เดือนนี้', data: summary.month, color: 'text-[#243E33]' }
          ].map((item, idx) => (
            <div key={idx} className="bg-white/70 backdrop-blur-md p-6 rounded-[2rem] border border-white/50 shadow-[0_8px_30px_rgb(180,200,190,0.15)] transition hover:translate-y-[-4px]">
              <span className="text-[10px] font-bold text-[#7C9A8E] uppercase tracking-[0.1em]">{item.title}</span>
              <h3 className={`text-2xl font-bold tracking-tight mt-1 ${item.color}`}>{formatMoney(item.data.inc - item.data.exp)}</h3>
              <div className="flex justify-between items-center text-[11px] mt-4 pt-3 border-t border-gray-100/50">
                <span className="text-[#55A380] flex items-center gap-1"><ArrowUpRight size={14} /> {item.data.inc.toLocaleString()}</span>
                <span className="text-[#C77979] flex items-center gap-1"><ArrowDownLeft size={14} /> {item.data.exp.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Transaction Form */}
          <section className="bg-white/80 backdrop-blur-md p-7 rounded-[2.5rem] border border-white/60 shadow-[0_8px_30px_rgb(180,200,190,0.15)] lg:col-span-5">
            <h2 className="text-lg font-bold mb-6 text-[#243E33] flex items-center gap-2"><Plus size={20} className="text-[#4A7864]" /> บันทึกรายการใหม่</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-[#628275] mb-2 px-1">ประเภทเงิน</label>
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#F4F7F5] rounded-2xl">
                  <button type="button" onClick={() => { setType('income'); setDescription(''); }} className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${type === 'income' ? 'bg-white text-[#4A7864] shadow-sm' : 'text-[#A4B8AF] hover:text-[#7C9A8E]'}`}>รายรับ</button>
                  <button type="button" onClick={() => { setType('expense'); setDescription(''); }} className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${type === 'expense' ? 'bg-white text-[#A25757] shadow-sm' : 'text-[#A4B8AF] hover:text-[#7C9A8E]'}`}>รายจ่าย</button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2 px-1 text-xs font-bold text-[#628275]">
                  <span>หัวข้อด่วน</span>
                  <button type="button" onClick={() => setShowAddCat(!showAddCat)} className="text-[#4A7864] hover:underline cursor-pointer">{showAddCat ? 'ยกเลิก' : '+ เพิ่มหัวข้อเอง'}</button>
                </div>
                {showAddCat && (
                  <div className="flex gap-2 mb-3">
                    <input type="text" value={newCatInput} onChange={(e) => setNewCatInput(e.target.value)} placeholder="ชื่อหัวข้อใหม่..." className="flex-1 p-2 bg-[#F4F7F5] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#BCD6CB]" />
                    <button type="button" onClick={handleAddCategory} className="bg-[#4A7864] text-white px-4 rounded-xl text-xs font-bold cursor-pointer">เพิ่ม</button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50/30 rounded-2xl border border-gray-100/50 max-h-40 overflow-y-auto">
                  {currentCategories.map((cat) => (
                    <button key={cat} type="button" onClick={() => setDescription(cat)} className={`px-3 py-1.5 text-[11px] rounded-lg transition-all cursor-pointer border ${description === cat ? 'bg-[#E4EFE9] border-[#BCD6CB] text-[#243E33] font-bold shadow-xs' : 'bg-white border-gray-200 text-[#7C9A8E] hover:border-[#BCD6CB]'}`}>{cat}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="group">
                  <label className="block text-xs font-bold text-[#628275] mb-1 px-1">รายละเอียด</label>
                  <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="..." required className="w-full p-3.5 bg-[#F4F7F5] border-2 border-transparent rounded-2xl focus:bg-white focus:border-[#E4EFE9] text-sm text-[#243E33] transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#628275] mb-1 px-1">จำนวนเงิน (บาท)</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" min="0.01" step="0.01" required className="w-full p-3.5 bg-[#F4F7F5] border-2 border-transparent rounded-2xl focus:bg-white focus:border-[#E4EFE9] text-sm text-[#243E33] transition-all outline-none" />
                </div>
              </div>

              <button type="submit" className="w-full bg-[#4A7864] hover:bg-[#3E6B57] text-white font-bold py-4 rounded-2xl transition shadow-md flex items-center justify-center gap-2 mt-4 cursor-pointer">
                <Plus size={20} /> บันทึกรายการ
              </button>
            </form>
          </section>

          {/* Transaction History Section */}
          <section className="bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-white/60 shadow-[0_8px_30px_rgb(180,200,190,0.15)] overflow-hidden lg:col-span-7">
            <div className="p-7 border-b border-gray-100/50 flex justify-between items-center bg-white/30">
              <h2 className="text-lg font-bold text-[#243E33] flex items-center gap-2"><Receipt size={20} className="text-[#4A7864]" /> ประวัติธุรกรรม</h2>
              <span className="text-[10px] font-bold px-3 py-1 bg-[#E4EFE9] text-[#4A7864] rounded-full uppercase tracking-widest">{transactions.length} รายการ</span>
            </div>
            
            <div className="overflow-y-auto max-h-[600px] scrollbar-hide">
              {transactions.length === 0 ? (
                <div className="py-24 text-center text-[#A4B8AF]">
                  <Receipt className="mx-auto mb-4 opacity-20" size={60} strokeWidth={1} />
                  <p className="text-sm">ยังไม่มีประวัติการทำธุรกรรม</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100/50">
                  {transactions.map((t) => (
                    <div key={t.id} className="p-5 hover:bg-[#F9FBFA]/50 transition-colors flex justify-between items-center group">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${t.type === 'income' ? 'bg-[#E4EFE9] text-[#4A7864]' : 'bg-[#FFF5F5] text-[#A25757]'}`}>
                          {t.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                        </div>
                        <div className="text-left">
                          <h4 className="text-sm font-bold text-[#334E43] leading-tight">{t.description}</h4>
                          <p className="text-[10px] text-[#8AA79B] mt-1">{new Date(t.date).toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-sm font-bold ${t.type === 'income' ? 'text-[#4A7864]' : 'text-[#A25757]'}`}>
                          {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}
                        </span>
                        <button onClick={() => handleDelete(t.id)} className="text-[#CBDCD4] hover:text-[#C77979] transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
      
      {/* Footer Branding */}
      <footer className="mt-10 mb-8 text-center text-[10px] text-[#A4B8AF] font-bold uppercase tracking-[0.2em] opacity-60">
        © 2026 Fin. Personal Finance Manager
      </footer>
    </div>
  );
}